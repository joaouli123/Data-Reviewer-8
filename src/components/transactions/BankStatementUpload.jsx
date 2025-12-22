import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import { toast } from 'sonner';

export default function BankStatementUpload({ open, onOpenChange, onExtracted }) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const validTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!validTypes.includes(fileType) && !selectedFile.name.endsWith('.csv')) {
        toast.error('Formato de arquivo não suportado. Use PDF ou CSV.');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setIsUploading(true);
    try {
      // Upload file
      const { file_url } = await UploadFile({ file });

      // Extract data from file
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data da transação no formato YYYY-MM-DD ou DD/MM/YYYY" },
            description: { type: "string", description: "Descrição da movimentação" },
            amount: { type: "number", description: "Valor absoluto da transação" },
            type: { type: "string", enum: ["income", "expense"], description: "Tipo: income para crédito/entrada, expense para débito/saída" }
          },
          required: ["date", "description", "amount", "type"]
        }
      };

      const extractionResult = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema
      });

      if (extractionResult.status === 'success' && extractionResult.output) {
        // Normalize dates
        const normalizedData = extractionResult.output.map(item => {
          let normalizedDate = item.date;
          
          // Convert DD/MM/YYYY to YYYY-MM-DD
          if (item.date.includes('/')) {
            const parts = item.date.split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          
          return {
            ...item,
            date: normalizedDate
          };
        });

        onExtracted(normalizedData);
        toast.success(`${normalizedData.length} transações extraídas do extrato!`);
        onOpenChange(false);
        setFile(null);
      } else {
        toast.error(extractionResult.details || 'Erro ao extrair dados do arquivo');
      }
    } catch (error) {
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Extrato Bancário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
            <p className="text-sm text-primary">
              <strong>Formatos aceitos:</strong> PDF ou CSV
            </p>
            <p className="text-xs text-primary mt-1">
              O sistema irá extrair automaticamente as transações do seu extrato bancário.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Selecionar Arquivo</Label>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <div className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {file ? file.name : 'Clique para selecionar o arquivo'}
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.csv,.xls,.xlsx"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">
                Arquivo selecionado: {file.name}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
              className="no-default-hover-elevate"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="bg-primary no-default-hover-elevate"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar e Conciliar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}