import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardCheck, Package, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { supabase } from "@/integrations/supabase/client";
import { getDateLocale } from "@/utils/dateLocale";

const greeting = (hour: number) => {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

/** Personalized greeting header with the primary operational actions. */
export const HomeHero = () => {
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const name = (data?.full_name as string | null) ?? user.email ?? "";
      if (active) setFirstName(name.split(/[\s@]/)[0] ?? "");
    });
    return () => {
      active = false;
    };
  }, []);

  const now = new Date();

  return (
    <section className="relative overflow-hidden border-b bg-card">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-70"
        aria-hidden="true"
      />
      <div className="container relative px-4 py-7 sm:py-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {format(now, "EEEE, d 'de' MMMM", { locale: getDateLocale() })}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Visão da operação Ropes<span className="font-semibold text-primary">360</span>: serviços,
          materiais e pessoas em um só fluxo.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/novo-servico">
              <Plus className="h-4 w-4" /> Novo JBR
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary" className="gap-1.5">
            <Link to="/checklist">
              <ClipboardCheck className="h-4 w-4" /> Novo checklist
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/inventario">
              <Package className="h-4 w-4" /> Inventário
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/assistente-tecnico">
              <Sparkles className="h-4 w-4" /> Assistente técnico
            </Link>
          </Button>
          <div className="hidden sm:block">
            <CommandPaletteTrigger />
          </div>
        </div>
      </div>
    </section>
  );
};
