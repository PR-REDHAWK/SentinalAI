import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { IncidentProvider } from './context/IncidentContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <IncidentProvider>
        <AppRoutes />
      </IncidentProvider>
    </BrowserRouter>
  );
}

export default App;
