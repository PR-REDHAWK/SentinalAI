import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const NotificationToast = () => {
  const { toast } = useStore();

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center space-x-3 text-sm font-medium ${
          isError
            ? 'bg-red-950/90 border-red-500/70 text-red-200'
            : isSuccess
            ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200'
            : 'bg-gray-800 border-gray-700 text-gray-200'
        }`}
      >
        {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {!isError && !isSuccess && <Info className="w-5 h-5 text-blue-400" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
