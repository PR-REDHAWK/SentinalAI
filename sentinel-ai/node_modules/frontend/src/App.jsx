import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { IncidentProvider } from './context/IncidentContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <IncidentProvider>
          <AppRoutes />
        </IncidentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
