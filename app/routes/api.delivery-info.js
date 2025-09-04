import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const normalizeId = (id) => id?.toString().replace(/gid:\/\/shopify\/(Product|Collection)\//, "");

const countryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const formatDatePKT = (date) => {
  const pktDate = new Date(new Date(date).getTime() + 5 * 60 * 60 * 1000);
  return pktDate.toLocaleDateString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

async function detectCountry(ip) {
  if (countryCache.has(ip)) {
    const cached = countryCache.get(ip);
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.country;
    countryCache.delete(ip);
  }

  const fallbackCountry = "Pakistan";
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  if (!ipRegex.test(ip) && ip !== "8.8.8.8") return fallbackCountry;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const country = geoData.country_name || geoData.country || fallbackCountry;
      countryCache.set(ip, { country, timestamp: Date.now() });
      return country;
    }
  } catch {}

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const geoResponse = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    const geoData = await geoResponse.json();
    if (geoData.success) {
      const country = geoData.country || fallbackCountry;
      countryCache.set(ip, { country, timestamp: Date.now() });
      return country;
    }
  } catch {}

  countryCache.set(ip, { country: fallbackCountry, timestamp: Date.now() });
  return fallbackCountry;
}

const matchesZipCode = (userZipCode, ruleZipCodes, zipCodeType) => {
  if (!ruleZipCodes?.trim()) return true;

  const zipCodeArray = ruleZipCodes.split(",").map((z) => z.trim());
  const userZip = userZipCode.trim();
  let isMatch = false;

  for (const pattern of zipCodeArray) {
    if (pattern.includes("-")) {
      const [start, end] = pattern.split("-").map(Number);
      if (Number(userZip) >= start && Number(userZip) <= end) {
        isMatch = true;
        break;
      }
    } else if (pattern.endsWith("*")) {
      if (userZip.startsWith(pattern.slice(0, -1))) {
        isMatch = true;
        break;
      }
    } else if (pattern === userZip) {
      isMatch = true;
      break;
    }
  }

  return zipCodeType === "inclusive" ? isMatch : !isMatch;
};

