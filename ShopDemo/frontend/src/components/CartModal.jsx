import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CartModal = () => {
  const { cart, cartOpen, setCartOpen, removeFromCart, setCheckoutOpen } = useStore();

  if (!cartOpen) return null;

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Your Shopping Cart</h2>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-60" />
              <p className="text-sm">Your cart is currently empty.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-4 p-3 bg-gray-800/60 rounded-xl border border-gray-700/60"
              >
                <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg bg-gray-900" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                  <span className="text-xs text-gray-400 block">${item.price.toFixed(2)} × {item.quantity}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="block text-red-400 hover:text-red-300 text-xs mt-1"
                  >
                    <Trash2 className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-gray-800 bg-gray-950/60 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-xl font-extrabold text-white">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
