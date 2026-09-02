// src/hooks/useModals.ts
// Modal visibility state: the export/share dialog, the CSV import dialog, the help modal, and
// the first-run disclaimer splash screen (whose dismissal is persisted to localStorage).
import { useState } from 'react';

const DISCLAIMER_VERSION = '1.0'; // Version for the disclaimer acknowledgment

export const useModals = () => {
  const [isExportShareModalOpen, setExportShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(
    localStorage.getItem('disclaimerAcknowledged') !== DISCLAIMER_VERSION
  );

  const handleAcknowledgeSplash = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('disclaimerAcknowledged', DISCLAIMER_VERSION);
    }
    setShowSplashScreen(false);
  };

  return {
    isExportShareModalOpen, setExportShareModalOpen,
    isImportModalOpen, setImportModalOpen,
    isHelpModalOpen, setHelpModalOpen,
    showSplashScreen, handleAcknowledgeSplash,
  };
};
