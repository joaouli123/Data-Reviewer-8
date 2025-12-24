import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, TrendingUp, AlertTriangle, Plus, MoreVertical, Eye, Lock, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const apiRequest = async (url, options = {}) => {
  const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
};

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(null);

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiRequest('/api/admin/stats'),
  });

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['/api/admin/companies'],
    queryFn: () => apiRequest('/api/admin/companies'),
  });

  // Filter companies
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.document.includes(searchTerm) ||
                         c.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: (data) => apiRequest('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Success', description: 'Company created successfully' });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiRequest(`/api/admin/companies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Success', description: 'Company status updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/admin/companies/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Success', description: 'Company deleted successfully' });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Impersonate mutation
  const impersonateMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/admin/companies/${id}/impersonate`, {
      method: 'POST',
    }),
    onSuccess: (data) => {
      localStorage.setItem('auth', JSON.stringify({
        token: data.token,
        user: data.user,
        company: data.company,
      }));
      toast({ title: 'Success', description: 'Accessing company dashboard' });
      setTimeout(() => window.location.href = '/dashboard', 1000);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all companies and subscriptions</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Companies</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalCompanies || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Active Subscriptions</p>
                <p className="text-3xl font-bold text-foreground">{stats.activeSubscriptions || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Monthly Revenue</p>
                <p className="text-3xl font-bold text-foreground">${stats.monthlyRevenue || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Alerts</p>
                <p className="text-3xl font-bold text-foreground">{stats.alerts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </Card>
        </div>

        {/* Companies Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Companies Management</h2>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Company
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>Add a new company and its admin user</DialogDescription>
                </DialogHeader>
                <CreateCompanyForm onSuccess={() => setCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by name, document, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              data-testid="input-search-companies"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      No companies found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{company.ownerName}</p>
                          <p className="text-xs text-muted-foreground">{company.ownerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{company.document}</TableCell>
                      <TableCell className="capitalize">{company.subscription?.plan || 'basic'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={company.subscriptionStatus === 'active' ? 'default' : 'destructive'}
                          className="capitalize"
                          data-testid={`badge-status-${company.id}`}
                        >
                          {company.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.userCount}</TableCell>
                      <TableCell className="text-right">
                        <CompanyActionsMenu
                          company={company}
                          onImpersonate={() => impersonateMutation.mutate(company.id)}
                          onBlock={() => updateStatusMutation.mutate({ id: company.id, status: 'suspended' })}
                          onDelete={() => setDeleteConfirm(company)}
                          onDetails={() => setDetailsDialogOpen(company)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Details Dialog */}
        {detailsDialogOpen && (
          <Dialog open={!!detailsDialogOpen} onOpenChange={() => setDetailsDialogOpen(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{detailsDialogOpen.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Document</p>
                  <p className="text-lg font-medium">{detailsDialogOpen.document}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="text-lg font-medium">{detailsDialogOpen.ownerName}</p>
                  <p className="text-sm">{detailsDialogOpen.ownerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg font-medium capitalize">{detailsDialogOpen.subscription?.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="capitalize mt-2">{detailsDialogOpen.subscriptionStatus}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-lg font-medium">{detailsDialogOpen.userCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(detailsDialogOpen.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Company?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone and will delete all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-destructive/10 border border-destructive/20 rounded p-4 mb-4">
                <p className="text-sm text-destructive font-medium">Warning: This will permanently delete all company data.</p>
              </div>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCompanyMutation.mutate(deleteConfirm.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete Company
              </AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

function CompanyActionsMenu({ company, onImpersonate, onBlock, onDelete, onDetails }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-actions-${company.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDetails}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImpersonate}>
          <Eye className="h-4 w-4 mr-2" />
          Access as Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onBlock}
          className={company.subscriptionStatus === 'suspended' ? 'text-green-600' : 'text-orange-600'}
        >
          <Lock className="h-4 w-4 mr-2" />
          {company.subscriptionStatus === 'suspended' ? 'Unblock' : 'Block'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateCompanyForm({ onSuccess }) {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      companyName: '',
      companyDocument: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      plan: 'pro',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => apiRequest('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Success', description: 'Company created successfully' });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} data-testid="input-company-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyDocument"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="00.000.000/0000-00" {...field} data-testid="input-company-document" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} data-testid="input-admin-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@acme.com" {...field} data-testid="input-admin-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} data-testid="input-admin-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger data-testid="select-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic ($0)</SelectItem>
                  <SelectItem value="pro">Pro ($99/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($299/mo)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-create-company">
          {mutation.isPending ? 'Creating...' : 'Create Company'}
        </Button>
      </form>
    </Form>
  );
}
