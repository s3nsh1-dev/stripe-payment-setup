import "client-only";
import { z } from "zod";

const envClientSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  NEXT_PUBLIC_BASE_URL: z.string(),
});

const envClient = envClientSchema.parse({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
});

export { envClient };
