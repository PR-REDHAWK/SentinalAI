import React from 'react';

export const Input = ({
  label,
  error,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={`w-full bg-slate-900/80 border ${
            error ? 'border-red-500/60 focus:ring-red-500/40' : 'border-slate-800 focus:border-indigo-500/60 focus:ring-indigo-500/30'
          } rounded-lg text-slate-100 placeholder-slate-500 text-sm px-3.5 py-2.5 ${
            Icon ? 'pl-9' : ''
          } focus:outline-none focus:ring-2 transition-all duration-200 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

export default Input;
