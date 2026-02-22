import React from 'react';
import { Modal, ModalDialog, DialogTitle, DialogContent, Box, useColorScheme } from '@mui/joy';
import Picker from 'emoji-picker-react';

export default function EmojiPicker({
  open,
  onClose,
  onEmojiSelect,
  title = 'Select Emoji',
  isDark,
}) {
  const { mode, systemMode } = useColorScheme();

  // Determine theme: use prop if provided, otherwise sync with MUI mode
  const resolvedMode = mode === 'system' ? systemMode : mode;
  const currentTheme =
    isDark !== undefined ? (isDark ? 'dark' : 'light') : resolvedMode === 'dark' ? 'dark' : 'light';

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          p: 0,
          overflow: 'hidden',
          border: 'none',
          minWidth: { xs: '90vw', sm: '400px' },
        }}
      >
        <DialogTitle sx={{ p: 2, pb: 1 }}>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: '450px' }}>
            <Picker
              onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
              autoFocusSearch={false}
              theme={currentTheme}
              emojiStyle="google"
              width="100%"
              height="100%"
              lazyLoadEmojis={true}
              searchPlaceHolder="Search emojis..."
            />
          </Box>
        </DialogContent>
      </ModalDialog>
    </Modal>
  );
}
