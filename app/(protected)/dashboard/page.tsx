"use client";
import { useSession } from "@/client/lib/auth-client";

const DashboardPage = () => {
  const { data, isPending, error, isRefetching } = useSession();
  if (error) {
    return <div>Error while fetching user info</div>;
  }
  if (isPending) {
    return <div>Please wait while data is fetching</div>;
  }
  if (isRefetching) {
    return <div>Refetching latest user information</div>;
  }
  return (
    <div>
      This is dashboard page
      <div>
        <p>{JSON.stringify(data?.user)}</p>
        <p>{JSON.stringify(data?.session)}</p>
      </div>
    </div>
  );
};

export default DashboardPage;
