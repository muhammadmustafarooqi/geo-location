import { json } from "@remix-run/node";


import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function action({ request }) {
  try {
    console.log("Received /api/send-email request at", new Date().toISOString());
    const body = await request.json();
    const { to, subject, html } = body;
    console.log("Request body:", { to, subject, html: html.substring(0, 100) + "..." });

    if (!to || !subject || !html) {
      console.error("Missing required fields:", { to, subject, html });
      return json({ error: "Missing to, subject, or html" }, { status: 400 });
    }

    console.log("Sending email via Resend to:", to);
   const info = await transporter.sendMail({
      from: `"Test Store 0012" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);

    if (response.error) {
      console.error("Resend API error:", response.error);
      return json({ error: `Resend API error: ${response.error.message || response.error}` }, { status: 500 });
    }

    console.log("Email sent successfully to:", to, "Email ID:", response.data?.id);
    return json({ success: true, id: response.data?.id }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/send-email:", error.message, error.stack);
    return json({ error: `Failed to send email: ${error.message}` }, { status: 500 });
  }
}