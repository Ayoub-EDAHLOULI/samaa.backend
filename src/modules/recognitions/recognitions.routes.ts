import { Router } from "express";
import { recognitionsController } from "./recognitions.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  optionalAuth,
} from "../../shared/middleware/auth.middleware";
import { uploadAudio } from "../../shared/middleware/multer";
import { recognitionValidation } from "./recognitions.validation";

const router = Router();

// POST /recognitions/identify - The core AI pipeline
router.post(
  "/identify",
  optionalAuth,
  uploadAudio.single("audioSnippet"),
  recognitionsController.identify,
);

// GET /recognitions/history - User's personal library
router.get(
  "/history",
  authenticate,
  validate(recognitionValidation.listQuery),
  recognitionsController.getHistory,
);

export default router;
