import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { ChecklistItem } from "@/hooks/useChecklistData";
import { useUserRole } from "@/hooks/useUserRole";

interface ChecklistItemRowProps {
  item: ChecklistItem;
  stockQuantity: number | null;
  stockUnit?: string | null;
  onQuantityChange: (itemId: string, delta: number) => void;
  onDelete: (itemId: string) => void;
}

export const ChecklistItemRow = ({ item, stockQuantity, stockUnit, onQuantityChange, onDelete }: ChecklistItemRowProps) => {
  const { canDelete } = useUserRole();
  const hasStock = stockQuantity === null || stockQuantity > 0;
  return (
    <div className={`flex flex-wrap items-center gap-3 border-b px-3 py-2.5 last:border-b-0 sm:flex-nowrap ${item.is_checked ? "bg-muted/30" : ""}`}>
      <Checkbox
        checked={item.is_checked}
        className="pointer-events-none"
      />
      <div className="min-w-0 flex-1">
        <span className={item.is_checked ? "line-through text-muted-foreground" : ""}>
          {item.item_text}
        </span>
      </div>
      <div className="min-w-[5.5rem] text-right">
        <p className="text-[11px] leading-tight text-muted-foreground">Estoque atual</p>
        <p className={`text-sm font-semibold ${stockQuantity === 0 ? "text-destructive" : ""}`}>
          {stockQuantity ?? "—"}{stockQuantity !== null && stockUnit ? ` ${stockUnit}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onQuantityChange(item.id, -1)}
          disabled={item.current_quantity <= 0}
        >
          <MinusCircle className="h-4 w-4" />
        </Button>
        <span className="w-16 text-center font-mono text-sm">
          {item.current_quantity}/{item.target_quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onQuantityChange(item.id, 1)}
          disabled={item.current_quantity >= item.target_quantity || !hasStock}
          title={!hasStock ? "Sem estoque disponível" : "Baixar uma unidade do estoque"}
          aria-label={!hasStock ? "Sem estoque disponível" : "Adicionar uma unidade ao checklist"}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
