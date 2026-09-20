import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  Eye, 
  MessageSquare, 
  Cake, 
  Calendar, 
  Building2, 
  Phone, 
  Car, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowUpDown,
  FileCheck
} from 'lucide-react';
import { Client, ClientType, AlertLevel, User } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getDaysRemaining, 
  getExpiryAlertLevel, 
  getWhatsAppLink, 
  getRenewalWhatsAppMessage, 
  POPULAR_INSURERS 
} from '../utils/insuranceUtils';
import { exportClientsToExcel } from '../services/excelService';
import { exportClientsToPdf } from '../services/pdfService';

interface ClientListProps {
  clients: Client[];
  onOpenNewClient: () => void;
  onViewClientDetails: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onViewDocument: (client: Client) => void;
  currentUser: User | null;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  onOpenNewClient,
  onViewClientDetails,
  onEditClient,
  onDeleteClient,
  onViewDocument,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ClientType>('all');
  const [selectedInsurer, setSelectedInsurer] = useState<string>('all');
  const [selectedAlertStatus, setSelectedAlertStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<'endDate' | 'name' | 'commissionAmount' | 'totalInsuredValue'>('endDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const brokerName = currentUser?.name || 'Corretor';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.toLowerCase().includes(q);
        const matchesInsurer = c.insuranceCompany.toLowerCase().includes(q);
        const matchesCar = (c.vehicleModel || '').toLowerCase().includes(q);
        const matchesPlate = (c.licensePlate || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesInsurer && !matchesCar && !matchesPlate) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'all' && c.clientType !== selectedType) {
        return false;
      }

      // Insurer filter
      if (selectedInsurer !== 'all' && c.insuranceCompany !== selectedInsurer) {
        return false;
      }

      // Alert status filter
      if (selectedAlertStatus !== 'all') {
        const days = getDaysRemaining(c.endDate);
        const level = getExpiryAlertLevel(days);
        if (selectedAlertStatus === 'red' && level !== 'red' && level !== 'expired') return false;
        if (selectedAlertStatus === 'orange' && level !== 'orange') return false;
        if (selectedAlertStatus === 'yellow' && level !== 'yellow') return false;
        if (selectedAlertStatus === 'normal' && level !== 'normal') return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'endDate') {
        comparison = a.endDate.localeCompare(b.endDate);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'commissionAmount') {
        comparison = (a.commissionAmount || 0) - (b.commissionAmount || 0);
      } else if (sortField === 'totalInsuredValue') {
        comparison = (a.totalInsuredValue || 0) - (b.totalInsuredValue || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [clients, searchTerm, selectedType, selectedInsurer, selectedAlertStatus, sortField, sortOrder]);

  const toggleSort = (field: 'endDate' | 'name' | 'commissionAmount' | 'totalInsuredValue') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExportFilteredExcel = () => {
    if (filteredClients.length === 0) {
      showToast('Nenhum cliente disponível para exportar com os filtros atuais.');
      return;
    }
    const success = exportClientsToExcel(filteredClients, 'GestaoCorretor_Clientes');
    if (success) {
      showToast(`Planilha Excel exportada com sucesso! (${filteredClients.length} cliente(s))`);
    }
    setShowExportMenu(false);
  };

  const handleExportAllExcel = () => {
    if (clients.length === 0) {
      showToast('Sua carteira está vazia. Cadastre ou importe clientes antes de exportar.');
      return;
    }
    const success = exportClientsToExcel(clients, 'GestaoCorretor_CarteiraCompleta');
    if (success) {
      showToast(`Planilha Excel com toda a carteira exportada com sucesso! (${clients.length} cliente(s))`);
    }
    setShowExportMenu(false);
  };

  const handleExportFilteredPdf = () => {
    if (filteredClients.length === 0) {
      showToast('Nenhum cliente para gerar o relatório PDF.');
      return;
    }
    exportClientsToPdf(filteredClients, currentUser, 'Relatório da Carteira de Clientes');
    showToast(`Relatório PDF gerado com sucesso! (${filteredClients.length} cliente(s))`);
  };

  const hasFiltersApplied = filteredClients.length !== clients.length;

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2 duration-200">
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

      {/* Top action & title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Carteira de Clientes & Apólices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total de {clients.length} segurados cadastrados • {filteredClients.length} exibidos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Export actions with Excel & PDF */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800/80 shadow-xs overflow-hidden">
              <button
                onClick={handleExportFilteredExcel}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                title={hasFiltersApplied ? `Exportar ${filteredClients.length} clientes filtrados para Excel` : 'Exportar carteira para Excel'}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Excel</span>
                {hasFiltersApplied && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-[10px] text-emerald-800 dark:text-emerald-200">
                    {filteredClients.length}
                  </span>
                )}
              </button>

              {hasFiltersApplied && (
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-2 py-2 border-l border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs cursor-pointer"
                  title="Mais opções de exportação"
                >
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Submenu when filters are active */}
            {showExportMenu && hasFiltersApplied && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-1.5 text-xs animate-in fade-in zoom-in-95">
                <button
                  onClick={handleExportFilteredExcel}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Apenas Filtrados</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {filteredClients.length} clientes
                  </span>
                </button>
                <button
                  onClick={handleExportAllExcel}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Toda a Carteira</span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {clients.length} clientes
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportFilteredPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Exportar relatório em PDF"
          >
            <FileText className="w-4 h-4 text-cyan-600" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          {/* New Client Button */}
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, placa, telefone, carro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
            >
              <option value="all">Todos os Tipos (Novo & Renovação)</option>
              <option value="Renovação">Apenas Renovações</option>
              <option value="Novo">Apenas Clientes Novos</option>
            </select>
          </div>

          {/* Insurer Filter */}
          <div>
            <select
              value={selectedInsurer}
              onChange={(e) => setSelectedInsurer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
            >
              <option value="all">Todas as Seguradoras</option>
              {POPULAR_INSURERS.map((ins) => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>

          {/* Alert Status Filter */}
          <div>
            <select
              value={selectedAlertStatus}
              onChange={(e) => setSelectedAlertStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
            >
              <option value="all">Todos os Status de Vencimento</option>
              <option value="red">Crítico (≤ 10 dias / Vencidas)</option>
              <option value="orange">Atenção (11 a 15 dias)</option>
              <option value="yellow">Monitoramento (16 a 30 dias)</option>
              <option value="normal">Vigente Seguro (&gt; 30 dias)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Table of Clients */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th 
                  onClick={() => toggleSort('name')}
                  className="px-4 py-3.5 font-bold cursor-pointer hover:text-cyan-600"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente & Veículo</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="px-3 py-3.5 font-bold">Telefone / WhatsApp</th>
                <th className="px-3 py-3.5 font-bold">Seguradora</th>
                
                <th 
                  onClick={() => toggleSort('endDate')}
                  className="px-3 py-3.5 font-bold cursor-pointer hover:text-cyan-600"
                >
                  <div className="flex items-center gap-1">
                    <span>Fim Vigência / Prazo</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="px-3 py-3.5 font-bold text-center">Tipo</th>

                <th 
                  onClick={() => toggleSort('totalInsuredValue')}
                  className="px-3 py-3.5 font-bold text-right cursor-pointer hover:text-cyan-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Seguro</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('commissionAmount')}
                  className="px-3 py-3.5 font-bold text-right cursor-pointer hover:text-cyan-600"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Comissão R$</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="px-3 py-3.5 font-bold text-center">Apólice</th>
                <th className="px-4 py-3.5 font-bold text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    {clients.length === 0 ? (
                      <div className="max-w-md mx-auto px-4">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1.5">
                          Sua carteira de clientes está vazia
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                          Esta conta possui acesso exclusivo e ainda não possui clientes cadastrados.
                        </p>
                        <button
                          onClick={onOpenNewClient}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Cadastrar Primeiro Cliente</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Nenhum cliente encontrado com os filtros aplicados.
                        </p>
                        <p className="text-[11px]">
                          Tente limpar a barra de pesquisa ou redefinir os filtros.
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const daysRemaining = getDaysRemaining(client.endDate);
                  const alertLevel = getExpiryAlertLevel(daysRemaining);

                  const whatsappRenewalUrl = getWhatsAppLink(
                    client.phone,
                    getRenewalWhatsAppMessage(client, brokerName)
                  );

                  return (
                    <tr 
                      key={client.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cliente e Veículo */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => onViewClientDetails(client)}
                          className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 text-left transition-colors cursor-pointer block"
                        >
                          {client.name}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {client.vehicleModel && (
                            <span className="truncate max-w-[170px]">{client.vehicleModel}</span>
                          )}
                          {client.licensePlate && (
                            <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold">
                              {client.licensePlate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Telefone & WhatsApp */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {client.phone}
                          </span>
                          <a
                            href={whatsappRenewalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Seguradora */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {client.insuranceCompany}
                        </span>
                      </td>

                      {/* Fim Vigência / Prazo */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {formatDateBR(client.endDate)}
                          </span>

                          {alertLevel === 'red' || alertLevel === 'expired' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {daysRemaining <= 0 ? 'Vencido' : `${daysRemaining} dias`}
                            </span>
                          ) : alertLevel === 'orange' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="w-2.5 h-2.5" />
                              {daysRemaining} dias
                            </span>
                          ) : alertLevel === 'yellow' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                              {daysRemaining} dias
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Em {daysRemaining} dias
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tipo: Novo vs Renovação */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          client.clientType === 'Renovação'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {client.clientType}
                        </span>
                      </td>

                      {/* Valor Total do Seguro */}
                      <td className="px-3 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatCurrency(client.totalInsuredValue)}
                      </td>

                      {/* Comissão Ganha */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                          {formatCurrency(client.commissionAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {client.commissionRate}%
                        </span>
                      </td>

                      {/* Anexo da Apólice */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {client.document ? (
                          <button
                            onClick={() => onViewDocument(client)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold text-[10px] border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            title={`Visualizar apólice: ${client.document.name}`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewClientDetails(client)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ver detalhes do cliente"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditClient(client)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar cadastro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir ${client.name}?`)) {
                                onDeleteClient(client.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};
