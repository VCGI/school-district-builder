// src/components/SplashScreen.tsx
import React, { useState } from 'react';

interface SplashScreenProps {
  onAcknowledge: (dontShowAgain: boolean) => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAcknowledge }) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
      style={{ zIndex: 10004 }}
    >
      <div 
        className="p-8 rounded-lg shadow-2xl max-w-xl w-full border border-white border-opacity-20 flex flex-col"
        style={{ backgroundColor: '#003300', color: '#f8f8f8' }}
      >
        <img 
          src="https://files.vcgi.vermont.gov/logo/vermont-logo-white.png" 
          alt="State of Vermont" 
          className="mb-6 self-start"
          style={{ height: '24px', width: 'auto' }} 
        />

        <p className="text-sm mb-6 text-left">
          Welcome! This tool allows you to create and visualize custom school district maps for Vermont. It is intended for general planning and reference purposes, and to meet the requirements of <a href="https://legislature.vermont.gov/bill/status/2026/H.454" target="_blank" rel="noopener noreferrer" className="underline hover:text-white font-semibold">H.454 (Act 73) of 2025</a>.
        </p>
        
        <hr className="border-t border-white border-opacity-20 my-2" />

        <div className="text-left text-sm space-y-4 my-6 w-full">
            <h3 className="font-bold text-base" style={{ color: '#f8f8f8' }}>
              Notice
            </h3>
            <div className="space-y-2 text-sm">
                <p>
                  <strong className="font-semibold">Data Accuracy:</strong> The information provided may contain errors or omissions and should not be considered definitive or official.
                </p>
                <p>
                  <strong className="font-semibold">Simplified Maps:</strong> To improve performance, features like town boundaries have been simplified and are not precise.
                </p>
            </div>
        </div>

        <div className="flex items-center justify-center mb-6">
          <input
            id="dont-show-again"
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 bg-transparent text-blue-500 focus:ring-blue-400"
          />
          <label htmlFor="dont-show-again" className="ml-2 block text-sm">
            Don't show this again
          </label>
        </div>

        <button
          onClick={() => onAcknowledge(dontShowAgain)}
          className="bg-white text-green-900 font-bold py-2 px-6 rounded-full hover:bg-gray-200 transition-colors text-base self-center"
        >
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;
