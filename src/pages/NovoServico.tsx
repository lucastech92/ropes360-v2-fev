import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const NovoServico = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo_jbr: "",
    cliente: "",
    escopo: "",
    equipamentos: "",
    data_inicio: "",
    data_termino: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase.from("services").insert({
        codigo_jbr: formData.codigo_jbr,
        cliente: formData.cliente,
        escopo: formData.escopo || null,
        equipamentos: formData.equipamentos || null,
        data_inicio: formData.data_inicio || null,
        data_termino: formData.data_termino || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Serviço criado com sucesso!",
        description: `O serviço ${formData.codigo_jbr} foi registrado.`,
      });

      navigate("/servicos");
    } catch (error) {
      console.error("Error creating service:", error);
      toast({
        title: "Erro ao criar serviço",
        description: "Não foi possível salvar o serviço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Novo Serviço</CardTitle>
            <CardDescription>
              Preencha os dados do serviço a ser cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="codigo_jbr">Código JBR *</Label>
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
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, cliente: e.target.value })
                  }
                  placeholder="Nome do cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="escopo">Escopo</Label>
                <Textarea
                  id="escopo"
                  value={formData.escopo}
                  onChange={(e) =>
                    setFormData({ ...formData, escopo: e.target.value })
                  }
                  placeholder="Descreva o escopo do serviço"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipamentos">Equipamentos</Label>
                <Textarea
                  id="equipamentos"
                  value={formData.equipamentos}
                  onChange={(e) =>
                    setFormData({ ...formData, equipamentos: e.target.value })
                  }
                  placeholder="Liste os equipamentos necessários"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
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
                  <Label htmlFor="data_termino">Data de Término</Label>
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

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/servicos")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovoServico;
