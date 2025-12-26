import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle, Wrench, CalendarClock } from "lucide-react";
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

type WarningType = 'stock' | 'maintenance' | 'calibration';

interface PendingItem {
  id: string;
  quantity: number;
  availableStock: number;
  itemName: string;
  warningType: WarningType;
  status?: string | null;
  nextCalibration?: string | null;
}

export const AddItemForm = ({ inventoryItems, onAddItem }: AddItemFormProps) => {
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);

  const isOutOfCalibration = (nextCalibration: string | null): boolean => {
    if (!nextCalibration) return false;
    const calibrationDate = new Date(nextCalibration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calibrationDate < today;
  };

  const getStatusLabel = (status: string | null): string => {
    const labels: Record<string, string> = {
      'maintenance': 'Em Manutenção',
      'calibration': 'Em Calibração',
      'inactive': 'Inativo',
    };
    return status ? labels[status] || status : '';
  };

  const handleAdd = async () => {
    if (!selectedInventoryItem) return;

    const selectedItem = inventoryItems.find(item => item.id === selectedInventoryItem);
    if (!selectedItem) return;

    const availableStock = selectedItem.quantity || 0;

    // Check for maintenance or calibration status first
    if (selectedItem.status === 'maintenance' || selectedItem.status === 'calibration') {
      setPendingItem({
        id: selectedInventoryItem,
        quantity: newItemQuantity,
        availableStock,
        itemName: selectedItem.item_name,
        warningType: 'maintenance',
        status: selectedItem.status,
      });
      setShowWarning(true);
      return;
    }

    // Check for out of calibration
    if (isOutOfCalibration(selectedItem.next_calibration)) {
      setPendingItem({
        id: selectedInventoryItem,
        quantity: newItemQuantity,
        availableStock,
        itemName: selectedItem.item_name,
        warningType: 'calibration',
        nextCalibration: selectedItem.next_calibration,
      });
      setShowWarning(true);
      return;
    }

    // Check for insufficient stock
    if (newItemQuantity > availableStock) {
      setPendingItem({
        id: selectedInventoryItem,
        quantity: newItemQuantity,
        availableStock,
        itemName: selectedItem.item_name,
        warningType: 'stock',
      });
      setShowWarning(true);
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
    setShowWarning(false);
    setPendingItem(null);
  };

  const handleCancelWarning = () => {
    setShowWarning(false);
    setPendingItem(null);
  };

  const getWarningContent = () => {
    if (!pendingItem) return { title: '', description: '', icon: AlertTriangle };

    switch (pendingItem.warningType) {
      case 'maintenance':
        return {
          title: 'Item em Manutenção/Calibração',
          description: (
            <>
              <p>
                O item <strong>{pendingItem.itemName}</strong> está atualmente com status{" "}
                <strong className="text-orange-600">{getStatusLabel(pendingItem.status)}</strong>.
              </p>
              <p className="text-orange-600 font-medium mt-2">
                Deseja adicionar este item mesmo assim?
              </p>
            </>
          ),
          icon: Wrench,
        };
      case 'calibration':
        return {
          title: 'Item Fora de Calibração',
          description: (
            <>
              <p>
                O item <strong>{pendingItem.itemName}</strong> está com a calibração vencida desde{" "}
                <strong className="text-red-600">
                  {pendingItem.nextCalibration ? new Date(pendingItem.nextCalibration).toLocaleDateString('pt-BR') : 'data desconhecida'}
                </strong>.
              </p>
              <p className="text-red-600 font-medium mt-2">
                Deseja adicionar este item mesmo assim?
              </p>
            </>
          ),
          icon: CalendarClock,
        };
      case 'stock':
      default:
        return {
          title: 'Estoque Insuficiente',
          description: (
            <>
              <p>
                Você está tentando adicionar <strong>{pendingItem.quantity}</strong> unidades de{" "}
                <strong>{pendingItem.itemName}</strong>, mas o estoque atual possui apenas{" "}
                <strong>{pendingItem.availableStock}</strong> unidades disponíveis.
              </p>
              <p className="text-amber-600 font-medium mt-2">
                Deseja continuar mesmo assim?
              </p>
            </>
          ),
          icon: AlertTriangle,
        };
    }
  };

  const warningContent = getWarningContent();
  const WarningIcon = warningContent.icon;

  const getWarningColor = () => {
    if (!pendingItem) return 'text-amber-600';
    switch (pendingItem.warningType) {
      case 'maintenance': return 'text-orange-600';
      case 'calibration': return 'text-red-600';
      default: return 'text-amber-600';
    }
  };

  const getButtonColor = () => {
    if (!pendingItem) return 'bg-amber-600 hover:bg-amber-700';
    switch (pendingItem.warningType) {
      case 'maintenance': return 'bg-orange-600 hover:bg-orange-700';
      case 'calibration': return 'bg-red-600 hover:bg-red-700';
      default: return 'bg-amber-600 hover:bg-amber-700';
    }
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

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={`flex items-center gap-2 ${getWarningColor()}`}>
              <WarningIcon className="h-5 w-5" />
              {warningContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {warningContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWarning} className={getButtonColor()}>
              Continuar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
