import { Router } from "express";
import { languageController } from "./languages.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import { languageValidation } from "./languages.validation";

const router = Router();

// Public routes
router.get("/", languageController.getAllLanguages);
router.get("/default", languageController.getDefaultLanguage);
router.get(
  "/:code",
  validate(languageValidation.params),
  languageController.getLanguageByCode,
);

// Admin only routes
router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  validate(languageValidation.create),
  languageController.createLanguage,
);

router.put(
  "/:code",
  authenticate,
  authorize(["ADMIN"]),
  validate(languageValidation.params),
  validate(languageValidation.update),
  languageController.updateLanguage,
);

router.delete(
  "/:code",
  authenticate,
  authorize(["ADMIN"]),
  validate(languageValidation.params),
  languageController.deleteLanguage,
);

export default router;
