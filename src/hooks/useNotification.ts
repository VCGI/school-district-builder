// src/hooks/useNotification.ts
// The toast-style notification banner shown/hidden across the app (data-load errors, export
// confirmations, CSV import results, etc).
import { useState } from 'react';

export interface Notification {
  message: string;
  isError: boolean;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, isError: boolean = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  return { notification, showNotification };
};
