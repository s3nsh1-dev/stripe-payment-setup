"use client";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/client/lib/auth-client";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending, isRefetching, error } = useSession();

  if (!session) {
    return null;
  }
  if (isPending) {
    return <p>Wait till you page loads</p>;
  }
  if (isRefetching) {
    return <p>Wait till refetching the user info</p>;
  }
  if (error) {
    return <p>There was error getting you session</p>;
  }
  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        cache: "no-store",
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl">
          {/* Header */}

          <div className="border-b border-zinc-800 p-8">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-semibold">
                {session.user.name?.charAt(0)}
              </div>

              <div>
                <h1 className="text-2xl font-semibold">{session.user.name}</h1>

                <p className="mt-1 text-zinc-400">{session.user.email}</p>
              </div>
            </div>
          </div>

          {/* Details */}

          <div className="space-y-6 p-8">
            <div className="grid gap-5">
              <div>
                <p className="text-sm text-zinc-500">User ID</p>

                <p className="mt-1 break-all rounded-lg bg-zinc-950 p-3 text-sm">
                  {session.user.id}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Email Verified</p>

                <p className="mt-1">
                  {session.user.emailVerified ? (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-400">
                      Not Verified
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-8">
              <button
                className="w-full rounded-xl bg-red-600 px-5 py-3 font-medium transition hover:bg-red-500"
                type="button"
                onClick={handleSignOut}
              >
                Sign Out
              </button>

              <p className="mt-3 text-center text-xs text-zinc-500">
                This will sign you out of your current session.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
