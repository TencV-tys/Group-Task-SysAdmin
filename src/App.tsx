// App.tsx - FIXED VERSION

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import LoadingScreen from './components/LoadingScreen';
import { useAdminAuth } from './hooks/useAdminAuth';
import { AdminSocketProvider } from './contexts/AdminSocketContext';

import Feedback from './pages/Feedback';
import './App.css';
 
// Lazy load other components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Reports = lazy(() => import('./pages/Reports'));
const AdminGroups = lazy(() => import('./pages/AdminGroups'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAdminAuth();
  
  if (loading) {
    return <LoadingScreen message="Authenticating..." fullScreen />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" />;
}

function App() {
  return (
    <AdminSocketProvider>
      <BrowserRouter>
        <Routes> 
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/admin" element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            
            <Route path="dashboard" element={
              <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
                <Dashboard />
              </Suspense>
            } />
            
            <Route path="users" element={
              <Suspense fallback={<LoadingScreen message="Loading users..." />}>
                <Users />
              </Suspense>
            } />
            
            {/* ✅ Feedback - NO Suspense, direct import */}
            <Route path="feedback" element={<Feedback />} />
            
            <Route path="notifications" element={
              <Suspense fallback={<LoadingScreen message="Loading notifications..." />}>
                <Notifications />
              </Suspense>
            } />
            
            <Route path="reports" element={
              <Suspense fallback={<LoadingScreen message="Loading reports..." />}>
                <Reports />
              </Suspense>
            } />
            
            <Route path="groups" element={
              <Suspense fallback={<LoadingScreen message="Loading groups..." />}>
                <AdminGroups />
              </Suspense>
            } />
            
            <Route path="audit" element={
              <Suspense fallback={<LoadingScreen message="Loading audit logs..." />}>
                <AdminAudit />
              </Suspense>
            } />
          </Route>
          
          <Route path="/" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AdminSocketProvider>
  );
}

export default App;