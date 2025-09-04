import { useAppBridge } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useNavigation, useFetcher, useNavigate } from "@remix-run/react";
import {
  Button,
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Text,
  Select,
  Checkbox,
  Box,
  ChoiceList
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { CountrySelector } from "../components/CountrySearch";
import { checkAndSendNotifications } from "../utils/notification";


export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop, accessToken } = session;

  let allProducts = [];
  let allCollections = [];
  let allVendors = [];
  let allTags = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const query = `
      query getProducts($cursor: String) {
        products(first: 250, after: $cursor) {
          edges {
            node {
              id
              title
              tags
              vendor
              productType
              collections(first: 100) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    const response = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables: { cursor } }),
    });

    if (!response.ok) {
      return json({ error: `HTTP error! status: ${response.status}` });
    }

    const result = await response.json();
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return json({ error: "GraphQL query failed" }, { status: 500 });
    }

    const responseData = result.data?.products;
    if (!responseData) {
      return json({ error: "No products data returned from Shopify" });
    }

    allProducts = [
      ...allProducts,
      ...responseData.edges.map(edge => ({
        ...edge.node,
        id: edge.node.id.split("/").pop(),
        collections: edge.node.collections.edges.map(e => ({
          ...e.node,
          id: e.node.id.split("/").pop(),
        })),
      })),
    ];
    hasNextPage = responseData.pageInfo.hasNextPage;
    cursor = responseData.pageInfo.endCursor;

    responseData.edges.forEach(edge => {
      const { vendor, tags } = edge.node;
      if (vendor && !allVendors.some(v => v.name === vendor)) {
        allVendors.push({ name: vendor });
      }
      tags.forEach(tag => {
        if (!allTags.some(t => t.name === tag)) {
          allTags.push({ name: tag });
        }
      });
    });
  }

  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    const query = `
      query getCollections($cursor: String) {
        collections(first: 250, after: $cursor) {
          edges {
            node {
              id
              title
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    const response = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables: { cursor } }),
    });

    if (!response.ok) {
      return json({ error: `HTTP error! status: ${response.status}` });
    }

    const result = await response.json();
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return json({ error: "GraphQL query failed" }, { status: 500 });
    }

    const responseData = result.data?.collections;
    if (!responseData) {
      return json({ error: "No collections data returned from Shopify" });
    }

    allCollections = [
      ...allCollections,
      ...responseData.edges.map(edge => ({
        ...edge.node,
        id: edge.node.id.split("/").pop(),
      })),
    ];
    hasNextPage = responseData.pageInfo.hasNextPage;
    cursor = responseData.pageInfo.endCursor;
  }

  return json({ allProducts, allCollections, allVendors, allTags });
}

