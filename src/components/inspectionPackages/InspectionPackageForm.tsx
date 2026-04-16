import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { FileText, Upload, X, RefreshCw, Package, Check, ChevronsUpDown } from "lucide-react";
import { useInspectionPackages, InspectionFileType } from "@/hooks/useInspectionPackages";
import { supabase } from "@/integrations/supabase/client";

const FILE_TYPE_LABELS: Record<InspectionFileType, string> = {
  certificate: "Certificado (Word/PDF)",
  slb_mrt: "Arquivo SLB / MRT",
  report: "Relatório",
  other: "Outros",
};

const ACCEPTED_BY_TYPE: Record<InspectionFileType, string> = {
  certificate: ".doc,.docx,.pdf",
  slb_mrt: ".slb,.dat,.csv,.xlsx,.xls",
  report: ".pdf,.docx,.xlsx",
  other: "*",
};

interface PendingFile {
  file: File;
  type: InspectionFileType;
}

interface Props {
  onCreated?: () => void;
}

export const InspectionPackageForm = ({ onCreated }: Props) => {
  const { getNextTag, createPackage } = useInspectionPackages();
  const [tag, setTag] = useState("");
  const [client, setClient] = useState("");
  const [serviceId, setServiceId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [application, setApplication] = useState("");
  const [location, setLocation] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [services, setServices] = useState<{ id: string; codigo_jbr: string; cliente: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getNextTag().then(setTag);
    supabase
      .from("services")
      .select("id, codigo_jbr, cliente")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setServices(data || []));
  }, [getNextTag]);

  const refreshTag = async () => setTag(await getNextTag());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: InspectionFileType) => {
    const files = Array.from(e.target.files || []);
    setPending((prev) => [...prev, ...files.map((f) => ({ file: f, type }))]);
    e.target.value = "";
  };

  const removePending = (idx: number) => {
    setPending((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim() || !client.trim()) return;
    setSubmitting(true);
    const result = await createPackage({
      tag_number: tag.trim(),
      client: client.trim(),
      service_id: serviceId === "none" ? null : serviceId,
      description: description.trim() || null,
      inspection_date: inspectionDate || null,
      files: pending,
    });
    setSubmitting(false);
    if (result) {
      setClient("");
      setServiceId("none");
      setDescription("");
      setInspectionDate("");
      setPending([]);
      await refreshTag();
      onCreated?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Novo Pacote de Inspeção
        </CardTitle>
        <CardDescription>
          Agrupe certificado, arquivo SLB/MRT e demais documentos de uma mesma inspeção.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tag">TAG *</Label>
              <div className="flex gap-2">
                <Input id="tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="LS BR 0001" required />
                <Button type="button" variant="outline" size="icon" onClick={refreshTag} title="Próximo TAG">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex: Petrobras" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data da Inspeção</Label>
              <Input id="date" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service">Serviço JBR (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="service"
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {serviceId === "none"
                        ? "Nenhum"
                        : services.find((s) => s.id === serviceId)
                        ? `${services.find((s) => s.id === serviceId)!.codigo_jbr} — ${services.find((s) => s.id === serviceId)!.cliente}`
                        : "Selecionar serviço"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por código JBR ou cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="none" onSelect={() => setServiceId("none")}>
                          <Check className={cn("mr-2 h-4 w-4", serviceId === "none" ? "opacity-100" : "opacity-0")} />
                          Nenhum
                        </CommandItem>
                        {services.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.codigo_jbr} ${s.cliente}`}
                            onSelect={() => setServiceId(s.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", serviceId === s.id ? "opacity-100" : "opacity-0")} />
                            {s.codigo_jbr} — {s.cliente}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Notas, escopo, observações..." />
          </div>

          <div className="space-y-3">
            <Label>Arquivos do Pacote (máx. 20MB cada)</Label>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(FILE_TYPE_LABELS) as InspectionFileType[]).map((type) => (
                <label key={type} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-center font-medium">{FILE_TYPE_LABELS[type]}</span>
                  <input type="file" multiple accept={ACCEPTED_BY_TYPE[type]} className="hidden" onChange={(e) => handleFileSelect(e, type)} />
                </label>
              ))}
            </div>

            {pending.length > 0 && (
              <div className="space-y-1 pt-2">
                {pending.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-muted/50 rounded px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{p.file.name}</span>
                      <Badge variant="secondary" className="text-xs">{FILE_TYPE_LABELS[p.type]}</Badge>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePending(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !tag || !client}>
            {submitting ? "Criando pacote..." : "Criar Pacote de Inspeção"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
