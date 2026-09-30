import React from 'react';
import { Star, ShoppingCart, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ProductCard = ({ product }) => {
  const { addToCart, cart } = useStore();

  const inCart = cart.some(item => item.id === product.id);

  return (
    <div className="bg-gray-800/80 border border-gray-700/80 rounded-2xl overflow-hidden shadow-xl hover:border-gray-600 transition-all flex flex-col group">
      <div className="relative h-48 bg-gray-900 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-md text-xs font-semibold px-2.5 py-1 rounded-full text-emerald-400 border border-emerald-500/30">
          In Stock ({product.stock})
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{product.category}</span>
            <div className="flex items-center space-x-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-semibold text-gray-200">{product.rating}</span>
            </div>
          </div>
          <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>
          <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-700/60">
          <div>
            <span className="text-xs text-gray-400 block">Price</span>
            <span className="text-xl font-extrabold text-white">${product.price.toFixed(2)}</span>
          </div>

          <button
            onClick={() => addToCart(product)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              inCart
                ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {inCart ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
