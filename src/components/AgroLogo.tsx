import React from 'react';

interface AgroLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'brand';
}

export const AgroLogo: React.FC<AgroLogoProps> = ({ 
  className = "", 
  size = 40, 
  showText = true,
  variant = 'brand'
}) => {
  const brandGreen = "#4CAF50";
  const darkGreen = "#1B5E20";
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8BC34A" />
              <stop offset="100%" stopColor="#4CAF50" />
            </linearGradient>
          </defs>
          
          {/* Stylized 'A' */}
          <path
            d="M45 20L20 80H35L40 68H55L50 56H44L52 35L60 56H70"
            stroke="url(#logo-grad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden"
          />
          
          {/* Based on the user's logo: Stylized AL with integrated leaf */}
          <path
            d="M30 80L50 25L70 80"
            stroke="url(#logo-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M40 60L75 60L75 80"
            stroke="url(#logo-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* The Wave/Leaf connection */}
          <path
            d="M35 65C45 65 50 45 65 45"
            stroke="#1B5E20"
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* The Leaf */}
          <path
            d="M65 45C75 45 80 35 75 25C65 25 55 35 65 45Z"
            fill="#8BC34A"
          />
          <path
            d="M60 40L70 30"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {showText && (
        <span className={`font-black tracking-tighter leading-none ${size > 80 ? 'text-6xl' : 'text-2xl'} ${variant === 'light' ? 'text-white' : 'text-stone-900'}`}>
          AGROLIFE
        </span>
      )}
    </div>
  );
};
