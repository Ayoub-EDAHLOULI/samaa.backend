import { Router } from "express";
import { Role } from "@prisma/client";
import { userController } from "./users.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import { userValidation } from "./users.validation";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /users/me/stats — logged-in user's own Samaa stats
router.get("/me/stats", userController.getUserStats);

// Admin-only routes
router.get("/", authorize([Role.ADMIN]), userController.getAllUsers);

router.post(
  "/",
  authorize([Role.ADMIN]),
  validate(userValidation.create),
  userController.createUser,
);

router.get(
  "/:id",
  authorize([Role.ADMIN]),
  validate(userValidation.params),
  userController.getUserById,
);

router.put(
  "/:id",
  authorize([Role.ADMIN]),
  validate(userValidation.params),
  validate(userValidation.update),
  userController.updateUser,
);

router.delete(
  "/:id",
  authorize([Role.ADMIN]),
  validate(userValidation.params),
  userController.deleteUser,
);

export default router;
