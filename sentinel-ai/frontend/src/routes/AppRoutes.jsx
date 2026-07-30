import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

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
      {/* Public Route */}
      <Route path="/" element={<Login />} />

      {/* App Dashboard Routes wrapped in DashboardLayout */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<ReportIncident />} />
        <Route path="/incidents" element={<IncidentsList />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/simulator" element={<WebhookSimulator />} />
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
