import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function DashboardCustomizer({ open, onOpenChange, widgets, onToggleWidget }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-600">
            Selecione quais widgets deseja visualizar no seu dashboard.
          </p>
          
          <div className="space-y-3">
            {widgets.map((widget) => {
              const IconComponent = widget.icon;
              return (
                <div key={widget.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
                    <div>
                      <Label htmlFor={widget.id} className="text-sm font-medium cursor-pointer">
                        {widget.title}
                      </Label>
                      {widget.description && (
                        <p className="text-xs text-slate-500">{widget.description}</p>
                      )}
                    </div>
                  </div>
                  <Switch
                    id={widget.id}
                    checked={widget.visible}
                    onCheckedChange={() => onToggleWidget(widget.id)}
                  />
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-slate-500">
              💡 Dica: Arraste os widgets pela barra de grade para reordená-los
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}