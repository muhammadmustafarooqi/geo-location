

// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,   // e.g. smtp.gmail.com
//   port: process.env.SMTP_PORT,   // e.g. 465 or 587
//   secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
//   auth: {
//     user: process.env.SMTP_USER, 
//     pass: process.env.SMTP_PASS, 
//   },
// });

// export async function sendNotificationEmail(email, product, country, deliveryTime) {
//   try {
//    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
//       console.warn("Email service not configured - skipping notification");
//       return false;
//     }
//     const html = `
//       <h2>🎉 Your requested product is now available!</h2>
//       <p><strong>Product:</strong> ${product.title}</p>
//       <p><strong>Country:</strong> ${country}</p>
//       <p><strong>Estimated Delivery:</strong> ${deliveryTime}</p>
//       <p>Thank you for subscribing!</p>
//     `;

//     const info = await transporter.sendMail({
//       from: `"Test Store 0012" <${process.env.SMTP_USER}>`,
//       to: email,
//       subject: `🎉 ${product.title} is now available in ${country}!`,
//       html,
//     });

//     console.log("Email sent successfully:", info);
//     return true;
//   } catch (error) {
//     console.error("Error sending notification email:", error);
//     return false;
//   }
// }
