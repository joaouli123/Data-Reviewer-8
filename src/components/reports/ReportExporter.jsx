import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDateUTC3, formatDateTimeUTC3, getDateNowUTC3 } from '@/utils/formatters';

export default function ReportExporter({ reportData, reportType = 'general', analysisResult }) {
  const [isExporting, setIsExporting] = useState(false);

  const addSectionDivider = (pdf, margin, pageWidth, yPosition, pageHeight) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      return margin;
    }
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    return yPosition + 8;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setLanguage('pt-BR');
      pdf.setFont('helvetica');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // PÁGINA 1: Title & Executive Summary
      pdf.setFontSize(18);
      pdf.setTextColor(79, 70, 229);
      pdf.text('Relatório Financeiro Completo', margin, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Gerado em: ${formatDateTimeUTC3()}`, margin, yPosition);
      
      yPosition += 12;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Executive Summary
      if (reportData?.summary) {
        pdf.setFontSize(13);
        pdf.setTextColor(79, 70, 229);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RESUMO EXECUTIVO', margin, yPosition);
        yPosition += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          let valueStr = '';
          
          if (typeof value === 'number') {
            valueStr = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            valueStr = String(value || '');
          }
          
          if (valueStr) {
            pdf.text(`${label}: ${valueStr}`, margin, yPosition);
            yPosition += 7;
          }
        });
        yPosition += 10;
      }

      // PÁGINA 2: Transactions
      pdf.addPage();
      yPosition = margin;

      if (reportData?.transactions && reportData.transactions.length > 0) {
        pdf.setFontSize(13);
        pdf.setTextColor(79, 70, 229);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TRANSACOES DETALHADAS', margin, yPosition);
        yPosition += 10;

        const tableMargin = margin + 2;
        const col1 = tableMargin;
        const col2 = tableMargin + 18;
        const col3 = tableMargin + 48;
        const col4 = tableMargin + 80;
        const col5 = tableMargin + 115;

        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(79, 70, 229);
        pdf.setTextColor(255, 255, 255);
        pdf.rect(col1 - 2, yPosition - 5, contentWidth + 4, 7, 'F');
        pdf.text('Data', col1, yPosition);
        pdf.text('Descrição', col2, yPosition);
        pdf.text('Tipo', col3, yPosition);
        pdf.text('Categoria', col4, yPosition);
        pdf.text('Valor', col5, yPosition);
        yPosition += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(8);
        
        reportData.transactions.slice(0, 25).forEach((t, idx) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = margin;
          }

          const dateStr = t.date ? new Date(t.date).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
          const amount = parseFloat(t.amount || 0);
          const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const typeLabel = t.type === 'venda' ? 'Receita' : t.type === 'compra' ? 'Despesa' : t.type;
          const category = t.category || 'Sem Categoria';
          const description = (t.description || '').substring(0, 18);

          // Alternate row colors
          if (idx % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(col1 - 2, yPosition - 4, contentWidth + 4, 5, 'F');
          }

          pdf.text(dateStr, col1, yPosition);
          pdf.text(description, col2, yPosition);
          pdf.text(typeLabel, col3, yPosition);
          pdf.text(category.substring(0, 12), col4, yPosition);
          pdf.text(formattedAmount, col5, yPosition);
          yPosition += 5;
        });

        if (reportData.transactions.length > 25) {
          yPosition += 4;
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`... e mais ${reportData.transactions.length - 25} transações`, margin, yPosition);
        }
      }

      // PÁGINA 3: Cash Flow + Expenses
      pdf.addPage();
      yPosition = margin;

      if (analysisResult?.cash_flow_forecast && analysisResult.cash_flow_forecast.length > 0) {
        pdf.setFontSize(13);
        pdf.setTextColor(79, 70, 229);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PREVISAO DE FLUXO DE CAIXA', margin, yPosition);
        yPosition += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);

        analysisResult.cash_flow_forecast.slice(0, 6).forEach(forecast => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }

          const month = forecast.month || 'Mês';
          const revenue = parseFloat(forecast.revenue || 0);
          const expense = parseFloat(forecast.expense || 0);
          const profit = revenue - expense;
          const formattedRevenue = revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const formattedExpense = expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const formattedProfit = profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

          pdf.text(`${month}`, margin, yPosition);
          pdf.setTextColor(76, 175, 80);
          pdf.text(`Receita: ${formattedRevenue}`, margin + 50, yPosition);
          pdf.setTextColor(244, 67, 54);
          pdf.text(`Despesa: ${formattedExpense}`, margin + 100, yPosition);
          yPosition += 6;
          pdf.setTextColor(33, 150, 243);
          pdf.text(`Lucro: ${formattedProfit}`, margin + 50, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 8;
        });
        yPosition += 8;
      }

      // Expense Reduction
      yPosition = addSectionDivider(pdf, margin, pageWidth, yPosition, pageHeight);

      if (analysisResult?.expense_reduction_opportunities && analysisResult.expense_reduction_opportunities.length > 0) {
        pdf.setFontSize(13);
        pdf.setTextColor(79, 70, 229);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OPORTUNIDADES DE REDUCAO DE CUSTOS', margin, yPosition);
        yPosition += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);

        analysisResult.expense_reduction_opportunities.slice(0, 4).forEach(opp => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }

          const category = opp.category || 'Categoria';
          const suggestion = (opp.suggestion || '').substring(0, 70);
          const savings = opp.potential_savings || '0%';

          pdf.setFont('helvetica', 'bold');
          pdf.text(`${category}`, margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          yPosition += 6;
          pdf.setFontSize(8);
          pdf.text(`${suggestion}`, margin + 5, yPosition);
          yPosition += 4;
          pdf.setTextColor(76, 175, 80);
          pdf.text(`Economia Potencial: ${savings}`, margin + 5, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 8;
        });
      }

      // PÁGINA 4: Revenue Growth + Debt
      pdf.addPage();
      yPosition = margin;

      if (analysisResult?.revenue_growth_suggestions && analysisResult.revenue_growth_suggestions.length > 0) {
        pdf.setFontSize(13);
        pdf.setTextColor(79, 70, 229);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ESTRATEGIAS DE CRESCIMENTO DE RECEITA', margin, yPosition);
        yPosition += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);

        analysisResult.revenue_growth_suggestions.slice(0, 4).forEach(strategy => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }

          const strat = (strategy.strategy || '').substring(0, 60);
          const rationale = (strategy.rationale || '').substring(0, 50);
          const target = (strategy.target_customer_segment || '').substring(0, 35);

          pdf.setFont('helvetica', 'bold');
          pdf.text(`${strat}`, margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          yPosition += 5;
          pdf.setFontSize(8);
          pdf.text(`Fundamentação: ${rationale}`, margin + 5, yPosition);
          yPosition += 4;
          pdf.setTextColor(33, 150, 243);
          pdf.text(`Alvo: ${target || 'Geral'}`, margin + 5, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 8;
        });
        yPosition += 8;
      }

      // Debt Analysis
      yPosition = addSectionDivider(pdf, margin, pageWidth, yPosition, pageHeight);

      pdf.setFontSize(13);
      pdf.setTextColor(79, 70, 229);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANALISE DE ENDIVIDAMENTO', margin, yPosition);
      yPosition += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

      if (reportData?.summary?.despesas_total && reportData?.summary?.receita_total) {
        const receita = reportData.summary.receita_total;
        const despesa = reportData.summary.despesas_total;
        const debtRatio = (despesa / receita * 100) || 0;
        const lucro = receita - despesa;

        pdf.text(`Receita Total: ${receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin, yPosition);
        yPosition += 6;
        pdf.text(`Despesa Total: ${despesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin, yPosition);
        yPosition += 6;
        pdf.text(`Lucro Líquido: ${lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin, yPosition);
        yPosition += 6;
        pdf.setTextColor(79, 70, 229);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Índice Despesa/Receita: ${debtRatio.toFixed(1)}%`, margin, yPosition);
        yPosition += 6;
        pdf.setTextColor(76, 175, 80);
        pdf.text(`Status: ${debtRatio < 50 ? '✓ Saudável' : debtRatio < 80 ? '⚠ Atenção' : '✗ Crítico'}`, margin, yPosition);
      }

      pdf.save(`relatorio-financeiro-${formatDateUTC3()}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      // Create CSV content with UTF-8 encoding
      let csvContent = `Relatório ${reportType === 'dre' ? 'DRE' : 'Financeiro'}\n`;
      csvContent += `Gerado em: ${formatDateTimeUTC3()}\n\n`;

      if (reportData?.summary) {
        csvContent += 'Resumo Financeiro\n';
        Object.entries(reportData.summary).forEach(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const valueStr = typeof value === 'number' 
            ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : value;
          csvContent += `${label},${valueStr}\n`;
        });
        csvContent += '\n';
      }

      if (reportData?.transactions) {
        csvContent += 'Transações\n';
        csvContent += 'Data,Descrição,Tipo,Categoria,Valor\n';
        reportData.transactions.forEach(t => {
          // Format date as DD/MM/YYYY
          const dateStr = t.date ? new Date(t.date).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
          
          // Format amount as R$ with Brazilian currency
          const amount = parseFloat(t.amount || 0);
          const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          
          // Map transaction type to Receita/Despesa
          const typeLabel = t.type === 'venda' ? 'Receita' : t.type === 'compra' ? 'Despesa' : t.type;
          
          // Ensure no undefined values
          const description = t.description || '';
          const category = t.category || 'Sem Categoria';
          
          csvContent += `${dateStr},"${description}",${typeLabel},${category},${formattedAmount}\n`;
        });
      }

      if (reportData?.forecast) {
        csvContent += '\nPrevisões\n';
        csvContent += 'Mês,Receita Prevista,Despesas Previstas,Lucro Previsto\n';
        reportData.forecast.forEach(f => {
          // Format forecast values as R$
          const formatValue = (val) => {
            const num = parseFloat(val || 0);
            return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          };
          
          csvContent += `${f.month || ''},${formatValue(f.revenue)},${formatValue(f.expense)},${formatValue(f.profit)}\n`;
        });
      }

      // Create blob with UTF-8 encoding + BOM (Byte Order Mark) for Excel compatibility
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(csvContent);
      const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blobData = new Uint8Array(BOM.length + uint8Array.length);
      blobData.set(BOM, 0);
      blobData.set(uint8Array, BOM.length);
      
      const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-${reportType}-${formatDateUTC3()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
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
        className="gap-2 flex-1 sm:flex-none"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        Exportar PDF
      </Button>
      <Button
        onClick={exportToExcel}
        disabled={isExporting}
        variant="outline"
        className="gap-2 flex-1 sm:flex-none"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Exportar Excel
      </Button>
    </div>
  );
}