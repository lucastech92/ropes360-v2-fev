import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
  company: string | null;
}

interface ServiceCollaboratorsSelectProps {
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
}

export const ServiceCollaboratorsSelect = ({
  selectedUserIds,
  onChange,
}: ServiceCollaboratorsSelectProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, user_id, full_name, email, position, company")
        .order("full_name");

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Colaboradores
        </Label>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Colaboradores
        </Label>
        {selectedUserIds.length > 0 && (
          <Badge variant="secondary">{selectedUserIds.length} selecionado(s)</Badge>
        )}
      </div>
      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum colaborador disponível</p>
        ) : (
          users.map((user) => (
            <label
              key={user.user_id}
              className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedUserIds.includes(user.user_id)}
                onCheckedChange={() => toggleUser(user.user_id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || user.email || "Usuário"}
                </p>
                {user.position && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.position}
                    {user.company && ` • ${user.company}`}
                  </p>
                )}
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
};
