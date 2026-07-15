import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Certification {
  id: string;
  user_id: string;
  certification_name: string;
  expiry_date: string;
  file_path: string;
  file_name: string;
  created_by: string;
  created_at: string;
}

export interface CompetencyEntry {
  id: string;
  user_id: string;
  skill_name: string;
  skill_level: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
}

export type CertStatus = "valid" | "expiring" | "expired";

export const getCertStatus = (expiryDate: string): CertStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const useCertifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const certificationsQuery = useQuery({
    queryKey: ["certifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data as Certification[];
    },
  });

  const competenciesQuery = useQuery({
    queryKey: ["competency_matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competency_matrix")
        .select("*")
        .order("skill_name");
      if (error) throw error;
      return data as CompetencyEntry[];
    },
  });

  const uploadCertification = useMutation({
    mutationFn: async ({
      file,
      certificationName,
      expiryDate,
      userId,
    }: {
      file: File;
      certificationName: string;
      expiryDate: string;
      userId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `certifications/${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("certifications").insert({
        user_id: userId,
        certification_name: certificationName,
        expiry_date: expiryDate,
        file_path: filePath,
        file_name: file.name,
        created_by: user.id,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast({ title: "Certificado salvo com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar certificado", description: error.message, variant: "destructive" });
    },
  });

  const deleteCertification = useMutation({
    mutationFn: async (cert: Certification) => {
      await supabase.storage.from("documents").remove([cert.file_path]);
      const { error } = await supabase.from("certifications").delete().eq("id", cert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast({ title: "Certificado excluído" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const upsertCompetency = useMutation({
    mutationFn: async (entry: {
      user_id: string;
      skill_name: string;
      skill_level: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("competency_matrix").upsert(
        {
          ...entry,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_name" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competency_matrix"] });
      toast({ title: "Competência atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    certifications: certificationsQuery.data ?? [],
    isLoadingCerts: certificationsQuery.isLoading,
    competencies: competenciesQuery.data ?? [],
    isLoadingCompetencies: competenciesQuery.isLoading,
    uploadCertification,
    deleteCertification,
    upsertCompetency,
  };
};

