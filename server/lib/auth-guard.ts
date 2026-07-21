import "server-only";
import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const requireAuth = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return session;
};
const requireUnAuth = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }
  return session;
};

export { requireAuth, requireUnAuth };
