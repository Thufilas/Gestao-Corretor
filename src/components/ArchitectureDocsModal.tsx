import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Terminal, 
  FileSpreadsheet, 
  Server, 
  Database, 
  FileText, 
  CheckCircle2, 
  Code2, 
  Copy, 
  Check,
  HardDrive
} from 'lucide-react';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'localRun' | 'filesAndExcel'>('architecture');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Documentação Técnica & Guia de Execução
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquitetura do GestãoCorretor, instruções locais e gestão de arquivos.
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/20 px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            1. Arquitetura Recomendada
          </button>
          <button
            onClick={() => setActiveTab('localRun')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'localRun'
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            2. Como Rodar Localmente
          </button>
          <button
            onClick={() => setActiveTab('filesAndExcel')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'filesAndExcel'
                ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            3. Anexos & Importação Excel
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          
          {activeTab === 'architecture' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-600" />
                  Comparativo de Arquiteturas para CRM de Seguros
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Para corretores de seguros automotivos que lidam com apólices confidenciais, comissões variáveis e anexos de documentos PDF pesados, a arquitetura moderna recomendada é:
                </p>
              </div>

              {/* Stack Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Opção Recomendada: Node.js + React + IndexedDB/SQLite/Postgres */}
                <div className="p-4 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border-2 border-cyan-500/40 dark:border-cyan-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-cyan-900 dark:text-cyan-300">
                      Arquitetura Escolhida (Produção)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-bold text-[10px]">
                      Recomendada
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">
                    React 19 + TypeScript + Tailwind CSS + IndexedDB / Node.js
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                      <span><strong>Velocidade e UX:</strong> Interface instantânea sem recarregamento de página, cálculo de comissões em tempo real.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                      <span><strong>Upload de Arquivos:</strong> Armazenamento local persistente de PDFs via IndexedDB no navegador ou Cloud Storage no servidor.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                      <span><strong>WhatsApp Direto:</strong> Integração instantânea com links pré-formatados com mensagens personalizadas.</span>
                    </li>
                  </ul>
                </div>

                {/* Opção Alternativa: Python com Streamlit ou Flask */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-xs text-slate-500 dark:text-slate-400 block mb-2">
                    Opção Alternativa (Python Data Science)
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">
                    Python (Streamlit / Flask) + SQLite
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <li>• <strong>Vantagem:</strong> Excelente para scripts rápidos de análise com pandas e geração de gráficos com matplotlib.</li>
                    <li>• <strong>Desvantagem:</strong> Streamlit reexecuta todo o script a cada clique, tornando uploads de PDFs pesados e máscaras de telefone lentas e pouco fluidas.</li>
                  </ul>
                </div>

              </div>

              {/* Database Schema */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-800">
                <div className="flex justify-between items-center text-slate-400 mb-2 font-sans font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    Esquema Relacional das Tabelas (SQL / Relacional)
                  </span>
                </div>
                <pre className="overflow-x-auto text-cyan-300">
{`CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  insurance_company VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  vehicle_model VARCHAR(150),
  license_plate VARCHAR(10),
  total_insured_value DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL, -- Calculado: total * (rate / 100)
  client_type ENUM('Novo', 'Renovação') NOT NULL,
  notes TEXT,
  document_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                </pre>
              </div>

            </div>
          )}

          {activeTab === 'localRun' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-600" />
                  Instruções para Execução Local no Computador
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Siga os passos abaixo para rodar o <strong>GestãoCorretor</strong> na sua máquina localmente:
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  1. Pré-requisitos
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Ter o <strong>Node.js 18+</strong> ou superior instalado (<a href="https://nodejs.org" target="_blank" className="text-cyan-600 underline">nodejs.org</a>).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    2. Instalação das Dependências
                  </h4>
                  <button
                    onClick={() => copyToClipboard('npm install', 'cmd1')}
                    className="flex items-center gap-1 text-[10px] text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer"
                  >
                    {copiedCode === 'cmd1' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'cmd1' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] font-mono">
npm install
                </pre>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    3. Iniciar o Servidor de Desenvolvimento
                  </h4>
                  <button
                    onClick={() => copyToClipboard('npm run dev', 'cmd2')}
                    className="flex items-center gap-1 text-[10px] text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer"
                  >
                    {copiedCode === 'cmd2' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'cmd2' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] font-mono">
npm run dev
                </pre>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  O sistema estará disponível em <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 font-mono">http://localhost:3000</code>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    4. Gerar Build de Produção
                  </h4>
                  <button
                    onClick={() => copyToClipboard('npm run build', 'cmd3')}
                    className="flex items-center gap-1 text-[10px] text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer"
                  >
                    {copiedCode === 'cmd3' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'cmd3' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] font-mono">
npm run build
                </pre>
              </div>

            </div>
          )}

          {activeTab === 'filesAndExcel' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-cyan-600" />
                  Gerenciamento de Arquivos e Planilhas Existentes
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Como substituir 100% a planilha Excel e gerenciar as apólices digitais:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    1. Como Importar sua Planilha Excel Atual
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Clique no botão <strong>"Planilhas"</strong> no topo da página. O GestãoCorretor aceita arquivos nos formatos <code>.xlsx</code> ou <code>.csv</code>. Ele detecta automaticamente nomes parecidos nas colunas (como "Nome", "Cliente", "Vigência", "Prêmio", "Comissão") e calcula a comissão ganha na hora. Você também pode baixar o <em>Modelo Oficial</em> para preenchimento fácil.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-500" />
                    2. Armazenamento de Arquivos: Firebase Storage & IndexedDB
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    O <strong>GestãoCorretor</strong> possui integração com o <strong>Firebase Storage</strong> para envio de apólices e documentos na nuvem, com links de download assinados e visualizador embutido. Possui também fallback automático para <strong>IndexedDB</strong> no navegador caso você esteja offline.
                    <br />
                    <span className="block mt-1 font-semibold text-cyan-600 dark:text-cyan-400">
                      Regra de Produção recomendada para o Firebase Storage:
                    </span>
                    <code className="block p-2 mt-1 rounded bg-slate-900 text-slate-200 text-[10px] font-mono">
                      allow read, write: if request.auth != null;
                    </code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                    3. Alertas Automáticos de Renovação & Aniversários
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    O sistema recalcula diariamente os dias restantes até o fim de vigência da apólice:
                    <br />
                    • <strong className="text-rose-600">Alerta Vermelho:</strong> 10 dias ou menos (ou vencidas)
                    <br />
                    • <strong className="text-amber-600">Alerta Laranja:</strong> 11 a 15 dias
                    <br />
                    • <strong className="text-yellow-600">Alerta Amarelo:</strong> 16 a 30 dias
                    <br />
                    Cada alerta possui atalho direto de mensagem pronta no WhatsApp e distinção visual se é <em>Renovação</em> ou <em>Cliente Novo</em>.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
