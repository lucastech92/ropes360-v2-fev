import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  FileText,
  Briefcase,
  Package,
  Wrench,
  CheckSquare,
  ClipboardList,
  Users,
  Folder,
  BookOpen,
  Gauge,
  Home,
  LayoutDashboard,
  Sparkles,
  Calendar,
  Award,
  History,
  Bell,
  Download,
  Plus,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type NavAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  keywords?: string;
  roles?: Array<"admin" | "moderator" | "inspector" | "viewer">;
};

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
};

// -------- Context so any button can open the palette --------
const PaletteCtx = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(PaletteCtx);

const QUICK_ACTIONS: NavAction[] = [
  { label: "Novo serviço", icon: Plus, path: "/novo-servico", keywords: "criar cadastrar jbr" },
];

const ALL_NAV: NavAction[] = [
  { label: "Página principal", icon: Home, path: "/" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Assistente Técnico IA", icon: Sparkles, path: "/assistente-tecnico", keywords: "ia chat rag" },
  { label: "Serviços", icon: Briefcase, path: "/servicos", keywords: "jbr" },
  { label: "Check List", icon: CheckSquare, path: "/checklist" },
  { label: "Inventário", icon: Package, path: "/inventario", keywords: "equipamento estoque" },
  { label: "Modelos de Relatórios", icon: FileText, path: "/modelos-relatorios" },
  { label: "Inspeção de Cabo", icon: Wrench, path: "/wire-rope-inspection", keywords: "wire rope iso 4309" },
  { label: "Relatórios Salvos", icon: ClipboardList, path: "/saved-reports" },
  { label: "Meus Downloads", icon: Download, path: "/meus-downloads" },
  { label: "Notificações", icon: Bell, path: "/notificacoes" },
  { label: "Instalar App", icon: Download, path: "/install" },
  // admin / moderator only
  { label: "Procedimentos Oficiais", icon: FileText, path: "/procedimentos-oficiais", roles: ["admin", "moderator"] },
  { label: "Dúvidas Frequentes", icon: BookOpen, path: "/duvidas-frequentes", roles: ["admin", "moderator"] },
  { label: "Histórico", icon: History, path: "/historico", roles: ["admin", "moderator"] },
  { label: "Folha de Ponto", icon: Calendar, path: "/folha-ponto", roles: ["admin", "moderator"] },
  { label: "Calendário", icon: Calendar, path: "/calendario", roles: ["admin", "moderator"] },
  { label: "Certificações", icon: Award, path: "/certificacoes", roles: ["admin", "moderator"] },
  { label: "Gerenciar Usuários", icon: Users, path: "/gerenciar-usuarios", roles: ["admin", "moderator"] },
  { label: "Relatório Executivo", icon: Gauge, path: "/relatorio-executivo", roles: ["admin", "moderator"] },
];

export const CommandPaletteProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { role } = useUserRole();

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Backend search (debounced)
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const term = `%${query}%`;
        const [docs, services, inv, checklists, reports] = await Promise.all([
          supabase.from("documents").select("id,title,description,category").or(`title.ilike.${term},description.ilike.${term}`).limit(4),
          supabase.from("services").select("id,codigo_jbr,cliente,local").or(`codigo_jbr.ilike.${term},cliente.ilike.${term},local.ilike.${term}`).limit(4),
          supabase.from("inventory").select("id,item_name,category,code").or(`item_name.ilike.${term},category.ilike.${term},code.ilike.${term}`).limit(4),
          supabase.from("checklists").select("id,name,checklist_type,is_template").or(`name.ilike.${term},description.ilike.${term}`).limit(4),
          supabase.from("inspection_reports").select("id,report_number,title").or(`report_number.ilike.${term},title.ilike.${term}`).limit(4),
        ]);
        const out: SearchResult[] = [];
        const catRoutes: Record<string, string> = {
          procedimentos_oficiais: "/procedimentos-oficiais",
          modelos_relatorios: "/modelos-relatorios",
          duvidas_frequentes: "/duvidas-frequentes",
          historico: "/historico",
        };
        docs.data?.forEach((d) =>
          out.push({ id: `d-${d.id}`, title: d.title, subtitle: d.description ?? undefined, group: "Documentos", icon: FileText, path: catRoutes[d.category] ?? "/procedimentos-oficiais" }),
        );
        services.data?.forEach((s) =>
          out.push({ id: `s-${s.id}`, title: `JBR ${s.codigo_jbr}`, subtitle: `${s.cliente}${s.local ? ` · ${s.local}` : ""}`, group: "Serviços", icon: Briefcase, path: "/servicos" }),
        );
        inv.data?.forEach((i) =>
          out.push({ id: `i-${i.id}`, title: i.item_name, subtitle: `${i.category ?? ""}${i.code ? ` · ${i.code}` : ""}`, group: "Inventário", icon: Package, path: "/inventario" }),
        );
        checklists.data?.forEach((c) =>
          out.push({ id: `c-${c.id}`, title: c.name, subtitle: `${c.is_template ? "Template" : "Checklist"} · ${c.checklist_type ?? "Geral"}`, group: "Checklists", icon: CheckSquare, path: "/checklist" }),
        );
        reports.data?.forEach((r) =>
          out.push({ id: `r-${r.id}`, title: r.title ?? `Relatório ${r.report_number}`, subtitle: `Nº ${r.report_number}`, group: "Relatórios", icon: ClipboardList, path: "/saved-reports" }),
        );
        setResults(out);
      } catch (e) {
        console.error("[palette] search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const openPalette = useCallback(() => setOpen(true), []);
  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const canSee = (a: NavAction) => !a.roles || (role && a.roles.includes(role));
  const nav = ALL_NAV.filter(canSee);
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  return (
    <PaletteCtx.Provider value={{ open: openPalette }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={isSearching ? "Buscando…" : "Buscar módulos, serviços, inventário, relatórios…"}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 2
              ? "Digite ao menos 2 caracteres para buscar."
              : `Nenhum resultado para "${query}"`}
          </CommandEmpty>

          {query.length < 2 && (
            <>
              <CommandGroup heading="Ações rápidas">
                {QUICK_ACTIONS.map((a) => (
                  <CommandItem key={a.path} value={`${a.label} ${a.keywords ?? ""}`} onSelect={() => go(a.path)}>
                    <a.icon className="mr-2 h-4 w-4 text-primary" />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Navegar">
                {nav.map((a) => (
                  <CommandItem key={a.path} value={`${a.label} ${a.keywords ?? ""}`} onSelect={() => go(a.path)}>
                    <a.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {Object.entries(grouped).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((r) => (
                <CommandItem key={r.id} value={`${r.title} ${r.subtitle ?? ""}`} onSelect={() => go(r.path)}>
                  <r.icon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">{r.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </PaletteCtx.Provider>
  );
};

/** Big search-input-lookalike button used in the Home hero. */
export const CommandPaletteTrigger = ({ className = "" }: { className?: string }) => {
  const { open } = useCommandPalette();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Abrir busca e navegação"
      className={`group relative w-full max-w-2xl inline-flex items-center gap-3 rounded-lg border bg-background/80 backdrop-blur pl-3 pr-2 h-11 md:h-12 text-left text-sm text-muted-foreground shadow-sm hover:border-primary/50 hover:text-foreground transition-colors ${className}`}
    >
      <Search className="h-4 w-4 md:h-5 md:w-5" />
      <span className="flex-1 truncate">Buscar em todos os módulos…</span>
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
        {isMac ? "⌘" : "Ctrl"}
        <span>K</span>
      </kbd>
    </button>
  );
};

/** Floating action button for mobile to open the palette. */
export const CommandPaletteFab = () => {
  const { open } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Abrir busca"
      className="md:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
    >
      <Search className="h-6 w-6" />
    </button>
  );
};

/** Header icon button (desktop). */
export const CommandPaletteHeaderButton = () => {
  const { open } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Buscar (Ctrl+K)"
      className="hidden md:inline-flex items-center gap-2 rounded-md border bg-background/60 px-2.5 h-8 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Buscar</span>
      <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
    </button>
  );
};
