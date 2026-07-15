import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statCardVariants = cva(
  "transition-all group",
  {
    variants: {
      tone: {
        default: "border-border hover:shadow-md",
        primary: "border-primary/20 hover:border-primary hover:shadow-xl",
        accent: "border-accent/30 hover:border-accent hover:shadow-xl",
        success: "border-green-500/20 hover:border-green-500/60 hover:shadow-lg",
        warning: "border-yellow-500/30 hover:border-yellow-500/70 hover:shadow-lg",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: { tone: "default", interactive: false },
  }
);

const iconToneClass: Record<NonNullable<VariantProps<typeof statCardVariants>["tone"]>, string> = {
  default: "text-muted-foreground",
  primary: "text-primary",
  accent: "text-accent",
  success: "text-green-600",
  warning: "text-yellow-600",
};

export interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof statCardVariants> {
  title: React.ReactNode;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: React.ReactNode;
  showArrow?: boolean;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, tone = "default", interactive, title, value, icon: Icon, hint, showArrow, onClick, ...props }, ref) => {
    const isInteractive = interactive ?? Boolean(onClick);
    return (
      <Card
        ref={ref}
        onClick={onClick}
        className={cn(statCardVariants({ tone, interactive: isInteractive }), className)}
        {...props}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", iconToneClass[tone ?? "default"])} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {(hint || showArrow) && (
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="text-xs text-muted-foreground flex-1 min-w-0">{hint}</div>
              {showArrow && isInteractive && (
                <ArrowRight className={cn("h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity", iconToneClass[tone ?? "default"])} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

export { statCardVariants };

