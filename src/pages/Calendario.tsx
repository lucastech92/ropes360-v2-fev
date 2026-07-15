import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useToast } from "@/hooks/use-toast";

const Calendario = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEventClick = (event: CalendarEvent) => {
    switch (event.type) {
      case "service":
        if (event.metadata?.serviceId) {
          toast({
            title: "Serviço",
            description: `Navegando para detalhes de ${event.title}`,
          });
          navigate("/servicos");
        }
        break;
      case "maintenance":
        if (event.metadata?.maintenanceId) {
          toast({
            title: "Manutenção",
            description: `Visualizando ${event.title}`,
          });
          navigate("/inventario?tab=maintenance");
        }
        break;
      case "calibration":
        toast({
          title: "Calibração",
          description: `Equipamento: ${event.title}`,
        });
        navigate("/inventario?tab=items&type=equipamento");
        break;
      case "timesheet":
        toast({
          title: "Folha de Ponto",
          description: event.description || "Registro de ponto",
        });
        navigate("/folha-ponto");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Calendário Integrado</h1>
          <p className="text-muted-foreground mt-1">
            Visualização unificada de serviços, manutenções, calibrações e folha de ponto
          </p>
        </div>

        <CalendarView onEventClick={handleEventClick} />
      </main>
    </div>
  );
};

export default Calendario;

