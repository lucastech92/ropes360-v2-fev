import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Briefcase, Package, Wrench, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: "documents" | "services" | "inventory" | "maintenance";
  path: string;
}

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search function
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchAll = async () => {
      try {
        console.log("🔍 Buscando por:", query);
        const searchTerm = `%${query}%`;

        const [documentsRes, servicesRes, inventoryRes, maintenanceRes] = await Promise.all([
          supabase
            .from("documents")
            .select("id, title, description")
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("services")
            .select("id, codigo_jbr, cliente")
            .or(`codigo_jbr.ilike.${searchTerm},cliente.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("inventory")
            .select("id, item_name, category")
            .or(`item_name.ilike.${searchTerm},category.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("maintenance_records")
            .select("id, equipment_name, equipment_code")
            .or(`equipment_name.ilike.${searchTerm},equipment_code.ilike.${searchTerm}`)
            .limit(5),
        ]);

        console.log("📄 Documentos encontrados:", documentsRes.data?.length || 0, documentsRes.error);
        console.log("💼 Serviços encontrados:", servicesRes.data?.length || 0, servicesRes.error);
        console.log("📦 Inventário encontrado:", inventoryRes.data?.length || 0, inventoryRes.error);
        console.log("🔧 Manutenção encontrada:", maintenanceRes.data?.length || 0, maintenanceRes.error);

        const allResults: SearchResult[] = [];

        documentsRes.data?.forEach((doc) => {
          allResults.push({
            id: doc.id,
            title: doc.title,
            subtitle: doc.description || undefined,
            category: "documents",
            path: "/",
          });
        });

        servicesRes.data?.forEach((service) => {
          allResults.push({
            id: service.id,
            title: service.codigo_jbr,
            subtitle: service.cliente,
            category: "services",
            path: "/servicos",
          });
        });

        inventoryRes.data?.forEach((item) => {
          allResults.push({
            id: item.id,
            title: item.item_name,
            subtitle: item.category || undefined,
            category: "inventory",
            path: "/inventario",
          });
        });

        maintenanceRes.data?.forEach((record) => {
          allResults.push({
            id: record.id,
            title: record.equipment_name,
            subtitle: record.equipment_code,
            category: "maintenance",
            path: "/manutencao",
          });
        });

        console.log("✅ Total de resultados:", allResults.length);
        setResults(allResults);
        setShowResults(true);
      } catch (error) {
        console.error("❌ Erro na busca:", error);
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

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar documentos, serviços, inventário, manutenção..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-10 h-12 text-base shadow-sm"
        />
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-2">
            {results.map((result) => {
              const config = categoryConfig[result.category];
              const Icon = config.icon;

              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left"
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${config.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {config.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {showResults && query.length >= 2 && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-6 text-center text-muted-foreground">
            Nenhum resultado encontrado
          </div>
        </Card>
      )}
    </div>
  );
}