export async function action({ request }) {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "create") {
    const productIds = formData.getAll("productId");
    const collectionIds = formData.getAll("collectionId");
    const vendorNames = formData.getAll("vendorName");
    const tagNames = formData.getAll("tagName");
    const productExcluded = formData.getAll("productExcluded").map((val) => val === "true");
    const productNotificationsEnabled = formData.getAll("productNotificationsEnabled").map((val) => val === "true");
    const productTitles = formData.getAll("productTitle");
    const collectionExcluded = formData.getAll("collectionExcluded").map((val) => val === "true");
    const collectionNotificationsEnabled = formData.getAll("collectionNotificationsEnabled").map((val) => val === "true");
    const collectionTitles = formData.getAll("collectionTitle");
    const vendorExcluded = formData.getAll("vendorExcluded").map((val) => val === "true");
    const vendorNotificationsEnabled = formData.getAll("vendorNotificationsEnabled").map((val) => val === "true");
    const tagExcluded = formData.getAll("tagExcluded").map((val) => val === "true");
    const tagNotificationsEnabled = formData.getAll("tagNotificationsEnabled").map((val) => val === "true");
    const country = formData.get("country");
    const deliveryTime = formData.get("deliveryTime") || null;
    const message = formData.get("message") || null;
    const eventName = formData.get("eventName") || null;
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const shippingMethod = formData.get("shippingMethod");
    const pickupAvailable = formData.get("pickupAvailable") === "true";
    const localDelivery = formData.get("localDelivery")?.replace(/^"|"$/g, "") || null;
    const zipCodes = formData.get("zipCodes") || "";
    const zipCodeType = formData.get("zipCodeType") || "inclusive";


    // ✅ Log all parsed form data before DB operations
    console.log("🔍 Parsed form data:");
    console.table([
      { key: "country", value: country },
      { key: "deliveryTime", value: deliveryTime },
      { key: "message", value: message },
      { key: "eventName", value: eventName },
      { key: "startDate", value: startDate },
      { key: "endDate", value: endDate },
      { key: "shippingMethod", value: shippingMethod },
      { key: "pickupAvailable", value: pickupAvailable },
      { key: "localDelivery", value: localDelivery },
      { key: "zipCodes", value: zipCodes },
      { key: "zipCodeType", value: zipCodeType },
    ]);

    console.log("📦 productIds:", productIds);
    console.log("📦 collectionIds:", collectionIds);
    console.log("📦 vendorNames:", vendorNames);
    console.log("📦 tagNames:", tagNames);

    console.log("🚫 productExcluded:", productExcluded);
    console.log("🔔 productNotificationsEnabled:", productNotificationsEnabled);
    console.log("🚫 collectionExcluded:", collectionExcluded);
    console.log("🔔 collectionNotificationsEnabled:", collectionNotificationsEnabled);
    console.log("🚫 vendorExcluded:", vendorExcluded);

    if (!country) {
      return json({ error: "Country selection is required" }, { status: 400 });
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return json({ error: "Start date cannot be after end date" }, { status: 400 });
    }
    if (!productIds.length && !collectionIds.length && !vendorNames.length && !tagNames.length) {
      return json({ error: "At least one resource is required" }, { status: 400 });
    }
    if (endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      if (end < today) {
        return json({ error: "End date cannot be in the past" }, { status: 400 });
      }
    }
    if (deliveryTime && deliveryTime.length < 3) {
      return json({ error: "Delivery time must be descriptive (e.g., 1-2 days)" }, { status: 400 });
    }
    if (zipCodes && zipCodes.trim() !== "") {
      const zipCodeArray = zipCodes.split(",").map((z) => z.trim());
      const invalidZipCodes = zipCodeArray.filter(
        (zip) => !/^\d+(-\d+)?$/.test(zip) && !/^\d+\*$/.test(zip)
      );
      if (invalidZipCodes.length > 0) {
        return json({ error: `Invalid zip code format: ${invalidZipCodes.join(", ")}` }, { status: 400 });
      }
    }

    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
      const result = await prisma.$transaction(async (tx) => {
        let existingRule = await tx.rule.findFirst({
          where: {
            shop,
            country,
            OR: [
              { productRules: { some: { productId: { in: productIds } } } },
              { collectionRules: { some: { collectionId: { in: collectionIds } } } },
              { VendorRules: { some: { vendorName: { in: vendorNames } } } },
              { TagRules: { some: { tagName: { in: tagNames } } } },
            ],
          },
          include: { productRules: true, collectionRules: true, VendorRules: true, TagRules: true },
        });

        if (!existingRule) {
          const conflictingRules = await tx.rule.findMany({
            where: {
              shop,
              country,
              OR: [
                { zipCodes: zipCodes.trim() || null, zipCodeType },
                ...(zipCodes.trim() === "" ? [] : [{ zipCodes: null }]),
              ],
            },
            include: {
              productRules: { where: { productId: { in: productIds } } },
              collectionRules: { where: { collectionId: { in: collectionIds } } },
              VendorRules: { where: { vendorName: { in: vendorNames } } },
              TagRules: { where: { tagName: { in: tagNames } } },
            },
          });

          const relevantConflicts = conflictingRules.filter(
            (rule) =>
              rule.productRules.length > 0 ||
              rule.collectionRules.length > 0 ||
              rule.VendorRules.length > 0 ||
              rule.TagRules.length > 0
          );

          if (relevantConflicts.length > 0) {
            return json({ error: "Conflicting rules found. Please delete existing rules first." });
          }
        }

        let ruleId;
        let previouslyExcludedProducts = [];
        if (existingRule) {
          ruleId = existingRule.id;
          previouslyExcludedProducts = existingRule.productRules
            .filter((pr) => pr.excluded)
            .map((pr) => pr.productId);
          await tx.rule.update({
            where: { id: ruleId },
            data: {
              deliveryTime,
              shippingMethod,
              message,
              eventName,
              startDate: startDate ? new Date(startDate) : null,
              endDate: endDate ? new Date(endDate) : null,
              pickupAvailable,
              localDelivery,
              zipCodes: zipCodes.trim() || null,
              zipCodeType,
            },
          });
        } else {
          const newRule = await tx.rule.create({
            data: {
              shop,
              country,
              deliveryTime,
              shippingMethod,
              message,
              eventName,
              startDate: startDate ? new Date(startDate) : null,
              endDate: endDate ? new Date(endDate) : null,
              pickupAvailable,
              localDelivery,
              zipCodes: zipCodes.trim() || null,
              zipCodeType,
            },
          });
          ruleId = newRule.id;
        }

        let createdCount = 0;
        const updatedProductIds = [];
        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i];
          const excluded = productExcluded[i] || false;
          const notificationsEnabled = productNotificationsEnabled[i] || false;
          const productTitle = productTitles[i];

          await tx.product.upsert({
            where: { id: productId },
            update: { shop, title: productTitle },
            create: { id: productId, shop, title: productTitle },
          });

          await tx.productRule.upsert({
            where: { ruleId_productId: { ruleId, productId } },
            update: { excluded, notificationsEnabled },
            create: { ruleId, productId, excluded, notificationsEnabled },
          });
          updatedProductIds.push({ productId, excluded, notificationsEnabled });
          createdCount++;
        }

        for (let i = 0; i < collectionIds.length; i++) {
          const collectionId = collectionIds[i];
          const excluded = collectionExcluded[i] || false;
          const notificationsEnabled = collectionNotificationsEnabled[i] || false;
          const collectionTitle = collectionTitles[i];

          await tx.collection.upsert({
            where: { id: collectionId },
            update: { shop, title: collectionTitle },
            create: { id: collectionId, shop, title: collectionTitle },
          });

          await tx.collectionRule.upsert({
            where: { ruleId_collectionId: { ruleId, collectionId } },
            update: { excluded, notificationsEnabled },
            create: { ruleId, collectionId, excluded, notificationsEnabled },
          });
          createdCount++;
        }

        for (let i = 0; i < vendorNames.length; i++) {
          const vendorName = vendorNames[i];
          const excluded = vendorExcluded[i] || false;
          const notificationsEnabled = vendorNotificationsEnabled[i] || false;

          await tx.vendor.upsert({
            where: { name: vendorName },
            update: { shop },
            create: { name: vendorName, shop },
          });

          await tx.vendorRule.upsert({
            where: { ruleId_vendorName: { ruleId, vendorName } },
            update: { excluded, notificationsEnabled },
            create: { ruleId, vendorName, excluded, notificationsEnabled },
          });
          createdCount++;
        }

        for (let i = 0; i < tagNames.length; i++) {
          const tagName = tagNames[i];
          const excluded = tagExcluded[i] || false;
          const notificationsEnabled = tagNotificationsEnabled[i] || false;

          await tx.tag.upsert({
            where: { name: tagName },
            update: { shop },
            create: { name: tagName, shop },
          });

          await tx.tagRule.upsert({
            where: { ruleId_tagName: { ruleId, tagName } },
            update: { excluded, notificationsEnabled },
            create: { ruleId, tagName, excluded, notificationsEnabled },
          });
          createdCount++;
        }

        console.log("✅ transaction finished – ruleId:", ruleId, "createdCount:", createdCount);
        
        return {
          success: true,
          createdCount,
          ruleId,
          previouslyExcludedProducts,
          updatedProductIds,
        };
      });

      if (result.previouslyExcludedProducts.length > 0) {
        const newlyIncluded = result.updatedProductIds
          .filter(
            (upd) =>
              !upd.excluded &&
              result.previouslyExcludedProducts.includes(upd.productId) &&
              upd.notificationsEnabled
          )
          .map((upd) => upd.productId);
        if (newlyIncluded.length > 0) {
          console.log("Triggering notifications for newly included products:", newlyIncluded);
          await checkAndSendNotifications({ productIds: newlyIncluded, country });
        }
      }

      return json(result);
    } catch (error) {
      console.error("Error creating rules:", error);
      if (error.message.includes("Conflicting rules found")) {
        return json({ error: error.message }, { status: 400 });
      }
      return json({ error: `Failed to save rules: ${error.message}` }, { status: 500 });
    }
  }

  if (actionType === "search") {
    const searchType = formData.get("searchType");
    const searchQuery = formData.get("searchQuery")?.trim();
    const { session } = await authenticate.admin(request);
    const { shop, accessToken } = session;

    if (!searchQuery) {
      return json({ items: [], error: `Please enter a ${searchType} name to search` }, { status: 400 });
    }

    let query = "";
    let queryString = `*${searchQuery}*`;

    if (searchType === "vendor") {
      query = `
        query getProductsByVendor($query: String) {
          products(first: 250, query: $query) {
            edges {
              node {
                id
                title
                vendor
              }
            }
          }
        }
      `;
      queryString = `vendor:${queryString}`;
    } else if (searchType === "tag") {
      query = `
        query getProductsByTag($query: String) {
          products(first: 250, query: $query) {
            edges {
              node {
                id
                title
                tags
              }
            }
          }
        }
      `;
      queryString = `tag:${queryString}`;
    } else {
      return json({ items: [], error: "Invalid search type" }, { status: 400 });
    }

    const response = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables: { query: queryString } }),
    });

    if (!response.ok) {
      return json({ items: [], error: `Failed to fetch: ${response.statusText}` }, { status: response.status });
    }

    const result = await response.json();
    if (result.errors) {
      return json({ items: [], error: `GraphQL error: ${result.errors[0]?.message || "Unknown error"}` }, { status: 500 });
    }

    let items = [];
    if (searchType === "vendor") {
      const products = result.data?.products?.edges || [];
      items = [...new Set(products.map(edge => edge.node.vendor))]
        .map(name => ({ name }))
        .filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
    } else if (searchType === "tag") {
      const products = result.data?.products?.edges || [];
      items = [...new Set(products.flatMap(edge => edge.node.tags))]
        .map(name => ({ name }))
        .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (items.length === 0) {
      return json({ items: [], error: `No ${searchType}s found for "${searchQuery}"` });
    }

    return json({ items, type: searchType + "s" });
  }

  if (actionType === "notify") {
    const email = formData.get("email");
    const productId = formData.get("productId");
    const collectionId = formData.get("collectionId");
    const vendorName = formData.get("vendorName");
    const tagName = formData.get("tagName");
    const country = formData.get("country");

    const rule = await prisma.rule.findFirst({
      where: {
        OR: [
          productId ? { productRules: { some: { productId, notificationsEnabled: true } } } : {},
          collectionId ? { collectionRules: { some: { collectionId, notificationsEnabled: true } } } : {},
          vendorName ? { VendorRules: { some: { vendorName, notificationsEnabled: true } } } : {},
          tagName ? { TagRules: { some: { tagName, notificationsEnabled: true } } } : {},
        ],
        country: { equals: country, mode: "insensitive" },
      },
    });

    try {
      await prisma.notificationSignup.create({
        data: { email, productId, collectionId, vendorName, tagName, country },
      });
      return json({ success: true, message: "You'll be notified when available!" });
    } catch (error) {
      console.error("Error saving notification:", error);
      return json({ error: `Failed to save notification: ${error.message}` }, { status: 500 });
    }
  }

  return json({ success: true });
}


