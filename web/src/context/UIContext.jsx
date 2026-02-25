/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import haptics from '../utils/haptics';

const UIContext = createContext(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};

export const UIProvider = ({ children }) => {
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const showNotification = useCallback((message, severity = 'neutral') => {
    if (severity === 'error' || severity === 'danger') {
      haptics.error();
      toast.error(message);
    } else if (severity === 'success') {
      haptics.success();
      toast.success(message);
    } else {
      haptics.light();
      toast(message);
    }
  }, []);

  const confirmAction = useCallback((title, message, onConfirm) => {
    haptics.selection();
    setConfirmDialog({ open: true, title, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const value = {
    showNotification,
    confirmAction,
    confirmDialog,
    closeConfirm,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
