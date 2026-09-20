import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Info,
  Loader2,
  Filter
} from 'lucide-react';
import { Client, User } from '../types';
import { 
  exportClientsToExcel, 
  downloadTemplateSpreadsheet, 
  parseExcelOrCsvFile, 
  ImportResult 
} from '../services/excelService';
import { exportClientsToPdf } from '../services/pdfService';
import { formatCurrency, formatDateBR, getDaysRemaining } from '../utils/insuranceUtils';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onImportClients: (newClients: Client[], mode: 'append' | 'replace') => void;
  currentUser: User | null;
  initialTab?: 'import' | 'export';
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  clients,
  onImportClients,
  currentUser,
  initialTab = 'import'
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);
  const [exportScope, setExportScope] = useState<'all' | 'renewal' | 'new' | 'expiring'>('all');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setExportSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsLoading(true);
    setFileName(file.name);

    try {
      const result = await parseExcelOrCsvFile(file);
      if (result.clients.length === 0) {
        setErrorMsg('Nenhum cliente válido encontrado na planilha. Verifique se os cabeçalhos correspondem ao modelo.');
        setImportResult(null);
      } else {
        setImportResult(result);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(`Erro ao ler a planilha: ${err.message || 'Formato incompatível'}. Certifique-se de enviar um arquivo .xlsx ou .csv válido.`);
      setImportResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.clients.length === 0) return;
    onImportClients(importResult.clients, importMode);
    alert(`Sucesso! ${importResult.clients.length} clientes foram importados para o GestãoCorretor.`);
    onClose();
  };

  const resetImport = () => {
    setImportResult(null);
    setFileName(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Importação & Exportação de Planilhas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Substitua sua planilha Excel ou gere relatórios da sua carteira.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/20 px-6 pt-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Importar Planilha Excel / CSV
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Exportar Dados (Excel / PDF)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'import' ? (
            <div className="space-y-5">
              
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/40 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Precisa de um modelo padrão de planilha?
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Baixe nosso modelo oficial já pré-formatado com as colunas certas (Nome, Aniversário, Seguradora, Início, Fim, Telefone, Valor Total, Comissão %, Tipo).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplateSpreadsheet}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-cyan-300 dark:border-cyan-700 hover:bg-cyan-100/50 text-cyan-800 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo .xlsx</span>
                </button>
              </div>

              {/* Step 2: Upload File Area */}
              {!importResult ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Selecione sua planilha existente (.xlsx ou .csv):
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-cyan-50/20"
                  >
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Processando planilha e calculando comissões...
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-cyan-600 dark:text-cyan-400 mb-2" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          Clique aqui ou arraste sua planilha
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou CSV (.csv)
                        </p>
                      </>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Step 3: Preview of Imported Data */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {fileName} processado com sucesso!
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          {importResult.clients.length} segurados identificados e prontos para importar.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetImport}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                    >
                      Trocar arquivo
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Adicionar à carteira atual (Manter existentes)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        Substituir toda a carteira
                      </span>
                    </label>
                  </div>

                  {/* Table Preview */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2">Cliente</th>
                          <th className="p-2">Seguradora</th>
                          <th className="p-2">Vigência Fim</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2 text-right">Comissão R$</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importResult.clients.slice(0, 10).map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2 font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                              {c.name}
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
                              {c.insuranceCompany}
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-400">
                              {formatDateBR(c.endDate)}
                            </td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                c.clientType === 'Renovação'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {c.clientType}
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(c.commissionAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importResult.clients.length > 10 && (
                    <p className="text-[11px] text-slate-400 text-center italic">
                      + {importResult.clients.length - 10} outros clientes na planilha...
                    </p>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* Export Tab */
            <div className="space-y-4">
              {exportSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{exportSuccessMsg}</span>
                  </div>
                  <button
                    onClick={() => setExportSuccessMsg(null)}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 p-0.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Selecione o filtro e o formato desejado para exportar sua carteira de clientes ({clients.length} cadastrados):
              </p>

              {/* Scope Selector */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Filtrar Clientes a Exportar:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      exportScope === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Todos ({clients.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('renewal')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      exportScope === 'renewal'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Renovações ({clients.filter(c => c.clientType === 'Renovação').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('new')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      exportScope === 'new'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Novos ({clients.filter(c => c.clientType === 'Novo').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('expiring')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      exportScope === 'expiring'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Vencendo em 30d ({clients.filter(c => getDaysRemaining(c.endDate) <= 30).length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Excel Option */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-emerald-500/50 dark:border-emerald-600/60 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        Mais Popular
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Planilha Excel (.xlsx)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Planilha com 14 colunas completas, cálculo de comissões, linha de totais automáticos e compatibilidade universal (Excel, Sheets, Calc).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      let toExport = clients;
                      let prefix = 'GestaoCorretor_Clientes';
                      if (exportScope === 'renewal') {
                        toExport = clients.filter(c => c.clientType === 'Renovação');
                        prefix = 'GestaoCorretor_Renovacoes';
                      } else if (exportScope === 'new') {
                        toExport = clients.filter(c => c.clientType === 'Novo');
                        prefix = 'GestaoCorretor_Novos';
                      } else if (exportScope === 'expiring') {
                        toExport = clients.filter(c => getDaysRemaining(c.endDate) <= 30);
                        prefix = 'GestaoCorretor_Vencendo30d';
                      }

                      if (toExport.length === 0) {
                        alert('Nenhum cliente disponível no filtro selecionado.');
                        return;
                      }

                      const ok = exportClientsToExcel(toExport, prefix);
                      if (ok) {
                        setExportSuccessMsg(`Planilha Excel baixada com sucesso! (${toExport.length} clientes)`);
                      }
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Planilha do Excel (.xlsx)</span>
                  </button>
                </div>

                {/* PDF Option */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-cyan-500 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Relatório em PDF (.pdf)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Documento formal em formato paisagem com cabeçalho da sua corretora, dados SUSEP, métricas totais e listagem dos clientes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      let toExport = clients;
                      if (exportScope === 'renewal') {
                        toExport = clients.filter(c => c.clientType === 'Renovação');
                      } else if (exportScope === 'new') {
                        toExport = clients.filter(c => c.clientType === 'Novo');
                      } else if (exportScope === 'expiring') {
                        toExport = clients.filter(c => getDaysRemaining(c.endDate) <= 30);
                      }

                      if (toExport.length === 0) {
                        alert('Nenhum cliente disponível no filtro selecionado.');
                        return;
                      }

                      exportClientsToPdf(toExport, currentUser);
                      setExportSuccessMsg(`Relatório PDF gerado com sucesso! (${toExport.length} clientes)`);
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Relatório em PDF</span>
                  </button>
                </div>

              </div>

              {/* Template download link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={downloadTemplateSpreadsheet}
                  className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1.5 cursor-pointer underline-offset-2 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha Modelo em Branco para Preenchimento (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {activeTab === 'import' && importResult && (
            <button
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Importação de {importResult.clients.length} Clientes</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
