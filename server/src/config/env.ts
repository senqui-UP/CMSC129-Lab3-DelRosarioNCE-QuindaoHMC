import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("5000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_BACKUP_URI: z.string().min(1, "MONGODB_BACKUP_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required for AI chatbot"),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
