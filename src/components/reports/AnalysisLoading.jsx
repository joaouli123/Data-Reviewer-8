import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from 'lucide-react';

export default function AnalysisLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Loading Header */}
      <div className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-spin flex-shrink-0" />
        <p className="text-xs sm:text-sm font-medium text-blue-700">Analisando seus dados com IA...</p>
      </div>

      {/* Executive Summary Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 mb-2" />
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-60" />
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-4">
                  <Skeleton className="h-3 sm:h-4 w-20 mb-2" />
                  <Skeleton className="h-6 sm:h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 sm:h-8 w-16 sm:w-20" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Chart Skeleton */}
          <div className="space-y-3 sm:space-y-4">
            <Skeleton className="h-5 sm:h-6 w-32" />
            <Skeleton className="h-48 sm:h-64 lg:h-80 w-full rounded-lg" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <Skeleton className="h-3 sm:h-4 w-20" />
                  <Skeleton className="h-6 sm:h-8 w-24" />
                  <Skeleton className="h-2 sm:h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* List Items Skeleton */}
          <div className="space-y-2 sm:space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 sm:p-4 bg-slate-50 rounded-lg border">
                <Skeleton className="h-3 sm:h-4 w-52 sm:w-64 mb-2" />
                <Skeleton className="h-2 sm:h-3 w-32 sm:w-40" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
