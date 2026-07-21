import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
config({ path: envFile });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    `DATABASE_URL is required for Drizzle migrations. Checked ${envFile}`,
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./server/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
