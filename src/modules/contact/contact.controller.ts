import { Request, Response } from "express";
import { emailService } from "../../services/email/email.service";
import { ApiResponse } from "../../shared/utils/response";

export const contactController = {
  async submit(req: Request, res: Response) {
    try {
      const { name, email, subject, message } = req.body;

      const sent = await emailService.sendContactFormEmail({
        name,
        email,
        subject,
        message,
      });

      if (!sent) {
        return ApiResponse.error(
          res,
          "Email service is not configured. Please contact us directly.",
          503,
        );
      }

      return ApiResponse.success(res, null, "Message sent successfully");
    } catch {
      return ApiResponse.error(res, "Failed to send message", 500);
    }
  },
};
