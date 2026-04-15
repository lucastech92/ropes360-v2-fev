import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCertifications } from "@/hooks/useCertifications";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

const SUGGESTIONS = [
  "NR-35", "NR-34", "NR-33", "NR-11", "NR-10", "NR-12", "NR-13",
  "NR-18", "NR-20", "ISO 4309", "CBSP", "HUET", "T-BOSIET", "T-FOET",
  "ASO", "CREA", "Curso Offshore",
];

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface CertificationUploadProps {
  isAdmin?: boolean;
  profiles?: Profile[];
}

export const CertificationUpload = ({ isAdmin = false, profiles = [] }: CertificationUploadProps) => {
  const { t } = useTranslation();
  const { uploadCertification } = useCertifications();
  const [file, setFile] = useState<File | null>(null);
  const [certName, setCertName] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const filteredSuggestions = SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(certName.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!file || !certName.trim() || !expiryDate) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : user.id;

    await uploadCertification.mutateAsync({
      file,
      certificationName: certName.trim(),
      expiryDate: format(expiryDate, "yyyy-MM-dd"),
      userId: targetUserId,
    });

    setFile(null);
    setCertName("");
    setExpiryDate(undefined);
    setSelectedUserId("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <div className="space-y-6">
      {/* Owner selector for admins */}
      {isAdmin && profiles.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">{t("certifications.certOwner")}</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder={t("certifications.selectOwner")} />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name || p.email || p.user_id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* File Drop Zone */}
      <div>
        <Label className="text-sm font-medium mb-2 block">1. {t("certifications.selectFile")}</Label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
            file && "border-primary/50 bg-primary/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("certifications.dropFileHere")}
              </p>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG</p>
            </div>
          )}
        </div>
      </div>

      {/* Certification Name */}
      <div className="relative">
        <Label className="text-sm font-medium mb-2 block">2. {t("certifications.certName")}</Label>
        <Input
          placeholder="Ex: NR-35, ISO 4309..."
          value={certName}
          onChange={(e) => { setCertName(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && certName.length > 0 && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 max-h-40 overflow-y-auto">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                onMouseDown={() => { setCertName(s); setShowSuggestions(false); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {!certName && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SUGGESTIONS.slice(0, 6).map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => setCertName(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Expiry Date */}
      <div>
        <Label className="text-sm font-medium mb-2 block">3. {t("certifications.expiryDate")}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !expiryDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expiryDate ? format(expiryDate, "dd/MM/yyyy") : t("certifications.selectDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={expiryDate}
              onSelect={setExpiryDate}
              locale={ptBR}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!file || !certName.trim() || !expiryDate || uploadCertification.isPending}
        className="w-full"
        size="lg"
      >
        {uploadCertification.isPending ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  );
};
