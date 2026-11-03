import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().default('mongodb://localhost:27017/khata_ai'),
  JWT_SECRET: z.string().default('khata_ai_super_secret_jwt_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FASTAPI_SERVICE_URL: z.string().default('http://localhost:8000'),
  GEMINI_API_KEY: z.string().optional().default('')
});

export const env = envSchema.parse(process.env);
