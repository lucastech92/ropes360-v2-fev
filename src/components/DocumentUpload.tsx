import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type DocumentCategory = 
  | "procedimentos_oficiais"
  | "inspecoes"
  | "procedimentos_tecnicos"
  | "treinamento"
  | "modelos_relatorios"
  | "resolucao_problemas"
  | "duvidas_frequentes"
  | "historico";

interface DocumentUploadProps {
  category: DocumentCategory;
  onUploadComplete?: () => void;
}

export const DocumentUpload = ({ category, onUploadComplete }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) {
        setTitle(e.target.files[0].name);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo e forneça um título.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert({
        title,
        description,
        category,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
      });

      if (dbError) throw dbError;

      toast({
        title: "Sucesso!",
        description: "Documento enviado com sucesso.",
      });

      setFile(null);
      setTitle("");
      setDescription("");
      onUploadComplete?.();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Upload className="h-5 w-5" />
        Upload de Documento
      </h3>

      <div className="space-y-4">
        <div>
          <Label htmlFor="file">Arquivo</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
          />
          {file && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do documento"
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descrição do documento"
            rows={3}
          />
        </div>

        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? "Enviando..." : "Enviar Documento"}
        </Button>
      </div>
    </div>
  );
};
