import { LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional custom icon on the action button (defaults to Plus). */
  actionIcon?: LucideIcon;
  /** Optional secondary link/action (e.g. "Ver templates"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  secondaryLabel,
  onSecondary,
  className,
}: EmptyStateProps) => {
  return (
    <Card
      className={cn(
        "p-8 md:p-12 text-center border-dashed transition-all hover:border-primary/50",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="rounded-full bg-muted p-5 md:p-6 animate-float">
          <Icon className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg md:text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        </div>
        {(actionLabel || secondaryLabel) && (
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
            {actionLabel && onAction && (
              <Button onClick={onAction} className="gap-2">
                <ActionIcon className="h-4 w-4" />
                {actionLabel}
              </Button>
            )}
            {secondaryLabel && onSecondary && (
              <Button variant="ghost" onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};


