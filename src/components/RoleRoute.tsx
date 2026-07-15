import { Navigate } from "react-router-dom";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { PageSkeleton } from "@/components/skeletons/AppSkeletons";

interface RoleRouteProps {
  allowedRoles: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export const RoleRoute = ({ allowedRoles, children, redirectTo = "/" }: RoleRouteProps) => {
  const { role, isLoading } = useUserRole();

  if (isLoading) return <PageSkeleton />;
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};


