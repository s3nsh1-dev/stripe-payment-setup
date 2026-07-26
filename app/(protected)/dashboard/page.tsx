"use client";

import Image from "next/image";

import { useSession } from "@/client/lib/auth-client";

export default function DashboardPage() {
  const { data, isPending, error, isRefetching } = useSession();

  if (isPending) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400">Loading dashboard...</p>
      </main>
    );
  }

  if (isRefetching) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400">Refreshing session...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 text-white">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
          <h2 className="text-xl font-semibold text-red-400">
            Failed to load dashboard
          </h2>

          <p className="mt-2 text-zinc-300">
            Unable to retrieve the current session.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}

        <section>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>

          <p className="mt-2 text-zinc-400">Welcome back, {data.user.name}.</p>
        </section>

        {/* User */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <Image
              src={data.user.image ?? "/avatar.png"}
              alt={data.user.name}
              width={88}
              height={88}
              className="rounded-full border border-zinc-700"
            />

            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{data.user.name}</h2>

              <p className="mt-1 text-zinc-400">{data.user.email}</p>

              <div className="mt-4 flex gap-3">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                  Active Session
                </span>

                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-400">
                  {data.user.emailVerified ? "Verified" : "Not Verified"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Stats */}

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Authentication" value="Authenticated" />

          <StatCard
            title="Email"
            value={data.user.emailVerified ? "Verified" : "Pending"}
          />

          <StatCard title="Session" value="Active" />

          <StatCard title="Provider" value="Better Auth" />
        </section>

        {/* Session Details */}

        <section className="grid gap-5 md:grid-cols-2">
          <InfoCard title="User ID" value={data.user.id} />
          <InfoCard title="Session ID" value={data.session.id} />
          <InfoCard title="Session Token" value={data.session.token} />
          <InfoCard
            title="Expires"
            value={new Date(data.session.expiresAt).toLocaleString()}
          />
          <InfoCard
            title="IP Address"
            value={data.session.ipAddress ?? "Unknown"}
          />
          <InfoCard title="User Agent" value={data.session.userAgent || ""} />
        </section>

        {/* JSON */}

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="font-semibold">Session Payload</h2>
          </div>

          <pre className="overflow-x-auto p-6 text-sm text-zinc-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="mt-3 break-all font-mono text-sm">{value}</p>
    </div>
  );
}
