import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return <div>No Authenticated User found</div>;
  }
  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      <p>{JSON.stringify(session)}</p>
    </div>
  );
}
