import React, { useState } from 'react';
import { 
  Box, Typography, Button, Modal, ModalDialog, DialogTitle, DialogContent, 
  DialogActions, Stack, Input, Textarea, Table, Checkbox, CircularProgress,
  Alert, IconButton, Chip, Select, Option
} from '@mui/joy';
import { 
  FileUpload, ContentPaste, Delete, Save, Warning, 
  ReceiptLong
} from '@mui/icons-material';

export default function ReceiptImporter({ open, onClose, api, householdId, onImportComplete, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('file'); // 'file' or 'text'
  const [pasteText, setPasteText] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedSuggestions] = useState([]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await api.post(`/households/${householdId}/shopping-list/import/analyze-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setItems(res.data.items || []);
      setSelectedSuggestions((res.data.items || []).map((_, i) => i));
    } catch {
      showNotification("Failed to analyze receipt. Try pasting the text instead.", "danger");
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset
    }
  };

  const handlePasteAnalyze = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/households/${householdId}/shopping-list/import/analyze-receipt`, { text: pasteText });
      setItems(res.data.items || []);
      setSelectedSuggestions((res.data.items || []).map((_, i) => i));
    } catch {
      showNotification("Failed to parse text.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItems = async () => {
    const toSave = items.filter((_, i) => selectedItems.includes(i));
    setLoading(true);
    try {
      await Promise.all(toSave.map(item => 
        api.post(`/households/${householdId}/shopping-list`, item)
      ));
      showNotification(`Imported ${toSave.length} items to your list.`, "success");
      onImportComplete();
      onClose();
    } catch {
      showNotification("Failed to save some items.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index, updates) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], ...updates };
      setItems(newItems);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 900, width: '95vw', maxHeight: '90vh' }}>
        <DialogTitle>
          <ReceiptLong sx={{ mr: 1 }} />
          Foodbill Importer
        </DialogTitle>
        <DialogContent sx={{ overflowX: 'auto' }}>
          <Typography level="body-sm" sx={{ mb: 3 }}>
            Upload a receipt image, PDF, or paste text from an email to quickly add items to your grocery list.
          </Typography>

          {items.length === 0 ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Button 
                  variant={mode === 'file' ? 'solid' : 'outlined'} 
                  onClick={() => setMode('file')}
                  startDecorator={<FileUpload />}
                >
                  Upload File
                </Button>
                <Button 
                  variant={mode === 'text' ? 'solid' : 'outlined'} 
                  onClick={() => setMode('text')}
                  startDecorator={<ContentPaste />}
                >
                  Paste Text
                </Button>
              </Stack>

              {mode === 'file' && (
                <Box 
                  sx={{ 
                    border: '2px dashed', 
                    borderColor: 'divider', 
                    borderRadius: 'md', 
                    p: 5, 
                    textAlign: 'center',
                    bgcolor: 'background.level1'
                  }}
                >
                  {loading ? (
                    <Stack alignItems="center" spacing={1}>
                      <CircularProgress />
                      <Typography level="body-sm">Analyzing receipt (OCR)...</Typography>
                    </Stack>
                  ) : (
                    <>
                      <Typography level="title-md" mb={2}>Select a Receipt or PDF</Typography>
                      <Button variant="outlined" component="label">
                        Choose File
                        <input type="file" hidden accept="image/*,.pdf" onChange={handleFileChange} />
                      </Button>
                    </>
                  )}
                </Box>
              )}

              {mode === 'text' && (
                <Stack spacing={2}>
                  <Textarea 
                    placeholder="Paste email confirmation text here..." 
                    minRows={10}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <Button 
                    onClick={handlePasteAnalyze} 
                    loading={loading}
                    disabled={!pasteText.trim()}
                  >
                    Analyze Text
                  </Button>
                </Stack>
              )}
            </Stack>
          ) : (
            <Box>
              <Table stickyHeader variant="soft" sx={{ '--TableCell-paddingX': '8px' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <Checkbox 
                        checked={selectedItems.length === items.length}
                        indeterminate={selectedItems.length > 0 && selectedItems.length < items.length}
                        onChange={(e) => setSelectedSuggestions(e.target.checked ? items.map((_, i) => i) : [])}
                      />
                    </th>
                    <th>Item Name</th>
                    <th style={{ width: 100 }}>Qty</th>
                    <th style={{ width: 100 }}>Price</th>
                    <th style={{ width: 150 }}>Category</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <Checkbox 
                          checked={selectedItems.includes(idx)}
                          onChange={(e) => setSelectedSuggestions(prev => e.target.checked ? [...prev, idx] : prev.filter(i => i !== idx))}
                        />
                      </td>
                      <td>
                        <Input size="sm" value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                      </td>
                      <td>
                        <Input size="sm" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                      </td>
                      <td>
                        <Input 
                          size="sm" 
                          type="number" 
                          value={item.estimated_cost} 
                          startDecorator="£"
                          onChange={(e) => updateItem(idx, { estimated_cost: e.target.value })} 
                        />
                      </td>
                      <td>
                        <Select size="sm" value={item.category} onChange={(_, v) => updateItem(idx, { category: v })}>
                          <Option value="general">General</Option>
                          <Option value="produce">Produce</Option>
                          <Option value="dairy">Dairy</Option>
                          <Option value="meat">Meat</Option>
                          <Option value="bakery">Bakery</Option>
                          <Option value="household">Household</Option>
                        </Select>
                      </td>
                      <td>
                        <IconButton size="sm" color="danger" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                          <Delete />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              
              <Alert color="primary" variant="soft" sx={{ mt: 2 }} startDecorator={<Warning />}>
                Verify items and prices before importing. OCR may not be 100% accurate.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="plain" color="neutral" onClick={() => { setItems([]); onClose(); }}>Cancel</Button>
          {items.length > 0 && (
            <Button variant="solid" color="primary" startDecorator={<Save />} onClick={handleSaveItems} loading={loading}>
              Import {selectedItems.length} Items
            </Button>
          )}
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}
