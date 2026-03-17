import { Link } from "react-router-dom";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color?: string;
}

const ModuleCard = ({ title, description, icon: Icon, href, color = "primary" }: ModuleCardProps) => {
  return (
    <Link to={href} className="group block">
      <Card className="h-full overflow-hidden relative transition-all duration-300 hover:shadow-card-hover md:hover:-translate-y-2 md:hover:scale-[1.02] active:scale-[0.98] border-border/50 bg-card/80 backdrop-blur-sm">
        {/* Gradient overlay on hover */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          color === "primary" && "bg-gradient-to-br from-primary/5 via-transparent to-primary/10",
          color === "accent" && "bg-gradient-to-br from-accent/5 via-transparent to-accent/10"
        )} />
        
        {/* Top accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500",
          color === "primary" && "bg-gradient-to-r from-primary to-primary/50",
          color === "accent" && "bg-gradient-to-r from-accent to-accent/50"
        )} />

        <CardHeader className="relative p-4 md:p-6 pb-2 md:pb-3">
          <div className="flex items-start justify-between">
            <div className={cn(
              "mb-3 md:mb-4 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110",
              color === "primary" && "bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner group-hover:shadow-glow group-hover:from-primary/30",
              color === "accent" && "bg-gradient-to-br from-accent/20 to-accent/5 text-accent shadow-inner group-hover:shadow-glow group-hover:from-accent/30"
            )}>
              <Icon className="h-6 w-6 md:h-7 md:w-7 transition-all duration-300 group-hover:scale-110" />
            </div>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0",
              color === "primary" && "bg-primary/10 text-primary",
              color === "accent" && "bg-accent/10 text-accent"
            )}>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <CardTitle className="text-base md:text-lg font-semibold transition-all duration-300 group-hover:text-primary">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative p-4 pt-0 md:p-6 md:pt-0">
          <CardDescription className="text-sm leading-relaxed line-clamp-2 md:line-clamp-3 text-muted-foreground/80 mb-3">
            {description}
          </CardDescription>
          <div className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-300 group-hover:gap-2.5",
            color === "primary" && "text-primary",
            color === "accent" && "text-accent"
          )}>
            Acessar
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ModuleCard;
