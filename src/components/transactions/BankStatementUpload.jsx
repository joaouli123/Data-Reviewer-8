import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function BankStatementUpload({ open, onOpenChange, onExtracted }) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (ofxContent) => {
      const res = await fetch('/api/bank/upload-ofx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ofxContent })
      });
      if (!res.ok) throw new Error('Falha no upload do OFX');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      queryClient.refetchQueries({ queryKey: ['/api/bank/items'] });
      
      // Extract items properly from the response
      const items = data.newItems || (Array.isArray(data) ? data : []);
      const newCount = items.length;
      const duplicateCount = data.duplicateCount || 0;
      
      let message = `${newCount} nova${newCount !== 1 ? 's' : ''} transação${newCount !== 1 ? 's' : ''} importada${newCount !== 1 ? 's' : ''}`;
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} duplicata${duplicateCount !== 1 ? 's' : ''} ignorada${duplicateCount !== 1 ? 's' : ''})`;
      }
      toast.success(message);
      
      if (file) {
        localStorage.setItem('lastBankStatementFile', file.name);
      }
      if (onExtracted) onExtracted(items);
      onOpenChange(false);
      setFile(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao processar arquivo OFX');
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.ofx')) {
        toast.error('Por favor, selecione um arquivo no formato .OFX');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Ler como ArrayBuffer para detectar/converter encoding
      const buffer = await file.arrayBuffer();
      const decoderUtf8 = new TextDecoder('utf-8');
      const decodedUtf8 = decoderUtf8.decode(buffer);
      
      let content;
      // Heurística simples: se contém caracteres estranhos (como o caractere de substituição ), 
      // tenta ISO-8859-1 que é comum em OFX de bancos brasileiros
      if (decodedUtf8.includes('')) {
        const decoderIso = new TextDecoder('iso-8859-1');
        content = decoderIso.decode(buffer);
      } else {
        content = decodedUtf8;
      }
      
      await uploadMutation.mutateAsync(content);
    } catch (error) {
      toast.error('Erro ao ler arquivo');
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
            Importar Extrato Bancário (OFX)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Formato suportado:</strong> OFX (Open Financial Exchange)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              O extrato bancário padrão exportado pela maioria dos bancos brasileiros.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Arquivo OFX</Label>
            <label className="block">
              <div className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:border-primary">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-600">
                  {file ? file.name : 'Clique para selecionar o arquivo .ofx'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".ofx"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </div>
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">Pronto para importar</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Importar Extrato</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}