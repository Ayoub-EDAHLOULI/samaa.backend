import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";
import fs from "fs/promises";
import { EmailConfig, EmailOptions } from "./email.types";

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      from: {
        name: process.env.SMTP_FROM_NAME || "Samaa",
        email: process.env.SMTP_FROM_EMAIL || "noreply@samaa.app",
      },
    };

    this.initialize();
  }

  private async initialize() {
    try {
      if (!this.config.auth.user || !this.config.auth.pass) {
        console.warn(
          "[EmailService] SMTP credentials not set — email disabled.",
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });

      await this.transporter.verify();
      console.log("[EmailService] SMTP connection verified.");
    } catch (error) {
      console.error("[EmailService] SMTP initialization failed:", error);
      this.transporter = null;
    }
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "services",
      "email",
      "templates",
      `${templateName}.ejs`,
    );

    const template = await fs.readFile(templatePath, "utf-8");
    return ejs.render(template, context);
  }

  private async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn("[EmailService] Skipping email — transporter not ready.");
      return false;
    }

    try {
      const html = await this.renderTemplate(options.template, options.context);

      await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: Array.isArray(options.to)
          ? options.to.map((r) => r.email).join(", ")
          : options.to.email,
        subject: options.subject,
        html,
      });

      return true;
    } catch (error) {
      console.error("[EmailService] Failed to send email:", error);
      return false;
    }
  }

  // --- 1. Welcome (sent on register) ---
  async sendWelcomeEmail(email: string, displayName: string): Promise<boolean> {
    return this.send({
      to: { email, name: displayName },
      subject: "Welcome to Samaa — Discover the Voice of the Quran",
      template: "welcome",
      context: {
        displayName,
        APP_URL: process.env.FRONTEND_URL || "https://samaa.app",
        YEAR: new Date().getFullYear(),
      },
    });
  }

  // --- 2. Email Verification (sent on register) ---
  async sendEmailVerification(
    email: string,
    displayName: string,
    token: string,
  ): Promise<boolean> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    return this.send({
      to: { email, name: displayName },
      subject: "Verify your Samaa account",
      template: "account-verification",
      context: {
        displayName,
        VERIFY_URL: verifyUrl,
        YEAR: new Date().getFullYear(),
      },
    });
  }

  // --- 3. Contact Form (sends to notification email) ---
  async sendContactFormEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<boolean> {
    const notificationEmail =
      process.env.NOTIFICATION_EMAIL || this.config.from.email;

    return this.send({
      to: { email: notificationEmail },
      subject: `[Samaa Contact] ${data.subject} — ${data.name}`,
      template: "contact-form",
      context: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        YEAR: new Date().getFullYear(),
      },
    });
  }

  // --- 4. Password Reset ---
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.send({
      to: { email },
      subject: "Reset your Samaa password",
      template: "reset-password",
      context: {
        RESET_URL: resetUrl,
        YEAR: new Date().getFullYear(),
      },
    });
  }
}

export const emailService = new EmailService();
