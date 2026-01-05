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
    // Tentar capturar primeiro a versão de impressão (invisível mas renderizada)
    const printId = `${id}-print`;
    const element = document.getElementById(printId) || document.getElementById(id);
    
    if (!element) {
      console.warn(`Element ${id} or ${printId} not found`);
      return null;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(printId) || clonedDoc.getElementById(id);
          if (el) {
            el.style.height = 'auto';
            el.style.width = '1000px';
            el.style.padding = '20px';
            el.style.visibility = 'visible';
            el.style.display = 'block';
          }
        }
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      const checkPageBreak = (neededHeight) => {
        if (yPos + neededHeight > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;
          return true;
        }
        return false;
      };

      const addSectionTitle = (title) => {
        checkPageBreak(15);
        pdf.setFontSize(14);
        pdf.setTextColor(44, 62, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPos);
        yPos += 8;
      };

      // --- CAPA ---
      pdf.setFillColor(44, 62, 80);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('RELATÓRIO FINANCEIRO', margin, 25);
      
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(12);
      yPos = 55;
      pdf.text(`Empresa: ${reportData?.summary?.companyName || 'Minha Empresa'}`, margin, yPos);
      yPos += 7;
      pdf.text(`Período: ${reportData?.summary?.periodo || 'N/A'}`, margin, yPos);
      yPos += 7;
      pdf.text(`Gerado em: ${formatDateTimeUTC3()}`, margin, yPos);
      
      yPos += 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      // Section 1: Executive Summary
      addSectionTitle('1. Sumário Executivo');
      const summaryText = analysisResult?.executive_summary || 'Análise em processamento ou dados insuficientes para sumário executivo...';
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(52, 73, 94);
      const splitSummary = pdf.splitTextToSize(summaryText, contentWidth - 10);
      const summaryHeight = (splitSummary.length * 5) + 10;
      
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(margin, yPos, contentWidth, summaryHeight, 2, 2, 'F');
      pdf.text(splitSummary, margin + 5, yPos + 8);
      yPos += summaryHeight + 15;

      // Section 2: KPIs
      addSectionTitle('2. Indicadores Chave (KPIs)');
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
        pdf.roundedRect(x, yPos, cardWidth, 22, 2, 2, 'F');
        pdf.setFontSize(8);
        pdf.setTextColor(127, 140, 141);
        pdf.text(kpi.label, x + 5, yPos + 7);
        pdf.setFontSize(10);
        pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(kpi.isPercent ? kpi.value : formatCurrency(kpi.value), x + 5, yPos + 15);
      });
      yPos += 35;

      // Section 3: Charts
      const charts = [
        { id: 'report-chart-cashflow', title: '3. Previsão de Fluxo de Caixa' },
        { id: 'report-chart-revenue', title: '4. Tendência de Receita' },
        { id: 'report-chart-expenses', title: '5. Distribuição de Despesas' },
        { id: 'report-chart-working-capital', title: '6. Capital de Giro' },
        { id: 'report-chart-debt', title: '7. Análise de Dívidas' }
      ];

      for (const chart of charts) {
        const chartImg = await captureChart(chart.id);
        if (chartImg) {
          addSectionTitle(chart.title);
          // Manter proporção e evitar esticamento: 180mm largura -> ~70mm altura é seguro
          pdf.addImage(chartImg, 'PNG', margin, yPos, contentWidth, 70, undefined, 'FAST');
          yPos += 85;
          checkPageBreak(20);
        }
      }

      // Section 8: DRE
      addSectionTitle('8. Demonstrativo de Resultados (DRE)');
      const dreData = [
        ['RECEITA BRUTA', formatCurrency(reportData?.summary?.receita_total || 0), '100%'],
        ['(-) CUSTOS E DESPESAS', formatCurrency(reportData?.summary?.despesas_total || 0), `${((reportData?.summary?.despesas_total || 0) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`],
        ['(=) RESULTADO LÍQUIDO', formatCurrency((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)), `${(((reportData?.summary?.receita_total || 0) - (reportData?.summary?.despesas_total || 0)) / (reportData?.summary?.receita_total || 1) * 100).toFixed(1)}%`]
      ];

      autoTable(pdf, {
        startY: yPos,
        head: [['DESCRIÇÃO', 'VALOR (R$)', '%']],
        body: dreData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], halign: 'center' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'center' }
        }
      });
      yPos = pdf.lastAutoTable.finalY + 15;

      // Section 9: AI Insights
      addSectionTitle('9. Recomendações Estratégicas');
      const insights = [
        { label: 'Redução de Custos', data: analysisResult.expense_reduction_opportunities, field: 'suggestion', icon: '•' },
        { label: 'Crescimento de Receita', data: analysisResult.revenue_growth_suggestions, field: 'strategy', icon: '→' }
      ];

      insights.forEach(insight => {
        if (insight.data && insight.data.length > 0) {
          checkPageBreak(20);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(insight.label, margin, yPos);
          yPos += 6;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          
          insight.data.forEach(item => {
            const text = `${insight.icon} ${item[insight.field]}${item.rationale ? `: ${item.rationale}` : ''}`;
            const splitLines = pdf.splitTextToSize(text, contentWidth - 5);
            checkPageBreak(splitLines.length * 5);
            pdf.text(splitLines, margin + 2, yPos);
            yPos += splitLines.length * 5 + 2;
          });
          yPos += 5;
        }
      });

      // Section 10: Transactions
      pdf.addPage();
      yPos = 20;
      addSectionTitle('10. Histórico Analítico');
      const txnData = (reportData?.transactions || []).map(t => [
        t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-',
        t.description || '-',
        t.category || 'Outros',
        ['venda', 'receita', 'income'].includes(t.type) ? 'Receita' : 'Despesa',
        formatCurrency(t.amount || 0)
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: txnData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8 },
        columnStyles: { 4: { halign: 'right' } }
      });

      pdf.save(`Relatorio_Financeiro_${formatDateUTC3()}.pdf`);
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
        Exportar PDF
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
        Exportar XLSX
      </Button>
    </div>
  );
}