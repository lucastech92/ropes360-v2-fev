import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuditFilters } from "@/hooks/useInventoryAuditTrail";

interface InventoryAuditFiltersProps {
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
}

interface InventoryItem {
  id: string;
  item_name: string;
}

export function InventoryAuditFilters({
  filters,
  onFiltersChange,
}: InventoryAuditFiltersProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("inventory")
        .select("id, item_name")
        .order("item_name");
      if (data) setItems(data);
    };
    fetchItems();
  }, []);

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/50 rounded-lg">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Item</label>
        <Select
          value={filters.itemId || "all"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, itemId: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os itens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os itens</SelectItem>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.item_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Tipo</label>
        <Select
          value={filters.changeType || "all"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, changeType: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="consumption">Saída</SelectItem>
            <SelectItem value="restock">Entrada</SelectItem>
            <SelectItem value="adjustment">Ajuste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Origem</label>
        <Select
          value={filters.actionSource || "all"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, actionSource: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="checklist">Checklist</SelectItem>
            <SelectItem value="checkout">Checkout</SelectItem>
            <SelectItem value="checkin">Check-in</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Data Início</label>
        <div className="relative">
          <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })
            }
            className="pl-8 w-[150px]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Data Fim</label>
        <div className="relative">
          <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateTo: e.target.value || undefined })
            }
            className="pl-8 w-[150px]"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-10"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}

