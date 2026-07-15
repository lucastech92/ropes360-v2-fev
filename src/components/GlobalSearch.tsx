import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Briefcase, Package, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: "documents" | "services" | "inventory" | "maintenance";
  path: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Ctrl+K hotkey
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search function
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchAll = async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;

        // Search documents
        const { data: documents } = await supabase
          .from("documents")
          .select("id, title, description, category")
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        // Search services
        const { data: services } = await supabase
          .from("services")
          .select("id, codigo_jbr, cliente, aplicacao")
          .or(`codigo_jbr.ilike.${searchTerm},cliente.ilike.${searchTerm},aplicacao.ilike.${searchTerm}`)
          .limit(5);

        // Search inventory
        const { data: inventory } = await supabase
          .from("inventory")
          .select("id, item_name, category, location")
          .or(`item_name.ilike.${searchTerm},category.ilike.${searchTerm}`)
          .limit(5);

        // Search maintenance
        const { data: maintenance } = await supabase
          .from("maintenance_records")
          .select("id, equipment_name, equipment_code, description")
          .or(`equipment_name.ilike.${searchTerm},equipment_code.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);

        // Format results
        const allResults: SearchResult[] = [];

        documents?.forEach((doc) => {
          allResults.push({
            id: doc.id,
            title: doc.title,
            subtitle: doc.description || undefined,
            category: "documents",
            path: "/",
          });
        });

        services?.forEach((service) => {
          allResults.push({
            id: service.id,
            title: service.codigo_jbr,
            subtitle: service.cliente,
            category: "services",
            path: "/servicos",
          });
        });

        inventory?.forEach((item) => {
          allResults.push({
            id: item.id,
            title: item.item_name,
            subtitle: item.category || undefined,
            category: "inventory",
            path: "/inventario",
          });
        });

        maintenance?.forEach((record) => {
          allResults.push({
            id: record.id,
            title: record.equipment_name,
            subtitle: record.equipment_code,
            category: "maintenance",
            path: "/inventario?tab=maintenance",
          });
        });

        setResults(allResults);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Erro ao realizar busca");
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const categoryConfig = {
    documents: { icon: FileText, label: "Documentos", color: "text-primary" },
    services: { icon: Briefcase, label: "Serviços", color: "text-accent" },
    inventory: { icon: Package, label: "Inventário", color: "text-success" },
    maintenance: { icon: Wrench, label: "Manutenção", color: "text-warning" },
  };

  const groupedResults = {
    documents: results.filter((r) => r.category === "documents"),
    services: results.filter((r) => r.category === "services"),
    inventory: results.filter((r) => r.category === "inventory"),
    maintenance: results.filter((r) => r.category === "maintenance"),
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery("");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar documentos, serviços, inventário, manutenção..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}

        {!loading &&
          Object.entries(groupedResults).map(([category, items]) => {
            if (items.length === 0) return null;

            const config = categoryConfig[category as keyof typeof categoryConfig];
            const Icon = config.icon;

            return (
              <CommandGroup key={category} heading={config.label}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.title}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <Icon className={`mr-2 h-4 w-4 ${config.color}`} />
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-sm text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
      </CommandList>
    </CommandDialog>
  );
}

