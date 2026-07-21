import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const LoadingScreen = ({ onComplete, message = "Secure Professional Conferencing" }) => {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing secure connection...");

  // Animate progress bar and status messages
  useEffect(() => {
    const statusMessages = [
      "Initializing secure connection...",
      "Authenticating credentials...",
      "Establishing encrypted channel...",
      "Verifying meeting security...",
      "Loading conference interface..."
    ];

    const interval = setInterval(() => {
      setProgress(prev => {
        const increment = Math.floor(Math.random() * 10) + 5;
        let newProgress = prev + increment;
        if (newProgress > 100) newProgress = 100;
        
        // Update status message based on progress
        if (newProgress < 20) {
          setStatusMessage(statusMessages[0]);
        } else if (newProgress < 40) {
          setStatusMessage(statusMessages[1]);
        } else if (newProgress < 60) {
          setStatusMessage(statusMessages[2]);
        } else if (newProgress < 80) {
          setStatusMessage(statusMessages[3]);
        } else {
          setStatusMessage(statusMessages[4]);
        }
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete && onComplete();
          }, 500);
          return 100;
        }
        
        return newProgress;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 text-white h-screen overflow-hidden flex flex-col items-center justify-center"
         style={{
           background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)'
         }}>
      
      {/* Animated Logo */}
      <motion.div 
        className="mb-8 relative"
        animate={{
          y: [0, -10, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* SVG Logo with Shield and Video Camera */}
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120" className="relative z-10">
            {/* Animated Circles */}
            <motion.circle 
              cx="60" 
              cy="60" 
              r="50" 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="4"
              pathLength="1"
              strokeDasharray="1"
              animate={{
                strokeDashoffset: [1, 0],
                rotate: [0, 360]
              }}
              transition={{
                strokeDashoffset: { duration: 2, ease: "easeInOut" },
                rotate: { duration: 2, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.circle 
              cx="60" 
              cy="60" 
              r="40" 
              fill="none" 
              stroke="#60a5fa" 
              strokeWidth="3"
              pathLength="1"
              strokeDasharray="1"
              animate={{
                strokeDashoffset: [1, 0],
                rotate: [0, 360]
              }}
              transition={{
                strokeDashoffset: { duration: 2, delay: 0.2, ease: "easeInOut" },
                rotate: { duration: 2, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.circle 
              cx="60" 
              cy="60" 
              r="30" 
              fill="none" 
              stroke="#93c5fd" 
              strokeWidth="2"
              pathLength="1"
              strokeDasharray="1"
              animate={{
                strokeDashoffset: [1, 0],
                rotate: [0, 360]
              }}
              transition={{
                strokeDashoffset: { duration: 2, delay: 0.4, ease: "easeInOut" },
                rotate: { duration: 2, repeat: Infinity, ease: "linear" }
              }}
            />
            
            {/* Shield Icon */}
            <path 
              d="M60 20 L90 30 V50 C90 70 75 90 60 100 C45 90 30 70 30 50 V30 Z" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="3" 
              strokeLinejoin="round"
            />
            <path 
              d="M60 40 L75 45 V55 C75 65 70 75 60 80 C50 75 45 65 45 55 V45 Z" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="2" 
              strokeLinejoin="round"
            />
            
            {/* Video Camera */}
            <rect x="45" y="50" width="30" height="20" rx="2" fill="none" stroke="#ffffff" strokeWidth="2"/>
            <circle cx="55" cy="60" r="3" fill="#ffffff"/>
            <path d="M65 57 L75 52 V68 L65 63 Z" fill="#ffffff"/>
          </svg>
          
          {/* Glowing effect around the logo */}
          <motion.div 
            className="absolute rounded-full bg-blue-500 opacity-20 blur-xl"
            style={{
              width: '100px', 
              height: '100px', 
              top: '10px', 
              left: '10px'
            }}
            animate={{
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>
      
      {/* App Name */}
      <motion.h1 
        className="text-4xl md:text-5xl font-bold mb-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <span 
          className="text-white"
          style={{
            textShadow: '0 0 10px rgba(59, 130, 246, 0.7)'
          }}
        >
          Pro
        </span>
        <span className="text-blue-300">Comm</span>
      </motion.h1>
      
      {/* Tagline */}
      <motion.p 
        className="text-blue-200 text-lg md:text-xl mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      >
        {message}
      </motion.p>
      
      {/* Loading Progress */}
      <motion.div 
        className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.7 }}
      >
        <motion.div 
          className="h-full bg-blue-400 rounded-full"
          animate={{
            width: `${progress}%`
          }}
          transition={{
            duration: 0.3,
            ease: "easeOut"
          }}
        />
      </motion.div>
      
      {/* Status Messages */}
      <motion.div 
        className="text-sm text-blue-300 space-y-1 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.9 }}
      >
        <p>{statusMessage}</p>
        <div className="flex items-center justify-center space-x-2">
          <Lock className="w-4 h-4" />
          <span>End-to-end encryption enabled</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;