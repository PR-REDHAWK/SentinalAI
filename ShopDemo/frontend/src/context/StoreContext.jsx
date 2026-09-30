import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const StoreContext = createContext();

const API_BASE = 'http://localhost:5100/api/shop';

export const StoreProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [user, setUser] = useState({ name: 'Alex Rivera', email: 'alex.rivera@cloudtech.io' });
  const [orders, setOrders] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`Added '${product.name}' to cart`, 'success');
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  const processCheckout = async (paymentDetails) => {
    try {
      const res = await axios.post(`${API_BASE}/checkout`, {
        items: cart,
        payment: paymentDetails
      });
      setLastOrder(res.data);
      clearCart();
      setCheckoutOpen(false);
      showToast(`Order ${res.data.orderId} placed successfully!`, 'success');
      return { success: true, order: res.data };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Payment processing failed';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        loading,
        error,
        cart,
        cartOpen,
        setCartOpen,
        checkoutOpen,
        setCheckoutOpen,
        addToCart,
        removeFromCart,
        clearCart,
        user,
        orders,
        lastOrder,
        processCheckout,
        fetchProducts,
        toast,
        showToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
