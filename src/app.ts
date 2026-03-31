// src/app.ts
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { errorMiddleware } from "./shared/middleware/error.middleware";
import { parseFormData } from "./shared/middleware/formdata-parser.middleware";

const app: Express = express();

// Trust Nginx (Required for secure cookies/headers behind a proxy on your server)
app.set("trust proxy", 1);

// CORS Configuration - Tailored for Next.js Web and Expo Mobile App
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Next.js Local
      "http://localhost:8081", // Expo Local
      // We will add production domains here later (e.g., "https://samaa.app")
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Helmet with custom configuration to allow cross-origin resources (important for audio/images)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// Rate Limiting - Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const authHeader = req.headers.authorization;
    return !!authHeader && authHeader.startsWith("Bearer ");
  },
});
app.use(globalLimiter);

// Rate Limiting - Auth (stricter, login/register only to prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === "/refresh-token";
  },
});
app.use("/api/v1/auth", authLimiter);

// Apply dynamic form-data parsing globally before routes hit validation
app.use(parseFormData);

// Health check (Useful for server monitoring/Docker)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files (Reciter Profile Images)
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    next();
  },
  express.static("public/uploads"),
);

// ==========================================
// API ROUTES
// ==========================================
// import authRoutes from "./modules/auth/auth.routes";
// import userRoutes from "./modules/users/users.routes";
// import reciterRoutes from "./modules/reciters/reciters.routes";
// import recognitionRoutes from "./modules/recognitions/recognitions.routes";

// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/users", userRoutes);
// app.use("/api/v1/reciters", reciterRoutes);
// app.use("/api/v1/recognitions", recognitionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found in Samaa API",
  });
});

// Global Error handling middleware (must be registered AFTER all routes)
app.use(errorMiddleware);

export default app;
