import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles,
  Package,
  Clock,
  ArrowRight,
  Lightbulb,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface TrendsData {
  summary: {
    totalItems: number;
    criticalCount: number;
    lowStockCount: number;
    averageConsumptionRate: number;
  };
  criticalItems: Array<{
    id: string;
    name: string;
    category: string;
    currentQuantity: number;
    minQuantity: number;
    daysUntilStockout: number | null;
    dailyConsumptionRate: number;
    unit: string;
  }>;
  highConsumptionItems: Array<{
    id: string;
    name: string;
    category: string;
    dailyConsumptionRate: number;
    weeklyConsumption: number[];
    currentQuantity: number;
  }>;
  aiInsights: {
    urgentActions?: string[];
    trends?: string[];
    recommendations?: string[];
    predictedRestockNeeds?: Array<{
      item: string;
      suggestedQuantity: number;
      reason: string;
    }>;
  } | null;
}

export function InventoryTrendsAI() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TrendsData | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const fetchTrends = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      
      const { data: result, error } = await supabase.functions.invoke("inventory-trends-ai");
      
      if (error) throw error;
      setData(result);
      
      if (showRefreshToast) {
        toast.success("Análise atualizada com sucesso");
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
      toast.error("Erro ao carregar análise de tendências");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const getConsumptionChartData = (item: TrendsData['highConsumptionItems'][0] | undefined) => {
    if (!item?.weeklyConsumption) return [];
    return item.weeklyConsumption.map((value, index) => ({
      week: `S${index + 1}`,
      consumo: value,
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Não foi possível carregar a análise de tendências</p>
          <Button onClick={() => fetchTrends()} className="mt-4">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedItemData = selectedItem 
    ? data.highConsumptionItems.find(i => i.id === selectedItem)
    : data.highConsumptionItems[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Detecção de Tendências com IA
          </h2>
          <p className="text-muted-foreground">
            Análise preditiva de consumo e reposição de inventário
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchTrends(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{data.summary.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className={data.summary.criticalCount > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Itens Críticos</p>
                <p className="text-2xl font-bold text-destructive">
                  {data.summary.criticalCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className={data.summary.lowStockCount > 0 ? "border-warning" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-amber-500">
                  {data.summary.lowStockCount}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consumo Médio/Dia</p>
                <p className="text-2xl font-bold">
                  {data.summary.averageConsumptionRate}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Itens Críticos
            </CardTitle>
            <CardDescription>
              Itens com estoque baixo ou esgotamento iminente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {data.criticalItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum item crítico detectado
                </div>
              ) : (
                <div className="space-y-3">
                  {data.criticalItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <span>•</span>
                          <span>
                            {item.currentQuantity} {item.unit || 'un'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {item.daysUntilStockout !== null && (
                          <Badge 
                            variant={item.daysUntilStockout <= 3 ? "destructive" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {item.daysUntilStockout}d
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.dailyConsumptionRate}/dia
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Consumption Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendência de Consumo
            </CardTitle>
            <CardDescription>
              Consumo semanal dos últimos 3 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-2">
                  {data.highConsumptionItems.slice(0, 5).map((item) => (
                    <Badge
                      key={item.id}
                      variant={selectedItem === item.id || (!selectedItem && item.id === data.highConsumptionItems[0]?.id) ? "default" : "outline"}
                      className="cursor-pointer shrink-0"
                      onClick={() => setSelectedItem(item.id)}
                    >
                      {item.name}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {selectedItemData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={getConsumptionChartData(selectedItemData)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Selecione um item para ver a tendência
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        {data.aiInsights && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Insights da IA
              </CardTitle>
              <CardDescription>
                Análise inteligente e recomendações baseadas nos dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Urgent Actions */}
                {data.aiInsights.urgentActions && data.aiInsights.urgentActions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Ações Urgentes
                    </h4>
                    <ul className="space-y-1">
                      {data.aiInsights.urgentActions.map((action, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-destructive" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trends */}
                {data.aiInsights.trends && data.aiInsights.trends.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-primary">
                      <TrendingUp className="h-4 w-4" />
                      Tendências Detectadas
                    </h4>
                    <ul className="space-y-1">
                      {data.aiInsights.trends.map((trend, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-primary" />
                          <span>{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {data.aiInsights.recommendations && data.aiInsights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-green-600">
                      <Lightbulb className="h-4 w-4" />
                      Recomendações
                    </h4>
                    <ul className="space-y-1">
                      {data.aiInsights.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-green-600" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Restock Predictions */}
                {data.aiInsights.predictedRestockNeeds && data.aiInsights.predictedRestockNeeds.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                      <Target className="h-4 w-4" />
                      Previsão de Reposição
                    </h4>
                    <ul className="space-y-2">
                      {data.aiInsights.predictedRestockNeeds.map((need, i) => (
                        <li key={i} className="text-sm bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                          <p className="font-medium">{need.item}</p>
                          <p className="text-xs text-muted-foreground">
                            Sugestão: +{need.suggestedQuantity} un
                          </p>
                          <p className="text-xs text-muted-foreground">{need.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Consumption Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Top 10 Itens Mais Consumidos
            </CardTitle>
            <CardDescription>
              Taxa de consumo diário (últimos 90 dias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data.highConsumptionItems.map(i => ({
                  name: i.name.length > 20 ? i.name.substring(0, 20) + '...' : i.name,
                  consumo: i.dailyConsumptionRate,
                  estoque: i.currentQuantity,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  className="text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="consumo" fill="hsl(var(--primary))" radius={4}>
                  {data.highConsumptionItems.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={index < 3 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
