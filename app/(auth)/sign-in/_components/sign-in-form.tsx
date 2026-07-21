"use client";
import { useSession, signIn } from "@/client/lib/auth-client";
import { useState } from "react";
import { redirect } from "next/navigation";

const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Get the current session (automatically updates when user logs in/out)
  const { isPending } = useSession();

  // Function to handle GitHub Login
  const loginWithGithub = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: "/dashboard", // Where to redirect after login
    });
  };

  // Function to handle Google Login
  const loginWithGoogle = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  if (isPending) return <p>Loading...</p>;

  const redirectTo = () => {
    redirect("/sign-up");
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex min-h-screen">
          <div className="hidden lg:flex w-1/2 bg-linear-to-br from-zinc-900 via-zinc-950 to-black items-center justify-center p-16">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold tracking-tight">
                Welcome back.
              </h1>

              <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
                Sign in to continue managing your projects, deployments and
                account settings.
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
              <div className="mb-10">
                <h2 className="text-3xl font-bold">Sign in</h2>

                <p className="mt-2 text-zinc-400">
                  Enter your email to continue.
                </p>
              </div>

              <form className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email
                  </label>

                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-indigo-500"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Password
                  </label>

                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-indigo-500"
                    type="password"
                    placeholder="***********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  className="w-full rounded-xl bg-indigo-600 py-3 font-medium hover:bg-indigo-500 transition"
                  type="submit"
                >
                  Continue with Email
                </button>
              </form>

              <div className="my-8 flex items-center">
                <div className="h-px flex-1 bg-zinc-800"></div>

                <span className="mx-4 text-sm text-zinc-500">OR</span>

                <div className="h-px flex-1 bg-zinc-800"></div>
              </div>

              <div className="space-y-4">
                <button
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 py-3 hover:bg-zinc-800 transition"
                  onClick={loginWithGithub}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12 2a10 10 0 0 0-3.162 19.49c.5.09.683-.216.683-.482
                        0-.237-.009-.866-.014-1.699-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608
                        1.004.071 1.532 1.031 1.532 1.031.892 1.529 2.341
                        1.087 2.91.831.092-.647.35-1.087.636-1.337-2.221-.252-4.555-1.111-4.555-4.944
                        0-1.091.39-1.984 1.03-2.683-.104-.253-.447-1.27.098-2.646
                        0 0 .84-.269 2.75 1.025A9.565 9.565 0 0 1 12
                        6.844a9.56 9.56 0 0 1 2.504.337c1.909-1.294
                        2.748-1.025 2.748-1.025.546 1.376.203
                        2.393.1 2.646.64.699 1.028 1.592
                        1.028 2.683 0 3.842-2.337 4.689-4.566
                        4.937.359.309.679.92.679
                        1.855 0 1.338-.012 2.419-.012
                        2.748 0 .268.18.576.688.479A10.002
                        10.002 0 0 0 12 2Z"
                    />
                  </svg>
                  Continue with GitHub
                </button>

                <button
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 py-3 hover:bg-zinc-800 transition"
                  onClick={loginWithGoogle}
                >
                  <svg className="h-5 w-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.22 3.6l6.85-6.84C35.91 2.39 30.37 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.42 13.7 17.72 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.5 24.5c0-1.66-.15-3.25-.43-4.78H24v9.06h12.68c-.55 2.96-2.21 5.47-4.71 7.16l7.27 5.64c4.25-3.92 6.76-9.69 6.76-17.08z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.6.27-3.15.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.86.92 7.51 2.56 10.78l7.98-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.37 0 11.72-2.1 15.63-5.72l-7.27-5.64c-2.02 1.35-4.61 2.14-8.36 2.14-6.28 0-11.58-4.2-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-zinc-500">
                Do not have an account?
                <button
                  className="font-medium text-indigo-400 hover:text-indigo-300"
                  onClick={redirectTo}
                >
                  Create one
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignInForm;
