import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Zap, ShieldAlert, Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useChaos } from '../context/ChaosContext';

export const Navbar = () => {
  const location = useLocation();
  const { cart, setCartOpen } = useStore();
  const { simulationState } = useChaos();

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isChaosPage = location.pathname.startsWith('/chaos');
  const systemStatus = simulationState?.systemStatus || 'HEALTHY';

  const getStatusBadge = () => {
    switch (systemStatus) {
      case 'INCIDENT':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-semibold rounded-full animate-pulse">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span>INCIDENT ACTIVE</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-400 text-xs font-semibold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>DEGRADED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-semibold rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>HEALTHY</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand logo & switcher */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5 text-gray-950 font-bold" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">ShopDemo</span>
              <span className="text-xs font-semibold block text-emerald-400 -mt-1">Production Store</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-2">
            <Link
              to="/"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !isChaosPage
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Storefront
            </Link>
            <Link
              to="/chaos"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isChaosPage
                  ? 'bg-red-950/70 text-red-300 border border-red-800/60'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Chaos Control</span>
            </Link>
          </nav>
        </div>

        {/* Right side widgets */}
        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          <Link to="/chaos" title="View Chaos Controller State">
            {getStatusBadge()}
          </Link>

          {/* Cart Icon */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            title="Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-gray-950 font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {totalItems}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
