import { Check, CircleDot, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SERVICE_PHASES, type ServiceOperationalStatus } from "@/lib/serviceLifecycle";

interface ServicePhaseStepperProps {
  status: ServiceOperationalStatus;
}

export const ServicePhaseStepper = ({ status }: ServicePhaseStepperProps) => {
  const currentIndex = Math.max(0, SERVICE_PHASES.findIndex((phase) => phase.value === status));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start">
        {SERVICE_PHASES.map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={phase.value} className="flex items-start">
              <div className="flex w-24 flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary",
                    !isComplete && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : isCurrent ? <CircleDot className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </div>
                <span className={cn("mt-2 text-xs leading-tight", isCurrent ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {phase.label}
                </span>
              </div>
              {index < SERVICE_PHASES.length - 1 && (
                <div className={cn("mt-4 h-px w-6", index < currentIndex ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
      <Badge variant="secondary" className="mt-3">
        {SERVICE_PHASES[currentIndex].description}
      </Badge>
    </div>
  );
};
