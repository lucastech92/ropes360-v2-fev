import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "inspector" | "viewer";

export const useUserRole = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["current-user-role"],
    queryFn: async (): Promise<AppRole | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("approved", true);

      if (error || !roles || roles.length === 0) return null;

      // Priority: admin > moderator > inspector > viewer
      const priority: AppRole[] = ["admin", "moderator", "inspector", "viewer"];
      for (const r of priority) {
        if (roles.some((x) => x.role === r)) return r;
      }
      return roles[0].role as AppRole;
    },
    staleTime: 5 * 60 * 1000,
  });

  const role = data ?? null;
  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const isInspector = role === "inspector";
  const isViewer = role === "viewer";

  return {
    role,
    isAdmin,
    isModerator,
    isInspector,
    isViewer,
    canDelete: isAdmin,
    canEdit: isAdmin || isModerator || isInspector,
    canUpload: isAdmin || isModerator || isInspector,
    isLoading,
  };
};
