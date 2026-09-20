import React, { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, Loader2, AlertCircle, Cloud } from 'lucide-react';
import { PolicyDocument } from '../types';
import { getDocumentFile } from '../services/storage';

interface DocumentViewerModalProps {
  document: PolicyDocument | null;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  clientName,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !document) {
      setDataUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    // 1. If document has Firebase Storage URL, use it directly
    if (document.storageUrl) {
      setDataUrl(document.storageUrl);
      setLoading(false);
      return;
    }

    // 2. If document has inline dataUrl
    if (document.dataUrl) {
      setDataUrl(document.dataUrl);
      setLoading(false);
      return;
    }

    // 3. Otherwise load from IndexedDB
    getDocumentFile(document.id)
      .then((doc) => {
        if (doc && (doc.storageUrl || doc.dataUrl)) {
          setDataUrl(doc.storageUrl || doc.dataUrl || null);
        } else {
          setDataUrl(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load document content:', err);
        setError('Não foi possível carregar o arquivo anexado.');
        setLoading(false);
      });
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleDownload = () => {
    if (document.storageUrl) {
      window.open(document.storageUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!dataUrl) {
      // Create a fallback text file if it's sample data
      const element = window.document.createElement('a');
      const file = new Blob([
        `APÓLICE DE SEGURO AUTOMOTIVO\n\nCliente: ${clientName}\nDocumento: ${document.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nEste é um registro oficial vinculado ao GestãoCorretor.`
      ], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = document.name.endsWith('.pdf') ? document.name.replace('.pdf', '.txt') : document.name;
      window.document.body.appendChild(element);
      element.click();
      window.document.body.removeChild(element);
      return;
    }

    const a = window.document.createElement('a');
    a.href = dataUrl;
    a.download = document.name;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const isPdf = document.type.includes('pdf') || document.name.toLowerCase().endsWith('.pdf');
  const isImage = document.type.includes('image') || /\.(png|jpe?g|webp|gif)$/i.test(document.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate max-w-md">
                  {document.name}
                </h3>
                {document.storageUrl && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span>Firebase Storage</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apólice de: <span className="font-semibold text-slate-700 dark:text-slate-300">{clientName}</span> • {(document.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.storageUrl && (
              <a
                href={document.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                title="Abrir arquivo diretamente no Firebase Storage"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Link Firebase</span>
              </a>
            )}
            <button
              id="btn-doc-modal-download"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo</span>
            </button>
            <button
              id="btn-doc-modal-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-auto flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              <p className="text-sm font-medium">Carregando visualização do documento...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 max-w-md">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
            </div>
          ) : dataUrl && isPdf ? (
            <iframe
              src={dataUrl}
              title="Visualizador de Apólice"
              className="w-full h-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white shadow-sm"
            />
          ) : dataUrl && isImage ? (
            <div className="max-h-full flex items-center justify-center">
              <img
                src={dataUrl}
                alt="Documento da Apólice"
                className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          ) : (
            <div className="text-center p-8 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-100 dark:border-cyan-800 flex items-center justify-center text-cyan-600 mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white mb-2">
                Documento de Demonstração
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Este é um registro de demonstração ({document.name}). Ao cadastrar um novo cliente ou editar este cliente, você pode fazer o upload do seu próprio arquivo PDF ou imagem real da apólice, permitindo visualizá-lo diretamente aqui ou baixá-lo.
              </p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Certificado / Comprovante</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
