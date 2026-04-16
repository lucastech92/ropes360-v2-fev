import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InspectionFileType = "certificate" | "slb_mrt" | "report" | "other";

export interface InspectionPackageFile {
  id: string;
  package_id: string;
  file_type: InspectionFileType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export interface InspectionPackage {
  id: string;
  user_id: string;
  tag_number: string;
  client: string;
  service_id: string | null;
  description: string | null;
  inspection_date: string | null;
  application: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  files?: InspectionPackageFile[];
}

const TAG_PREFIX = "LS BR";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const useInspectionPackages = () => {
  const [packages, setPackages] = useState<InspectionPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pkgs, error } = await supabase
        .from("inspection_packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: files, error: filesError } = await supabase
        .from("inspection_package_files")
        .select("*")
        .order("uploaded_at", { ascending: true });

      if (filesError) throw filesError;

      const withFiles = (pkgs || []).map((p) => ({
        ...p,
        files: (files || []).filter((f) => f.package_id === p.id),
      })) as InspectionPackage[];

      setPackages(withFiles);
    } catch (err: any) {
      console.error("Error fetching packages:", err);
      toast.error("Erro ao carregar pacotes: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const getNextTag = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase
      .from("inspection_packages")
      .select("tag_number")
      .ilike("tag_number", `${TAG_PREFIX}%`)
      .order("tag_number", { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      return `${TAG_PREFIX} 0001`;
    }

    if (!data || data.length === 0) return `${TAG_PREFIX} 0001`;

    const last = data[0].tag_number;
    const match = last.match(/(\d+)\s*$/);
    const num = match ? parseInt(match[1], 10) + 1 : 1;
    return `${TAG_PREFIX} ${String(num).padStart(4, "0")}`;
  }, []);

  const createPackage = async (input: {
    tag_number: string;
    client: string;
    service_id?: string | null;
    description?: string | null;
    inspection_date?: string | null;
    files: { file: File; type: InspectionFileType }[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return null;
    }

    // Validate file sizes
    for (const f of input.files) {
      if (f.file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo "${f.file.name}" excede 20MB`);
        return null;
      }
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("inspection_packages")
      .insert({
        user_id: user.id,
        tag_number: input.tag_number,
        client: input.client,
        service_id: input.service_id || null,
        description: input.description || null,
        inspection_date: input.inspection_date || null,
      })
      .select()
      .single();

    if (pkgError) {
      toast.error("Erro ao criar pacote: " + pkgError.message);
      return null;
    }

    // Upload files
    for (const { file, type } of input.files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `inspection_packages/${pkg.id}/${type}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(`Erro ao enviar "${file.name}": ${uploadError.message}`);
        continue;
      }

      const { error: fileError } = await supabase
        .from("inspection_package_files")
        .insert({
          package_id: pkg.id,
          file_type: type,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (fileError) {
        console.error("File record error:", fileError);
        toast.error(`Erro ao registrar "${file.name}"`);
      }
    }

    toast.success(`Pacote ${input.tag_number} criado com sucesso!`);
    await fetchPackages();
    return pkg;
  };

  const addFilesToPackage = async (
    packageId: string,
    files: { file: File; type: InspectionFileType }[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const { file, type } of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede 20MB`);
        continue;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `inspection_packages/${packageId}/${type}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);

      if (uploadError) {
        toast.error(`Erro: ${uploadError.message}`);
        continue;
      }

      await supabase.from("inspection_package_files").insert({
        package_id: packageId,
        file_type: type,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        uploaded_by: user.id,
      });
    }

    toast.success("Arquivos adicionados");
    await fetchPackages();
  };

  const downloadFile = async (file: InspectionPackageFile) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(file.file_path, 60);

    if (error || !data) {
      toast.error("Erro ao gerar link de download");
      return;
    }

    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deletePackage = async (id: string) => {
    const pkg = packages.find((p) => p.id === id);
    if (pkg?.files?.length) {
      const paths = pkg.files.map((f) => f.file_path);
      await supabase.storage.from("documents").remove(paths);
    }
    const { error } = await supabase.from("inspection_packages").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Pacote excluído");
    await fetchPackages();
  };

  return {
    packages,
    loading,
    fetchPackages,
    getNextTag,
    createPackage,
    addFilesToPackage,
    downloadFile,
    deletePackage,
  };
};
