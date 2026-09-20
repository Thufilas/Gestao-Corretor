import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  Calculator, 
  Calendar, 
  User, 
  Phone, 
  Building2, 
  Car, 
  DollarSign, 
  Percent, 
  HelpCircle,
  AlertCircle,
  Cloud,
  Loader2,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Copy
} from 'lucide-react';
import { Client, ClientType, PolicyDocument } from '../types';
import { POPULAR_INSURERS, formatCurrency, maskPhone } from '../utils/insuranceUtils';
import { saveDocumentFile } from '../services/storage';
import { 
  isFirebaseConfigured, 
  uploadPolicyToFirebaseStorage, 
  deletePolicyFromFirebaseStorage,
  parseFirebaseStorageError,
  FirebaseStorageDiagnosticDetail,
  getFirebaseConfig,
  RECOMMENDED_STORAGE_RULES_PROD
} from '../services/firebase';
import { FirebaseTroubleshootModal } from './FirebaseTroubleshootModal';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  clientToEdit?: Client | null;
  currentUserId?: string;
  onOpenTroubleshootGlobal?: () => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientToEdit,
  currentUserId
}) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('Porto Seguro');
  const [customInsurer, setCustomInsurer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [totalInsuredValue, setTotalInsuredValue] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(18);
  const [clientType, setClientType] = useState<ClientType>('Renovação');
  const [notes, setNotes] = useState('');
  const [document, setDocument] = useState<PolicyDocument | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [storageDiagnostic, setStorageDiagnostic] = useState<FirebaseStorageDiagnosticDetail | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingRetryFile, setPendingRetryFile] = useState<File | null>(null);
  const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_STORAGE_RULES_PROD);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  // Automatic calculation: Valor Total * (% / 100)
  const calculatedCommissionAmount = (totalInsuredValue || 0) * ((commissionRate || 0) / 100);

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setBirthDate(clientToEdit.birthDate);
      
      if (POPULAR_INSURERS.includes(clientToEdit.insuranceCompany)) {
        setInsuranceCompany(clientToEdit.insuranceCompany);
        setCustomInsurer('');
      } else {
        setInsuranceCompany('Outra Seguradora');
        setCustomInsurer(clientToEdit.insuranceCompany);
      }

      setStartDate(clientToEdit.startDate);
      setEndDate(clientToEdit.endDate);
      setPhone(clientToEdit.phone);
      setVehicleModel(clientToEdit.vehicleModel || '');
      setLicensePlate(clientToEdit.licensePlate || '');
      setTotalInsuredValue(clientToEdit.totalInsuredValue);
      setCommissionRate(clientToEdit.commissionRate);
      setClientType(clientToEdit.clientType);
      setNotes(clientToEdit.notes || '');
      setDocument(clientToEdit.document);
    } else {
      // Defaults for a new client
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const oneYearLater = nextYear.toISOString().split('T')[0];

      setName('');
      setBirthDate('1990-01-01');
      setInsuranceCompany('Porto Seguro');
      setCustomInsurer('');
      setStartDate(today);
      setEndDate(oneYearLater);
      setPhone('');
      setVehicleModel('');
      setLicensePlate('');
      setTotalInsuredValue(3500);
      setCommissionRate(18);
      setClientType('Novo');
      setNotes('');
      setDocument(undefined);
    }
    setUploadError(null);
  }, [clientToEdit, isOpen]);

  // When start date changes on a new client, suggest end date + 1 year
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    if (!clientToEdit && val) {
      const d = new Date(val);
      d.setFullYear(d.getFullYear() + 1);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingRetryFile(file);
    setUploadError(null);
    setStorageDiagnostic(null);

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('O arquivo selecionado excede o limite de 15MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Read base64 for local fallback & offline immediate preview
      const readDataUrlPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const dataUrl = await readDataUrlPromise;
      let storageUrl: string | undefined = undefined;
      let storagePath: string | undefined = undefined;

      // 2. Upload to Firebase Storage if configured
      if (isFirebaseConfigured()) {
        try {
          const clientId = clientToEdit ? clientToEdit.id : `draft-${Date.now()}`;
          const userId = currentUserId || 'corretor-padrao';
          
          const uploadResult = await uploadPolicyToFirebaseStorage(
            file,
            file.name,
            clientId,
            userId,
            (pct) => setUploadProgress(pct)
          );

          storageUrl = uploadResult.downloadUrl;
          storagePath = uploadResult.storagePath;
          setStorageDiagnostic(null);
        } catch (fbErr) {
          console.warn('Firebase Storage upload failed, falling back to local storage:', fbErr);
          const config = getFirebaseConfig();
          const parsed = (fbErr as unknown as { diagnostic?: FirebaseStorageDiagnosticDetail })?.diagnostic 
            || parseFirebaseStorageError(fbErr, config?.storageBucket || '');
          setStorageDiagnostic(parsed);
          setUploadError(`${parsed.title} (${parsed.code})`);
        }
      }

      const newDoc: PolicyDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        dataUrl,
        storageUrl,
        storagePath
      };

      // Save to IndexedDB as resilient backup
      await saveDocumentFile(newDoc);
      setDocument(newDoc);
      setUploadProgress(100);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Erro ao processar o upload do arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryFirebaseSync = async () => {
    if (!pendingRetryFile || !document) return;
    setIsUploading(true);
    setUploadProgress(15);
    try {
      const clientId = clientToEdit ? clientToEdit.id : `draft-${Date.now()}`;
      const userId = currentUserId || 'corretor-padrao';
      
      const uploadResult = await uploadPolicyToFirebaseStorage(
        pendingRetryFile,
        pendingRetryFile.name,
        clientId,
        userId,
        (pct) => setUploadProgress(pct)
      );

      const updatedDoc: PolicyDocument = {
        ...document,
        storageUrl: uploadResult.downloadUrl,
        storagePath: uploadResult.storagePath
      };

      await saveDocumentFile(updatedDoc);
      setDocument(updatedDoc);
      setStorageDiagnostic(null);
      setUploadError(null);
      setUploadProgress(100);
    } catch (retryErr) {
      console.error('Retry failed:', retryErr);
      const config = getFirebaseConfig();
      const parsed = (retryErr as unknown as { diagnostic?: FirebaseStorageDiagnosticDetail })?.diagnostic 
        || parseFirebaseStorageError(retryErr, config?.storageBucket || '');
      setStorageDiagnostic(parsed);
      setUploadError(`${parsed.title} (${parsed.code})`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (document?.storagePath && isFirebaseConfigured()) {
      try {
        await deletePolicyFromFirebaseStorage(document.storagePath);
      } catch (err) {
        console.warn('Could not delete from Firebase Storage:', err);
      }
    }
    setDocument(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    const finalInsurer = insuranceCompany === 'Outra Seguradora' 
      ? (customInsurer.trim() || 'Outra Seguradora')
      : insuranceCompany;

    const updatedClient: Client = {
      id: clientToEdit ? clientToEdit.id : `cli-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      birthDate: birthDate || '1990-01-01',
      insuranceCompany: finalInsurer,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      phone: phone.trim(),
      vehicleModel: vehicleModel.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      totalInsuredValue: Number(totalInsuredValue) || 0,
      commissionRate: Number(commissionRate) || 0,
      commissionAmount: calculatedCommissionAmount,
      clientType,
      notes: notes.trim(),
      document,
      createdAt: clientToEdit ? clientToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(updatedClient);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl my-8 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {clientToEdit ? 'Editar Cadastro de Cliente & Apólice' : 'Novo Cliente & Apólice de Seguro'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preencha os dados do segurado, prazos de vigência e cálculo de comissão.
            </p>
          </div>
          <button
            id="btn-close-client-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Dados do Segurado */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              1. Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Nome */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Roberto Albuquerque"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Data de Aniversário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-500" />
                  Data de Aniversário *
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-500" />
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Veículo / Modelo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Car className="w-3 h-3 text-slate-500" />
                  Veículo / Modelo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Corolla Altis 2.0 2023"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Placa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  placeholder="BRA2E19"
                  maxLength={8}
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl text-xs uppercase bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white tracking-wider"
                />
              </div>

            </div>
          </div>

          {/* Section 2: Seguradora e Vigências */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              2. Seguradora & Período de Vigência
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Seguradora Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Seguradora *
                </label>
                <select
                  value={insuranceCompany}
                  onChange={(e) => setInsuranceCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                >
                  {POPULAR_INSURERS.map((ins) => (
                    <option key={ins} value={ins}>{ins}</option>
                  ))}
                </select>

                {insuranceCompany === 'Outra Seguradora' && (
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da Seguradora"
                    value={customInsurer}
                    onChange={(e) => setCustomInsurer(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                  />
                )}
              </div>

              {/* Início da Vigência */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Início da Vigência *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Fim da Vigência */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fim da Vigência (Vencimento) *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white font-medium text-rose-600 dark:text-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Valores Financeiros & Comissões */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              3. Financeiro & Comissões (Cálculo Automático)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-cyan-50/40 dark:bg-cyan-950/20 p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/40">
              
              {/* Valor Total do Seguro */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Total do Seguro (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={totalInsuredValue || ''}
                    onChange={(e) => setTotalInsuredValue(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              {/* % da Comissão */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Comissão Acordada (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={commissionRate || ''}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white font-semibold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">%</span>
                </div>
              </div>

              {/* Valor da Comissão Ganha (Cálculo Automático) */}
              <div>
                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5" />
                  Comissão Ganha (Automático)
                </label>
                <div className="px-3 py-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-sm flex items-center justify-between">
                  <span>{formatCurrency(calculatedCommissionAmount)}</span>
                  <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-300">
                    ({commissionRate}% de {formatCurrency(totalInsuredValue)})
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Section 4: Tipo de Cliente & Documento / Apólice */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 mb-3">
              4. Classificação & Documento da Apólice
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tipo de Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de Cliente no GestãoCorretor *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientType('Novo')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      clientType === 'Novo'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">Cliente Novo</span>
                    <span className="text-[10px] font-normal opacity-80">1ª renovação conosco</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClientType('Renovação')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      clientType === 'Renovação'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">Renovação</span>
                    <span className="text-[10px] font-normal opacity-80">Já renovou antes</span>
                  </button>
                </div>
              </div>

              {/* Upload de Apólice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Anexo da Apólice (PDF ou Imagem)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-800 dark:text-cyan-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                        <span>Enviando apólice para o Firebase Storage...</span>
                      </div>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-cyan-200 dark:bg-cyan-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-cyan-600 h-1.5 rounded-full transition-all duration-200" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : document ? (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {document.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400">
                            {(document.size / 1024).toFixed(0)} KB
                          </span>
                          {document.storageUrl ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold border border-emerald-200 dark:border-emerald-800">
                              <Cloud className="w-2.5 h-2.5" />
                              <span>Firebase Storage</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-medium">
                              <span>Local (IndexedDB)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveDocument}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                      title="Remover arquivo anexado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 rounded-xl p-3 text-center transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-800/50 hover:bg-cyan-50/20"
                  >
                    <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Clique para anexar a apólice (PDF ou Imagem)
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                      <Cloud className="w-3 h-3 text-cyan-600" />
                      <span>Upload direto no Firebase Storage (até 15MB)</span>
                    </span>
                  </button>
                )}

                {storageDiagnostic ? (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Sincronização com Firebase Storage Interrompida</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold shrink-0">
                        {storageDiagnostic.code}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      {storageDiagnostic.description}
                    </p>

                    <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Documento Seguro:</strong> A apólice foi salva no armazenamento local seguro (IndexedDB) e não foi perdida!</span>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsTroubleshootOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Diagnosticar Firebase Storage</span>
                      </button>

                      {storageDiagnostic.code === 'storage/unauthorized' && (
                        <button
                          type="button"
                          onClick={handleCopyRules}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {copiedRules ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedRules ? 'Regras Copiadas!' : 'Copiar Regras do Storage'}</span>
                        </button>
                      )}

                      {pendingRetryFile && (
                        <button
                          type="button"
                          onClick={handleRetryFirebaseSync}
                          disabled={isUploading}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                          <span>Tentar Sincronizar Novamente</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : uploadError ? (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{uploadError}</span>
                  </p>
                ) : null}
              </div>

            </div>

            {/* Observações / Comentários */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Comentários / Observações da Negociação
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Franquia reduzida, carro reserva 15 dias, bônus classe 7, contato preferencial por WhatsApp."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-client-submit"
              className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
            >
              {clientToEdit ? 'Atualizar Cliente' : 'Salvar Cliente'}
            </button>
          </div>

        </form>
      </div>

      {/* Embedded Diagnostic Modal */}
      <FirebaseTroubleshootModal
        isOpen={isTroubleshootOpen}
        onClose={() => setIsTroubleshootOpen(false)}
        initialErrorDetail={storageDiagnostic}
      />
    </div>
  );
};
