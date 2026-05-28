import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Download, Package, Wrench } from "lucide-react";
import { exportToExcel } from "@/utils/exportUtils";
import InventoryItemCard from "./InventoryItemCard";
import type { UnifiedInventoryItem, ItemType, EquipmentStatus } from "@/hooks/useUnifiedInventory";

interface InventoryItemListProps {
  items: UnifiedInventoryItem[];
  onAdd: () => void;
  onEdit: (item: UnifiedInventoryItem) => void;
  onDelete: (id: string) => void;
  onCheckout?: (item: UnifiedInventoryItem) => void;
  onCheckin?: (item: UnifiedInventoryItem) => void;
  onViewDetails?: (item: UnifiedInventoryItem) => void;
  canManage: boolean;
  canDelete?: boolean;
}

export default function InventoryItemList({
  items,
  onAdd,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
  canManage,
  canDelete = false,
}: InventoryItemListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === "all" || item.item_type === filterType;

      const matchesStatus =
        filterStatus === "all" ||
        (item.item_type === "equipamento" && item.status === filterStatus);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, searchTerm, filterType, filterStatus]);

  const handleExport = () => {
    const exportData = filteredItems.map((i) => ({
      Tipo: i.item_type === "equipamento" ? "Equipamento" : "Consumível",
      Nome: i.item_name,
      Código: i.code || "",
      Categoria: i.category || "",
      Quantidade: i.quantity,
      Unidade: i.unit || "",
      Localização: i.item_type === "equipamento" ? i.current_location : i.location,
      Status: i.status || "",
      Condição: i.condition || "",
      Fabricante: i.manufacturer || "",
      Modelo: i.model || "",
      "Próx. Calibração": i.next_calibration || "",
      "Qtd. Mínima": i.min_quantity || "",
      Observações: i.notes || "",
    }));
    exportToExcel(
      exportData,
      `inventario_${new Date().toISOString().split("T")[0]}`,
      "Inventário"
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria, código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="consumivel">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Consumíveis
              </div>
            </SelectItem>
            <SelectItem value="equipamento">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipamentos
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {(filterType === "all" || filterType === "equipamento") && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="in_service">Em Serviço</SelectItem>
              <SelectItem value="maintenance">Manutenção</SelectItem>
              <SelectItem value="calibration">Calibração</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={handleExport} disabled={filteredItems.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {canManage && (
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          )}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum item encontrado</p>
          {canManage && (
            <Button variant="link" onClick={onAdd}>
              Adicionar primeiro item
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onCheckout={onCheckout}
              onCheckin={onCheckin}
              onViewDetails={onViewDetails}
              canManage={canManage}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
