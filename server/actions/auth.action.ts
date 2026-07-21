"use server";
import { auth } from "@/server/lib/auth";

const signIn = async () => {
  await auth.api.signInEmail({
    body: {
      email: "user@email.com",
      password: "password",
    },
  });
};

export { signIn };
