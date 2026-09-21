import React from 'react';
import { 
  X, 
  Calendar, 
  Phone, 
  Building2, 
  Car, 
  FileText, 
  Download, 
  Eye, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  Cake, 
  DollarSign,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Client, User } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getDaysRemaining, 
  getExpiryAlertLevel, 
  getWhatsAppLink, 
  getRenewalWhatsAppMessage, 
  getBirthdayWhatsAppMessage,
  calculateExactAge
} from '../utils/insuranceUtils';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onViewDocument: (client: Client) => void;
  currentUser: User | null;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onViewDocument,
  currentUser
}) => {
  if (!isOpen || !client) return null;

  const daysRemaining = getDaysRemaining(client.endDate);
  const alertLevel = getExpiryAlertLevel(daysRemaining);

  const brokerName = currentUser?.name || 'Corretor';
  const brokerageName = currentUser?.brokerageName || 'Corretora';
  const whatsappRenewalLink = getWhatsAppLink(
    client.phone, 
    getRenewalWhatsAppMessage(client, brokerName, brokerageName)
  );
  const whatsappBirthdayLink = getWhatsAppLink(
    client.phone, 
    getBirthdayWhatsAppMessage(client, brokerName, brokerageName)
  );
  const whatsappDirectLink = getWhatsAppLink(
    client.phone, 
    `Olá, ${client.name.trim()}, tudo bem? Aqui é o ${brokerName}, da ${brokerageName}.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                client.clientType === 'Renovação'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {client.clientType === 'Renovação' ? 'Cliente Renovação' : 'Cliente Novo (1ª Renovação)'}
              </span>

              {alertLevel === 'red' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Alerta Vermelho ({daysRemaining <= 0 ? 'Vencido' : `${daysRemaining} dias`})
                </span>
              )}
              {alertLevel === 'orange' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Alerta Laranja ({daysRemaining} dias)
                </span>
              )}
              {alertLevel === 'yellow' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                  Alerta Amarelo ({daysRemaining} dias)
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {client.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{client.insuranceCompany}</span>
              {client.vehicleModel && (
                <>
                  <span>•</span>
                  <span>{client.vehicleModel}</span>
                </>
              )}
              {client.licensePlate && (
                <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono font-bold">
                  {client.licensePlate}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={whatsappRenewalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar Proposta de Renovação WhatsApp</span>
            </a>

            <a
              href={whatsappBirthdayLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-all cursor-pointer"
              title="Mandar parabéns de aniversário"
            >
              <Cake className="w-4 h-4" />
              <span>Parabéns</span>
            </a>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Box 1: Vigência & Prazos */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-600" />
                Vigência & Status da Apólice
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Início da Vigência:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateBR(client.startDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fim da Vigência:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatDateBR(client.endDate)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Contagem Regressiva:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {daysRemaining < 0
                      ? `Expirada há ${Math.abs(daysRemaining)} dias`
                      : daysRemaining === 0
                      ? 'Vence Hoje!'
                      : `${daysRemaining} dias restantes`}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Financeiro & Comissão */}
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Valores & Comissão do Corretor
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Valor Total do Seguro:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {formatCurrency(client.totalInsuredValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Percentual da Comissão:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {client.commissionRate}%
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold">Comissão Ganha:</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-base">
                    {formatCurrency(client.commissionAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 3: Dados Pessoais & Contato */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-600" />
                Contato & Aniversário
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Telefone / WhatsApp:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {client.phone}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Data de Aniversário:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Cake className="w-3 h-3 text-purple-500" />
                    <span>{formatDateBR(client.birthDate)}</span>
                    {calculateExactAge(client.birthDate) !== null && (
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/70 px-1.5 py-0.5 rounded">
                        ({calculateExactAge(client.birthDate)} anos)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Box 4: Apólice Anexada */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-600" />
                Documento da Apólice
              </h3>

              {client.document ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {client.document.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onViewDocument(client)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar / Baixar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Nenhum arquivo de apólice anexado. Clique em "Editar" para fazer upload do PDF.
                </div>
              )}
            </div>

          </div>

          {/* Observações */}
          {client.notes && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Observações / Histórico
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {client.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Deseja realmente excluir o cadastro de ${client.name}?`)) {
                onDelete(client.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Cliente</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onEdit(client);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Cadastro</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
