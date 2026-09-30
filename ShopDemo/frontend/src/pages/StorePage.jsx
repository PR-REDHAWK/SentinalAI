import React, { useState } from 'react';
import { Search, SlidersHorizontal, RefreshCw, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { Link } from 'react-router-dom';

export const StorePage = () => {
  const { products, loading, error, fetchProducts } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Computers', 'Smart Home', 'Audio', 'Wearables', 'Furniture', 'Accessories'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/40 border-b border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4 text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ShopDemo Live Simulated Microservices Stack</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Enterprise Cloud Gear & Tech Store
            </h1>
            <p className="text-gray-400 text-base leading-relaxed">
              Experience a high-throughput production e-commerce store with real-time telemetry streaming into SentinelAI.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700/80 rounded-2xl p-5 w-full md:w-80 shadow-2xl space-y-3 backdrop-blur-md">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>DevOps Chaos Control</span>
            </div>
            <p className="text-xs text-gray-400 leading-normal">
              Test SentinelAI incident intelligence by injecting production chaos scenarios.
            </p>
            <Link
              to="/chaos"
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-300 font-bold rounded-xl text-xs border border-red-800/80 transition-colors"
            >
              <span>Open Chaos Control Panel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Catalog Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-800">
          
          {/* Categories */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                    : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Error Banner if API Degraded */}
        {error && (
          <div className="p-5 bg-red-950/80 border border-red-500/80 rounded-2xl flex items-center justify-between text-red-200">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">Backend Microservice Degraded</h4>
                <p className="text-xs text-red-300">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchProducts}
              className="flex items-center space-x-2 px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry API</span>
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-gray-800/50 rounded-2xl animate-pulse border border-gray-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
