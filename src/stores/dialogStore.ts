'use client';

import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface CustomDialog {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  resolve: (value: boolean) => void;
}

interface DialogState {
  dialog: CustomDialog | null;
  notifications: ToastNotification[];
  
  showAlert: (title: string, message: string, confirmText?: string) => Promise<void>;
  showConfirm: (
    title: string, 
    message: string, 
    options?: { confirmText?: string; cancelText?: string }
  ) => Promise<boolean>;
  
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  dismissNotification: (id: string) => void;
  
  confirmDialog: () => void;
  cancelDialog: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  dialog: null,
  notifications: [],

  showAlert: (title, message, confirmText = 'OK') => {
    const currentDialog = get().dialog;
    if (currentDialog) {
      currentDialog.resolve(false);
    }

    return new Promise<void>((resolve) => {
      set({
        dialog: {
          isOpen: true,
          type: 'alert',
          title,
          message,
          confirmText,
          resolve: () => {
            set({ dialog: null });
            resolve();
          },
        },
      });
    });
  },

  showConfirm: (title, message, options = {}) => {
    const currentDialog = get().dialog;
    if (currentDialog) {
      currentDialog.resolve(false);
    }

    const { confirmText = 'Confirm', cancelText = 'Cancel' } = options;

    return new Promise<boolean>((resolve) => {
      set({
        dialog: {
          isOpen: true,
          type: 'confirm',
          title,
          message,
          confirmText,
          cancelText,
          resolve: (value: boolean) => {
            set({ dialog: null });
            resolve(value);
          },
        },
      });
    });
  },

  showNotification: (message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification = { id, message, type, duration };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().dismissNotification(id);
      }, duration);
    }
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  confirmDialog: () => {
    const d = get().dialog;
    if (d) d.resolve(true);
  },

  cancelDialog: () => {
    const d = get().dialog;
    if (d) d.resolve(false);
  },
}));
