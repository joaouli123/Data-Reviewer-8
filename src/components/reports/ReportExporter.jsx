import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { formatDateUTC3, formatDateTimeUTC3 } from '@/utils/formatters';

export default function ReportExporter({ reportData, reportType = 'general', analysisResult }) {
  const [isExporting, setIsExporting] = useState(false);

  const formatCurrency = (value) => {
    const val = parseFloat(value || 0);
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const captureChart = async (id) => {
    const element = document.getElementById(id);
    if (!element) return null;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`Error capturing chart ${id}:`, error);
      return null;
    }
  };

  const exportToPDF = async () => {
    if (!analysisResult) {
      toast.error('Gere uma análise primeiro para exportar o relatório completo.');
      return;
    }

    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(44, 62, 80);
      pdf.text('Relatório Financeiro Analítico', margin, yPos);
      
      yPos += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(127, 140, 141);
      pdf.text(`Período: ${reportData?.summary?.periodo || 'N/A'}`, margin, yPos);
      pdf.text(`Gerado em: ${formatDateTimeUTC3()}`, pageWidth - margin - 45, yPos);

      yPos += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);

      // Section 1: Executive Summary
      yPos += 15;
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.setFont('helvetica', 'bold');
      pdf.text('1. Sumário Executivo', margin, yPos);

      yPos += 8;
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(52, 73, 94);
      const summaryText = analysisResult.executive_summary || 'Sem resumo disponível.';
      const splitSummary = pdf.splitTextToSize(summaryText, contentWidth - 10);
      pdf.text(splitSummary, margin + 5, yPos + 10);

      // Section 2: KPIs
      yPos += 45;
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.setFont('helvetica', 'bold');
      pdf.text('2. KPIs Principais', margin, yPos);

      yPos += 10;
      const cardWidth = (contentWidth - 15) / 4;
      const kpis = [
        { label: 'Receita', value: reportData?.summary?.receita_total || 0, color: [46, 204, 113] },
        { label: 'Despesas', value: reportData?.summary?.despesas_total || 0, color: [231, 76, 60] },
        { label: 'Lucro', value: (reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0), color: [52, 152, 219] },
        { label: 'Margem', value: `${(((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`, color: [155, 89, 182], isPercent: true }
      ];

      kpis.forEach((kpi, i) => {
        const x = margin + (i * (cardWidth + 5));
        pdf.setFillColor(248, 249, 250);
        pdf.roundedRect(x, yPos, cardWidth, 20, 2, 2, 'F');
        pdf.setFontSize(8);
        pdf.setTextColor(127, 140, 141);
        pdf.text(kpi.label, x + 5, yPos + 7);
        pdf.setFontSize(10);
        pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(kpi.isPercent ? kpi.value : formatCurrency(kpi.value), x + 5, yPos + 14);
      });

      // Section 3: Charts
      yPos += 35;
      const cashflowChart = await captureChart('report-chart-cashflow');
      if (cashflowChart) {
        pdf.setFontSize(14);
        pdf.setTextColor(44, 62, 80);
        pdf.text('3. Previsão de Fluxo de Caixa', margin, yPos);
        pdf.addImage(cashflowChart, 'PNG', margin, yPos + 5, contentWidth, 60);
        yPos += 75;
      }

      if (yPos > 220) {
        pdf.addPage();
        yPos = 20;
      }

      const revenueChart = await captureChart('report-chart-revenue');
      if (revenueChart) {
        pdf.setFontSize(14);
        pdf.setTextColor(44, 62, 80);
        pdf.text('4. Tendência de Receita', margin, yPos);
        pdf.addImage(revenueChart, 'PNG', margin, yPos + 5, contentWidth, 60);
        yPos += 75;
      }

      // Section 4: DRE Table
      if (yPos > 180) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.text('5. DRE (Demonstrativo de Resultados)', margin, yPos);

      const dreData = [
        ['Receita Bruta', formatCurrency(reportData?.summary?.receita_total || 0), '100%'],
        ['Custos Totais', formatCurrency(reportData?.summary?.despesas_total || 0), `${((reportData?.summary?.despesas_total || 0) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`],
        ['Lucro Líquido', formatCurrency((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)), `${(((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`]
      ];

      autoTable(pdf, {
        startY: yPos + 5,
        head: [['Categoria', 'Valor', '% da Receita']],
        body: dreData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 10 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            if (data.row.index === 0) data.cell.styles.textColor = [46, 204, 113];
            if (data.row.index === 1) data.cell.styles.textColor = [231, 76, 60];
            if (data.row.index === 2) data.cell.styles.textColor = [52, 152, 219];
          }
        }
      });

      pdf.save(`relatorio-analitico-${formatDateUTC3()}.pdf`);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Erro ao gerar PDF. Verifique se os gráficos estão visíveis.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Aba 1: Dashboard e Resumo
      const summaryData = [
        ['Resumo Financeiro Executivo'],
        ['Gerado em', formatDateTimeUTC3()],
        ['Período', reportData?.summary?.periodo || 'N/A'],
        [],
        ['KPIs Principais', 'Valor'],
        ['Receita Total', parseFloat(reportData?.summary?.receita_total || 0)],
        ['Despesas Totais', parseFloat(reportData?.summary?.despesas_total || 0)],
        ['Lucro Líquido', parseFloat((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0))],
        [],
        ['Fluxo de Caixa Projetado'],
        ['Mês', 'Receita Prevista', 'Despesa Prevista', 'Lucro Previsto']
      ];

      if (analysisResult?.cash_flow_forecast) {
        analysisResult.cash_flow_forecast.forEach(f => {
          const rev = parseFloat(f.predicted_revenue || 0);
          const exp = parseFloat(f.predicted_expense || 0);
          summaryData.push([f.month, rev, exp, rev - exp]);
        });
      }

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Dashboard e Resumo");

      // Aba 2: DRE Detalhada
      const dreData = [
        ['Demonstrativo de Resultados (DRE)'],
        [],
        ['Categoria', 'Valor', '% do Total'],
        ['Receitas', parseFloat(reportData?.summary?.receita_total || 0), '100%'],
        ['Custos e Despesas', parseFloat(reportData?.summary?.despesas_total || 0), `${((reportData?.summary?.despesas_total || 0) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`],
        ['Resultado Líquido', parseFloat((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)), `${(((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`]
      ];
      const wsDRE = XLSX.utils.aoa_to_sheet(dreData);
      XLSX.utils.book_append_sheet(wb, wsDRE, "DRE Detalhada");

      // Aba 3: Transações (Analítico)
      const txnHeader = ['Data', 'Descrição', 'Valor', 'Categoria', 'Tipo'];
      const txnData = [txnHeader];
      
      if (reportData?.transactions) {
        reportData.transactions.forEach(t => {
          const dateStr = t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '';
          const amount = parseFloat(t.amount || 0);
          const typeLabel = ['venda', 'receita', 'income'].includes(t.type) ? 'Receita' : 'Despesa';
          txnData.push([dateStr, t.description, amount, t.category || 'Outros', typeLabel]);
        });
      }

      const wsTxns = XLSX.utils.aoa_to_sheet(txnData);
      XLSX.utils.book_append_sheet(wb, wsTxns, "Transações");

      XLSX.writeFile(wb, `Gestao_Financeira_${formatDateUTC3()}.xlsx`);
      toast.success('Planilha Excel gerada com sucesso!');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error('Erro ao gerar Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      <Button
        onClick={exportToPDF}
        disabled={isExporting}
        variant="outline"
        className="gap-2 flex-1 sm:flex-none border-blue-200 hover:bg-blue-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 text-blue-600" />
        )}
        Relatório Executivo (PDF)
      </Button>
      <Button
        onClick={exportToExcel}
        disabled={isExporting}
        variant="outline"
        className="gap-2 flex-1 sm:flex-none border-emerald-200 hover:bg-emerald-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        )}
        Planilha de Gestão (XLSX)
      </Button>
    </div>
  );
}