import { useHealthScore, type HealthScoreData } from "@/hooks/useHealthScore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, ShieldCheck, Wrench, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const getScoreColor = (score: number) => {
  if (score >= 80) return { text: "text-emerald-500", stroke: "stroke-emerald-500", bg: "bg-emerald-500/10", label: "Excelente" };
  if (score >= 60) return { text: "text-yellow-500", stroke: "stroke-yellow-500", bg: "bg-yellow-500/10", label: "Atenção" };
  return { text: "text-destructive", stroke: "stroke-destructive", bg: "bg-destructive/10", label: "Crítico" };
};

const GaugeChart = ({ score, size = 180 }: { score: number; size?: number }) => {
  const colors = getScoreColor(score);
  const radius = (size - 24) / 2;
  const circumference = Math.PI * radius; // semicircle
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M 12 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2 + 8}`}
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M 12 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2 + 8}`}
          fill="none"
          className={colors.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${circumference - progress}`}
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className={cn("text-4xl font-bold tabular-nums", colors.text)}>{score}</span>
        <span className="text-lg text-muted-foreground">/100</span>
        <p className={cn("text-xs font-medium mt-0.5", colors.text)}>{colors.label}</p>
      </div>
    </div>
  );
};

interface FactorCardProps {
  icon: React.ElementType;
  label: string;
  score: number;
  detail: string;
}

const FactorCard = ({ icon: Icon, label, score, detail }: FactorCardProps) => {
  const colors = getScoreColor(score);
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors", colors.bg)}>
      <div className={cn("p-2 rounded-md", colors.bg)}>
        <Icon className={cn("h-4 w-4", colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
      </div>
      <span className={cn("text-lg font-bold tabular-nums", colors.text)}>{score}%</span>
    </div>
  );
};

interface HealthScoreGaugeProps {
  compact?: boolean;
}

export const HealthScoreGauge = ({ compact = false }: HealthScoreGaugeProps) => {
  const { data, isLoading } = useHealthScore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Skeleton className="h-24 w-44 rounded-t-full" />
          <div className="grid grid-cols-2 gap-2 w-full">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const factors: FactorCardProps[] = [
    {
      icon: Award,
      label: "Certificações",
      score: data.certifications.score,
      detail: `${data.certifications.valid}/${data.certifications.total} válidos`,
    },
    {
      icon: ShieldCheck,
      label: "Calibrações",
      score: data.calibrations.score,
      detail: `${data.calibrations.valid}/${data.calibrations.total} em dia`,
    },
    {
      icon: Wrench,
      label: "Manutenções",
      score: data.maintenance.score,
      detail: `${data.maintenance.ontime}/${data.maintenance.total} no prazo`,
    },
    {
      icon: Package,
      label: "Estoque",
      score: data.inventory.score,
      detail: `${data.inventory.ok}/${data.inventory.total} acima do mínimo`,
    },
  ];

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex items-center gap-4">
          <GaugeChart score={data.overall} size={120} />
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              Saúde Operacional
            </p>
            {factors.map(f => (
              <div key={f.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{f.label}</span>
                <span className={cn("font-medium", getScoreColor(f.score).text)}>{f.score}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Saúde Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <GaugeChart score={data.overall} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {factors.map(f => (
            <FactorCard key={f.label} {...f} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
