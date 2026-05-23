import { config } from 'dotenv';
import { join } from 'node:path';

if (!process.env['CI']) {
  config();
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const apiConfig = {
  host: process.env['HOST'] ?? 'localhost',
  port: process.env['PORT'] ? Number(process.env['PORT']) : 3333,
  geminiApiKey: requireEnv('GEMINI_API_KEY'),
  outputDir: join(process.cwd(), 'generated-images'),
  serviceName: process.env['SERVICE_NAME'] ?? 'pixelmind-api',
};
