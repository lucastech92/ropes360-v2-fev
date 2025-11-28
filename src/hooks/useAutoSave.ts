import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions {
  data: any;
  reportId: string | null;
  onSave?: (id: string) => void;
  delay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  data,
  reportId,
  onSave,
  delay = 3000,
  enabled = true
}: UseAutoSaveOptions) => {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    const dataString = JSON.stringify(data);
    if (dataString === lastSavedRef.current) return;

    isSavingRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const reportData = {
        user_id: user.id,
        report_number: data.reportNumber || `LS BR ${Date.now()}`,
        title: data.client ? `${data.client} - ${data.location || 'Sem local'}` : 'Rascunho sem título',
        status: 'draft',
        report_data: data,
        updated_at: new Date().toISOString()
      };

      if (reportId) {
        // Update existing report
        const { error } = await supabase
          .from('inspection_reports')
          .update(reportData)
          .eq('id', reportId);

        if (error) throw error;
      } else {
        // Create new report
        const { data: newReport, error } = await supabase
          .from('inspection_reports')
          .insert(reportData)
          .select()
          .single();

        if (error) throw error;
        if (newReport && onSave) {
          onSave(newReport.id);
        }
      }

      lastSavedRef.current = dataString;
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o rascunho automaticamente',
        variant: 'destructive'
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [data, reportId, enabled, onSave, toast]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  return { save };
};
