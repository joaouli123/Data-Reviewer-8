import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateUTC3, formatDateTimeUTC3 } from '@/utils/formatters';

export default function ReportExporter({ reportData, reportType = 'general', analysisResult }) {
  const [isExporting, setIsExporting] = useState(false);

  const extractTxDate = (t) => {
    if (!t) return null;
    const candidate = t.paymentDate || t.date || t.createdAt || t.created_at;
    if (!candidate) return null;
    const d = new Date(candidate);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isIncomeType = (type) => ['venda', 'income', 'receita', 'entrada', 'venda_prazo'].includes(type);

  // === DESIGN SYSTEM PADRONIZADO ===
  const COLORS = {
    primary: [44, 62, 80],      // Azul escuro - headers principais
    secondary: [52, 73, 94],    // Azul médio - subheaders
    success: [39, 174, 96],     // Verde - receitas/positivo
    danger: [192, 57, 43],      // Vermelho - despesas/negativo
    warning: [230, 126, 34],    // Laranja - alertas
    info: [52, 152, 219],       // Azul claro - informações
    purple: [142, 68, 173],     // Roxo - previsões
    gray: [149, 165, 166],      // Cinza - texto secundário
    lightBg: [248, 249, 250],   // Fundo claro
    white: [255, 255, 255]
  };

  const FONTS = {
    title: 18,
    subtitle: 14,
    sectionTitle: 11,
    body: 9,
    small: 8,
    tiny: 7
  };

  const formatCurrency = (value) => {
    const val = parseFloat(value || 0);
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const exportToPDF = async () => {
    if (!analysisResult) {
      toast.error('Gere uma analise primeiro para exportar o relatorio.');
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

      const transactions = reportData?.transactions || [];

      // Helper functions
      const checkPageBreak = (neededHeight) => {
        if (yPos + neededHeight > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;
          return true;
        }
        return false;
      };

      const setColor = (color) => {
        pdf.setTextColor(color[0], color[1], color[2]);
      };

      const addSectionHeader = (title, bgColor = COLORS.primary) => {
        checkPageBreak(15);
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setFontSize(FONTS.sectionTitle);
        setColor(COLORS.white);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 3, yPos + 5.5);
        yPos += 12;
        setColor(COLORS.primary);
      };

      const addText = (text, options = {}) => {
        const { 
          fontSize = FONTS.body, 
          color = COLORS.primary, 
          bold = false,
          maxWidth = contentWidth - 5,
          indent = 0
        } = options;
        
        pdf.setFontSize(fontSize);
        setColor(color);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const neededHeight = lines.length * (fontSize * 0.4);
        checkPageBreak(neededHeight + 3);
        
        pdf.text(lines, margin + indent, yPos);
        yPos += neededHeight + 2;
      };

      const addTable = (headers, data, options = {}) => {
        const { 
          headerColor = COLORS.primary,
          striped = true,
          cellPadding = 3
        } = options;

        autoTable(pdf, {
          startY: yPos,
          head: [headers],
          body: data,
          theme: striped ? 'striped' : 'grid',
          headStyles: { 
            fillColor: headerColor,
            textColor: COLORS.white,
            fontSize: FONTS.small,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: cellPadding
          },
          styles: { 
            fontSize: FONTS.small, 
            cellPadding: cellPadding,
            textColor: COLORS.primary
          },
          alternateRowStyles: { fillColor: COLORS.lightBg },
          margin: { left: margin, right: margin },
          ...options.columnStyles && { columnStyles: options.columnStyles }
        });
        yPos = pdf.lastAutoTable.finalY + 8;
      };

      // Calculate financial data
      const incomeTransactions = transactions.filter(t => 
        ['venda', 'venda_prazo', 'receita', 'income'].includes(t.type)
      );
      const expenseTransactions = transactions.filter(t => 
        ['compra', 'compra_prazo', 'despesa', 'expense'].includes(t.type)
      );

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const profit = totalIncome - totalExpense;
      const marginPercent = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : '0.0';

      // Group data
      const groupBy = (arr, keyFn) => {
        const result = {};
        arr.forEach(item => {
          const key = keyFn(item) || 'Outros';
          result[key] = (result[key] || 0) + Math.abs(parseFloat(item.amount || 0));
        });
        return Object.entries(result).sort((a, b) => b[1] - a[1]);
      };

      const incomeByCategory = groupBy(incomeTransactions, t => t.category);
      const expenseByCategory = groupBy(expenseTransactions, t => t.category);
      const incomeByPayment = groupBy(incomeTransactions, t => t.paymentMethod);
      const expenseByPayment = groupBy(expenseTransactions, t => t.paymentMethod);

      // ============ PAGINA 1: CAPA E RESUMO ============
      
      // Header
      pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      setColor(COLORS.white);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATORIO FINANCEIRO', margin, 22);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Analise Inteligente com Inteligencia Artificial', margin, 32);
      
      // Info box
      yPos = 55;
      pdf.setFillColor(COLORS.lightBg[0], COLORS.lightBg[1], COLORS.lightBg[2]);
      pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
      
      setColor(COLORS.secondary);
      pdf.setFontSize(FONTS.body);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Periodo:', margin + 5, yPos + 7);
      pdf.text('Gerado em:', margin + 5, yPos + 14);
      pdf.text('Transacoes:', margin + 90, yPos + 7);
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(reportData?.summary?.periodo || 'N/A', margin + 25, yPos + 7);
      pdf.text(formatDateTimeUTC3(), margin + 32, yPos + 14);
      pdf.text(`${transactions.length}`, margin + 115, yPos + 7);
      
      yPos += 30;

      // KPIs Cards
      addSectionHeader('INDICADORES PRINCIPAIS', COLORS.info);
      
      const kpiData = [
        ['Receita Total', formatCurrency(totalIncome), `${incomeTransactions.length} lancamentos`],
        ['Despesas Totais', formatCurrency(totalExpense), `${expenseTransactions.length} lancamentos`],
        ['Resultado Liquido', formatCurrency(profit), `${marginPercent}% de margem`]
      ];

      addTable(
        ['Indicador', 'Valor', 'Detalhes'],
        kpiData,
        { 
          headerColor: COLORS.info,
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 50, halign: 'right' },
            2: { cellWidth: 60, halign: 'center', textColor: COLORS.gray }
          }
        }
      );

      // Sumario Executivo (ANALISE IA)
      addSectionHeader('SUMARIO EXECUTIVO (ANALISE IA)', COLORS.success);
      
      const summaryText = analysisResult?.executive_summary || 'Analise nao disponivel.';
      pdf.setFillColor(245, 250, 245);
      const summaryLines = pdf.splitTextToSize(summaryText, contentWidth - 10);
      const summaryHeight = Math.max(summaryLines.length * 4 + 10, 25);
      checkPageBreak(summaryHeight + 5);
      
      pdf.roundedRect(margin, yPos, contentWidth, summaryHeight, 2, 2, 'F');
      pdf.setFontSize(FONTS.body);
      setColor(COLORS.secondary);
      pdf.setFont('helvetica', 'normal');
      pdf.text(summaryLines, margin + 5, yPos + 7);
      yPos += summaryHeight + 8;

      // ============ PAGINA 2: DRE COMPLETO ============
      pdf.addPage();
      yPos = 20;
      
      addSectionHeader('DEMONSTRATIVO DE RESULTADOS (DRE)', COLORS.danger);

      // Receitas
      addText('RECEITAS POR CATEGORIA', { bold: true, fontSize: FONTS.body, color: COLORS.success });
      
      if (incomeByCategory.length > 0) {
        const incomeData = incomeByCategory.map(([cat, val]) => [
          cat, formatCurrency(val), totalIncome > 0 ? `${((val / totalIncome) * 100).toFixed(1)}%` : '-'
        ]);
        incomeData.push(['TOTAL RECEITAS', formatCurrency(totalIncome), '100%']);
        
        addTable(['Categoria', 'Valor', '%'], incomeData, { 
          headerColor: COLORS.success,
          columnStyles: { 0: { cellWidth: 70 }, 1: { halign: 'right', cellWidth: 45 }, 2: { halign: 'center', cellWidth: 30 } }
        });
      }

      // Despesas
      addText('DESPESAS POR CATEGORIA', { bold: true, fontSize: FONTS.body, color: COLORS.danger });
      
      if (expenseByCategory.length > 0) {
        const expenseData = expenseByCategory.map(([cat, val]) => [
          cat, formatCurrency(val), totalIncome > 0 ? `${((val / totalIncome) * 100).toFixed(1)}%` : '-'
        ]);
        expenseData.push(['TOTAL DESPESAS', formatCurrency(totalExpense), totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(1)}%` : '-']);
        
        addTable(['Categoria', 'Valor', '% Receita'], expenseData, { 
          headerColor: COLORS.danger,
          columnStyles: { 0: { cellWidth: 70 }, 1: { halign: 'right', cellWidth: 45 }, 2: { halign: 'center', cellWidth: 30 } }
        });
      }

      // Resultado
      checkPageBreak(20);
      pdf.setFillColor(profit >= 0 ? 220 : 254, profit >= 0 ? 252 : 226, profit >= 0 ? 231 : 226);
      pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
      
      pdf.setFontSize(12);
      setColor(profit >= 0 ? COLORS.success : COLORS.danger);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESULTADO LIQUIDO:', margin + 5, yPos + 10);
      pdf.text(formatCurrency(profit), margin + 80, yPos + 10);
      pdf.text(`(${marginPercent}%)`, margin + 130, yPos + 10);
      yPos += 22;

      // ============ FORMAS DE PAGAMENTO ============
      addSectionHeader('ANALISE POR FORMA DE PAGAMENTO', COLORS.purple);

      if (incomeByPayment.length > 0) {
        addText('Receitas por Forma de Pagamento:', { bold: true, color: COLORS.success });
        const payIncData = incomeByPayment.map(([pm, val]) => [
          pm, formatCurrency(val), totalIncome > 0 ? `${((val / totalIncome) * 100).toFixed(1)}%` : '-'
        ]);
        addTable(['Forma', 'Valor', '%'], payIncData, { 
          headerColor: COLORS.success,
          columnStyles: { 0: { cellWidth: 60 }, 1: { halign: 'right', cellWidth: 45 }, 2: { halign: 'center', cellWidth: 30 } }
        });
      }

      if (expenseByPayment.length > 0) {
        addText('Despesas por Forma de Pagamento:', { bold: true, color: COLORS.danger });
        const payExpData = expenseByPayment.map(([pm, val]) => [
          pm, formatCurrency(val), totalExpense > 0 ? `${((val / totalExpense) * 100).toFixed(1)}%` : '-'
        ]);
        addTable(['Forma', 'Valor', '%'], payExpData, { 
          headerColor: COLORS.danger,
          columnStyles: { 0: { cellWidth: 60 }, 1: { halign: 'right', cellWidth: 45 }, 2: { halign: 'center', cellWidth: 30 } }
        });
      }

      // ============ PAGINA 3: ANALISES DA IA ============
      pdf.addPage();
      yPos = 20;

      // Previsao de Fluxo de Caixa
      if (analysisResult?.cash_flow_forecast && analysisResult.cash_flow_forecast.length > 0) {
        addSectionHeader('PREVISAO DE FLUXO DE CAIXA (IA)', COLORS.purple);
        
        const forecastData = analysisResult.cash_flow_forecast.map(f => {
          const rev = parseFloat(f.predicted_revenue || 0);
          const exp = parseFloat(f.predicted_expense || 0);
          return [f.month, formatCurrency(rev), formatCurrency(exp), formatCurrency(rev - exp)];
        });

        addTable(
          ['Periodo', 'Receita Prevista', 'Despesa Prevista', 'Resultado'],
          forecastData,
          { 
            headerColor: COLORS.purple,
            columnStyles: { 
              0: { cellWidth: 40 }, 
              1: { halign: 'right', cellWidth: 40 },
              2: { halign: 'right', cellWidth: 40 },
              3: { halign: 'right', cellWidth: 40 }
            }
          }
        );
      }

      // Oportunidades de Reducao de Custos (IA)
      if (analysisResult?.expense_reduction_opportunities && analysisResult.expense_reduction_opportunities.length > 0) {
        addSectionHeader('OPORTUNIDADES DE REDUCAO DE CUSTOS (IA)', COLORS.warning);
        
        analysisResult.expense_reduction_opportunities.forEach((item, idx) => {
          checkPageBreak(15);
          addText(`${idx + 1}. ${item.suggestion || item.category || 'Sugestao'}`, { 
            bold: true, 
            fontSize: FONTS.body,
            color: COLORS.secondary 
          });
          if (item.potential_savings) {
            addText(`Economia potencial: ${item.potential_savings}`, { 
              fontSize: FONTS.small, 
              color: COLORS.gray,
              indent: 5 
            });
          }
        });
        yPos += 5;
      }

      // Estrategias de Crescimento (IA)
      if (analysisResult?.revenue_growth_suggestions && analysisResult.revenue_growth_suggestions.length > 0) {
        addSectionHeader('ESTRATEGIAS DE CRESCIMENTO (IA)', COLORS.success);
        
        analysisResult.revenue_growth_suggestions.forEach((item, idx) => {
          checkPageBreak(20);
          addText(`${idx + 1}. ${item.strategy || 'Estrategia'}`, { 
            bold: true, 
            fontSize: FONTS.body,
            color: COLORS.secondary 
          });
          if (item.rationale) {
            addText(`Justificativa: ${item.rationale}`, { 
              fontSize: FONTS.small, 
              color: COLORS.gray,
              indent: 5 
            });
          }
          if (item.target_customer_segment) {
            addText(`Publico-alvo: ${item.target_customer_segment}`, { 
              fontSize: FONTS.small, 
              color: COLORS.purple,
              indent: 5 
            });
          }
        });
        yPos += 5;
      }

      // Alertas e Riscos (IA)
      if (analysisResult?.anomalies && analysisResult.anomalies.length > 0) {
        addSectionHeader('ALERTAS E RISCOS IDENTIFICADOS (IA)', COLORS.danger);
        
        analysisResult.anomalies.forEach((item) => {
          checkPageBreak(15);
          addText(`! ${item.title || 'Alerta'}`, { 
            bold: true, 
            fontSize: FONTS.body,
            color: COLORS.danger 
          });
          if (item.description) {
            addText(item.description, { 
              fontSize: FONTS.small, 
              color: COLORS.gray,
              indent: 5 
            });
          }
        });
        yPos += 5;
      }

      // ============ PAGINA 4: TRANSACOES ============
      if (transactions.length > 0) {
        pdf.addPage();
        yPos = 20;
        
        addSectionHeader('HISTORICO DE TRANSACOES', COLORS.secondary);

        const txnData = transactions.slice(0, 50).map(t => {
          const txDate = extractTxDate(t);
          return [
            txDate ? txDate.toLocaleDateString('pt-BR') : '-',
            (t.description || '-').substring(0, 28),
            t.category || 'Outros',
            t.paymentMethod || '-',
            isIncomeType(t.type) ? 'Receita' : 'Despesa',
            formatCurrency(t.amount || 0)
          ];
        });

        addTable(
          ['Data', 'Descricao', 'Categoria', 'Pagamento', 'Tipo', 'Valor'],
          txnData,
          { 
            headerColor: COLORS.secondary,
            columnStyles: { 
              0: { cellWidth: 20 },
              1: { cellWidth: 42 },
              2: { cellWidth: 28 },
              3: { cellWidth: 24 },
              4: { cellWidth: 12, halign: 'center' },
              5: { halign: 'right', cellWidth: 28 }
            }
          }
        );

        if (transactions.length > 50) {
          addText(`* Exibindo 50 de ${transactions.length} transacoes. Exporte para Excel para ver todas.`, {
            fontSize: FONTS.tiny,
            color: COLORS.gray
          });
        }
      }

      // ============ RODAPE EM TODAS AS PAGINAS ============
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Linha separadora
        pdf.setDrawColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        pdf.setFontSize(FONTS.tiny);
        setColor(COLORS.gray);
        pdf.text(`Pagina ${i} de ${totalPages}`, pageWidth - 28, pageHeight - 7);
        pdf.text('HUACONTROL - Inteligencia Financeira', margin, pageHeight - 7);
      }

      pdf.save(`Relatorio_HUACONTROL_${formatDateUTC3()}.pdf`);
      toast.success('Relatorio PDF gerado com sucesso!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const transactions = reportData?.transactions || [];

      const incomeTransactions = transactions.filter(t => ['venda', 'venda_prazo', 'receita', 'income'].includes(t.type));
      const expenseTransactions = transactions.filter(t => ['compra', 'compra_prazo', 'despesa', 'expense'].includes(t.type));

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const profit = totalIncome - totalExpense;

      const groupBy = (arr, keyFn) => {
        const result = {};
        arr.forEach(item => {
          const key = keyFn(item) || 'Outros';
          result[key] = (result[key] || 0) + Math.abs(parseFloat(item.amount || 0));
        });
        return Object.entries(result).sort((a, b) => b[1] - a[1]);
      };

      // Aba 1: Resumo
      const summaryData = [
        ['HUACONTROL - RELATORIO FINANCEIRO'],
        [''],
        ['Periodo', reportData?.summary?.periodo || 'N/A'],
        ['Gerado em', formatDateTimeUTC3()],
        [''],
        ['INDICADORES'],
        ['Receita Total', totalIncome],
        ['Despesas Totais', totalExpense],
        ['Resultado Liquido', profit],
        ['Margem', totalIncome > 0 ? `${((profit / totalIncome) * 100).toFixed(1)}%` : '0%'],
        [''],
        ['SUMARIO EXECUTIVO (IA)'],
        [analysisResult?.executive_summary || 'N/A']
      ];

      if (analysisResult?.cash_flow_forecast?.length > 0) {
        summaryData.push([''], ['PREVISAO FLUXO DE CAIXA (IA)']);
        summaryData.push(['Mes', 'Receita', 'Despesa', 'Resultado']);
        analysisResult.cash_flow_forecast.forEach(f => {
          summaryData.push([f.month, f.predicted_revenue, f.predicted_expense, (f.predicted_revenue || 0) - (f.predicted_expense || 0)]);
        });
      }

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Resumo");

      // Aba 2: DRE
      const dreData = [['DRE - DEMONSTRATIVO DE RESULTADOS'], ['']];
      dreData.push(['RECEITAS'], ['Categoria', 'Valor', '%']);
      groupBy(incomeTransactions, t => t.category).forEach(([cat, val]) => {
        dreData.push([cat, val, totalIncome > 0 ? `${((val / totalIncome) * 100).toFixed(1)}%` : '-']);
      });
      dreData.push(['TOTAL', totalIncome, '100%'], ['']);
      dreData.push(['DESPESAS'], ['Categoria', 'Valor', '%']);
      groupBy(expenseTransactions, t => t.category).forEach(([cat, val]) => {
        dreData.push([cat, val, totalIncome > 0 ? `${((val / totalIncome) * 100).toFixed(1)}%` : '-']);
      });
      dreData.push(['TOTAL', totalExpense], [''], ['RESULTADO', profit]);
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dreData), "DRE");

      // Aba 3: Formas Pagamento
      const payData = [['POR FORMA DE PAGAMENTO'], ['']];
      payData.push(['RECEITAS'], ['Forma', 'Valor']);
      groupBy(incomeTransactions, t => t.paymentMethod).forEach(([pm, val]) => payData.push([pm, val]));
      payData.push([''], ['DESPESAS'], ['Forma', 'Valor']);
      groupBy(expenseTransactions, t => t.paymentMethod).forEach(([pm, val]) => payData.push([pm, val]));
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payData), "Formas Pagamento");

      // Aba 4: Analises IA
      const iaData = [['ANALISES DA INTELIGENCIA ARTIFICIAL'], ['']];
      
      if (analysisResult?.expense_reduction_opportunities?.length > 0) {
        iaData.push(['REDUCAO DE CUSTOS']);
        analysisResult.expense_reduction_opportunities.forEach((item, i) => {
          iaData.push([`${i + 1}. ${item.suggestion || item.category}`]);
        });
        iaData.push(['']);
      }

      if (analysisResult?.revenue_growth_suggestions?.length > 0) {
        iaData.push(['ESTRATEGIAS DE CRESCIMENTO']);
        analysisResult.revenue_growth_suggestions.forEach((item, i) => {
          iaData.push([`${i + 1}. ${item.strategy}`, item.rationale || '']);
        });
        iaData.push(['']);
      }

      if (analysisResult?.anomalies?.length > 0) {
        iaData.push(['ALERTAS E RISCOS']);
        analysisResult.anomalies.forEach(item => {
          iaData.push([item.title, item.description || '']);
        });
      }

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(iaData), "Analises IA");

      // Aba 5: Transacoes
      const txnData = [['Data', 'Descricao', 'Categoria', 'Pagamento', 'Tipo', 'Valor']];
      transactions.forEach(t => {
        const txDate = extractTxDate(t);
        txnData.push([
          txDate ? txDate.toLocaleDateString('pt-BR') : '',
          t.description || '',
          t.category || 'Outros',
          t.paymentMethod || '-',
          isIncomeType(t.type) ? 'Receita' : 'Despesa',
          parseFloat(t.amount || 0)
        ]);
      });
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txnData), "Transacoes");

      XLSX.writeFile(wb, `HUACONTROL_Relatorio_${formatDateUTC3()}.xlsx`);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      console.error('Excel Error:', error);
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
        data-testid="button-export-pdf"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-blue-600" />}
        Exportar PDF
      </Button>
      <Button
        onClick={exportToExcel}
        disabled={isExporting}
        variant="outline"
        className="gap-2 flex-1 sm:flex-none border-emerald-200 hover:bg-emerald-50"
        data-testid="button-export-excel"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
        Exportar XLSX
      </Button>
    </div>
  );
}
