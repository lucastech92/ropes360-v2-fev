import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Search } from "lucide-react";
import { Checklist } from "@/hooks/useChecklistData";
import { TemplateCard } from "./TemplateCard";

interface TemplatesTabProps {
  templates: Checklist[];
  onCreateClick: () => void;
  onEditClick: (template: Checklist) => void;
  onCloneClick: (template: Checklist) => void;
}

type OriginFilter = "todos" | "modelo" | "em_uso" | "arquivado";
type TypeFilter = "todos" | "entrada" | "saida";

const originOf = (checklist: Checklist): OriginFilter =>
  checklist.is_template ? "modelo" : checklist.is_saved ? "arquivado" : "em_uso";

export const TemplatesTab = ({
  templates,
  onCreateClick,
  onEditClick,
  onCloneClick,
}: TemplatesTabProps) => {
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<OriginFilter>("todos");
  const [type, setType] = useState<TypeFilter>("todos");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return templates.filter((checklist) => {
      if (origin !== "todos" && originOf(checklist) !== origin) return false;
      if (type !== "todos" && checklist.checklist_type !== type) return false;
      if (!term) return true;
      return [checklist.name, checklist.description, checklist.service_tag]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(term));
    });
  }, [templates, search, origin, type]);

  const hasFilters = search.trim() !== "" || origin !== "todos" || type !== "todos";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modelos reutilizáveis
            </CardTitle>
            <CardDescription>
              Todo checklist criado fica disponível aqui. Reutilize um deles e escolha o novo JBR.
            </CardDescription>
          </div>
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Novo modelo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, descrição ou JBR"
              className="pl-9"
            />
          </div>
          <Select value={origin} onValueChange={(value) => setOrigin(value as OriginFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as origens</SelectItem>
              <SelectItem value="modelo">Modelos</SelectItem>
              <SelectItem value="em_uso">Em uso</SelectItem>
              <SelectItem value="arquivado">Arquivados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(value) => setType(value as TypeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Entrada e saída</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} de {templates.length} checklists</span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setOrigin("todos");
                setType("todos");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Nenhum checklist encontrado</p>
            <p className="text-sm">Ajuste os filtros ou crie um novo checklist</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => onEditClick(template)}
                onClone={() => onCloneClick(template)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
