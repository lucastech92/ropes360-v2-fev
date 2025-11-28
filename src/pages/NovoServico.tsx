import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2 } from "lucide-react";
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

const ESCOPO_OPTIONS = [
  "MRT - Eletromagnético",
  "Inspeção Visual",
  "Soquetagem",
  "Lubrificação",
  "Spooler",
  "Outros"
];

const NovoServico = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    codigo_jbr: "",
    cliente: "",
    escopo: [] as string[],
    outros_escopo: "",
    aplicacao: "",
    equipamentos: "",
    data_inicio: "",
    data_termino: "",
  });

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id]);

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          codigo_jbr: data.codigo_jbr || "",
          cliente: data.cliente || "",
          escopo: data.escopo || [],
          outros_escopo: data.outros_escopo || "",
          aplicacao: data.aplicacao || "",
          equipamentos: data.equipamentos || "",
          data_inicio: data.data_inicio || "",
          data_termino: data.data_termino || "",
        });
      }
    } catch (error) {
      console.error("Error fetching service:", error);
      toast({
        title: "Erro ao carregar serviço",
        description: "Não foi possível carregar os dados do serviço.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const serviceData = {
        codigo_jbr: formData.codigo_jbr,
        cliente: formData.cliente,
        escopo: formData.escopo.length > 0 ? formData.escopo : null,
        outros_escopo: formData.outros_escopo || null,
        aplicacao: formData.aplicacao || null,
        equipamentos: formData.equipamentos || null,
        data_inicio: formData.data_inicio || null,
        data_termino: formData.data_termino || null,
      };

      if (id) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Serviço atualizado com sucesso!",
          description: `O serviço ${formData.codigo_jbr} foi atualizado.`,
        });
      } else {
        const { error } = await supabase.from("services").insert({
          ...serviceData,
          created_by: user.id,
        });

        if (error) throw error;

        toast({
          title: "Serviço criado com sucesso!",
          description: `O serviço ${formData.codigo_jbr} foi registrado.`,
        });
      }

      navigate("/servicos");
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: id ? "Erro ao atualizar serviço" : "Erro ao criar serviço",
        description: "Não foi possível salvar o serviço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Serviço excluído",
        description: "O serviço foi removido com sucesso.",
      });

      navigate("/servicos");
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Erro ao excluir serviço",
        description: "Não foi possível remover o serviço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/servicos")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{id ? t('services.editService') : t('services.newService')}</CardTitle>
            <CardDescription>
              {id ? t('services.updateData') : t('services.fillData')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="codigo_jbr">{t('services.serviceCode')} *</Label>
                <Input
                  id="codigo_jbr"
                  value={formData.codigo_jbr}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo_jbr: e.target.value })
                  }
                  placeholder="Ex: JBR-2025-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">{t('services.client')} *</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, cliente: e.target.value })
                  }
                  placeholder={t('services.clientName')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t('services.scope')} *</Label>
                <div className="space-y-3">
                  {ESCOPO_OPTIONS.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={formData.escopo.includes(option)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              escopo: [...formData.escopo, option],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              escopo: formData.escopo.filter((e) => e !== option),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={option} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.escopo.includes("Outros") && (
                  <div className="mt-3">
                    <Input
                      placeholder="Especifique outros serviços"
                      value={formData.outros_escopo}
                      onChange={(e) =>
                        setFormData({ ...formData, outros_escopo: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="aplicacao">{t('services.application')}</Label>
                <Textarea
                  id="aplicacao"
                  value={formData.aplicacao}
                  onChange={(e) =>
                    setFormData({ ...formData, aplicacao: e.target.value })
                  }
                  placeholder={t('services.applicationDesc')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipamentos">{t('services.equipment')}</Label>
                <Textarea
                  id="equipamentos"
                  value={formData.equipamentos}
                  onChange={(e) =>
                    setFormData({ ...formData, equipamentos: e.target.value })
                  }
                  placeholder={t('services.equipmentList')}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">{t('services.startDate')}</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, data_inicio: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_termino">{t('services.endDate')}</Label>
                  <Input
                    id="data_termino"
                    type="date"
                    value={formData.data_termino}
                    onChange={(e) =>
                      setFormData({ ...formData, data_termino: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-between gap-4">
                {id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={loading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Serviço
                  </Button>
                )}
                <div className="flex gap-4 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/servicos")}
                    disabled={loading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? t('common.saving') : id ? t('common.update') : t('common.save')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o serviço {formData.codigo_jbr}? Esta ação não pode ser desfeita e todos os dados relacionados serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Excluir Serviço
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default NovoServico;
