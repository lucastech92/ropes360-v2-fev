import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Briefcase, 
  Package, 
  Wrench, 
  Search, 
  CheckSquare, 
  ClipboardList,
  Users,
  Folder,
  Calendar,
  BookOpen,
  Gauge,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CategoryType = 
  | "documents" 
  | "services" 
  | "inventory" 
  | "maintenance" 
  | "employees" 
  | "checklists"
  | "reports"
  | "users"
  | "folders"
  | "allocations"
  | "technical_docs";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: CategoryType;
  path: string;
  metadata?: Record<string, string | undefined>;
}

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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
      setIsSearching(true);
      try {
        const searchTerm = `%${query}%`;

        // Execute all searches in parallel
        const [
          documentsRes, 
          servicesRes, 
          inventoryRes, 
          maintenanceRes, 
          employeesRes,
          checklistsRes,
          reportsRes,
          usersRes,
          foldersRes,
          allocationsRes,
          technicalDocsRes
        ] = await Promise.all([
          // Documents
          supabase
            .from("documents")
            .select("id, title, description, file_name, category")
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},file_name.ilike.${searchTerm}`)
            .limit(5),
          // Services
          supabase
            .from("services")
            .select("id, codigo_jbr, cliente, equipamentos, aplicacao, local")
            .or(`codigo_jbr.ilike.${searchTerm},cliente.ilike.${searchTerm},equipamentos.ilike.${searchTerm},aplicacao.ilike.${searchTerm},local.ilike.${searchTerm}`)
            .limit(5),
          // Inventory
          supabase
            .from("inventory")
            .select("id, item_name, category, location, code, item_type")
            .or(`item_name.ilike.${searchTerm},category.ilike.${searchTerm},location.ilike.${searchTerm},code.ilike.${searchTerm}`)
            .limit(5),
          // Maintenance
          supabase
            .from("maintenance_records")
            .select("id, equipment_name, equipment_code, technician, description, maintenance_type")
            .or(`equipment_name.ilike.${searchTerm},equipment_code.ilike.${searchTerm},technician.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
          // Employee folders
          supabase
            .from("employee_folders")
            .select("id, name, folder_id")
            .ilike("name", searchTerm)
            .limit(5),
          // Checklists
          supabase
            .from("checklists")
            .select("id, name, description, checklist_type, is_template")
            .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
          // Inspection reports
          supabase
            .from("inspection_reports")
            .select("id, report_number, title, status")
            .or(`report_number.ilike.${searchTerm},title.ilike.${searchTerm}`)
            .limit(5),
          // Users
          supabase
            .from("user_profiles")
            .select("id, user_id, full_name, email, company, position")
            .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm},position.ilike.${searchTerm}`)
            .limit(5),
          // Folders
          supabase
            .from("folders")
            .select("id, name, category")
            .ilike("name", searchTerm)
            .limit(5),
          // Equipment allocations
          supabase
            .from("inventory_allocations")
            .select(`
              id, 
              destination, 
              checkout_notes,
              inventory:inventory_item_id(item_name, code),
              service:service_id(codigo_jbr, cliente)
            `)
            .or(`destination.ilike.${searchTerm},checkout_notes.ilike.${searchTerm}`)
            .limit(5),
          // Technical documents
          supabase
            .from("technical_documents")
            .select("id, title, file_name, document_type")
            .or(`title.ilike.${searchTerm},file_name.ilike.${searchTerm}`)
            .limit(5),
        ]);

        const allResults: SearchResult[] = [];

        // Documents
        documentsRes.data?.forEach((doc) => {
          const categoryRoutes: Record<string, string> = {
            procedimentos_oficiais: "/procedimentos-oficiais",
            modelos_relatorios: "/modelos-relatorios",
            duvidas_frequentes: "/duvidas-frequentes",
            historico: "/historico",
          };
          allResults.push({
            id: doc.id,
            title: doc.title,
            subtitle: doc.description || doc.file_name,
            category: "documents",
            path: categoryRoutes[doc.category] || "/procedimentos-oficiais",
          });
        });

        // Services
        servicesRes.data?.forEach((service) => {
          allResults.push({
            id: service.id,
            title: `JBR: ${service.codigo_jbr}`,
            subtitle: `${service.cliente}${service.local ? ` • ${service.local}` : ''}`,
            category: "services",
            path: "/servicos",
          });
        });

        // Inventory
        inventoryRes.data?.forEach((item) => {
          allResults.push({
            id: item.id,
            title: item.item_name,
            subtitle: `${item.category || 'Sem categoria'}${item.code ? ` • ${item.code}` : ''}`,
            category: "inventory",
            path: "/inventario",
            metadata: { type: item.item_type },
          });
        });

        // Maintenance
        maintenanceRes.data?.forEach((record) => {
          allResults.push({
            id: record.id,
            title: record.equipment_name,
            subtitle: `${record.maintenance_type} • ${record.equipment_code || 'Sem código'}`,
            category: "maintenance",
            path: "/inventario",
          });
        });

        // Employee folders
        employeesRes.data?.forEach((employee) => {
          allResults.push({
            id: employee.id,
            title: employee.name,
            subtitle: "Pasta de Funcionário",
            category: "employees",
            path: "/duvidas-frequentes",
          });
        });

        // Checklists
        checklistsRes.data?.forEach((checklist) => {
          allResults.push({
            id: checklist.id,
            title: checklist.name,
            subtitle: `${checklist.is_template ? 'Template' : 'Checklist'} • ${checklist.checklist_type || 'Geral'}`,
            category: "checklists",
            path: "/check-list",
          });
        });

        // Inspection reports
        reportsRes.data?.forEach((report) => {
          allResults.push({
            id: report.id,
            title: report.title || `Relatório ${report.report_number}`,
            subtitle: `Nº ${report.report_number} • ${report.status === 'completed' ? 'Concluído' : 'Rascunho'}`,
            category: "reports",
            path: "/relatorios-salvos",
          });
        });

        // Users
        usersRes.data?.forEach((user) => {
          allResults.push({
            id: user.id,
            title: user.full_name || user.email || 'Usuário',
            subtitle: `${user.position || 'Sem cargo'}${user.company ? ` • ${user.company}` : ''}`,
            category: "users",
            path: "/gerenciar-usuarios",
          });
        });

        // Folders
        foldersRes.data?.forEach((folder) => {
          const categoryRoutes: Record<string, string> = {
            procedimentos_oficiais: "/procedimentos-oficiais",
            modelos_relatorios: "/modelos-relatorios",
            duvidas_frequentes: "/duvidas-frequentes",
          };
          allResults.push({
            id: folder.id,
            title: folder.name,
            subtitle: "Pasta",
            category: "folders",
            path: categoryRoutes[folder.category || ''] || "/procedimentos-oficiais",
          });
        });

        // Equipment allocations
        allocationsRes.data?.forEach((allocation) => {
          const inventory = allocation.inventory as { item_name: string; code: string } | null;
          const service = allocation.service as { codigo_jbr: string; cliente: string } | null;
          if (inventory || service) {
            allResults.push({
              id: allocation.id,
              title: inventory?.item_name || 'Equipamento',
              subtitle: service ? `JBR: ${service.codigo_jbr} • ${service.cliente}` : allocation.destination || undefined,
              category: "allocations",
              path: "/inventario",
            });
          }
        });

        // Technical documents
        technicalDocsRes.data?.forEach((doc) => {
          allResults.push({
            id: doc.id,
            title: doc.title,
            subtitle: doc.document_type || doc.file_name,
            category: "technical_docs",
            path: "/assistente-tecnico",
          });
        });

        setResults(allResults);
        setShowResults(true);
      } catch (error) {
        console.error("❌ Erro na busca:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const categoryConfig: Record<CategoryType, { icon: typeof FileText; label: string; color: string }> = {
    documents: { icon: FileText, label: "Documentos", color: "text-blue-500" },
    services: { icon: Briefcase, label: "Serviços", color: "text-purple-500" },
    inventory: { icon: Package, label: "Inventário", color: "text-green-500" },
    maintenance: { icon: Wrench, label: "Manutenção", color: "text-orange-500" },
    employees: { icon: Users, label: "Funcionários", color: "text-pink-500" },
    checklists: { icon: CheckSquare, label: "Checklists", color: "text-teal-500" },
    reports: { icon: ClipboardList, label: "Relatórios", color: "text-indigo-500" },
    users: { icon: Users, label: "Usuários", color: "text-cyan-500" },
    folders: { icon: Folder, label: "Pastas", color: "text-amber-500" },
    allocations: { icon: Gauge, label: "Alocações", color: "text-rose-500" },
    technical_docs: { icon: BookOpen, label: "Docs Técnicos", color: "text-emerald-500" },
  };

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<CategoryType, SearchResult[]>);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setShowResults(false);
  };

  const totalResults = results.length;

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl px-2 sm:px-0">
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground ${isSearching ? 'animate-pulse' : ''}`} />
        <Input
          type="text"
          placeholder="Buscar em todos os módulos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base shadow-sm"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-[70vh] md:max-h-[500px] overflow-y-auto shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-2 md:p-3">
            {/* Results count */}
            <div className="flex items-center justify-between px-2 pb-2 border-b mb-2">
              <span className="text-xs text-muted-foreground">
                {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-1 flex-wrap justify-end">
                {Object.keys(groupedResults).slice(0, 3).map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-[10px]">
                    {categoryConfig[cat as CategoryType].label}
                  </Badge>
                ))}
                {Object.keys(groupedResults).length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{Object.keys(groupedResults).length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Grouped results */}
            {Object.entries(groupedResults).map(([category, categoryResults]) => {
              const config = categoryConfig[category as CategoryType];
              const Icon = config.icon;

              return (
                <div key={category} className="mb-3 last:mb-0">
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    {config.label}
                    <span className="text-[10px] font-normal">({categoryResults.length})</span>
                  </div>

                  {/* Results */}
                  {categoryResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-start gap-2 md:gap-3 p-2 md:p-2.5 rounded-md hover:bg-accent active:bg-accent transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
        <Card className="absolute top-full mt-2 w-full shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 md:p-6 text-center">
            <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Nenhum resultado encontrado para "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tente termos diferentes ou verifique a ortografia
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