export async function loader({ request }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const url = new URL(request.url);
    const productId = normalizeId(url.searchParams.get("productId"));
    const collectionId = normalizeId(url.searchParams.get("collectionId"));
    const selectedCountry = url.searchParams.get("country");
    const zipCode = url.searchParams.get("zipCode");

    if (!productId && !collectionId) {
      return json({ error: "Product ID or Collection ID required", fallback: true }, { status: 400, headers });
    }

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "8.8.8.8";

    const country = selectedCountry || (await detectCountry(ip));

    const productRule = productId
      ? await prisma.productRule.findFirst({
          where: { productId, excluded: true, rule: { country: { equals: country, mode: "insensitive" } } },
          include: { rule: true },
        })
      : null;

    const collectionRule = collectionId
      ? await prisma.collectionRule.findFirst({
          where: { collectionId, excluded: true, rule: { country: { equals: country, mode: "insensitive" } } },
          include: { rule: true },
        })
      : null;

    if (productRule || collectionRule) {
      const rule = productRule?.rule || collectionRule?.rule;
      const notificationsEnabled = productRule?.notificationsEnabled || collectionRule?.notificationsEnabled || false;

      if (rule && zipCode && matchesZipCode(zipCode, rule.zipCodes, rule.zipCodeType)) {
        return json(
          {
            available: true,
            country,
            productId,
            collectionId,
            zipCode,
            fallback: true,
            message: `Available for delivery in ${country}${zipCode ? ` (zip code: ${zipCode})` : ""}`,
            deliveryTime: "Standard international shipping",
            shippingMethod: null,
            eventName: null,
            availableFrom: null,
            availableUntil: null,
            endDate: null,
            pickupAvailable: false,
            localDelivery: null,
            notificationsEnabled: false,
            debug: { countryDetected: country, ipUsed: ip, zipCode },
          },
          { headers }
        );
      }

      return json(
        {
          available: false,
          country,
          productId,
          collectionId,
          zipCode,
          fallback: false,
          message: notificationsEnabled
            ? `This ${productId ? "product" : "collection"} is not available in ${country}${zipCode ? ` (zip code: ${zipCode})` : ""}, but you can sign up for notifications.`
            : `This ${productId ? "product" : "collection"} is not available in ${country}${zipCode ? ` (zip code: ${zipCode})` : ""} and notifications are off.`,
          deliveryTime: null,
          shippingMethod: null,
          eventName: null,
          availableFrom: null,
          availableUntil: null,
          endDate: null,
          pickupAvailable: false,
          localDelivery: null,
          estimatedDeliveryDate: null,
          notificationsEnabled,
          debug: { countryDetected: country, ipUsed: ip, zipCode },
        },
        { headers }
      );
    }

    const rules = await prisma.rule.findMany({
      where: {
        OR: [
          productId ? { productRules: { some: { productId } } } : {},
          collectionId ? { collectionRules: { some: { collectionId } } } : {},
        ],
        country: { equals: country, mode: "insensitive" },
      },
      include: {
        productRules: { where: productId ? { productId } : {} },
        collectionRules: { where: collectionId ? { collectionId } : {} },
      },
    });

    const now = new Date();
    const nowPKT = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const nowPKTDate = nowPKT.toISOString().split("T")[0];

    const validRules = rules.filter((rule) => {
      const startDate = rule.startDate ? new Date(rule.startDate) : null;
      const endDate = rule.endDate ? new Date(rule.endDate) : null;
      if (startDate) startDate.setUTCHours(0, 0, 0, 0);
      if (endDate) endDate.setUTCHours(23, 59, 59, 999);

      const startDateStr = startDate ? startDate.toISOString().split("T")[0] : null;
      const isBeforeEnd = !endDate || now <= endDate;
      const isAfterStart = !startDate || nowPKTDate >= startDateStr;

      return isBeforeEnd && isAfterStart && (!rule.zipCodes || !zipCode || matchesZipCode(zipCode, rule.zipCodes, rule.zipCodeType));
    });

    if (validRules.length > 0) {
      const rule = validRules[0];
      const startDate = rule.startDate ? new Date(rule.startDate) : null;
      const endDate = rule.endDate ? new Date(rule.endDate) : null;
      const deliveryDays = rule.deliveryTime?.match(/\d+/)?.[0] || 3;
      const estimatedDate = new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
      const notificationsEnabled = rule.productRules[0]?.notificationsEnabled || rule.collectionRules[0]?.notificationsEnabled || false;

      return json(
        {
          available: true,
          country,
          productId,
          collectionId,
          zipCode,
          fallback: false,
          message: rule.message || `Available for delivery in ${country}${zipCode ? ` (zip code: ${zipCode})` : ""}`,
          deliveryTime: rule.deliveryTime || "Standard shipping",
          shippingMethod: rule.shippingMethod || null,
          eventName: rule.eventName || null,
          availableFrom: startDate ? formatDatePKT(startDate) : null,
          availableUntil: endDate ? formatDatePKT(endDate) : null,
          endDate: endDate ? endDate.toISOString() : null,
          pickupAvailable: rule.pickupAvailable,
          localDelivery: rule.localDelivery,
          notificationsEnabled,
          debug: {
            countryDetected: country,
            ipUsed: ip,
            ruleId: rule.id,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            zipCode,
          },
        },
        { headers }
      );
    }

    if (zipCode) {
      const zipCodeRules = await prisma.rule.findMany({
        where: {
          OR: [
            productId ? { productRules: { some: { productId } } } : {},
            collectionId ? { collectionRules: { some: { collectionId } } } : {},
          ],
          country: { equals: country, mode: "insensitive" },
          zipCodes: { not: null },
        },
      });

      if (zipCodeRules.length > 0) {
        return json(
          {
            available: false,
            country,
            productId,
            collectionId,
            zipCode,
            fallback: false,
            message: `This ${productId ? "product" : "collection"} is not available in ${country} (zip code: ${zipCode}).`,
            deliveryTime: null,
            shippingMethod: null,
            eventName: null,
            availableFrom: null,
            availableUntil: null,
            endDate: null,
            pickupAvailable: false,
            localDelivery: null,
            estimatedDeliveryDate: null,
            notificationsEnabled: false,
            debug: { countryDetected: country, ipUsed: ip, zipCode, totalRules: zipCodeRules.length },
          },
          { headers }
        );
      }
    }

    const estimatedDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return json(
      {
        available: true,
        country,
        productId,
        collectionId,
        zipCode,
        fallback: true,
        message: `Available for delivery in ${country}${zipCode ? ` (zip code: ${zipCode})` : ""}`,
        deliveryTime: "Standard international shipping",
        shippingMethod: null,
        eventName: null,
        availableFrom: null,
        availableUntil: null,
        endDate: null,
        pickupAvailable: false,
        localDelivery: null,
        notificationsEnabled: false,
        debug: { countryDetected: country, ipUsed: ip, totalRules: rules.length, zipCode },
      },
      { headers }
    );
  } catch (error) {
    console.error("API Error:", error);
    const estimatedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return json(
      {
        available: true,
        country: "Pakistan",
        productId: normalizeId(new URL(request.url).searchParams.get("productId")),
        collectionId: normalizeId(new URL(request.url).searchParams.get("collectionId")),
        zipCode: new URL(request.url).searchParams.get("zipCode") || null,
        message: `This product is available (fallback)${zipCode ? ` (zip code: ${zipCode})` : ""}`,
        deliveryTime: "Standard international shipping",
        shippingMethod: null,
        eventName: null,
        availableFrom: null,
        availableUntil: null,
        endDate: null,
        pickupAvailable: false,
        localDelivery: null,
        notificationsEnabled: false,
        fallback: true,
        debug: { error: error.message, zipCode },
      },
      { status: 500, headers }
    );
  }
}

