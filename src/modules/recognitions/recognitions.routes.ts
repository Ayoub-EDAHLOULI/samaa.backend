import { Router } from "express";
import { Role } from "@prisma/client";
import { recognitionsController } from "./recognitions.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
  optionalAuth,
} from "../../shared/middleware/auth.middleware";
import { uploadAudio } from "../../shared/middleware/multer";
import { recognitionValidation } from "./recognitions.validation";

const router = Router();

// ---------------------------------------------------------------------------
// Core pipeline — public with optional auth (guest or authenticated user)
// ---------------------------------------------------------------------------

// POST /recognitions/identify
// optionalAuth: if logged in, the recognition is saved to their history
router.post(
  "/identify",
  optionalAuth,
  uploadAudio.single("audioSnippet"),
  recognitionsController.identify,
);

// ---------------------------------------------------------------------------
// Authenticated user routes
// ---------------------------------------------------------------------------

// GET /recognitions/history — user's personal discovery library
router.get(
  "/history",
  authenticate,
  validate(recognitionValidation.listQuery),
  recognitionsController.getHistory,
);

// DELETE /recognitions/:id — remove an entry from history
// User can only delete their own; admin can delete any (checked in service)
router.delete(
  "/:id",
  authenticate,
  validate(recognitionValidation.idParam),
  recognitionsController.deleteRecognition,
);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

// GET /recognitions — all recognitions across all users (with optional filters)
router.get(
  "/",
  authenticate,
  authorize([Role.ADMIN]),
  validate(recognitionValidation.adminListQuery),
  recognitionsController.getAllRecognitions,
);

export default router;
