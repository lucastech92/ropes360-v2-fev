import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Search, PackagePlus, PackageMinus, RotateCcw, Eye, FileText } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SavedChecklistsTabProps {
  savedChecklists: Checklist[];
  onRestore: (id: string) => void;
  onView: (id: string) => void;
  onSaveAsTemplate?: (id: string) => void;
}

export const SavedChecklistsTab = ({
  savedChecklists,
  onRestore,
  onView,
  onSaveAsTemplate,
}: SavedChecklistsTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return savedChecklists.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.service_tag && c.service_tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType =
        typeFilter === "all" || c.checklist_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [savedChecklists, searchTerm, typeFilter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Checklists Salvos</CardTitle>
              <CardDescription>
                Checklists finalizados e arquivados para consulta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código JBR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum checklist salvo</p>
              <p className="text-sm mt-1">
                {savedChecklists.length === 0
                  ? "Salve checklists concluídos para consultá-los aqui"
                  : "Nenhum resultado encontrado para os filtros aplicados"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((checklist) => (
                <div
                  key={checklist.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{checklist.name}</span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs ${
                          checklist.checklist_type === "entrada"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}
                      >
                        {checklist.checklist_type === "entrada" ? (
                          <PackagePlus className="h-3 w-3 mr-1" />
                        ) : (
                          <PackageMinus className="h-3 w-3 mr-1" />
                        )}
                        {checklist.checklist_type === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      {checklist.service_tag && (
                        <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                          {checklist.service_tag}
                        </span>
                      )}
                      {checklist.description && (
                        <span className="truncate">{checklist.description}</span>
                      )}
                      {checklist.saved_at && (
                        <span className="text-xs">
                          Salvo em {format(new Date(checklist.saved_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(checklist.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    {onSaveAsTemplate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSaveAsTemplate(checklist.id)}
                        className="text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Salvar como Template
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestore(checklist.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
