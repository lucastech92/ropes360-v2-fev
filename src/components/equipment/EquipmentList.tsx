import { useState } from "react";
import { Search, Plus, Filter, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Equipment, EquipmentStatus } from "@/hooks/useEquipment";
import EquipmentCard from "./EquipmentCard";
import { exportToExcel } from "@/utils/exportUtils";

interface EquipmentListProps {
  equipment: Equipment[];
  onEdit: (equipment: Equipment) => void;
  onDelete: (id: string) => void;
  onCheckout: (equipment: Equipment) => void;
  onCheckin: (equipment: Equipment) => void;
  onViewDetails: (equipment: Equipment) => void;
  onAdd: () => void;
  canManage: boolean;
}

const EquipmentList = ({
  equipment,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
  onAdd,
  canManage,
}: EquipmentListProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = [...new Set(equipment.map((e) => e.category))];

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      (item.serial_number?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleExport = () => {
    const data = filteredEquipment.map((item) => ({
      Código: item.code,
      Nome: item.name,
      Categoria: item.category,
      Status: getStatusLabel(item.status),
      Condição: getConditionLabel(item.condition),
      "Número de Série": item.serial_number || "",
      Fabricante: item.manufacturer || "",
      Modelo: item.model || "",
      Localização: item.current_location || "",
      "Próxima Calibração": item.next_calibration || "",
    }));
    exportToExcel(data, "equipamentos");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="in_service">Em Serviço</SelectItem>
              <SelectItem value="maintenance">Manutenção</SelectItem>
              <SelectItem value="calibration">Calibração</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleExport} className="flex-1 md:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {canManage && (
            <Button onClick={onAdd} className="flex-1 md:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Novo Equipamento
            </Button>
          )}
        </div>
      </div>

      {filteredEquipment.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum equipamento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
              onCheckout={() => onCheckout(item)}
              onCheckin={() => onCheckin(item)}
              onViewDetails={() => onViewDetails(item)}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function getStatusLabel(status: EquipmentStatus): string {
  const labels: Record<EquipmentStatus, string> = {
    available: "Disponível",
    in_service: "Em Serviço",
    maintenance: "Manutenção",
    calibration: "Calibração",
    inactive: "Inativo",
  };
  return labels[status];
}

function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    excellent: "Excelente",
    good: "Bom",
    fair: "Regular",
    needs_repair: "Precisa Reparo",
    damaged: "Danificado",
  };
  return labels[condition] || condition;
}

export default EquipmentList;
