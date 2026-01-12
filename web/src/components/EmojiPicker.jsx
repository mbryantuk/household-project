import React from 'react';
import { Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/joy';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';

export default function EmojiPicker({ open, onClose, onEmojiSelect, title = "Select Emoji", isDark = false }) {
  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog layout="center" sx={{ p: 0, minWidth: 350, overflow: 'hidden' }}>
        <DialogTitle sx={{ p: 2 }}>{title}</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center' }}>
            <EmojiPickerReact
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                theme={isDark ? Theme.DARK : Theme.LIGHT}
                width="100%"
                height={400}
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emojis..."
                previewConfig={{ showPreview: false }}
            />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button variant="plain" color="neutral" onClick={onClose}>Close</Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}