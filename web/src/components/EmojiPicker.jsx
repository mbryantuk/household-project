import React from 'react';
import { Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/joy';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';

export default function EmojiPicker({ open, onClose, onEmojiSelect, title = "Select Emoji" }) {
  // We can infer theme or just use auto/dark
  // Joy doesn't expose easy "mode" without hook, but we can assume auto
  
  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog layout="center" sx={{ p: 0, minWidth: 350 }}>
        <DialogTitle sx={{ p: 2 }}>{title}</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center' }}>
            <EmojiPickerReact
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                theme={Theme.AUTO}
                width="100%"
                height={450}
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emojis..."
            />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button variant="plain" color="neutral" onClick={onClose}>Close</Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}