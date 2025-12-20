import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportExporter({ reportData, reportType = 'general' }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(79, 70, 229); // blue-600
      pdf.text('FinançasPro', 20, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Relatório ${reportType === 'dre' ? 'DRE' : 'Financeiro'}`, 20, yPosition);
      
      yPosition += 5;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, yPosition);
      
      yPosition += 15;

      // Capture charts from DOM
      const chartElements = document.querySelectorAll('[data-export-chart]');
      
      for (const element of chartElements) {
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = 20;
        }

        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (error) {
          console.error('Error capturing chart:', error);
        }
      }

      // Add data table if available
      if (reportData?.summary) {
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Resumo Financeiro', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const valueStr = typeof value === 'number' 
            ? `R$ ${value}`
            : value;
          
          pdf.text(`${label}: ${valueStr}`, 20, yPosition);
          yPosition += 7;
        });
      }

      pdf.save(`relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      // Create CSV content
      let csvContent = `Relatório ${reportType === 'dre' ? 'DRE' : 'Financeiro'}\n`;
      csvContent += `Gerado em: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

      if (reportData?.summary) {
        csvContent += 'Resumo Financeiro\n';
        Object.entries(reportData.summary).forEach(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const valueStr = typeof value === 'number' 
            ? value
            : value;
          csvContent += `${label},${valueStr}\n`;
        });
        csvContent += '\n';
      }

      if (reportData?.transactions) {
        csvContent += 'Transações\n';
        csvContent += 'Data,Descrição,Tipo,Categoria,Valor\n';
        reportData.transactions.forEach(t => {
          csvContent += `${t.date},"${t.description}",${t.type},${t.category},${t.amount}\n`;
        });
      }

      if (reportData?.forecast) {
        csvContent += '\nPrevisões\n';
        csvContent += 'Mês,Receita Prevista,Despesas Previstas,Lucro Previsto\n';
        reportData.forecast.forEach(f => {
          csvContent += `${f.month},${f.revenue},${f.expense},${f.profit}\n`;
        });
      }

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={exportToPDF}
        disabled={isExporting}
        variant="outline"
        className="gap-2"
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
        className="gap-2"
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