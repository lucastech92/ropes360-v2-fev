import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { ChecklistItem } from "@/hooks/useChecklistData";
import { useUserRole } from "@/hooks/useUserRole";

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onQuantityChange: (itemId: string, delta: number) => void;
  onDelete: (itemId: string) => void;
}

export const ChecklistItemRow = ({ item, onQuantityChange, onDelete }: ChecklistItemRowProps) => {
  const { canDelete } = useUserRole();
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
      <Checkbox
        checked={item.is_checked}
        className="pointer-events-none"
      />
      <div className="flex-1">
        <span className={item.is_checked ? "line-through text-muted-foreground" : ""}>
          {item.item_text}
        </span>
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
        <span className="w-16 text-center font-mono">
          {item.current_quantity}/{item.target_quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onQuantityChange(item.id, 1)}
          disabled={item.current_quantity >= item.target_quantity}
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
