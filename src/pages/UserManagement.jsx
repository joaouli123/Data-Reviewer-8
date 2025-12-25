import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  ShieldCheck, 
  MoreHorizontal, 
  Mail,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { InviteUserModal } from "@/components/users/InviteUserModal";
import { PERMISSIONS } from "../../shared/schema";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/invitations", {
        ...data,
        companyId: currentUser.companyId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsInviteOpen(false);
      toast({ title: "Sucesso", description: "Usuário convidado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
      toast({ title: "Sucesso", description: "Usuário removido com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/permissions`, { permissions });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsPermissionsOpen(false);
      toast({ title: "Sucesso", description: "Permissões atualizadas com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenPermissions = (user) => {
    let perms = user.permissions || {};
    
    // Força permissões completas para admin na interface
    if (user.role === 'admin') {
      Object.values(PERMISSIONS).forEach(p => perms[p] = true);
    }
    
    setSelectedUser({
      ...user,
      permissions: perms
    });
    setIsPermissionsOpen(true);
  };

  const togglePermission = (permId) => {
    if (selectedUser?.role === 'admin') return; // Admin sempre tem tudo
    
    setSelectedUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permId]: !prev.permissions[permId]
      }
    }));
  };

  const handleSavePermissions = () => {
    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      permissions: selectedUser.permissions
    });
  };

  const renderPermissionsModal = () => {
    if (!selectedUser) return null;

    const permsList = [
      {
        group: "TRANSAÇÕES",
        perms: [
          { id: PERMISSIONS.VIEW_TRANSACTIONS, label: "View Transactions" },
          { id: PERMISSIONS.CREATE_TRANSACTIONS, label: "Create Transactions" },
          { id: PERMISSIONS.EDIT_TRANSACTIONS, label: "Edit Transactions" },
          { id: PERMISSIONS.DELETE_TRANSACTIONS, label: "Delete Transactions" },
          { id: PERMISSIONS.IMPORT_BANK, label: "Import Bank" }
        ]
      },
      {
        group: "RELATÓRIOS",
        perms: [
          { id: PERMISSIONS.VIEW_REPORTS, label: "View Reports" },
          { id: PERMISSIONS.VIEW_PROFIT, label: "View Profit" },
          { id: PERMISSIONS.EXPORT_REPORTS, label: "Export Reports" }
        ]
      },
      {
        group: "ENTIDADES",
        perms: [
          { id: PERMISSIONS.VIEW_CUSTOMERS, label: "View Customers" },
          { id: PERMISSIONS.MANAGE_CUSTOMERS, label: "Manage Customers" },
          { id: PERMISSIONS.VIEW_SUPPLIERS, label: "View Suppliers" },
          { id: PERMISSIONS.MANAGE_SUPPLIERS, label: "Manage Suppliers" }
        ]
      },
      {
        group: "SISTEMA",
        perms: [
          { id: PERMISSIONS.PRICE_CALC, label: "Cálculo de Preços" },
          { id: PERMISSIONS.MANAGE_USERS, label: "Manage Users" },
          { id: PERMISSIONS.INVITE_USERS, label: "Invite Users" },
          { id: PERMISSIONS.VIEW_SETTINGS, label: "View Settings" },
          { id: PERMISSIONS.MANAGE_SETTINGS, label: "Manage Settings" }
        ]
      }
    ];

    return (
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-white">
            <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
              <ShieldCheck className="w-6 h-6 text-[#E7AA1C]" />
              Permissões: {selectedUser?.name || selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
            {permsList.map((groupData) => (
              <div key={groupData.group} className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{groupData.group}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                  {groupData.perms.map(perm => (
                    <div 
                      key={perm.id} 
                      className="flex items-center space-x-3 cursor-pointer group"
                      onClick={(e) => {
                        e.preventDefault();
                        togglePermission(perm.id);
                      }}
                    >
                      <Checkbox 
                        id={perm.id} 
                        checked={!!selectedUser?.permissions?.[perm.id]} 
                        onCheckedChange={() => togglePermission(perm.id)}
                        disabled={selectedUser?.role === 'admin'}
                        className="w-5 h-5 border-slate-300 rounded data-[state=checked]:bg-[#E7AA1C] data-[state=checked]:border-[#E7AA1C] transition-all"
                      />
                      <label 
                        htmlFor={perm.id} 
                        className="text-sm font-medium leading-none cursor-pointer select-none text-slate-600 group-hover:text-slate-900 transition-colors"
                      >
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="p-6 border-t bg-white gap-3">
            <Button variant="outline" onClick={() => setIsPermissionsOpen(false)} className="px-6 border-slate-200">Cancelar</Button>
            <Button 
              onClick={handleSavePermissions} 
              className="bg-[#E7AA1C] hover:bg-[#d49918] text-white font-semibold px-8"
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-sm text-slate-500 mt-2">Administre os membros da sua equipe e suas permissões de acesso.</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="bg-[#E7AA1C] hover:bg-[#d49918] text-black font-semibold shadow-sm" data-testid="button-invite-user">
          <Plus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="font-semibold text-slate-900 pl-6">Usuário</TableHead>
                <TableHead className="font-semibold text-slate-900">Email</TableHead>
                <TableHead className="font-semibold text-slate-900 text-center">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-900 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-900 text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Mail className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhum usuário cadastrado</p>
                      <p className="text-xs">Inicie convidando novos membros para sua empresa.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-medium text-slate-900 pl-6">
                      <div className="flex flex-col">
                        <span>{user.name || user.username}</span>
                        {currentUser?.id === user.id && <span className="text-[10px] text-primary font-bold">(VOCÊ)</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="capitalize font-normal border-slate-200">
                        {user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : user.role === 'operational' ? 'Operacional' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-normal hover:bg-emerald-50">Ativo</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-slate-600 hover:text-primary hover:bg-slate-100"
                          onClick={() => handleOpenPermissions(user)}
                          title="Permissões"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span className="ml-2 hidden sm:inline">Permissões</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                              onClick={() => setUserToDelete(user)}
                              disabled={currentUser?.id === user.id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover Usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteUserModal 
        open={isInviteOpen} 
        onOpenChange={setIsInviteOpen}
        onInvite={(data) => inviteMutation.mutateAsync(data)}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de <strong>{userToDelete?.name || userToDelete?.username}</strong>? 
              Esta ação não pode ser desfeita e o usuário perderá o acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteUserMutation.mutate(userToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : 'Sim, remover usuário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {renderPermissionsModal()}
    </div>
  );
}
