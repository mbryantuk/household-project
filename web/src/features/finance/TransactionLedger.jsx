import React, { useState } from 'react';
import { Box, Typography, Button, Stack, Chip, Menu, MenuItem } from '@mui/joy';
import { DataGrid } from '@mui/x-data-grid';
import { DoneAll, Block, Category, KeyboardArrowDown } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * TRANSACTION LEDGER
 * Item 231: DataGrid with Inline Batch Editing
 */
export default function TransactionLedger({ api, householdId }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedMembers] = useState([]);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState(null);

  // 1. Fetch Data
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['households', householdId, 'transactions'],
    queryFn: () => api.get(`/households/${householdId}/transactions`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  // 2. Mutations
  const batchUpdateMutation = useMutation({
    mutationFn: (updates) =>
      api.patch(`/households/${householdId}/transactions/batch`, { ids: selectedIds, updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'transactions'] });
      setSelectedMembers([]);
      setCategoryMenuAnchor(null);
    },
  });

  const categories = ['Food', 'Utilities', 'Leisure', 'Transport', 'Healthcare', 'Income', 'Other'];

  const columns = [
    { field: 'date', headerName: 'Date', width: 120, editable: true },
    { field: 'description', headerName: 'Description', flex: 1, editable: true },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 100,
      type: 'number',
      editable: true,
      valueFormatter: (params) => {
        if (params == null) return '';
        return `£${params.toLocaleString()}`;
      },
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      editable: true,
      type: 'singleSelect',
      valueOptions: categories,
    },
    {
      field: 'is_reconciled',
      headerName: 'Status',
      width: 120,
      type: 'boolean',
      editable: true,
      renderCell: (params) => (
        <Chip
          color={params.value ? 'success' : 'warning'}
          variant="soft"
          size="sm"
          startDecorator={params.value ? <DoneAll /> : <Block />}
        >
          {params.value ? 'Reconciled' : 'Pending'}
        </Chip>
      ),
    },
  ];

  const handleProcessRowUpdate = async (newRow) => {
    try {
      await api.put(`/households/${householdId}/transactions/${newRow.id}`, newRow);
      return newRow;
    } catch (err) {
      console.error('Failed to update row', err);
      throw err;
    }
  };

  const handleBatchReconcile = () => {
    batchUpdateMutation.mutate({ is_reconciled: 1 });
  };

  const handleBatchCategory = (category) => {
    batchUpdateMutation.mutate({ category });
  };

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography level="h3">Transaction Ledger</Typography>
        {selectedIds.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Button
              size="sm"
              variant="solid"
              color="success"
              startDecorator={<DoneAll />}
              onClick={handleBatchReconcile}
              loading={batchUpdateMutation.isPending}
            >
              Reconcile ({selectedIds.length})
            </Button>

            <Button
              size="sm"
              variant="outlined"
              color="neutral"
              startDecorator={<Category />}
              endDecorator={<KeyboardArrowDown />}
              onClick={(e) => setCategoryMenuAnchor(e.currentTarget)}
              loading={batchUpdateMutation.isPending}
            >
              Set Category
            </Button>
            <Menu
              anchorEl={categoryMenuAnchor}
              open={Boolean(categoryMenuAnchor)}
              onClose={() => setCategoryMenuAnchor(null)}
              size="sm"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} onClick={() => handleBatchCategory(cat)}>
                  {cat}
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        )}
      </Stack>

      <DataGrid
        rows={transactions}
        columns={columns}
        loading={isLoading}
        checkboxSelection
        disableRowSelectionOnClick
        processRowUpdate={handleProcessRowUpdate}
        onRowSelectionModelChange={(newSelection) => setSelectedMembers(newSelection)}
        sx={{
          bgcolor: 'background.surface',
          '& .MuiDataGrid-cell:focus': { outline: 'none' },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'md',
        }}
      />
    </Box>
  );
}
