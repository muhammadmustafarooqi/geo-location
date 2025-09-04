import { json } from "@remix-run/node";
import db from "../db.server";

const validCountries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia",
  "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
  "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

function normalizeProductId(id) {
  if (!id) return null;
  try {
    return id.toString().replace("gid://shopify/Product/", "");
  } catch (error) {
    console.error("Error normalizing productId:", id, error);
    return null;
  }
}

function formatDateUTC(date) {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return null;
  }
}

export async function loader({ request }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const collectionId = url.searchParams.get("collectionId");
    const country = url.searchParams.get("country");

    if (country && !validCountries.includes(country)) {
      return json(
        { error: "Invalid country name", fallback: true },
        { status: 400, headers }
      );
    }

    if (!country && !productId && !collectionId) {
      return json(
        { error: "Country is required for this request", fallback: true },
        { status: 400, headers }
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const allRules = await db.rule.findMany({
      where: {
        OR: [
          { productId: productId || undefined },
          { collectionId: collectionId || undefined }
        ]
      },
      select: {
        productId: true,
        collectionId: true,
        country: true,
        available: true,
        deliveryTime: true,
        startDate: true,
        endDate: true,
      },
    });

    const countryRules = country
      ? allRules.filter(rule => 
          rule.country && rule.country.toLowerCase() === country.toLowerCase()
        )
      : allRules;

    if (countryRules.some(rule => rule.available === "notavailable")) {
      const notAvailableRule = countryRules.find(rule => rule.available === "notavailable");
      
      return json({
        available: false,
        country: country || "Unknown",
        productId: productId ? normalizeProductId(productId) : null,
        collectionId,
        fallback: false,
        message: country ? `This product is not available in ${country}` : "This product is not available",
        deliveryTime: notAvailableRule?.deliveryTime || null,
        availableFrom: notAvailableRule?.startDate ? formatDateUTC(notAvailableRule.startDate) : null,
        availableUntil: notAvailableRule?.endDate ? formatDateUTC(notAvailableRule.endDate) : null,
      }, { headers });
    }

    const availableRules = countryRules.filter(rule => 
      rule.available === "available" &&
      (!rule.startDate || new Date(rule.startDate) <= today) &&
      (!rule.endDate || new Date(rule.endDate) >= today)
    );

    if (availableRules.length > 0) {
      const availableRule = availableRules[0];
      return json({
        available: true,
        country: country || "Unknown",
        productId: productId ? normalizeProductId(productId) : null,
        collectionId,
        fallback: false,
        message: country ? `This product is available in ${country}` : "This product is available",
        deliveryTime: availableRule.deliveryTime || "Standard shipping",
        availableFrom: availableRule.startDate ? formatDateUTC(availableRule.startDate) : null,
        availableUntil: availableRule.endDate ? formatDateUTC(availableRule.endDate) : null,
      }, { headers });
    }

    return json({
      available: true,
      country: country || "Unknown",
      productId: productId ? normalizeProductId(productId) : null,
      collectionId,
      fallback: false,
      message: country ? `Available for delivery in ${country}` : "Available for delivery",
      deliveryTime: "Standard international shipping",
      availableFrom: null,
      availableUntil: null,
    }, { headers });

  } catch (error) {
    console.error("Loader error:", error);
    return json(
      {
        available: true,
        country: "United States",
        message: "This product is available (fallback)",
        deliveryTime: "3-5 business days",
        fallback: true
      },
      { status: 500, headers }
    );
  }
}