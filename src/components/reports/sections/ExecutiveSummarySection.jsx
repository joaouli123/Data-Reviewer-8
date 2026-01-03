import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/button";
import ExecutiveSummary from '../ExecutiveSummary';

export function ExecutiveSummarySection({ data, company }) {
  return (
    <Card className="hover-elevate">
      <CardHeader>
        <CardTitle>Resumo Executivo</CardTitle>
      </CardHeader>
      <CardContent>
        <ExecutiveSummary data={data} company={company} />
      </CardContent>
    </Card>
  );
}
