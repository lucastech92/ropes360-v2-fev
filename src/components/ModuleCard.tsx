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
      <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader>
          <div className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-lg",
            color === "primary" && "bg-primary/10 text-primary",
            color === "accent" && "bg-accent/10 text-accent"
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base leading-relaxed">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ModuleCard;
