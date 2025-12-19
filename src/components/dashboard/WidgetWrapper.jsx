import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Eye, EyeOff } from 'lucide-react';

export default function WidgetWrapper({ 
  title, 
  icon: Icon, 
  children, 
  onRemove, 
  onToggle,
  isVisible = true,
  dragHandleProps 
}) {
  return (
    <Card className={`${isVisible ? 'bg-white' : 'bg-slate-50 opacity-60'} border-slate-200 shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <div {...dragHandleProps} className="cursor-move text-slate-400 hover:text-slate-600">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          {Icon && <Icon className="w-5 h-5 text-indigo-600" />}
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {onToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
              onClick={onToggle}
            >
              {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-rose-600"
              onClick={onRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      {isVisible && <CardContent>{children}</CardContent>}
    </Card>
  );
}