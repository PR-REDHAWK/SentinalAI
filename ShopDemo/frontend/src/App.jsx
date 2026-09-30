import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { ChaosProvider } from './context/ChaosContext';
import { Navbar } from './components/Navbar';
import { CartModal } from './components/CartModal';
import { CheckoutModal } from './components/CheckoutModal';
import { NotificationToast } from './components/NotificationToast';
import { StorePage } from './pages/StorePage';
import { ChaosControlPage } from './pages/ChaosControlPage';

export function App() {
  return (
    <StoreProvider>
      <ChaosProvider>
        <Router>
          <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<StorePage />} />
                <Route path="/chaos" element={<ChaosControlPage />} />
              </Routes>
            </main>
            <CartModal />
            <CheckoutModal />
            <NotificationToast />
          </div>
        </Router>
      </ChaosProvider>
    </StoreProvider>
  );
}

export default App;
