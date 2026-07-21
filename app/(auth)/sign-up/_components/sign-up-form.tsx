"use client";
import { useSession } from "@/client/lib/auth-client";
import { authClient } from "@/client/lib/auth-client";
import { useState } from "react";
import { redirect } from "next/navigation";

const SignUpForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Get the current session (automatically updates when user logs in/out)
  const { data: session, isPending } = useSession();

  if (isPending) return <p>Loading...</p>;

  const redirectTo = () => {
    redirect("/sign-in");
  };

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await authClient.signUp.email({
      name,
      email,
      password,
      image:
        "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png", // Optional
      callbackURL: "/",
    });

    console.log(data, error);
  };
  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 backdrop-blur">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Create Account</h1>

              <p className="mt-2 text-zinc-400">
                Start building with your new account.
              </p>
            </div>

            <form className="space-y-5" onSubmit={signUpWithEmail}>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>

                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                className="w-full rounded-xl bg-indigo-600 py-3 font-medium hover:bg-indigo-500 transition"
                type="submit"
              >
                Create Account
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500">
              Already have an account?
              <button
                className="font-medium text-indigo-400 hover:text-indigo-300"
                onClick={redirectTo}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUpForm;
