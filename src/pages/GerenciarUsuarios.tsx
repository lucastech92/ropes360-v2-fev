import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Shield, User } from "lucide-react";
import { logActivity } from "@/utils/activityLogger";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  approved: boolean;
  created_at: string;
  role_id: string;
  company: string | null;
  position: string | null;
}

const GerenciarUsuarios = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map(r => r.role) || [];
    setIsAdmin(userRoles.includes("admin"));
    setIsModerator(userRoles.includes("moderator"));
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email, full_name, created_at, company, position");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role, approved");

      if (rolesError) throw rolesError;

      const combined = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.email || "",
          full_name: profile.full_name,
          role: userRole?.role || "inspector",
          approved: userRole?.approved || false,
          created_at: profile.created_at,
          role_id: userRole?.id || "",
          company: profile.company,
          position: profile.position
        };
      }) || [];

      setUsers(combined);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, roleId: string, approve: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("user_roles")
        .update({
          approved: approve,
          approved_by: approve ? user.id : null,
          approved_at: approve ? new Date().toISOString() : null,
        })
        .eq("id", roleId);

      if (error) throw error;

      await logActivity({
        action: approve ? "approve_user" : "reject_user",
        module: "usuarios",
        entityType: "user",
        entityId: userId,
        description: approve ? "Usuário aprovado" : "Usuário rejeitado"
      });

      toast({
        title: approve ? "Usuário aprovado!" : "Usuário rejeitado",
        description: approve ? "O usuário agora pode acessar o sistema." : "O acesso foi negado.",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, roleId: string, newRole: "admin" | "moderator" | "inspector") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);

      if (error) throw error;

      await logActivity({
        action: "change_role",
        module: "usuarios",
        entityType: "user",
        entityId: userId,
        description: `Role alterada para ${newRole}`
      });

      toast({
        title: "Role atualizada!",
        description: `O usuário agora tem a role ${newRole}.`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async (userId: string, field: "company" | "position", value: string) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ [field]: value })
        .eq("user_id", userId);

      if (error) throw error;

      await logActivity({
        action: "update_profile",
        module: "usuarios",
        entityType: "user",
        entityId: userId,
        description: `${field === "company" ? "Empresa" : "Cargo"} atualizado`
      });

      toast({
        title: "Atualizado!",
        description: `${field === "company" ? "Empresa" : "Cargo"} atualizado com sucesso.`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin && !isModerator) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = isAdmin || isModerator;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Gerenciar Usuários e Acessos
            </CardTitle>
            <CardDescription>
              Aprove novos usuários e gerencie níveis de acesso no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={user.company || ""}
                          onChange={(e) => handleProfileUpdate(user.id, "company", e.target.value)}
                          disabled={!canEdit}
                          placeholder="Empresa"
                          className="w-full px-2 py-1 border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={user.position || ""}
                          onChange={(e) => handleProfileUpdate(user.id, "position", e.target.value)}
                          disabled={!canEdit}
                          placeholder="Cargo"
                          className="w-full px-2 py-1 border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: string) => {
                            const validRole = value as "admin" | "moderator" | "inspector";
                            handleRoleChange(user.id, user.role_id, validRole);
                          }}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="moderator">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Moderador
                              </div>
                            </SelectItem>
                            <SelectItem value="inspector">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Inspetor
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.approved ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {!user.approved ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproval(user.id, user.role_id, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproval(user.id, user.role_id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline">Aprovado</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GerenciarUsuarios;
