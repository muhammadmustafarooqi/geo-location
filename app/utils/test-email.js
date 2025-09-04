// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// async function main() {
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: Number(process.env.SMTP_PORT),
//     secure: process.env.SMTP_SECURE === "true",
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });

//   const info = await transporter.sendMail({
//     from: `"Test" <${process.env.SMTP_USER}>`,
//     to: "ahsansadaqat4123@gmail.com",
//     subject: "SMTP Test",
//     text: "SMTP is working",
//   });

//   console.log(" Sent:", info.messageId);
// }

// main().catch(console.error);
