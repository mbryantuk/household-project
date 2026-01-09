import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, useTheme } from '@mui/material';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';

export default function EmojiPicker({ open, onClose, onEmojiSelect, title = "Select Emoji" }) {
  const muiTheme = useTheme();
  
  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', minHeight: 450 }}>
        <Box sx={{ width: '100%', height: '100%' }}>
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme={muiTheme.palette.mode === 'dark' ? Theme.DARK : Theme.LIGHT}
            width="100%"
            height={450}
            lazyLoadEmojis={true}
            searchPlaceHolder="Search emojis..."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
