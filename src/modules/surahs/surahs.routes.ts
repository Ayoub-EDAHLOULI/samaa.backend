import { Router } from "express";
import { Role } from "@prisma/client";
import { surahController } from "./surahs.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import { surahValidation } from "./surahs.validation";

const router = Router();

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

// GET /surahs — full list of all 114 surahs
router.get("/", surahController.getAllSurahs);

// GET /surahs/:id — single surah by Quran number (1–114)
router.get(
  "/:id",
  validate(surahValidation.idParam),
  surahController.getSurahById,
);

// ---------------------------------------------------------------------------
// Admin-only routes
// ---------------------------------------------------------------------------

// PUT /surahs/:id — correct names or ayah count
router.put(
  "/:id",
  authenticate,
  authorize([Role.ADMIN]),
  validate(surahValidation.idParam),
  validate(surahValidation.update),
  surahController.updateSurah,
);

export default router;
