import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

/**
 * Supported LLM providers.
 */
export const LLM_PROVIDERS = ["gemini", "openai"] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

const envSchema = z
  .object({
    PORT: z.string().default("4000"),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url().optional(),

    // LLM Configuration
    LLM_PROVIDER: z.enum(LLM_PROVIDERS).default("gemini"),
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
  })
  .refine(
    (data) => {
      // Ensure selected provider has its API key
      if (data.LLM_PROVIDER === "gemini" && !data.GEMINI_API_KEY) return false;
      if (data.LLM_PROVIDER === "openai" && !data.OPENAI_API_KEY) return false;
      return true;
    },
    {
      message:
        "Selected LLM_PROVIDER requires its API key (GEMINI_API_KEY or OPENAI_API_KEY)",
    },
  );

export const env = envSchema.parse(process.env);
