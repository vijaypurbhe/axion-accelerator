import { Navigate, useLocation } from "react-router-dom";
import { useAxion } from "@/context/AxionContext";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAxion();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default RequireAuth;
