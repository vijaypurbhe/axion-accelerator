import { Navigate } from "react-router-dom";
import { usePhoenix } from "@/context/PhoenixContext";
import type { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn } = usePhoenix();
  if (!signedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
