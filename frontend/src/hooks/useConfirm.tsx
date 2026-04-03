import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: (archive?: boolean) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  showArchiveOption?: boolean;
  archiveLabel?: string;
  isPending?: boolean;
}

interface ConfirmContextType {
  openConfirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.openConfirm;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogOptions, setDialogOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openConfirm = useCallback((options: ConfirmOptions) => {
    setDialogOptions(options);
    setIsOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback((archive?: boolean) => {
    if (dialogOptions?.onConfirm) {
      dialogOptions.onConfirm(archive);
    }
    // We don't automatically close if it's pending, but usually we do close
    // unless we want to show a loading state in the dialog itself.
    // If the caller wants to keep it open while pending, they can handle it.
    if (!dialogOptions?.isPending) {
        setIsOpen(false);
    }
  }, [dialogOptions]);

  // Effect to close when isPending becomes false after being true? 
  // Better to let the handleConfirm logic be simple.

  return (
    <ConfirmContext.Provider value={{ openConfirm }}>
      {children}
      {dialogOptions && (
        <ConfirmDialog
          open={isOpen}
          title={dialogOptions.title}
          message={dialogOptions.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmLabel={dialogOptions.confirmLabel}
          cancelLabel={dialogOptions.cancelLabel}
          showArchiveOption={dialogOptions.showArchiveOption}
          archiveLabel={dialogOptions.archiveLabel}
          isPending={dialogOptions.isPending}
        />
      )}
    </ConfirmContext.Provider>
  );
};
