import type { ReactNode } from "react";
import { requireAuth } from "@/server/lib/auth-guard";

const ProtectedLayout = async ({ children }: { children: ReactNode }) => {
  await requireAuth();
  return <>{children}</>;
};

export default ProtectedLayout;
