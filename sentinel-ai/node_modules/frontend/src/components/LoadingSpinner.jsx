import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = "Loading...", size = "md" }) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className={`${sizes[size]} text-indigo-500 animate-spin`} />
      {label && <p className="text-xs text-slate-400 font-medium">{label}</p>}
    </div>
  );
};

export default LoadingSpinner;
