import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, ClipboardList, Download, Search, Users, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/utils/exportUtils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface Service {
  id: string;
  codigo_jbr: string;
  cliente: string;
  local: string | null;
  escopo: string[] | null;
  outros_escopo: string | null;
  aplicacao: string | null;
  equipamentos: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  collaborators_count?: number;
  checklists_count?: number;
}

const Servicos = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    try {
      // Use RPC function to get services with counts in a single query (optimized, no N+1)
      const { data, error } = await supabase.rpc("get_services_with_counts");

      if (error) throw error;

      setServices((data || []) as Service[]);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Erro ao carregar serviços",
        description: "Não foi possível carregar a lista de serviços.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    const filtered = services.filter(service =>
      service.codigo_jbr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.aplicacao?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredServices(filtered);
  }, [services, searchTerm]);

  const handleExport = () => {
    const exportData = filteredServices.map(s => ({
      'Código JBR': s.codigo_jbr,
      'Cliente': s.cliente,
      'Local': s.local || '',
      'Escopo': s.escopo?.join(', ') || '',
      'Outros Escopo': s.outros_escopo || '',
      'Aplicação': s.aplicacao || '',
      'Equipamentos': s.equipamentos || '',
      'Data Início': s.data_inicio || '',
      'Data Término': s.data_termino || '',
      'Colaboradores': s.collaborators_count || 0,
      'Checklists': s.checklists_count || 0,
    }));
    exportToExcel(exportData, `servicos_${new Date().toISOString().split('T')[0]}`, 'Serviços');
    toast({ title: "Exportado com sucesso", description: `${exportData.length} serviços exportados` });
  };

  useKeyboardShortcuts([
    { key: 'n', ctrl: true, callback: () => navigate("/novo-servico"), description: 'Novo serviço' },
    { key: 'e', ctrl: true, callback: handleExport, description: 'Exportar serviços' },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('services.title')}</h1>
              <p className="text-muted-foreground mt-2">
                {t('services.manageServices')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center gap-2"
                disabled={filteredServices.length === 0}
              >
                <Download className="h-4 w-4" />
                {t('common.download')} Excel
              </Button>
              <Button
                onClick={() => navigate("/novo-servico")}
                className="flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                {t('services.newService')}
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('services.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('services.serviceList')}</CardTitle>
            <CardDescription>
              {t('services.allServices')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <EmptyState
                icon={searchTerm ? Search : ClipboardList}
                title={searchTerm ? t('search.noResults') : t('services.noServices')}
                description={searchTerm ? t('services.adjustSearch') : t('services.createFirst')}
                actionLabel={t('services.createFirstService')}
                onAction={() => navigate("/novo-servico")}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('services.serviceCode')}</TableHead>
                    <TableHead>{t('services.client')}</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>{t('services.scope')}</TableHead>
                    <TableHead>Vínculos</TableHead>
                    <TableHead>{t('services.startDate')}</TableHead>
                    <TableHead>{t('services.endDate')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service, index) => (
                    <TableRow 
                      key={service.id}
                      className="animate-fade-in transition-all hover:bg-muted/50"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium">{service.codigo_jbr}</TableCell>
                      <TableCell>{service.cliente}</TableCell>
                      <TableCell>
                        {service.local ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-32">{service.local}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {service.escopo && service.escopo.length > 0 ? (
                          <div className="space-y-1">
                            {service.escopo.slice(0, 2).map((esc, idx) => (
                              <div key={idx} className="text-sm">
                                {esc}
                                {esc === "Outros" && service.outros_escopo && (
                                  <span className="text-muted-foreground ml-1">
                                    ({service.outros_escopo})
                                  </span>
                                )}
                              </div>
                            ))}
                            {service.escopo.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{service.escopo.length - 2} mais
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(service.collaborators_count || 0) > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                              <Users className="h-3 w-3" />
                              {service.collaborators_count}
                            </Badge>
                          )}
                          {(service.checklists_count || 0) > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                              <ClipboardList className="h-3 w-3" />
                              {service.checklists_count}
                            </Badge>
                          )}
                          {!service.collaborators_count && !service.checklists_count && "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {service.data_inicio
                          ? new Date(service.data_inicio).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {service.data_termino
                          ? new Date(service.data_termino).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/servico/${service.id}/timeline`)}
                            className="transition-all hover:scale-110 active:scale-95"
                            title="Ver Timeline"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/editar-servico/${service.id}`)}
                            className="transition-all hover:scale-110 active:scale-95"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Servicos;
