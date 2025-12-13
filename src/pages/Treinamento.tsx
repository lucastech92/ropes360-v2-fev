import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen, Gamepad2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Treinamento = () => {
  const treinamentos = [
    {
      title: "Introdução aos Cabos de Aço",
      duracao: "2 horas",
      descricao: "Fundamentos sobre tipos de cabos, construções e aplicações industriais."
    },
    {
      title: "Inspeção Visual Avançada",
      duracao: "4 horas",
      descricao: "Técnicas avançadas de identificação de defeitos e critérios de descarte."
    },
    {
      title: "Operação do INTROS",
      duracao: "6 horas",
      descricao: "Treinamento completo para operação e interpretação de resultados do equipamento eletromagnético."
    },
    {
      title: "Segurança em Campo",
      duracao: "3 horas",
      descricao: "Procedimentos de segurança, uso de EPIs e trabalho em altura."
    }
  ];

  const glossario = [
    { termo: "LMA", definicao: "Loss of Metallic Area - Perda de área metálica do cabo, geralmente causada por corrosão ou desgaste." },
    { termo: "LF", definicao: "Local Fault - Defeito localizado como arames rompidos ou amassamentos." },
    { termo: "Baseline", definicao: "Linha de base de referência estabelecida durante calibração do equipamento de inspeção." },
    { termo: "Soquete", definicao: "Terminal fixado na extremidade do cabo através de resina ou metal fundido." },
    { termo: "Torção", definicao: "Padrão de enrolamento dos arames que compõem o cabo de aço." }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Treinamento e Glossário</h1>
          <p className="text-muted-foreground">
            Materiais educativos e glossário técnico para desenvolvimento profissional.
          </p>
        </div>

        {/* Game Card */}
        <Card className="mb-12 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Jogo Interativo ISO 4309</CardTitle>
                  <CardDescription className="text-base">
                    Pratique a identificação de defeitos em cabos de aço com cenários reais
                  </CardDescription>
                </div>
              </div>
              <Link to="/treinamento-iso4309">
                <Button className="gap-2">
                  Jogar Agora
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-semibold">Treinamentos Disponíveis</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {treinamentos.map((treino, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                      {treino.duracao}
                    </span>
                  </div>
                  <CardTitle>{treino.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{treino.descricao}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold">Glossário Técnico</h2>
          </div>
          
          <div className="grid gap-4">
            {glossario.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{item.termo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.definicao}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Treinamento;
