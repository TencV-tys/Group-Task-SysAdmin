import React from 'react';
import './styles/LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  fullScreen = false,
  size = 'medium'
}) => {
  return (
    <div className={`loading-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className={`spinner spinner-${size}`}>
        <div className="spinner-circle"></div>
        <div className="spinner-circle-2"></div>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingScreen;