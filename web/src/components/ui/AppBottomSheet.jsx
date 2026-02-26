import React from 'react';
import { Drawer, ModalClose, Typography, ModalDialog, Modal, Sheet } from '@mui/joy';
import { useTheme } from '@mui/joy/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Responsive Bottom Sheet / Modal Drawer
 * Renders a bottom drawer on mobile and a standard modal on desktop.
 *
 * @param {boolean} open - Whether the modal/drawer is open
 * @param {function} onClose - Close handler
 * @param {string} title - Optional title
 * @param {React.ReactNode} children - Modal content
 * @param {number} maxWidth - Max width on desktop
 */
export default function AppBottomSheet({
  open,
  onClose,
  title,
  children,
  maxWidth = 500,
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        slotProps={{
          content: {
            sx: {
              borderRadius: '16px 16px 0 0',
              p: 3,
              maxHeight: '90vh',
              overflowY: 'auto',
              bgcolor: 'background.surface',
            },
          },
        }}
        {...props}
      >
        <ModalClose />
        {title && (
          <Typography level="h4" sx={{ mb: 2 }}>
            {title}
          </Typography>
        )}
        {children}
      </Drawer>
    );
  }

  return (
    <Modal open={open} onClose={onClose} {...props}>
      <ModalDialog sx={{ maxWidth, width: '100%' }}>
        <ModalClose />
        {title && (
          <Typography level="h4" sx={{ mb: 2 }}>
            {title}
          </Typography>
        )}
        {children}
      </ModalDialog>
    </Modal>
  );
}
