import React from 'react';
import { AlertTriangle, Info, CheckCircle2, Trash2, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: Trash2,
          iconBg: 'bg-rose-100 text-rose-600',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-100 text-amber-600',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 text-emerald-600',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconBg: 'bg-blue-100 text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
        };
    }
  };

  const config = getVariantStyles();
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${config.iconBg}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <h3 className="text-base font-black text-slate-900 leading-snug">{title}</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer ${config.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
