import React from 'react'; // ← Add this import!
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLoginScreen from './pages/AdminLogin';
//import AdminDashboard from './pages/AdminDashboard';
import { useAdminAuth } from './hooks/useAdminAuth';
import './App.css';

function PrivateRoute({ children }: { children: React.ReactNode }) { // ← Use React.ReactNode
  const { isAuthenticated, loading } = useAdminAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" />; // ← Wrap children in fragment
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginScreen />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <div>Dashboard Coming Soon</div> // ← Temporary placeholder
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/admin/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;