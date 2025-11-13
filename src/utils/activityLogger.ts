import { supabase } from "@/integrations/supabase/client";

type ActionType = "created" | "updated" | "deleted" | "downloaded" | "uploaded" | "completed" | "approve_user" | "reject_user" | "change_role" | "update_profile";
type ModuleType = "documents" | "checklist" | "inventory" | "maintenance" | "folders" | "tags" | "usuarios";

interface LogActivityParams {
  action: ActionType;
  module: ModuleType;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  action,
  module,
  entityType,
  entityId,
  description,
  metadata,
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Cannot log activity: user not authenticated");
      return;
    }

    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      module,
      entity_type: entityType,
      entity_id: entityId || null,
      description,
      metadata: metadata || null,
    });

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};
