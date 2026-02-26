import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Modal,
  ModalDialog,
  Select,
  Option,
  Table,
  Stack,
} from '@mui/joy';
import { FileUpload, Save } from '@mui/icons-material';

/**
 * IMPORT MAPPING WIZARD
 * Item 236: Generic CSV support
 */
export default function ImportMappingWizard({ columns, data, onConfirm, onClose }) {
  const [mapping, setMapping] = useState({
    date: columns.find((c) => c.toLowerCase().includes('date')) || '',
    description: columns.find((c) => c.toLowerCase().includes('desc')) || '',
    amount: columns.find((c) => c.toLowerCase().includes('amount')) || '',
  });

  const handleConfirm = () => {
    const mappedData = data.map((row) => ({
      date: row[mapping.date],
      description: row[mapping.description],
      amount: parseFloat(row[mapping.amount]?.replace(/[^0-9.-]+/g, '') || 0),
    }));
    onConfirm(mappedData);
  };

  return (
    <Modal open onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 800 }}>
        <Typography level="h3">Map CSV Columns</Typography>
        <Typography level="body-sm">Tell us which columns match our data format.</Typography>

        <Stack spacing={2} sx={{ my: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ width: 120 }}>Date Column:</Typography>
            <Select
              value={mapping.date}
              onChange={(_, v) => setMapping((m) => ({ ...m, date: v }))}
            >
              {columns.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ width: 120 }}>Description:</Typography>
            <Select
              value={mapping.description}
              onChange={(_, v) => setMapping((m) => ({ ...m, description: v }))}
            >
              {columns.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ width: 120 }}>Amount:</Typography>
            <Select
              value={mapping.amount}
              onChange={(_, v) => setMapping((m) => ({ ...m, amount: v }))}
            >
              {columns.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Box>
        </Stack>

        <Typography level="title-sm">Preview (First 3 rows):</Typography>
        <Table size="sm">
          <thead>
            <tr>
              {Object.keys(mapping).map((k) => (
                <th key={k}>{k.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 3).map((row, i) => (
              <tr key={i}>
                <td>{row[mapping.date]}</td>
                <td>{row[mapping.description]}</td>
                <td>{row[mapping.amount]}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="plain" color="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" color="primary" onClick={handleConfirm} startDecorator={<Save />}>
            Confirm Mapping
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
