import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, Plus, AlertTriangle } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  code: string;
  category: string;
  status: string;
  condition: string;
  next_calibration: string | null;
  score: number;
  reason: string;
}

interface EquipmentSuggestionsProps {
  serviceScope: string[];
  onAddEquipment: (equipmentText: string) => void;
  currentEquipmentText: string;
}

export const EquipmentSuggestions = ({
  serviceScope,
  onAddEquipment,
  currentEquipmentText,
}: EquipmentSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  useEffect(() => {
    if (serviceScope.length > 0) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [serviceScope]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("equipment-ai", {
        body: {
          action: "suggest_equipment",
          serviceScope: serviceScope,
        },
      });

      if (error) throw error;
      setSuggestions(data?.suggestions || []);
    } catch (error) {
      console.error("Error fetching equipment suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEquipment = (equipmentId: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipmentId)
        ? prev.filter((id) => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleAddSelected = () => {
    const selectedItems = suggestions.filter((eq) =>
      selectedEquipment.includes(eq.id)
    );
    const newEquipmentText = selectedItems
      .map((eq) => `${eq.name} (${eq.code})`)
      .join("\n");

    const updatedText = currentEquipmentText
      ? `${currentEquipmentText}\n${newEquipmentText}`
      : newEquipmentText;

    onAddEquipment(updatedText);
    setSelectedEquipment([]);
  };

  if (serviceScope.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Sugestões de Equipamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : suggestions.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground">
              Equipamentos sugeridos com base no escopo selecionado:
            </p>
            <div className="space-y-2">
              {suggestions.map((equipment) => (
                <div
                  key={equipment.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
                >
                  <Checkbox
                    id={equipment.id}
                    checked={selectedEquipment.includes(equipment.id)}
                    onCheckedChange={() => handleToggleEquipment(equipment.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        htmlFor={equipment.id}
                        className="font-medium text-sm cursor-pointer"
                      >
                        {equipment.name}
                      </label>
                      <Badge variant="outline" className="text-xs">
                        {equipment.code}
                      </Badge>
                      <Badge
                        variant={
                          equipment.status === "available"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {equipment.status === "available"
                          ? "Disponível"
                          : "Em serviço"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {equipment.reason}
                    </p>
                    {equipment.next_calibration && (
                      <div className="flex items-center gap-1 mt-1">
                        {new Date(equipment.next_calibration) < new Date() ? (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          Calibração:{" "}
                          {new Date(
                            equipment.next_calibration
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectedEquipment.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleAddSelected}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar {selectedEquipment.length} equipamento
                {selectedEquipment.length > 1 ? "s" : ""} selecionado
                {selectedEquipment.length > 1 ? "s" : ""}
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhum equipamento disponível para o escopo selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
