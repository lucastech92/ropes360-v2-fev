import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
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
    <Link to={href} className="group">
      <Card className="h-full overflow-hidden relative transition-all duration-300 hover:shadow-card-hover hover:-translate-y-2 hover:scale-[1.02] border-border/50">
        <div className="absolute inset-0 bg-gradient-mesh opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="relative">
          <div className={cn(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
            color === "primary" && "bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner group-hover:shadow-glow",
            color === "accent" && "bg-gradient-to-br from-accent/20 to-accent/5 text-accent shadow-inner group-hover:shadow-glow"
          )}>
            <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <CardTitle className="text-xl transition-all duration-300 group-hover:text-gradient-primary">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <CardDescription className="text-base leading-relaxed">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ModuleCard;
