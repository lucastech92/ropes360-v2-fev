import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, FileText, Package, Search, Trash2, CheckCircle2, Calendar } from "lucide-react";
import { useInspectionPackages, InspectionFileType } from "@/hooks/useInspectionPackages";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FILE_TYPE_LABELS: Record<InspectionFileType, string> = {
  certificate: "Certificado",
  slb_mrt: "SLB/MRT",
  report: "Relatório",
  other: "Outros",
};

const FILE_TYPE_VARIANTS: Record<InspectionFileType, "default" | "secondary" | "outline"> = {
  certificate: "default",
  slb_mrt: "secondary",
  report: "outline",
  other: "outline",
};

export const InspectionPackageList = () => {
  const { packages, loading, downloadFile, deletePackage } = useInspectionPackages();
  const { canDelete } = useUserRole();
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.tag_number.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [packages, search]);

  const toggle = (id: string) => {
    setOpenIds((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const downloadAll = async (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg?.files) return;
    for (const f of pkg.files) {
      await downloadFile(f);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const isComplete = (files?: any[]) => {
    if (!files) return false;
    const types = new Set(files.map((f) => f.file_type));
    return types.has("certificate") && types.has("slb_mrt");
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando pacotes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por TAG, cliente ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{search ? "Nenhum pacote encontrado" : "Nenhum pacote criado ainda"}</p>
          </CardContent>
        </Card>
      ) : (
        filtered.map((pkg) => {
          const open = openIds.has(pkg.id);
          const complete = isComplete(pkg.files);
          return (
            <Card key={pkg.id}>
              <Collapsible open={open} onOpenChange={() => toggle(pkg.id)}>
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Package className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{pkg.tag_number}</h3>
                            {complete && (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Completo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{pkg.client}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {pkg.inspection_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(pkg.inspection_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        <Badge variant="outline">{pkg.files?.length || 0} arquivo(s)</Badge>
                        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    )}

                    {pkg.files && pkg.files.length > 0 ? (
                      <>
                        <div className="space-y-1">
                          {pkg.files.map((f) => (
                            <div key={f.id} className="flex items-center justify-between gap-2 bg-muted/30 rounded px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate">{f.file_name}</span>
                                <Badge variant={FILE_TYPE_VARIANTS[f.file_type]} className="text-xs shrink-0">
                                  {FILE_TYPE_LABELS[f.file_type]}
                                </Badge>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => downloadFile(f)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadAll(pkg.id)}>
                            <Download className="h-4 w-4 mr-2" /> Baixar todos
                          </Button>
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Excluir pacote ${pkg.tag_number}?`)) deletePackage(pkg.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum arquivo neste pacote.</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })
      )}
    </div>
  );
};
