import { Navigate, useLocation } from "react-router-dom";
import { useAxion } from "@/context/AxionContext";
import { LoadingState } from "@/components/enterprise/States";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { session, authReady } = useAxion();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <LoadingState label="Restoring your session" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default RequireAuth;
