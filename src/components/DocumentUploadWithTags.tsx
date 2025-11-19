import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { logActivity } from "@/utils/activityLogger";

interface Tag {
  id: string;
  name: string;
}

interface DocumentUploadWithTagsProps {
  folderId: string | null;
  category?: string;
  onUploadComplete?: () => void;
}

export const DocumentUploadWithTags = ({
  folderId,
  category,
  onUploadComplete,
}: DocumentUploadWithTagsProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data, error } = await supabase.from("tags").select("*").order("name");
    if (!error && data) {
      setAvailableTags(data);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    const { data, error } = await supabase
      .from("tags")
      .insert({ name: newTagName })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Tag já existe",
          description: "Esta tag já foi criada anteriormente",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar tag",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    setAvailableTags([...availableTags, data]);
    setSelectedTags([...selectedTags, data.id]);
    setNewTagName("");
    toast({
      title: "Tag criada",
      description: `Tag "${newTagName}" criada com sucesso`,
    });
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para enviar",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para o documento",
        variant: "destructive",
      });
      return;
    }

    if (selectedTags.length === 0) {
      toast({
        title: "Tags obrigatórias",
        description: "Por favor, selecione pelo menos uma tag para organização",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError, data: documentData } = await supabase
        .from("documents")
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          category: (category as any) || "procedimentos_oficiais",
          folder_id: folderId,
          expiry_date: expiryDate || null,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (dbError) throw dbError;

      // Link tags to document
      const tagLinks = selectedTags.map((tagId) => ({
        document_id: documentData.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("document_tags")
        .insert(tagLinks);

      if (tagError) throw tagError;

      // Log activity
      await logActivity({
        action: "uploaded",
        module: "documents",
        entityType: "document",
        entityId: documentData.id,
        description: `Upload do documento "${title.trim()}" com ${selectedTags.length} tag(s)`,
        metadata: {
          file_name: file.name,
          file_size: file.size,
          tags: selectedTags,
          folder_id: folderId,
          expiry_date: expiryDate || null,
        },
      });

      toast({
        title: "Upload concluído",
        description: "Documento enviado com sucesso",
      });

      setFile(null);
      setTitle("");
      setDescription("");
      setExpiryDate("");
      setSelectedTags([]);

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }} className="space-y-4">
        <div>
          <Label htmlFor="file">Arquivo *</Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/5 scale-105'
                : 'border-border hover:border-primary/50 hover:bg-accent/5'
            }`}
            onClick={() => document.getElementById('file')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {file ? file.name : 'Arraste e solte ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground">
              Suporta PDF, DOC, DOCX, XLS, XLSX e mais
            </p>
          </div>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </div>

        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do documento"
            disabled={uploading}
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do documento"
            disabled={uploading}
          />
        </div>

        <div>
          <Label htmlFor="expiry">Data de Validade</Label>
          <Input
            id="expiry"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div>
          <Label>Tags * (obrigatório para rastreamento)</Label>
          <div className="flex gap-2 mt-2 mb-3">
            <Input
              placeholder="Nova tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTag()}
              disabled={uploading}
            />
            <Button onClick={createTag} disabled={uploading} variant="outline">
              Criar Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => !uploading && toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          {selectedTags.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Selecione pelo menos uma tag para continuar
            </p>
          )}
        </div>

      <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Enviando..." : "Enviar Documento"}
      </Button>
    </div>
  );
};