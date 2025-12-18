import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, PackageMinus, PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checklist, ChecklistItem } from "@/hooks/useChecklistData";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { AddItemForm } from "./AddItemForm";

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string | null;
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
}: ChecklistDetailsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {checklist.is_template && <FileText className="h-5 w-5 text-primary" />}
              <CardTitle>{checklist.name}</CardTitle>
              {checklist.is_template && (
                <Badge variant="secondary">Template</Badge>
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
          <div className="text-right">
            <div className="text-2xl font-bold">{progress}%</div>
            <div className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} completos
            </div>
            {checklist.is_template && (
              <Button
                size="sm"
                className="mt-2"
                onClick={onCloneClick}
              >
                <Copy className="h-4 w-4 mr-1" />
                Clonar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onQuantityChange={onQuantityChange}
            onDelete={onDeleteItem}
          />
        ))}

        <AddItemForm
          inventoryItems={inventoryItems}
          onAddItem={onAddItem}
        />
      </CardContent>
    </Card>
  );
};
