// App.tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import LoadingScreen from './components/LoadingScreen';
import { useAdminAuth } from './hooks/useAdminAuth';
import './App.css';

// 🔥 LAZY LOAD ALL PAGE COMPONENTS
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Feedback = lazy(() => import('./pages/Feedback'));
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
    <BrowserRouter>
      <Routes> 
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Dashboard Route */}
          <Route path="dashboard" element={
            <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
              <Dashboard />
            </Suspense>
          } />
          
          {/* Users Route */}
          <Route path="users" element={
            <Suspense fallback={<LoadingScreen message="Loading users..." />}>
              <Users />
            </Suspense>
          } />
          
          {/* Feedback Route */}
          <Route path="feedback" element={
            <Suspense fallback={<LoadingScreen message="Loading feedback..." />}>
              <Feedback />
            </Suspense>
          } />
          
          {/* Notifications Route */}
          <Route path="notifications" element={
            <Suspense fallback={<LoadingScreen message="Loading notifications..." />}>
              <Notifications />
            </Suspense>
          } />
          
          {/* Reports Route */}
          <Route path="reports" element={
            <Suspense fallback={<LoadingScreen message="Loading reports..." />}>
              <Reports />
            </Suspense>
          } />
          
          {/* Groups Route */}
          <Route path="groups" element={
            <Suspense fallback={<LoadingScreen message="Loading groups..." />}>
              <AdminGroups />
            </Suspense>
          } />
          
          {/* Audit Route */}
          <Route path="audit" element={
            <Suspense fallback={<LoadingScreen message="Loading audit logs..." />}>
              <AdminAudit />
            </Suspense>
          } />
        </Route>
        
        <Route path="/" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
} 

export default App;