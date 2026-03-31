import dotenv from "dotenv";
dotenv.config();

export const appConfig = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:5000",
};
