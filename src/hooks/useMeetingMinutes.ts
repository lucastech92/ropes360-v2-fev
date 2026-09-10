import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type ProjectStatus = "planned" | "in_progress" | "delayed" | "completed";
export type ActionStatus = "pending" | "in_progress" | "completed";

export interface MeetingMinute {
  id: string;
  meeting_date: string;
  title: string;
  summary: string | null;
  participants: string[];
  created_by: string;
  created_at: string;
}

export interface MeetingProject {
  id: string;
  minute_id: string;
  title: string;
  objective: string | null;
  status: ProjectStatus;
}

export interface MeetingActionItem {
  id: string;
  minute_id: string;
  project_id: string | null;
  description: string;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  status: ActionStatus;
  completed_at: string | null;
}

export interface TeamProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export const useMeetingMinutes = () => {
  const qc = useQueryClient();

  const { data: minutes = [], isLoading } = useQuery({
    queryKey: ["meeting_minutes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MeetingMinute[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["meeting_projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_projects")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingProject[];
    },
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ["meeting_action_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_action_items")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as MeetingActionItem[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["user_profiles_for_meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, email");
      if (error) throw error;
      return (data ?? []) as TeamProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = (keys: string[]) =>
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const createMinute = useMutation({
    mutationFn: async (payload: {
      meeting_date: string;
      title: string;
      summary: string;
      participants: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("meeting_minutes")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as MeetingMinute;
    },
    onSuccess: () => {
      invalidate(["meeting_minutes"]);
      notify.success("Ata criada", { description: "Agora adicione os projetos e as ações." });
    },
    onError: (e: Error) => notify.error("Erro ao criar ata", { description: e.message }),
  });

  const updateMinute = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<MeetingMinute> & { id: string }) => {
      const { error } = await supabase.from("meeting_minutes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(["meeting_minutes"]);
      notify.success("Ata atualizada");
    },
    onError: (e: Error) => notify.error("Erro ao atualizar ata", { description: e.message }),
  });

  const deleteMinute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_minutes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(["meeting_minutes", "meeting_projects", "meeting_action_items"]);
      notify.success("Ata excluída");
    },
    onError: (e: Error) => notify.error("Erro ao excluir ata", { description: e.message }),
  });

  const saveProject = useMutation({
    mutationFn: async (payload: Partial<MeetingProject> & { minute_id: string; title: string }) => {
      if (payload.id) {
        const { id, ...patch } = payload;
        const { error } = await supabase.from("meeting_projects").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meeting_projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(["meeting_projects"]),
    onError: (e: Error) => notify.error("Erro ao salvar projeto", { description: e.message }),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["meeting_projects", "meeting_action_items"]),
    onError: (e: Error) => notify.error("Erro ao excluir projeto", { description: e.message }),
  });

  const saveActionItem = useMutation({
    mutationFn: async (
      payload: Partial<MeetingActionItem> & { minute_id: string; description: string },
    ) => {
      if (payload.id) {
        const { id, ...patch } = payload;
        const { error } = await supabase.from("meeting_action_items").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meeting_action_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(["meeting_action_items"]),
    onError: (e: Error) => notify.error("Erro ao salvar ação", { description: e.message }),
  });

  const toggleActionItem = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("meeting_action_items")
        .update({
          status: done ? "completed" : "pending",
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["meeting_action_items"]),
    onError: (e: Error) => notify.error("Erro ao atualizar ação", { description: e.message }),
  });

  const deleteActionItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_action_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["meeting_action_items"]),
    onError: (e: Error) => notify.error("Erro ao excluir ação", { description: e.message }),
  });

  return {
    minutes,
    projects,
    actionItems,
    profiles,
    isLoading,
    createMinute,
    updateMinute,
    deleteMinute,
    saveProject,
    deleteProject,
    saveActionItem,
    toggleActionItem,
    deleteActionItem,
  };
};

export const isOverdue = (item: MeetingActionItem) => {
  if (!item.due_date || item.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${item.due_date}T00:00:00`) < today;
};

export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
