import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  ShieldCheck, 
  ExternalLink, 
  Database, 
  Wrench, 
  HardDrive, 
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  getFirebaseConfig, 
  saveCustomFirebaseConfig, 
  runFirebaseStorageDiagnosticTest, 
  RECOMMENDED_STORAGE_RULES_PROD, 
  RECOMMENDED_STORAGE_RULES_DEV,
  FirebaseStorageDiagnosticDetail,
  isFirebaseConfigured,
  getFirebaseAuth
} from '../services/firebase';

interface FirebaseTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialErrorDetail?: FirebaseStorageDiagnosticDetail | null;
}

export const FirebaseTroubleshootModal: React.FC<FirebaseTroubleshootModalProps> = ({
  isOpen,
  onClose,
  initialErrorDetail
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'rules' | 'bucket' | 'offline'>('diagnostic');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    code?: string;
    latencyMs: number;
    bucket: string;
    isAuthenticated: boolean;
    diagnostic: FirebaseStorageDiagnosticDetail;
  } | null>(null);

  const [copiedRules, setCopiedRules] = useState<string | null>(null);
  const [customBucket, setCustomBucket] = useState('');
  const [saveBucketNotice, setSaveBucketNotice] = useState(false);

  const config = getFirebaseConfig();
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  useEffect(() => {
    if (config) {
      setCustomBucket(config.storageBucket || '');
    }
  }, [config, isOpen]);

  // If opened with an initial error detail, set it into the test view
  useEffect(() => {
    if (initialErrorDetail && isOpen) {
      setTestResult({
        success: false,
        message: `${initialErrorDetail.title}: ${initialErrorDetail.description}`,
        code: initialErrorDetail.code,
        latencyMs: 0,
        bucket: initialErrorDetail.bucketUsed,
        isAuthenticated: initialErrorDetail.isAuthenticated,
        diagnostic: initialErrorDetail
      });
      setActiveTab('diagnostic');
    }
  }, [initialErrorDetail, isOpen]);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setIsRunningTest(true);
    setSaveBucketNotice(false);
    try {
      const res = await runFirebaseStorageDiagnosticTest();
      setTestResult(res);
    } catch (err) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRules(label);
    setTimeout(() => {
      setCopiedRules(null);
    }, 3000);
  };

  const handleSwitchBucketPreset = (type: 'firebasestorage' | 'appspot') => {
    if (!config?.projectId) return;
    const newBucket = type === 'firebasestorage' 
      ? `${config.projectId}.firebasestorage.app` 
      : `${config.projectId}.appspot.com`;

    setCustomBucket(newBucket);
    saveCustomFirebaseConfig({
      ...config,
      storageBucket: newBucket
    });
    setSaveBucketNotice(true);
  };

  const handleSaveCustomBucket = () => {
    if (!config) return;
    saveCustomFirebaseConfig({
      ...config,
      storageBucket: customBucket.trim()
    });
    setSaveBucketNotice(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Flame className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Troubleshoot: Firebase Storage</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300">
                  Diagnóstico Ativo
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resolução guiada para anexo e sincronização de apólices de seguro na nuvem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Diagnóstico em Tempo Real</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Regras de Segurança (Rules)</span>
          </button>

          <button
            onClick={() => setActiveTab('bucket')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'bucket'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Configurar Bucket</span>
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'offline'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Armazenamento Local Seguro</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* TAB 1: DIAGNOSTIC */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-4">
              {/* Quick Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Firebase Config</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {config?.projectId || 'Não Configurado'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {isFirebaseConfigured() ? '✅ Chaves presentes' : '❌ Faltando chaves'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Autenticação</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {currentUser ? (currentUser.email || 'Usuário Conectado') : 'Modo Demo / Local'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {currentUser ? '✅ Auth UID ativo' : '⚠️ Sem token Auth'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Bucket Storage</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={config?.storageBucket}>
                    {config?.storageBucket || 'Indefinido'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {config?.storageBucket?.includes('firebasestorage.app') ? 'Novo padrão Google' : 'Padrão appspot'}
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-500" />
                    <span>Teste de Sonda em Tempo Real</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Envia um arquivo de teste de 1 byte para verificar se o Storage aceita uploads e responder com o código exato.
                  </p>
                </div>

                <button
                  onClick={handleRunDiagnostic}
                  disabled={isRunningTest}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-900 text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningTest ? 'animate-spin' : ''}`} />
                  <span>{isRunningTest ? 'Testando Conexão...' : 'Executar Teste Agora'}</span>
                </button>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  testResult.success
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className={`text-xs font-bold ${
                          testResult.success ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
                        }`}>
                          {testResult.diagnostic.title}
                        </h4>
                        {testResult.code && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                            {testResult.code}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {testResult.diagnostic.description}
                      </p>

                      {/* Actionable recommendation */}
                      <div className="mt-3 p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Como Corrigir Este Erro:</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {testResult.diagnostic.solution}
                        </p>

                        {/* Direct shortcut button based on the error */}
                        {testResult.code === 'storage/unauthorized' && (
                          <div className="pt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => setActiveTab('rules')}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Ver & Copiar Regras de Segurança</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {testResult.code === 'storage/bucket-not-found' && (
                          <div className="pt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleSwitchBucketPreset('firebasestorage')}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Mudar para .firebasestorage.app</span>
                            </button>
                            <button
                              onClick={() => handleSwitchBucketPreset('appspot')}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Mudar para .appspot.com</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Troubleshooting Checklist */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Checklist Rápido de Verificação
                </h4>
                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 shrink-0">1.</span>
                    <span>O Firebase Storage foi iniciado no console? (Acesse Firebase Console &gt; Storage &gt; "Primeiros Passos").</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 shrink-0">2.</span>
                    <span>As Regras do Storage estão configuradas para permitir escrita na pasta <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px]">policies/</code>?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 shrink-0">3.</span>
                    <span>O domínio do bucket está correto (<code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px]">.firebasestorage.app</code> para novos projetos ou <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px]">.appspot.com</code> para projetos antigos)?</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      Como Resolver o Erro "storage/unauthorized" no Firebase Storage:
                    </span>
                    <p className="mt-1 leading-relaxed">
                      O Firebase Storage possui um painel de regras próprio (separado do Firestore). Por padrão, projetos recém-criados vêm em <em>Modo Bloqueado</em> (<code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[11px]">allow read, write: if false;</code>). Para liberar o anexo de apólices, siga estes 3 passos simples:
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Copie as Regras Recomendadas (Opção 1) abaixo.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Acesse a aba <strong>Rules</strong> do Storage no seu Firebase Console.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Substitua o conteúdo atual e clique no botão azul <strong>"Publicar" (Publish)</strong>.</span>
                  </div>
                </div>

                {config?.projectId && (
                  <div className="pt-1">
                    <a
                      href={`https://console.firebase.google.com/project/${config.projectId}/storage/rules`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer inline-flex"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Storage Rules no Firebase Console ({config.projectId})</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Rules Option A: Production */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Opção 1: Regras Recomendadas (Seguro para Corretores Autenticados)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Permite que cada corretor leia e grave apenas nas pastas de apólices e pasta de teste de diagnóstico.
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(RECOMMENDED_STORAGE_RULES_PROD, 'prod')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedRules === 'prod' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRules === 'prod' ? 'Copiado!' : 'Copiar Regras'}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {RECOMMENDED_STORAGE_RULES_PROD}
                </pre>
              </div>

              {/* Rules Option B: Development Mode */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Opção 2: Modo Teste Aberto (Temporário para Desenvolvimento)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Libera leitura e escrita livremente no Storage (útil para testes imediatos sem exigir login do corretor).
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(RECOMMENDED_STORAGE_RULES_DEV, 'dev')}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedRules === 'dev' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRules === 'dev' ? 'Copiado!' : 'Copiar Regras'}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {RECOMMENDED_STORAGE_RULES_DEV}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: BUCKET CONFIGURATION */}
          {activeTab === 'bucket' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Nome do Bucket do Firebase Storage
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Projetos criados recentemente pelo Google utilizam o sufixo <strong>.firebasestorage.app</strong>. Projetos anteriores utilizavam <strong>.appspot.com</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customBucket}
                      onChange={(e) => setCustomBucket(e.target.value)}
                      placeholder="ex: meu-projeto.firebasestorage.app"
                      className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      onClick={handleSaveCustomBucket}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold cursor-pointer transition-all shrink-0"
                    >
                      Salvar Bucket
                    </button>
                  </div>

                  {saveBucketNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bucket atualizado com sucesso! Execute o teste na primeira aba para validar.</span>
                    </div>
                  )}
                </div>

                {/* Quick Switch Buttons */}
                {config?.projectId && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Atalhos rápidos:</span>
                    <button
                      onClick={() => handleSwitchBucketPreset('firebasestorage')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-300 text-[11px] font-mono font-medium cursor-pointer"
                    >
                      {config.projectId}.firebasestorage.app
                    </button>
                    <button
                      onClick={() => handleSwitchBucketPreset('appspot')}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-medium cursor-pointer"
                    >
                      {config.projectId}.appspot.com
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OFFLINE LOCAL STORAGE RESILIENCY */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
                  <Database className="w-4 h-4" />
                  <span>Sua apólice não foi perdida! Motor de Armazenamento Local Seguro (IndexedDB)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  O <strong>GestãoCorretor</strong> foi desenhado com arquitetura de contingência (Offline-First).
                  Sempre que um anexo de PDF é realizado, o sistema armazena uma cópia integral do arquivo no banco de dados local do seu navegador (IndexedDB) em formato binário otimizado.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-cyan-900 dark:text-cyan-200">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Você pode visualizar e baixar a apólice anexada normalmente a qualquer momento.</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Benefícios da Arquitetura Híbrida:
                </h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Resiliência:</strong> Funciona mesmo sem conexão com a internet ou enquanto o Firebase estiver em manutenção.</li>
                  <li><strong>Velocidade:</strong> Abertura instantânea dos documentos de apólices sem aguardar download da rede.</li>
                  <li><strong>Sincronização em Nuvem:</strong> Quando o Firebase Storage estiver conectado, novas apólices são sincronizadas automaticamente para backup permanente.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Fazer Teste Novamente</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Fechar Diagnóstico
          </button>
        </div>

      </div>
    </div>
  );
};
