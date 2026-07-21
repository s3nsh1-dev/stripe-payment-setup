import { requireUnAuth } from "@/server/lib/auth-guard";

export default async function Home() {
  const session = await requireUnAuth();
  return (
    <div>
      {!session ? (
        <div>No User Found</div>
      ) : (
        <div>{JSON.stringify(session)}</div>
      )}
      <p>Homepage</p>
    </div>
  );
}
