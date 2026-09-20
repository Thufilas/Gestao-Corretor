import React, { useState } from 'react';
import { Cake, MessageSquare, Phone, Calendar, UserCheck, Search, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Client, User, BirthdayItem } from '../types';
import { getUpcomingBirthdays, getWhatsAppLink, getBirthdayWhatsAppMessage, formatDateBR } from '../utils/insuranceUtils';
import { exportBirthdaysToExcel } from '../services/excelService';

interface BirthdaysViewProps {
  clients: Client[];
  onViewClientDetails: (client: Client) => void;
  currentUser: User | null;
}

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  clients,
  onViewClientDetails,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const brokerName = currentUser?.name || 'Corretor';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  const upcomingBirthdays = getUpcomingBirthdays(clients);

  const filteredBirthdays = upcomingBirthdays.filter(item => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return item.client.name.toLowerCase().includes(q) || item.client.phone.includes(q);
  });

  const handleExportBirthdays = () => {
    if (filteredBirthdays.length === 0) {
      showToast('Nenhum aniversariante para exportar no momento.');
      return;
    }
    const success = exportBirthdaysToExcel(filteredBirthdays, 'GestaoCorretor_Aniversariantes');
    if (success) {
      showToast(`Planilha de aniversariantes exportada com sucesso! (${filteredBirthdays.length} aniversários)`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-600/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white p-1 rounded-lg text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Cake className="w-6 h-6 text-purple-500" />
            <span>Próximos Aniversariantes da Carteira</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mantenha um relacionamento próximo enviando mensagens calorosas de felicitações no WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar aniversariante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExportBirthdays}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
            title="Exportar lista de aniversariantes para planilha Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-200" />
            <span>Exportar (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Birthday Cards Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        {filteredBirthdays.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Cake className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Nenhum aniversariante encontrado nos próximos 45 dias.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBirthdays.map((item) => {
              const { client, daysUntilBirthday, birthdayFormatted, ageUpcoming, isToday } = item;
              const whatsappUrl = getWhatsAppLink(
                client.phone,
                getBirthdayWhatsAppMessage(client, brokerName)
              );

              return (
                <div
                  key={client.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-purple-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Dia {birthdayFormatted}
                      </span>

                      {isToday ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-600 text-white animate-bounce">
                          É HOJE! 🎂
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Em {daysUntilBirthday} dias
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onViewClientDetails(client)}
                      className="font-bold text-base text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 text-left transition-colors cursor-pointer block"
                    >
                      {client.name}
                    </button>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {client.insuranceCompany} • {client.phone}
                    </p>

                    {ageUpcoming > 0 && (
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                        Completando {ageUpcoming} anos
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => onViewClientDetails(client)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                    >
                      Ver detalhes
                    </button>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Parabenizar no WhatsApp</span>
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
