import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InventoryItem } from "@/hooks/useChecklistData";

interface AddItemFormProps {
  inventoryItems: InventoryItem[];
  onAddItem: (inventoryItemId: string, quantity: number) => Promise<boolean>;
}

export const AddItemForm = ({ inventoryItems, onAddItem }: AddItemFormProps) => {
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ id: string; quantity: number; availableStock: number; itemName: string } | null>(null);

  const handleAdd = async () => {
    if (!selectedInventoryItem) return;

    const selectedItem = inventoryItems.find(item => item.id === selectedInventoryItem);
    if (!selectedItem) return;

    const availableStock = selectedItem.quantity || 0;

    if (newItemQuantity > availableStock) {
      setPendingItem({
        id: selectedInventoryItem,
        quantity: newItemQuantity,
        availableStock,
        itemName: selectedItem.item_name
      });
      setShowStockWarning(true);
      return;
    }

    await confirmAdd(selectedInventoryItem, newItemQuantity);
  };

  const confirmAdd = async (itemId: string, quantity: number) => {
    const success = await onAddItem(itemId, quantity);
    if (success) {
      setSelectedInventoryItem("");
      setNewItemQuantity(1);
    }
  };

  const handleConfirmWarning = async () => {
    if (pendingItem) {
      await confirmAdd(pendingItem.id, pendingItem.quantity);
    }
    setShowStockWarning(false);
    setPendingItem(null);
  };

  const handleCancelWarning = () => {
    setShowStockWarning(false);
    setPendingItem(null);
  };

  return (
    <>
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

      <AlertDialog open={showStockWarning} onOpenChange={setShowStockWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Estoque Insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está tentando adicionar <strong>{pendingItem?.quantity}</strong> unidades de{" "}
                <strong>{pendingItem?.itemName}</strong>, mas o estoque atual possui apenas{" "}
                <strong>{pendingItem?.availableStock}</strong> unidades disponíveis.
              </p>
              <p className="text-amber-600 font-medium">
                Deseja continuar mesmo assim?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWarning} className="bg-amber-600 hover:bg-amber-700">
              Continuar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
