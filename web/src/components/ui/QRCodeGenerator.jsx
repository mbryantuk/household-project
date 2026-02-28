import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Card,
  AspectRatio,
} from '@mui/joy';
import { QrCode, Share, Download, Close } from '@mui/icons-material';

/**
 * QRCodeGenerator
 * Item 281: Reusable component to show and download a QR code.
 */
export default function QRCodeGenerator({ title, subtitle, fetchUrl, api }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await api.get(fetchUrl);
      setQrData(res.data);
    } catch (err) {
      console.error('Failed to fetch QR code', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData?.qrCode) return;
    const link = document.createElement('a');
    link.href = qrData.qrCode;
    link.download = `${title.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Button variant="soft" color="neutral" startDecorator={<QrCode />} onClick={handleOpen}>
        {title}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} alignItems="center" sx={{ mt: 2 }}>
              {loading ? (
                <CircularProgress sx={{ my: 5 }} />
              ) : qrData ? (
                <>
                  <Card variant="outlined" sx={{ p: 1, bgcolor: 'white' }}>
                    <AspectRatio ratio="1" sx={{ width: 250 }}>
                      <img src={qrData.qrCode} alt="QR Code" />
                    </AspectRatio>
                  </Card>
                  <Typography level="body-sm" textAlign="center">
                    {subtitle}
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="neutral"
                      startDecorator={<Download />}
                      onClick={handleDownload}
                    >
                      Download
                    </Button>
                    <Button
                      fullWidth
                      variant="solid"
                      color="primary"
                      onClick={() => setOpen(false)}
                    >
                      Done
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography color="danger">Failed to generate QR code.</Typography>
              )}
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </>
  );
}
