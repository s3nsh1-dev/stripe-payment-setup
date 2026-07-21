import "server-only";
import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const requireAuth = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  return session;
};
const requireUnAuth = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
};

export { requireAuth, requireUnAuth };

/**
 * for sign-in and sign-out if session exit you will be redirected to dashboard
 * but if you want to protect a route individual use requireAuth
 * if you want the session but not auth check use requireUnAuth
 */
