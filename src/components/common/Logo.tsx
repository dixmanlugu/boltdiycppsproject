import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 48, className = '' }) => {
  return (
    <div 
      className={`flex-shrink-0 relative ${className}`} 
      style={{ width: size, height: size }}
    >
      <img 
        src="https://ennhknwwfdlaudephyly.supabase.co/storage/v1/object/sign/cpps/logocrest.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMmRkZDBlOC05MjU4LTQ5ZmEtYTUyYy03NmRlZDY5MTM4OTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjcHBzL2xvZ29jcmVzdC5wbmciLCJpYXQiOjE3NTI2MDg2MzEsImV4cCI6MjM4MzMyODYzMX0.cZ8Px1aDewyNCGugVA5WUNqSUGyu28LvfU5VfmR3jao"
        alt="Office of Workers Compensation Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
