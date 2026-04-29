import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import LoadingScreen from '../components/LoadingScreen';
import './styles/AdminLogin.css';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  
  const { 
    loading, 
    error, 
    authError, 
    login, 
    reset, 
    isAuthenticated, 
    remainingAttempts, 
    isLocked,
    lockoutMinutes 
  } = useAdminAuth();
  
  const navigate = useNavigate();
  const redirectingRef = useRef(false);

  // Validation functions (matching mobile app backend)
  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    if (email.length > 254) return 'Email is too long';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required';
    if (password.length < 8) return `Password must be at least 8 characters (need ${8 - password.length} more)`;
    if (password.length > 128) return 'Password is too long (max 128 characters)';
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    if (!hasUpperCase) return 'Password must contain at least one uppercase letter (A-Z)';
    if (!hasLowerCase) return 'Password must contain at least one lowercase letter (a-z)';
    if (!hasNumber) return 'Password must contain at least one number (0-9)';
    if (!hasSpecial) return 'Password must contain at least one special character (!@#$%^&* etc.)';
    
    return '';
  };

  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';
  const emailValid = touched.email && !emailError && email;
  const passwordValid = touched.password && !passwordError && password;

  // Clear auth error after 3 seconds
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => reset(), 3000);
      return () => clearTimeout(timer);
    }
  }, [authError, reset]);

  // Handle authentication redirect
  useEffect(() => {
    if (isAuthenticated && !redirectingRef.current) {
      redirectingRef.current = true;
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate before submitting
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      return;
    }

    setIsSubmitting(true);
    
    // Option 1: If you need to use the result for something
    const result = await login(email, password);
    
    // Option 2: If you don't need the result, just call login without storing
    // await login(email, password);
    
    // Option 3: If you want to log the result for debugging
    if (!result.success) {
      console.log('Login failed:', result.message);
    }
    
    setIsSubmitting(false);
  };

  // Get remaining attempts message
  const getRemainingAttemptsMessage = () => {
    if (isLocked) {
      return { 
        message: `Account temporarily locked due to too many failed attempts. Please try again in ${lockoutMinutes} minutes.`, 
        type: 'error' 
      };
    }
    if (remainingAttempts !== null && remainingAttempts > 0 && remainingAttempts <= 5) {
      return { 
        message: `⚠️ ${remainingAttempts} attempt(s) remaining before account lockout`, 
        type: 'warning' 
      };
    }
    return null;
  };

  const attemptsInfo = getRemainingAttemptsMessage();

  if (loading || isSubmitting) {
    return <LoadingScreen message="Signing in..." fullScreen />;
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo">
            <img 
              src="/assets/GTRLOGO.jpeg" 
              alt="GroupTask Logo" 
              className="admin-logo-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
            <div className="admin-logo-fallback" style={{ display: 'none' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                <path d="M2 17L12 22L22 17" />
                <path d="M2 12L12 17L22 12" />
              </svg>
            </div>
          </div>
          <h1 className="admin-login-title">System Admin</h1>
          <p className="admin-login-subtitle">Sign in to manage the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Rate limit warning */}
          {attemptsInfo && (
            <div className={`admin-warning-message ${attemptsInfo.type}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{attemptsInfo.message}</span>
            </div>
          )}

          <div className="admin-input-group">
            <label>Email</label>
            <div className={`admin-input-wrapper ${emailError ? 'error' : emailValid ? 'valid' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#868e96">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                disabled={loading || isLocked}
              />
              {emailValid && <span className="input-check">✓</span>}
            </div>
            {emailError && <div className="input-error-message">{emailError}</div>}
          </div>

          <div className="admin-input-group">
            <label>Password</label>
            <div className={`admin-input-wrapper ${passwordError ? 'error' : passwordValid ? 'valid' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#868e96">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                disabled={loading || isLocked}
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
              {passwordValid && <span className="input-check">✓</span>}
            </div>
            {passwordError && <div className="input-error-message">{passwordError}</div>}
            
            {/* Password requirements */}
            {password && !passwordValid && (
              <div className="password-requirements">
                <div className={`req ${password.length >= 8 ? 'valid' : ''}`}>
                  <span className="check">{password.length >= 8 ? '✓' : '○'}</span>
                  <span>At least 8 characters</span>
                </div>
                <div className={`req ${/[A-Z]/.test(password) ? 'valid' : ''}`}>
                  <span className="check">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className={`req ${/[a-z]/.test(password) ? 'valid' : ''}`}>
                  <span className="check">{/[a-z]/.test(password) ? '✓' : '○'}</span>
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div className={`req ${/[0-9]/.test(password) ? 'valid' : ''}`}>
                  <span className="check">{/[0-9]/.test(password) ? '✓' : '○'}</span>
                  <span>At least 1 number (0-9)</span>
                </div>
                <div className={`req ${/[!@#$%^&*]/.test(password) ? 'valid' : ''}`}>
                  <span className="check">{/[!@#$%^&*]/.test(password) ? '✓' : '○'}</span>
                  <span>At least 1 special character (!@#$%^&* etc.)</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading || isSubmitting || !email.trim() || !password.trim() || !!emailError || !!passwordError || isLocked}
          >
            {loading || isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}