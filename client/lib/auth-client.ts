import { createAuthClient } from "better-auth/react";
import { envClient } from "../utils/envClient";

export const authClient = createAuthClient({
  baseURL: envClient.NEXT_PUBLIC_BASE_URL,
});

export const { signIn, signUp, useSession } = authClient;
