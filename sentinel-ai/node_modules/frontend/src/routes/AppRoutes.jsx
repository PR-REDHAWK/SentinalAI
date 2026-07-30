import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ReportIncident from '../pages/ReportIncident';
import IncidentsList from '../pages/IncidentsList';
import IncidentDetail from '../pages/IncidentDetail';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';
import WebhookSimulator from '../pages/WebhookSimulator';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Public Incident Report (Accessible by any user without login) */}
      <Route path="/report" element={
        <div className="min-h-screen bg-slate-950 bg-grid-pattern p-6">
          <ReportIncident />
        </div>
      } />

      {/* Protected Routes for Engineers */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<IncidentsList />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/simulator" element={<WebhookSimulator />} />
        </Route>
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