export default function CreateRule() {
  const app = useAppBridge();
  const fetcher = useFetcher();
  const navigation = useNavigation();
  // new work
  const navigate = useNavigate(); 
  // ****
  const [resourceType, setResourceType] = useState("product");
  const [searchQuery, setSearchQuery] = useState("");
  const [country, setCountry] = useState("");
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [shipping, setShipping] = useState("express");
  const [message, setMessage] = useState("");
  const [pickupAvailable, setPickupAvailable] = useState(false);
  const [localDelivery, setLocalDelivery] = useState("");
  const [zipCodes, setZipCodes] = useState("");
  const [zipCodeType, setZipCodeType] = useState("inclusive");
  const [offerState, setOfferState] = useState({
    selectedProducts: [],
    selectedCollections: [],
    selectedVendors: [],
    selectedTags: [],
  });
  const [excludedItems, setExcludedItems] = useState({
    products: [], collections: [], vendors: [], tags: [],
  });
  const [notifications, setNotifications] = useState({
    products: {}, collections: {}, vendors: {}, tags: {},
  });
  const [errors, setErrors] = useState({
    country: "", startDate: "", endDate: "", deliveryTime: "", resources: "", zipCodes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {
      country: "", startDate: "", endDate: "", deliveryTime: "", resources: "", zipCodes: "",
    };
    let isValid = true;

    if (!country) {
      newErrors.country = "Country selection is required";
      isValid = false;
    }
    if (!startDate) {
      newErrors.startDate = "Start date is required";
      isValid = false;
    }
    if (!endDate) {
      newErrors.endDate = "End date is required";
      isValid = false;
    } else if (startDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = "End date must be after start date";
      isValid = false;
    } else if (new Date(endDate) < new Date().setHours(0, 0, 0, 0)) {
      newErrors.endDate = "End date cannot be in the past";
      isValid = false;
    }
    if (!deliveryTime) {
      newErrors.deliveryTime = "Delivery time is required";
      isValid = false;
    } else if (deliveryTime.length < 3) {
      newErrors.deliveryTime = "Enter a descriptive time (e.g., 1-2 days)";
      isValid = false;
    }
    if (
      offerState.selectedProducts.length === 0 &&
      offerState.selectedCollections.length === 0 &&
      offerState.selectedVendors.length === 0 &&
      offerState.selectedTags.length === 0
    ) {
      newErrors.resources = "Please select at least one resource";
      isValid = false;
    }
    if (zipCodes && zipCodes.trim() !== "") {
      const zipCodeArray = zipCodes.split(',').map(z => z.trim());
      const invalidZipCodes = zipCodeArray.filter(zip => !/^\d+(-\d+)?$/.test(zip) && !/^\d+\*$/.test(zip));
      if (invalidZipCodes.length > 0) {
        newErrors.zipCodes = `Invalid zip code format: ${invalidZipCodes.join(', ')}`;
        isValid = false;
      }
    }
    setErrors(newErrors);
    return isValid;
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setIsSubmitting(true);
  //   if (!validateForm()) {
  //     setIsSubmitting(false);
  //     return;
  //   }
  //   if (navigation.state === "submitting") return;

  //   const formData = new FormData();
  //   formData.append("actionType", "create");
  //   formData.append("country", country);
  //   formData.append("deliveryTime", deliveryTime);
  //   formData.append("shippingMethod", shipping);
  //   formData.append("message", message);
  //   formData.append("eventName", eventName);
  //   formData.append("startDate", startDate);
  //   formData.append("endDate", endDate);
  //   formData.append("pickupAvailable", pickupAvailable.toString());
  //   formData.append("localDelivery", localDelivery);
  //   formData.append("zipCodes", zipCodes);
  //   formData.append("zipCodeType", zipCodeType);

  //   offerState.selectedProducts.forEach((product) => {
  //     formData.append("productId", product.id);
  //     formData.append("productExcluded", excludedItems.products.includes(product.id) ? "true" : "false");
  //     formData.append("productNotificationsEnabled", notifications.products[product.id] ? "true" : "false");
  //     formData.append("productTitle", product.title);
  //   });
  //   offerState.selectedCollections.forEach((collection) => {
  //     formData.append("collectionId", collection.id);
  //     formData.append("collectionExcluded", excludedItems.collections.includes(collection.id) ? "true" : "false");
  //     formData.append("collectionNotificationsEnabled", notifications.collections[collection.id] ? "true" : "false");
  //     formData.append("collectionTitle", collection.title);
  //   });
  //   offerState.selectedVendors.forEach(vendor => {
  //     formData.append("vendorName", vendor.name);
  //     formData.append("vendorExcluded", excludedItems.vendors.includes(vendor.name) ? "true" : "false");
  //     formData.append("vendorNotificationsEnabled", notifications.vendors[vendor.name] ? "true" : "false");
  //   });

  //   offerState.selectedTags.forEach(tag => {
  //     formData.append("tagName", tag.name);
  //     formData.append("tagExcluded", excludedItems.tags.includes(tag.name) ? "true" : "false");
  //     formData.append("tagNotificationsEnabled", notifications.tags[tag.name] ? "true" : "false");
  //   });


  //   fetcher.submit(formData, { method: "POST", encType: "multipart/form-data" });
  //  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }
    if (navigation.state === "submitting") return;

    const formData = new FormData();
    formData.append("actionType", "create");
    formData.append("country", country);
    formData.append("deliveryTime", deliveryTime);
    formData.append("shippingMethod", shipping);
    formData.append("message", message);
    formData.append("eventName", eventName);
    formData.append("startDate", startDate);
    formData.append("endDate", endDate);
    formData.append("pickupAvailable", pickupAvailable.toString());
    formData.append("localDelivery", localDelivery);
    formData.append("zipCodes", zipCodes);
    formData.append("zipCodeType", zipCodeType);

    offerState.selectedProducts.forEach((product) => {
      formData.append("productId", product.id);
      formData.append("productExcluded", excludedItems.products.includes(product.id) ? "true" : "false");
      formData.append("productNotificationsEnabled", notifications.products[product.id] ? "true" : "false");
      formData.append("productTitle", product.title);
    });

    offerState.selectedCollections.forEach((collection) => {
      formData.append("collectionId", collection.id);
      formData.append("collectionExcluded", excludedItems.collections.includes(collection.id) ? "true" : "false");
      formData.append("collectionNotificationsEnabled", notifications.collections[collection.id] ? "true" : "false");
      formData.append("collectionTitle", collection.title);
    });

    offerState.selectedVendors.forEach((vendor) => {
      formData.append("vendorName", vendor.name);
      formData.append("vendorExcluded", excludedItems.vendors.includes(vendor.name) ? "true" : "false");
      formData.append("vendorNotificationsEnabled", notifications.vendors[vendor.name] ? "true" : "false");
    });

    offerState.selectedTags.forEach((tag) => {
      formData.append("tagName", tag.name);
      formData.append("tagExcluded", excludedItems.tags.includes(tag.name) ? "true" : "false");
      formData.append("tagNotificationsEnabled", notifications.tags[tag.name] ? "true" : "false");
    });

    // ✅ Debugging logs
    console.log("📦 FormData being submitted:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    console.log("🧾 Final offerState:", offerState);
    console.log("🧾 Excluded items:", excludedItems);
    console.log("🧾 Notifications:", notifications);

    fetcher.submit(formData, { method: "POST", encType: "multipart/form-data" });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      setOfferState({ selectedProducts: [], selectedCollections: [], selectedVendors: [], selectedTags: [] });
      setExcludedItems({ products: [], collections: [], vendors: [], tags: [] });
      setNotifications({ products: {}, collections: {}, vendors: {}, tags: {} });
      setCountry("");
      setDeliveryTime("");
      setMessage("");
      setStartDate("");
      setEndDate("");
      setEventName("");
      setShipping("express");
      setZipCodes("");
      setZipCodeType("inclusive");
      setResourceType("product");
      setSearchQuery("");
      // new work
      navigate("/product"); 
      //***
    }
  }, [fetcher.data , navigate]);


  const shippingMethods = [
    { label: "Express", value: "express" },
    { label: "Standard", value: "standard" },
  ];

  const resourceTypes = [
    { label: "Products", value: "product" },
    { label: "Collections", value: "collection" },
    { label: "Vendors", value: "vendor" },
    { label: "Tags", value: "tag" },
  ];

  async function resourcePicker() {
    try {
      if (resourceType === "vendor" || resourceType === "tag") {
        if (!searchQuery) {
          setErrors((prev) => ({ ...prev, resources: "Please enter a search query for vendors or tags" }));
          return;
        }
        const formData = new FormData();
        formData.append("actionType", "search");
        formData.append("searchType", resourceType);
        formData.append("searchQuery", searchQuery);
        fetcher.submit(formData, { method: "POST" });
      } else {
        const pickerOptions = {
          type: resourceType,
          action: "select",
          multiple: true,
          showVariants: resourceType === "product" ? false : undefined,
        };
        const selectedItems = await window.shopify.resourcePicker(pickerOptions);
        if (selectedItems) {
          let newItems;
          if (resourceType === "product") {
            newItems = selectedItems.map((item) => ({
              id: item.id.split("/").pop(),
              title: item.title,
            }));
            setOfferState((prev) => ({
              ...prev,
              selectedProducts: [...prev.selectedProducts, ...newItems].filter(
                (item, index, self) => index === self.findIndex((i) => i.id === item.id)
              ),
            }));
            setNotifications((prev) => {
              const updated = { ...prev.products };
              newItems.forEach((item) => {
                if (!(item.id in updated)) updated[item.id] = true;
              });
              return { ...prev, products: updated };
            });
          } else if (resourceType === "collection") {
            newItems = selectedItems.map((item) => ({
              id: item.id.split("/").pop(),
              title: item.title,
            }));
            setOfferState((prev) => ({
              ...prev,
              selectedCollections: [...prev.selectedCollections, ...newItems].filter(
                (item, index, self) => index === self.findIndex((i) => i.id === item.id)
              ),
            }));
            setNotifications((prev) => {
              const updated = { ...prev.collections };
              newItems.forEach((item) => {
                if (!(item.id in updated)) updated[item.id] = true;
              });
              return { ...prev, collections: updated };
            });
          }
        }
      }
    } catch (error) {
      console.error("Error in resource picker:", error);
      setErrors((prev) => ({ ...prev, resources: "Error selecting resources" }));
    }
  }

  const toggleExcludeItem = useCallback((type, id) => {
    setExcludedItems((prev) => ({
      ...prev,
      [type]: prev[type].includes(id)
        ? prev[type].filter((itemId) => itemId !== id)
        : [...prev[type], id],
    }));
  }, []);

  const toggleNotification = useCallback((type, id) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [id]: !prev[type][id],
      },
    }));
  }, []);

  const removeItem = useCallback((type, id) => {
    setOfferState((prev) => ({
      ...prev,
      [`selected${type.charAt(0).toUpperCase() + type.slice(1)}s`]: prev[
        `selected${type.charAt(0).toUpperCase() + type.slice(1)}s`
      ].filter((item) => item.id !== id && item.name !== id),
    }));
    setExcludedItems((prev) => ({
      ...prev,
      [type]: prev[type].filter((itemId) => itemId !== id),
    }));
    setNotifications((prev) => {
      const updated = { ...prev[type] };
      delete updated[id];
      return { ...prev, [type]: updated };
    });
  }, []);

  return (
    <Page title="Create Shipping Rule">
      <Layout>
        <Layout.Section>
          <Card title="Shipping Rule Details" sectioned>
            <FormLayout>
              <Card sectioned>
                <Text variant="headingSm" as="h3" fontWeight="bold">
                  Resource Selection
                </Text>
                <Box style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <Select
                    label="Select Resource Type"
                    options={resourceTypes}
                    value={resourceType}
                    onChange={(value) => {
                      setResourceType(value);
                      setSearchQuery("");
                      setErrors((prev) => ({ ...prev, resources: "" }));
                    }}
                  />
                  {(resourceType === "vendor" || resourceType === "tag") && (
                    <TextField
                      label={`Search ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`}
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder={`Enter ${resourceType} name (e.g., Nike, Sale)`}
                      autoComplete="off"
                    />
                  )}
                  <Button
                    onClick={resourcePicker}
                    primary
                    disabled={fetcher.state === "submitting" || (resourceType === "vendor" || resourceType === "tag") && !searchQuery}
                    loading={fetcher.state === "submitting"}
                  >
                    {resourceType === "vendor" || resourceType === "tag"
                      ? `Search ${resourceTypes.find((rt) => rt.value === resourceType)?.label}`
                      : `Select ${resourceTypes.find((rt) => rt.value === resourceType)?.label}`}
                  </Button>
                  {errors.resources && <Text tone="critical">{errors.resources}</Text>}
                  {fetcher.data?.items?.length > 0 && (fetcher.data.type === "vendors" || fetcher.data.type === "tags") && (
                    <Card sectioned>
                      <Text variant="headingXs" as="h4" fontWeight="semibold">
                        {fetcher.data.type === "vendors" ? "Vendors" : "Tags"} Found
                      </Text>
                      <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {fetcher.data.items.map((item) => (
                          <Box
                            key={item.name}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px",
                              backgroundColor: "var(--p-surface)",
                              borderRadius: "4px",
                            }}
                          >
                            <Text variant="bodyMd" fontWeight="medium">{item.name}</Text>
                            <Button
                              onClick={() => {
                                const typeKey = fetcher.data.type;
                                setOfferState((prev) => ({
                                  ...prev,
                                  [`selected${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)}`]: [
                                    ...prev[`selected${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)}`],
                                    { name: item.name, id: item.name },
                                  ].filter(
                                    (i, index, self) => index === self.findIndex((s) => s.name === i.name)
                                  ),
                                }));
                                setNotifications((prev) => ({
                                  ...prev,
                                  [typeKey]: {
                                    ...prev[typeKey],
                                    [item.name]: true,
                                  },
                                }));
                              }}
                              disabled={offerState[
                                `selected${fetcher.data.type.charAt(0).toUpperCase() + fetcher.data.type.slice(1)}`
                              ].some((i) => i.name === item.name)}
                            >
                              Add
                            </Button>
                          </Box>
                        ))}
                      </Box>
                    </Card>
                  )}
                  {fetcher.data?.error && <Text tone="critical">{fetcher.data.error}</Text>}
                </Box>
              </Card>

              {/* Selected Products */}
              {offerState.selectedProducts.length > 0 && (
                <Card sectioned>
                  <Text variant="headingXs" as="h4" fontWeight="semibold">Selected Products</Text>
                  <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {offerState.selectedProducts.map((product) => (
                      <Box
                        key={product.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "var(--p-surface)",
                          borderRadius: "4px",
                        }}
                      >
                        <Text variant="bodyMd" fontWeight="medium">{product.title}</Text>
                        <Box style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <Checkbox
                            label="Exclude"
                            checked={excludedItems.products.includes(product.id)}
                            onChange={() => toggleExcludeItem("products", product.id)}
                          />
                          <Checkbox
                            label="Notifications"
                            checked={notifications.products[product.id] || false}
                            onChange={() => toggleNotification("products", product.id)}
                          />
                          <Button
                            plain
                            onClick={() => removeItem("products", product.id)}
                            tone="critical"
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Card>
              )}

              {/* Selected Collections */}
              {offerState.selectedCollections.length > 0 && (
                <Card sectioned>
                  <Text variant="headingXs" as="h4" fontWeight="semibold">Selected Collections</Text>
                  <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {offerState.selectedCollections.map((collection) => (
                      <Box
                        key={collection.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "var(--p-surface)",
                          borderRadius: "4px",
                        }}
                      >
                        <Text variant="bodyMd" fontWeight="medium">{collection.title}</Text>
                        <Box style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <Checkbox
                            label="Exclude"
                            checked={excludedItems.collections.includes(collection.id)}
                            onChange={() => toggleExcludeItem("collections", collection.id)}
                          />
                          <Checkbox
                            label="Notifications"
                            checked={notifications.collections[collection.id] || false}
                            onChange={() => toggleNotification("collections", collection.id)}
                          />
                          <Button
                            plain
                            onClick={() => removeItem("collections", collection.id)}
                            tone="critical"
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Card>
              )}

              {/* Selected Vendors */}
              {offerState.selectedVendors.length > 0 && (
                <Card sectioned>
                  <Text variant="headingXs" as="h4" fontWeight="semibold">Selected Vendors</Text>
                  <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {offerState.selectedVendors.map((vendor) => (
                      <Box
                        key={vendor.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "var(--p-surface)",
                          borderRadius: "4px",
                        }}
                      >
                        <Text variant="bodyMd" fontWeight="medium">{vendor.name}</Text>
                        <Box style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <Checkbox
                            label="Exclude"
                            checked={excludedItems.vendors.includes(vendor.name)}
                            onChange={() => toggleExcludeItem("vendors", vendor.name)}
                          />
                          <Checkbox
                            label="Notifications"
                            checked={notifications.vendors[vendor.name] || false}
                            onChange={() => toggleNotification("vendors", vendor.name)}
                          />
                          <Button
                            plain
                            onClick={() => removeItem("vendors", vendor.name)}
                            tone="critical"
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Card>
              )}

              {/* Selected Tags */}
              {offerState.selectedTags.length > 0 && (
                <Card sectioned>
                  <Text variant="headingXs" as="h4" fontWeight="semibold">Selected Tags</Text>
                  <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {offerState.selectedTags.map((tag) => (
                      <Box
                        key={tag.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "var(--p-surface)",
                          borderRadius: "4px",
                        }}
                      >
                        <Text variant="bodyMd" fontWeight="medium">{tag.name}</Text>
                        <Box style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <Checkbox
                            label="Exclude"
                            checked={excludedItems.tags.includes(tag.name)}
                            onChange={() => toggleExcludeItem("tags", tag.name)}
                          />
                          <Checkbox
                            label="Notifications"
                            checked={notifications.tags[tag.name] || false}
                            onChange={() => toggleNotification("tags", tag.name)}
                          />
                          <Button
                            plain
                            onClick={() => removeItem("tags", tag.name)}
                            tone="critical"
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Card>
              )}

              {/* Rule Configuration */}
              <Card sectioned>
                <Text variant="headingSm" as="h3" fontWeight="bold">Rule Configuration</Text>
                <FormLayout>
                  <Box style={{ display: "flex", gap: "16px" }}>
                    <Box style={{ flex: 1 }}>
                      <TextField
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={setStartDate}
                        error={errors.startDate}
                        required
                      />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <TextField
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={setEndDate}
                        error={errors.endDate}
                        required
                      />
                    </Box>
                  </Box>
                  <Box paddingBlockEnd="400">
                    <CountrySelector
                      selectedCountry={country}
                      setSelectedCountry={(value) => {
                        setCountry(value);
                        if (errors.country) setErrors((prev) => ({ ...prev, country: "" }));
                      }}
                    />
                    {errors.country && (
                      <Box paddingBlockStart="100">
                        <Text tone="critical">{errors.country}</Text>
                      </Box>
                    )}
                  </Box>
                  <TextField
                    label="Zip Codes (Optional)"
                    value={zipCodes}
                    onChange={(value) => {
                      setZipCodes(value);
                      if (errors.zipCodes) setErrors((prev) => ({ ...prev, zipCodes: "" }));
                    }}
                    placeholder="10001, 10002, 10005-10010, 1002*"
                    helpText="Leave empty for entire country. Enter comma-separated zip codes, ranges, or wildcards"
                    multiline={3}
                    error={errors.zipCodes}
                  />
                  {zipCodes && (
                    <ChoiceList
                      title="Zip Code Rule Type"
                      choices={[
                        { label: "Include only these zip codes", value: "inclusive" },
                        { label: "Exclude these zip codes", value: "exclusive" },
                      ]}
                      selected={zipCodeType}
                      onChange={(selected) => setZipCodeType(selected[0])}
                    />
                  )}
                  <Checkbox
                    label="Pickup Available"
                    checked={pickupAvailable}
                    onChange={(value) => setPickupAvailable(value)}
                  />
                  <TextField
                    label="Local Delivery Options (e.g., Same Day, Next Day)"
                    value={localDelivery}
                    onChange={setLocalDelivery}
                    placeholder="e.g., Same Day Delivery"
                  />
                  <TextField
                    label="Estimated Delivery Time"
                    value={deliveryTime}
                    onChange={setDeliveryTime}
                    error={errors.deliveryTime}
                    placeholder="e.g., 1-2 business days"
                    required
                  />
                  <Select
                    label="Shipping Method"
                    options={shippingMethods}
                    value={shipping}
                    onChange={setShipping}
                  />
                  <TextField
                    label="Event Name (Optional)"
                    value={eventName}
                    onChange={setEventName}
                    placeholder="e.g., Holiday Sale, Black Friday"
                  />
                  <TextField
                    label="Customer Message (Optional)"
                    value={message}
                    onChange={setMessage}
                    multiline={4}
                    placeholder="This message will be shown to customers during checkout"
                  />
                </FormLayout>
              </Card>

              <Box style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
                <Button
                  onClick={() => {
                    setCountry("");
                    setDeliveryTime("");
                    setMessage("");
                    setStartDate("");
                    setEndDate("");
                    setEventName("");
                    setShipping("express");
                    setOfferState({ selectedProducts: [], selectedCollections: [], selectedVendors: [], selectedTags: [] });
                    setExcludedItems({ products: [], collections: [], vendors: [], tags: [] });
                    setNotifications({ products: {}, collections: {}, vendors: {}, tags: {} });
                    setZipCodes("");
                    setZipCodeType("inclusive");
                    setResourceType("product");
                    setSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  primary
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Create Shipping Rule
                </Button>
              </Box>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}


