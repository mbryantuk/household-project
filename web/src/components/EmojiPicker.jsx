import React from 'react';
import { Modal, ModalDialog, DialogTitle, DialogContent, Box } from '@mui/joy';
import Picker from 'emoji-picker-react';

export default function EmojiPicker({ open, onClose, onEmojiSelect, title = "Select Emoji", isDark = true }) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog 
        sx={{ 
          p: 0, 
          overflow: 'hidden', 
          border: 'none',
          minWidth: { xs: '90vw', sm: '400px' }
        }}
      >
        <DialogTitle sx={{ p: 2, pb: 1 }}>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: '450px' }}>
            <Picker
              onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
              autoFocusSearch={false}
              theme={isDark ? 'dark' : 'light'}
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