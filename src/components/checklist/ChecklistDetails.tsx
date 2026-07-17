import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, PackageMinus, PackagePlus, Archive, MoreHorizontal, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checklist, ChecklistItem } from "@/hooks/useChecklistData";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { AddItemForm } from "./AddItemForm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string | null;
  status: string | null;
  next_calibration: string | null;
}

interface ChecklistDetailsProps {
  checklist: Checklist;
  items: ChecklistItem[];
  inventoryItems: InventoryItem[];
  progress: number;
  completedCount: number;
  totalCount: number;
  onQuantityChange: (itemId: string, delta: number) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (inventoryItemId: string, quantity: number) => Promise<boolean>;
  onCloneClick: () => void;
  onArchiveClick?: () => void;
  onFinishClick?: () => void;
  finishLabel?: string;
}

export const ChecklistDetails = ({
  checklist,
  items,
  inventoryItems,
  progress,
  completedCount,
  totalCount,
  onQuantityChange,
  onDeleteItem,
  onAddItem,
  onCloneClick,
  onArchiveClick,
  onFinishClick,
  finishLabel = "Salvar checklist",
}: ChecklistDetailsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {checklist.is_template && <FileText className="h-5 w-5 text-primary" />}
              <CardTitle>{checklist.name}</CardTitle>
              {checklist.is_template && (
                <Badge variant="secondary">Template</Badge>
              )}
              {checklist.is_saved && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Archive className="h-3 w-3 mr-1" />
                  Salvo
                </Badge>
              )}
              <span className={`text-sm font-semibold px-2 py-1 rounded flex items-center gap-1 ${
                checklist.checklist_type === 'entrada' 
                  ? 'bg-green-500/10 text-green-600' 
                  : 'bg-blue-500/10 text-blue-600'
              }`}>
                {checklist.checklist_type === 'entrada' ? (
                  <>
                    <PackagePlus className="h-3 w-3" />
                    Entrada
                  </>
                ) : (
                  <>
                    <PackageMinus className="h-3 w-3" />
                    Saída
                  </>
                )}
              </span>
            </div>
            {checklist.description && (
              <CardDescription className="mt-2">
                {checklist.description}
              </CardDescription>
            )}
            {checklist.service_tag && (
              <div className="mt-2">
                <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                  JBR: {checklist.service_tag}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
            <div className="text-left sm:text-right"><div className="text-2xl font-semibold">{progress}%</div><div className="text-sm text-muted-foreground">{completedCount}/{totalCount} completos</div></div>
            <div className="flex gap-2">
              {checklist.is_template && (
                <Button
                  size="sm"
                  onClick={onCloneClick}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Clonar
                </Button>
              )}
              {onArchiveClick && (
                <DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Mais ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={onArchiveClick}><Archive className="mr-2 h-4 w-4" />Arquivar checklist</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!checklist.is_template && checklist.checklist_type === 'saida' && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-300">Quantidade destinada ao JBR</p>
            <p className="mt-1 text-muted-foreground">Ao vincular este checklist a um JBR, a quantidade planejada é baixada imediatamente do inventário.</p>
          </div>
        )}
        <div className="overflow-hidden rounded-lg border">{items.length ? items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onQuantityChange={onQuantityChange}
            onDelete={onDeleteItem}
          />
        )) : <p className="p-6 text-center text-sm text-muted-foreground">Nenhum item neste checklist.</p>}</div>

        <AddItemForm
          inventoryItems={inventoryItems}
          onAddItem={onAddItem}
        />

        {onFinishClick && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Terminou de montar o checklist?</p>
              <p className="text-xs text-muted-foreground">Cada item é gravado automaticamente. Use o botão para concluir esta etapa.</p>
            </div>
            <Button onClick={onFinishClick} disabled={items.length === 0} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {finishLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
