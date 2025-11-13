import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface InventoryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: any[];
}

export const InventoryDetailsDialog = ({
  open,
  onOpenChange,
  inventory,
}: InventoryDetailsDialogProps) => {
  const lowStockItems = inventory.filter(
    (item) => item.min_quantity && item.quantity < item.min_quantity
  );

  const okItems = inventory.filter(
    (item) => !item.min_quantity || item.quantity >= item.min_quantity
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalhes do Inventário</DialogTitle>
          <DialogDescription>
            Visualização completa do estoque com alertas de itens abaixo do mínimo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{inventory.length}</div>
              <div className="text-sm text-muted-foreground">Total de Itens</div>
            </div>
            <div className="p-4 border rounded-lg border-destructive/50">
              <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
              <div className="text-sm text-muted-foreground">Abaixo do Mínimo</div>
            </div>
            <div className="p-4 border rounded-lg border-green-500/50">
              <div className="text-2xl font-bold text-green-600">{okItems.length}</div>
              <div className="text-sm text-muted-foreground">Em Estoque OK</div>
            </div>
          </div>

          {/* Itens Críticos */}
          {lowStockItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Itens Abaixo do Mínimo ({lowStockItems.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">{item.min_quantity} {item.unit}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Crítico</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Itens OK */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Itens em Estoque Normal ({okItems.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Localização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {okItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.min_quantity ? `${item.min_quantity} ${item.unit}` : "-"}
                    </TableCell>
                    <TableCell>{item.location || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
