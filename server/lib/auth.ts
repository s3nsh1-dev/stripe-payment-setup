// better-auth server instance
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/config/db.connect";
import { envServer } from "@/server/utils/envServer";
import * as schema from "@/server/schema/index";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  baseURL: envServer.NEXT_PUBLIC_BASE_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: envServer.GITHUB_CLIENT_ID,
      clientSecret: envServer.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: envServer.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: envServer.GOOGLE_OAUTH_CLIENT_SECRET,
    },
  },
  emailVerification: {},
  // to set-cookies automatically this plugin needs to be at the bottom
  plugins: [nextCookies()], //
});
