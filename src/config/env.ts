import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((v) => parseInt(v, 10)).default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().optional(),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/circuitlab3d'),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  API_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