export async function action({ request }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const formData = await request.formData();
    if (formData.get("actionType") === "notify") {
      const email = formData.get("email");
      const productId = formData.get("productId");
      const collectionId = formData.get("collectionId");
      const country = formData.get("country");

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "Valid email is required" }, { status: 400, headers });
      }

      const productRule = productId
        ? await prisma.productRule.findFirst({
            where: { productId, notificationsEnabled: true, rule: { country: { equals: country, mode: "insensitive" } } },
            include: { rule: true },
          })
        : null;

      const collectionRule = collectionId
        ? await prisma.collectionRule.findFirst({
            where: { collectionId, notificationsEnabled: true, rule: { country: { equals: country, mode: "insensitive" } } },
            include: { rule: true },
          })
        : null;

      const rule = productRule?.rule || collectionRule?.rule;
      if (!rule) {
        return json({ error: "Notifications not enabled for this product in your country" }, { status: 403, headers });
      }

      await prisma.notificationSignup.create({
        data: { email, productId, collectionId, country },
      });

      try {
        await transporter.sendMail({
          from: `"Test Store 0012" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Notification Signup Confirmation",
          html: `<h1>Thank You for Signing Up!</h1>
                 <p>You will be notified when the product is available in ${country}.</p>
                 <p>Product ID: ${productId || "N/A"}</p>
                 <p>Collection ID: ${collectionId || "N/A"}</p>`,
        });
        return json({ success: true, message: "You'll be notified when available!" }, { headers });
      } catch (err) {
        console.error("Email failed:", err);
        return json(
          { success: false, message: "Unable to send email. Please use a verified email or try later." },
          { headers }
        );
      }
    }

    return json(null, { headers });
  } catch (error) {
    console.error("Action error:", error);
    return json({ error: "Server error, please try again later" }, { status: 500, headers });
  }
}