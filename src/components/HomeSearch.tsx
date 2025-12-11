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
  category: "documents" | "services" | "inventory" | "maintenance" | "employees";
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
        const searchTerm = `%${query}%`;

        const [documentsRes, servicesRes, inventoryRes, maintenanceRes, employeesRes] = await Promise.all([
          supabase
            .from("documents")
            .select("id, title, description, file_name")
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},file_name.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("services")
            .select("id, codigo_jbr, cliente, equipamentos, aplicacao")
            .or(`codigo_jbr.ilike.${searchTerm},cliente.ilike.${searchTerm},equipamentos.ilike.${searchTerm},aplicacao.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("inventory")
            .select("id, item_name, category, location")
            .or(`item_name.ilike.${searchTerm},category.ilike.${searchTerm},location.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("maintenance_records")
            .select("id, equipment_name, equipment_code, technician, description")
            .or(`equipment_name.ilike.${searchTerm},equipment_code.ilike.${searchTerm},technician.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from("employee_folders")
            .select("id, name, folder_id")
            .ilike("name", searchTerm)
            .limit(5),
        ]);

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

        employeesRes.data?.forEach((employee) => {
          allResults.push({
            id: employee.id,
            title: employee.name,
            subtitle: "Pasta de Funcionário",
            category: "employees",
            path: "/duvidas-frequentes",
          });
        });
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
    employees: { icon: FileText, label: "Funcionários", color: "text-info" },
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl px-2 sm:px-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base shadow-sm"
        />
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-80 md:max-h-96 overflow-y-auto shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-1.5 md:p-2">
            {results.map((result) => {
              const config = categoryConfig[result.category];
              const Icon = config.icon;

              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-md hover:bg-accent active:bg-accent transition-colors text-left"
                >
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 mt-0.5 ${config.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm md:text-base">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs md:text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </div>
                    )}
                    <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
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
          <div className="p-4 md:p-6 text-center text-muted-foreground text-sm">
            Nenhum resultado encontrado
          </div>
        </Card>
      )}
    </div>
  );
}
