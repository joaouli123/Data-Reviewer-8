import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";

const formatMoney = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};

export default function AdminPlans() {
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/admin/plans"],
    queryFn: () => apiRequest("GET", "/api/admin/plans"),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const normalizedPlans = useMemo(() => {
    const list = Array.isArray(plans) ? plans : plans?.data || [];
    return list.map((p) => ({
      key: p.key,
      displayName: p.displayName,
      price: Number(p.price || 0),
      currency: p.currency || "BRL",
      interval: p.interval || "month",
      isActive: !!p.isActive,
    }));
  }, [plans]);

  const [drafts, setDrafts] = useState({});

  const updateMutation = useMutation({
    mutationFn: async ({ key, patch }) => {
      return apiRequest("PATCH", `/api/admin/plans/${encodeURIComponent(key)}`, patch);
    },
    onSuccess: async () => {
      toast.success("Plano atualizado!");
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/public/plans"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao atualizar plano");
    },
  });

  const setDraft = (key, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Altere os valores cobrados. Isso reflete no Checkout e na Landing Page.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        {isLoading ? (
          <div className="text-sm text-slate-500">Carregando...</div>
        ) : normalizedPlans.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhum plano cadastrado.</div>
        ) : (
          <div className="space-y-4">
            {normalizedPlans.map((plan) => {
              const draft = drafts[plan.key] || {};
              const draftPrice = draft.price ?? plan.price;
              const draftName = draft.displayName ?? plan.displayName;

              return (
                <div key={plan.key} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Chave</div>
                      <div className="font-semibold text-slate-900">{plan.key}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Atual: {formatMoney(plan.price)} / {plan.interval}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                      <Input
                        value={draftName}
                        onChange={(e) => setDraft(plan.key, "displayName", e.target.value)}
                        placeholder="Nome"
                      />
                      <Input
                        inputMode="decimal"
                        value={String(draftPrice)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(",", ".");
                          const num = Number(raw);
                          setDraft(plan.key, "price", Number.isFinite(num) ? num : 0);
                        }}
                        placeholder="Preço"
                      />
                      <Button
                        onClick={() => {
                          const patch = {};
                          if (draft.displayName !== undefined && String(draft.displayName).trim() !== plan.displayName) {
                            patch.displayName = String(draft.displayName).trim();
                          }
                          if (draft.price !== undefined && Number(draft.price) !== plan.price) {
                            patch.price = Number(draft.price);
                          }
                          if (Object.keys(patch).length === 0) {
                            toast.message("Nada para salvar");
                            return;
                          }
                          updateMutation.mutate({ key: plan.key, patch });
                        }}
                        disabled={updateMutation.isPending}
                        className="bg-primary hover:bg-primary"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
