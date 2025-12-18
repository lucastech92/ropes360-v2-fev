import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItem } from "@/hooks/useChecklistData";

interface AddItemFormProps {
  inventoryItems: InventoryItem[];
  onAddItem: (inventoryItemId: string, quantity: number) => Promise<boolean>;
}

export const AddItemForm = ({ inventoryItems, onAddItem }: AddItemFormProps) => {
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const handleAdd = async () => {
    const success = await onAddItem(selectedInventoryItem, newItemQuantity);
    if (success) {
      setSelectedInventoryItem("");
      setNewItemQuantity(1);
    }
  };

  return (
    <div className="flex gap-2 pt-4 border-t">
      <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Selecionar item do inventário" />
        </SelectTrigger>
        <SelectContent>
          {inventoryItems.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.item_name} - Disponível: {item.quantity} {item.unit || 'un'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={1}
        value={newItemQuantity}
        onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
        className="w-24"
        placeholder="Qtd"
      />
      <Button onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar
      </Button>
    </div>
  );
};
