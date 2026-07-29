import React from 'react';

export const Select = ({
  label,
  options = [],
  error,
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
      <select
        className={`w-full bg-slate-900/80 border ${
          error ? 'border-red-500/60 focus:ring-red-500/40' : 'border-slate-800 focus:border-indigo-500/60 focus:ring-indigo-500/30'
        } rounded-lg text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 transition-all duration-200 appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

export default Select;
