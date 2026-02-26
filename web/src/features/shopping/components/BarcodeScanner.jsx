import React, { useEffect } from 'react';
import { Box, Typography, Button, Sheet } from '@mui/joy';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Close } from '@mui/icons-material';

/**
 * BARCODE SCANNER
 * Item 240: Mobile shopping list helper
 */
export default function BarcodeScanner({ onScan, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'barcode-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      () => {
        // Silent error callback
      }
    );

    return () => {
      scanner.clear().catch((err) => console.error('Failed to clear scanner', err));
    };
  }, [onScan]);

  return (
    <Sheet
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3000,
        bgcolor: 'background.body',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level="h3">Scan Barcode</Typography>
        <Button variant="plain" color="neutral" onClick={onClose} startDecorator={<Close />}>
          Close
        </Button>
      </Box>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div id="barcode-reader" style={{ width: '100%', maxWidth: '500px' }}></div>
      </Box>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level="body-sm" color="neutral">
          Point your camera at a product barcode to add it to your list.
        </Typography>
      </Box>
    </Sheet>
  );
}
