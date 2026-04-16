import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { passwordUtils } from "../../shared/utils/password";
import { jwtUtils } from "../../shared/utils/jwt";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { emailService } from "../../services/email/email.service";
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UpdateProfileDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./auth.types";

// Refresh token TTL must match JWT_REFRESH_EXPIRY (default 7d)
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authService = {
  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------
  async register(data: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError("Email already in use", StatusCodes.CONFLICT);
    }

    const passwordHash = await passwordUtils.hash(data.password);

    // Generate email verification token (raw sent by email, hashed stored in DB)
    const rawVerifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = hashToken(rawVerifyToken);

    const user = await prisma.user.create({
      data: {
        displayName: data.displayName,
        email: data.email,
        passwordHash,
        emailVerifyToken: hashedVerifyToken,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isEmailVerified: true,
      },
    });

    // Generate tokens and persist the refresh token
    const tokens = jwtUtils.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: hashToken(tokens.refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    // Non-blocking: send welcome + verification emails
    emailService
      .sendWelcomeEmail(user.email, user.displayName)
      .catch(() => {});
    emailService
      .sendEmailVerification(user.email, user.displayName, rawVerifyToken)
      .catch(() => {});

    return { user, tokens };
  },

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------
  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
    }

    const isPasswordValid = await passwordUtils.compare(
      data.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
    }

    const tokens = jwtUtils.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: hashToken(tokens.refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  },

  // ---------------------------------------------------------------------------
  // Refresh Token — verifies JWT + validates against DB, then rotates
  // ---------------------------------------------------------------------------
  async refreshToken(rawToken: string) {
    // 1. Verify JWT signature & expiry
    const decoded = jwtUtils.verifyRefreshToken(rawToken);

    // 2. Look up the hashed token in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { token: hashToken(rawToken) },
    });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new AppError(
        "Invalid or expired refresh token",
        StatusCodes.UNAUTHORIZED,
      );
    }

    // 3. Confirm user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError("User no longer exists", StatusCodes.UNAUTHORIZED);
    }

    // 4. Rotate — revoke old token, issue new pair
    const newTokens = jwtUtils.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          token: hashToken(newTokens.refreshToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    return newTokens;
  },

  // ---------------------------------------------------------------------------
  // Logout — revokes the refresh token in DB
  // ---------------------------------------------------------------------------
  async logout(rawToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: hashToken(rawToken) },
      data: { revokedAt: new Date() },
    });
  },

  // ---------------------------------------------------------------------------
  // Get Profile
  // ---------------------------------------------------------------------------
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    return user;
  },

  // ---------------------------------------------------------------------------
  // Change Password
  // ---------------------------------------------------------------------------
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    const isValid = await passwordUtils.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isValid) {
      throw new AppError(
        "Current password is incorrect",
        StatusCodes.BAD_REQUEST,
      );
    }

    const passwordHash = await passwordUtils.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  // ---------------------------------------------------------------------------
  // Update Profile
  // ---------------------------------------------------------------------------
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  },

  // ---------------------------------------------------------------------------
  // Forgot Password — generates reset token and sends email
  // ---------------------------------------------------------------------------
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Security: always return success — don't reveal whether email exists
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    try {
      await emailService.sendPasswordResetEmail(user.email, rawToken);
    } catch {
      // If email fails, clear the token so user can try again
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: null, passwordResetExpiry: null },
      });
      throw new AppError(
        "Error sending reset email. Please try again.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },

  // ---------------------------------------------------------------------------
  // Reset Password
  // ---------------------------------------------------------------------------
  async resetPassword(data: ResetPasswordDto): Promise<void> {
    const hashedToken = hashToken(data.token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError(
        "Token is invalid or has expired",
        StatusCodes.BAD_REQUEST,
      );
    }

    const passwordHash = await passwordUtils.hash(data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
  },

  // ---------------------------------------------------------------------------
  // Verify Email
  // ---------------------------------------------------------------------------
  async verifyEmail(data: VerifyEmailDto): Promise<void> {
    const hashedToken = hashToken(data.token);

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: hashedToken },
    });

    if (!user) {
      throw new AppError(
        "Verification token is invalid or has already been used",
        StatusCodes.BAD_REQUEST,
      );
    }

    if (user.isEmailVerified) {
      throw new AppError("Email is already verified", StatusCodes.BAD_REQUEST);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });
  },
};
