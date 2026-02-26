import React from 'react';
import {
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/joy';

/**
 * Dialog to show when a user tries to navigate away with unsaved changes.
 *
 * @param {object} blocker - The blocker object from react-router-dom useBlocker.
 */
export default function UnsavedChangesDialog({ blocker }) {
  if (!blocker) return null;
  const isBlocked = blocker.state === 'blocked';

  return (
    <Modal open={isBlocked} onClose={() => blocker.reset && blocker.reset()}>
      <ModalDialog variant="outlined" role="alertdialog">
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. If you leave, your changes will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="plain" color="neutral" onClick={() => blocker.reset && blocker.reset()}>
            Stay on Page
          </Button>
          <Button
            variant="solid"
            color="danger"
            onClick={() => blocker.proceed && blocker.proceed()}
          >
            Leave Page
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}
