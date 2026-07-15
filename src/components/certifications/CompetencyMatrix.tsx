import { useState } from "react";
import { useCertifications, CompetencyEntry } from "@/hooks/useCertifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
const DEFAULT_SKILLS = [
  "Inspeção Visual", "MRT", "Soquetagem", "Instalação de Cabos",
  "Análise de Desgaste", "Norma ISO 4309", "Trabalho em Altura (NR-35)",
  "Espaço Confinado (NR-33)", "Offshore Safety",
];

const levelConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: "Iniciante", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  intermediate: { label: "Intermediário", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  advanced: { label: "Avançado", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  expert: { label: "Expert", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
};

interface Props {
  canEdit: boolean;
}

export const CompetencyMatrix = ({ canEdit }: Props) => {
  const { t } = useTranslation();
  const { competencies, upsertCompetency } = useCertifications();
  const [newSkill, setNewSkill] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["user_profiles_for_matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Get unique skill names
  const allSkills = Array.from(
    new Set([...DEFAULT_SKILLS, ...competencies.map((c) => c.skill_name)])
  ).sort();

  const getLevel = (userId: string, skill: string) => {
    return competencies.find((c) => c.user_id === userId && c.skill_name === skill)?.skill_level;
  };

  const handleLevelChange = (userId: string, skillName: string, level: string) => {
    upsertCompetency.mutate({ user_id: userId, skill_name: skillName, skill_level: level });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !allSkills.includes(newSkill.trim())) {
      setNewSkill("");
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex gap-2">
          <Input
            placeholder={t("certifications.addSkill")}
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={handleAddSkill} disabled={!newSkill.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            {t("common.add")}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium min-w-[180px]">{t("certifications.technician")}</th>
              {allSkills.map((skill) => (
                <th key={skill} className="text-center p-3 font-medium min-w-[130px] text-xs">
                  {skill}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles?.map((profile) => (
              <tr key={profile.user_id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{profile.full_name || profile.email}</td>
                {allSkills.map((skill) => {
                  const level = getLevel(profile.user_id, skill);
                  return (
                    <td key={skill} className="p-2 text-center">
                      {canEdit ? (
                        <Select
                          value={level || ""}
                          onValueChange={(v) => handleLevelChange(profile.user_id, skill, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_LEVELS.map((l) => (
                              <SelectItem key={l} value={l}>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {levelConfig[l].label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : level ? (
                        <Badge className={cn("text-xs", levelConfig[level]?.color)}>
                          {levelConfig[level]?.label || level}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

