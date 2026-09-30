import React, { useState } from 'react';
import { X, CreditCard, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CheckoutModal = () => {
  const { cart, checkoutOpen, setCheckoutOpen, processCheckout, lastOrder } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Alex Rivera',
    email: 'alex.rivera@cloudtech.io',
    cardNumber: '4532 •••• •••• 8892',
    expDate: '08/28',
    cvv: '912'
  });

  if (!checkoutOpen) return null;

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await processCheckout(formData);
    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    setCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Production Order Checkout</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-950 border border-emerald-500/50 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Order Confirmed!</h3>
            <p className="text-sm text-gray-300">
              Order ID: <span className="font-mono text-emerald-400 font-bold">{lastOrder?.orderId}</span>
            </p>
            <p className="text-xs text-gray-400">
              Payment was routed and processed through <span className="text-gray-200">payment-service</span>.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl text-sm"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-4 bg-red-950/90 border border-red-500/80 rounded-xl text-red-200 text-xs flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-red-300">Transaction Failed</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Card Number</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Expiry</label>
                  <input
                    type="text"
                    value={formData.expDate}
                    onChange={(e) => setFormData({ ...formData, expDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">CVV</label>
                  <input
                    type="text"
                    value={formData.cvv}
                    onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center">
                <Lock className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Encrypted 256-bit API
              </span>
              <span className="text-lg font-extrabold text-white">${total.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-gray-950" />
                  <span>Contacting Payment Processor...</span>
                </>
              ) : (
                <span>Complete Purchase (${total.toFixed(2)})</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
