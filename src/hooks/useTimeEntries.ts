import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activityLogger";

export type CheckInType = 'home_office' | 'offshore' | 'travel' | 'base' | 'day_off' | 'vacation';

export interface TimeEntry {
  id: string;
  user_id: string;
  entry_date: string;
  check_in_type: CheckInType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTimeEntryParams {
  entry_date: string;
  check_in_type: CheckInType;
  notes?: string;
}

interface UpdateTimeEntryParams {
  id: string;
  check_in_type: CheckInType;
  notes?: string;
}

export const useTimeEntries = (userId?: string, month?: Date) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startOfMonth = month ? new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split('T')[0] : undefined;
  const endOfMonth = month ? new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().split('T')[0] : undefined;

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['time-entries', userId, startOfMonth, endOfMonth],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('*')
        .order('entry_date', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startOfMonth && endOfMonth) {
        query = query.gte('entry_date', startOfMonth).lte('entry_date', endOfMonth);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TimeEntry[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (params: CreateTimeEntryParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          entry_date: params.entry_date,
          check_in_type: params.check_in_type,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast({
        title: "Check-in registrado",
        description: `Check-in de ${getCheckInLabel(data.check_in_type)} registrado com sucesso.`,
      });
      logActivity({
        action: "created",
        module: "timesheet" as any,
        entityType: "time_entry",
        entityId: data.id,
        description: `Check-in registrado: ${getCheckInLabel(data.check_in_type)} em ${data.entry_date}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar check-in",
        description: error.message || "Ocorreu um erro ao registrar o check-in.",
        variant: "destructive",
      });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async (params: UpdateTimeEntryParams) => {
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          check_in_type: params.check_in_type,
          notes: params.notes || null,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast({
        title: "Check-in atualizado",
        description: "Check-in atualizado com sucesso.",
      });
      logActivity({
        action: "updated",
        module: "timesheet" as any,
        entityType: "time_entry",
        entityId: data.id,
        description: `Check-in atualizado: ${getCheckInLabel(data.check_in_type)} em ${data.entry_date}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar check-in",
        description: error.message || "Ocorreu um erro ao atualizar o check-in.",
        variant: "destructive",
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast({
        title: "Check-in removido",
        description: "Check-in removido com sucesso.",
      });
      logActivity({
        action: "deleted",
        module: "timesheet" as any,
        entityType: "time_entry",
        entityId: id,
        description: "Check-in removido",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover check-in",
        description: error.message || "Ocorreu um erro ao remover o check-in.",
        variant: "destructive",
      });
    },
  });

  return {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};

export const getCheckInLabel = (type: CheckInType): string => {
  const labels: Record<CheckInType, string> = {
    home_office: 'Home Office',
    offshore: 'Offshore',
    travel: 'Viagem',
    base: 'Base',
    day_off: 'Folga',
    vacation: 'Férias',
  };
  return labels[type];
};

export const getCheckInColor = (type: CheckInType): string => {
  const colors: Record<CheckInType, string> = {
    home_office: 'bg-blue-500',
    offshore: 'bg-orange-500',
    travel: 'bg-purple-500',
    base: 'bg-green-500',
    day_off: 'bg-gray-400',
    vacation: 'bg-cyan-500',
  };
  return colors[type];
};

export const getCheckInBorderColor = (type: CheckInType): string => {
  const colors: Record<CheckInType, string> = {
    home_office: 'border-blue-500',
    offshore: 'border-orange-500',
    travel: 'border-purple-500',
    base: 'border-green-500',
    day_off: 'border-gray-400',
    vacation: 'border-cyan-500',
  };
  return colors[type];
};
