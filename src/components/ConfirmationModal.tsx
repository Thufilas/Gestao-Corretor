import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText = 'Excluir Definitivamente',
  cancelButtonText = 'Cancelar',
  variant = 'danger',
  isLoading: externalLoading = false
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  if (!isOpen) return null;

  const isLoading = externalLoading || internalLoading;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;

    try {
      setInternalLoading(true);
      // Run onConfirm with a max safeguard timeout of 4 seconds so modal never hangs
      const confirmPromise = Promise.resolve(onConfirm());
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
      await Promise.race([confirmPromise, timeoutPromise]);
    } catch (err) {
      console.error('Error during confirmation action:', err);
    } finally {
      setInternalLoading(false);
      onClose();
    }
  };

  const getIcon = () => {
    if (variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <Trash2 className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-6 h-6" />
      </div>
    );
  };

  const getConfirmButtonStyle = () => {
    if (variant === 'danger') {
      return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/20';
    }
    if (variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/20';
    }
    return 'bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white shadow-cyan-600/20';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 p-6 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {getIcon()}
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {description}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelButtonText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 ${getConfirmButtonStyle()}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>{confirmButtonText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
