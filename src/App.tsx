import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Feedback from './pages/Feedback';

import AdminLayout from './components/AdminLayout';
import LoadingScreen from './components/LoadingScreen';
import { useAdminAuth } from './hooks/useAdminAuth';
import './App.css';

// Placeholder components for now



const Notifications = () => <div>Notifications Content</div>;

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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;