// import prisma from "../db.server";
// import { sendNotificationEmail } from "./email";

// const normalizeId = (id) => {
//   if (!id) return null;
//   return id.toString().replace("gid://shopify/Product/", "");
// };

// export async function checkAndSendNotifications({ productIds = [], country } = {}) {
//   try {
//     console.log("Starting notification check at", new Date().toISOString(), { productIds, country });

//     const whereClause = {};
//     if (country) {
//       whereClause.country = { equals: country, mode: "insensitive" };
//     }

//     const rules = await prisma.rule.findMany({
//       where: whereClause,
//       include: {
//         productRules: {
//           where: {
//             excluded: false,
//             notificationsEnabled: true, 
//             ...(productIds.length > 0 ? { productId: { in: productIds.map(normalizeId) } } : {}),
//           },
//           include: { product: true },
//         },
//         collectionRules: {
//           where: {
//             excluded: false,
//             notificationsEnabled: true, 
//           },
//         },
//       },
//     });
//     console.log("Found rules:", rules.length, JSON.stringify(rules, null, 2));

//     for (const rule of rules) {
//       console.log("Processing rule:", rule.id, "Country:", rule.country);

//       const subscribers = await prisma.notificationSignup.findMany({
//         where: {
//           country: { equals: rule.country, mode: "insensitive" },
//           notifiedAt: null,
//           ...(productIds.length > 0 ? { productId: { in: productIds.map(normalizeId) } } : {}),
//         },
//       });
//       console.log("Found subscribers for", rule.country, ":", subscribers.length, JSON.stringify(subscribers, null, 2));

//       for (const sub of subscribers) {
//         console.log("Checking subscriber:", sub.email, "Product ID:", sub.productId);
//         const product = rule.productRules.find(
//           (pr) => normalizeId(pr.productId) === normalizeId(sub.productId)
//         )?.product;

//         if (product) {
//           console.log("Found matching product:", product.title, "for subscriber:", sub.email);
//           let attempts = 0;
//           const maxAttempts = 3;
//           let success = false;

//           while (attempts < maxAttempts && !success) {
//             attempts++;
//             console.log(`Attempt ${attempts} to send notification to: ${sub.email}`);
//             success = await sendNotificationEmail(
//               sub.email,
//               product,
//               rule.country,
//               rule.deliveryTime
//             );
//             if (!success && attempts < maxAttempts) {
//               console.log(`Retrying in 1 second for: ${sub.email}`);
//               await new Promise((resolve) => setTimeout(resolve, 1000));
//             }
//           }

//           if (success) {
//             console.log("Notification sent successfully to:", sub.email, "Product:", product.title);
//             await prisma.notificationSignup.update({
//               where: { id: sub.id },
//               data: { notifiedAt: new Date() },
//             });
//             console.log("Updated signup with notifiedAt:", sub.id);
//           } else {
//             console.error("Failed to send notification to:", sub.email, "after", maxAttempts, "attempts");
//           }
//         } else {
//           console.log("No matching product found for:", sub.productId);
//         }
//       }
//     }
//     console.log("Notification check completed at", new Date().toISOString());
//   } catch (error) {
//     console.error("Notification error:", error.message, error.stack);
//   }
// }
