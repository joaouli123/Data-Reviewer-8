import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDateUTC3, formatDateTimeUTC3, getDateNowUTC3 } from '@/utils/formatters';

export default function ReportExporter({ reportData, reportType = 'general' }) {
  const [isExporting, setIsExporting] = useState(false);

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

      // Title and metadata
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
      yPosition += 8;

      // Capture all visible sections from the page
      const tabContainers = document.querySelectorAll('[role="tabpanel"]');
      
      for (const container of tabContainers) {
        // Check if container has visible content
        if (container.style.display === 'none') continue;
        
        // Add section title
        const tabName = container.getAttribute('aria-labelledby');
        if (tabName) {
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.setFontSize(13);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${tabName.replace(/[_-]/g, ' ')}`, margin, yPosition);
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');
        }

        // Capture all charts and tables in this section
        const elements = container.querySelectorAll('.recharts-wrapper, [data-export-chart], table');
        
        for (const element of elements) {
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            yPosition = margin;
          }

          try {
            const canvas = await html2canvas(element, {
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false,
              useCORS: true,
              allowTaint: true
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * contentWidth) / canvas.width;
            
            // Check if image fits on current page
            if (yPosition + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, imgHeight);
            yPosition += imgHeight + 8;
          } catch (error) {
            // Skip elements that can't be captured
          }
        }

        // Add spacing between sections
        yPosition += 5;
      }

      // Add summary data if available
      if (reportData?.summary) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Resumo Executivo', margin, yPosition);
        yPosition += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        Object.entries(reportData.summary).forEach(([key, value]) => {
          // Skip undefined values
          if (value === undefined || value === null) return;
          
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          let valueStr;
          
          if (typeof value === 'number') {
            // Format numbers as Brazilian currency (R$)
            valueStr = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            // Format dates as DD/MM/YYYY
            const date = new Date(value);
            valueStr = date.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
          } else {
            // Keep string values as is
            valueStr = String(value || '');
          }
          
          if (valueStr) {
            pdf.text(`${label}: ${valueStr}`, margin, yPosition);
            yPosition += 6;
          }
        });
      }

      pdf.save(`relatorio-completo-${formatDateUTC3()}.pdf`);
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
          
          // Ensure no undefined values
          const description = t.description || '';
          const type = t.type || '';
          const category = t.category || 'Sem Categoria';
          
          csvContent += `${dateStr},"${description}",${type},${category},${formattedAmount}\n`;
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