import { useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Sheet } from '@mui/joy';
import StatusBar from './StatusBar';

/**
 * Standardized AppTable
 * Joy UI wrapper for MUI X Data Grid with mandatory status bar.
 */
export default function AppTable({
  rows = [],
  columns = [],
  sumField = null,
  sumLabel = 'Total SUM',
  loading = false,
  onRowUpdate = null,
  ...props
}) {
  const [rowSelectionModel, setRowSelectionModel] = useState([]);

  const selectedRows = useMemo(
    () => rows.filter((r) => rowSelectionModel.includes(r.id)),
    [rows, rowSelectionModel]
  );

  const totalSum = useMemo(() => {
    if (!sumField) return null;
    const itemsToSum = selectedRows.length > 0 ? selectedRows : rows;
    return itemsToSum.reduce((acc, curr) => acc + (parseFloat(curr[sumField]) || 0), 0);
  }, [rows, selectedRows, sumField]);

  const processRowUpdate = async (newRow, oldRow) => {
    if (onRowUpdate) {
      try {
        await onRowUpdate(newRow, oldRow);
        return newRow;
      } catch {
        return oldRow;
      }
    }
    return newRow;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Sheet
        variant="outlined"
        sx={{
          height: 500,
          width: '100%',
          borderRadius: 'md',
          overflow: 'hidden',
          '& .MuiDataGrid-root': {
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'var(--joy-palette-background-level1)',
              color: 'var(--joy-palette-text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            },
            '& .MuiDataGrid-footerContainer': { display: 'none' },
            '& .MuiDataGrid-row.Mui-selected': {
              backgroundColor: 'var(--joy-palette-primary-softBg)',
              '&:hover': { backgroundColor: 'var(--joy-palette-primary-softBg)' },
            },
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
          processRowUpdate={processRowUpdate}
          onRowSelectionModelChange={setRowSelectionModel}
          rowSelectionModel={rowSelectionModel}
          density="compact"
          {...props}
        />
      </Sheet>
      <StatusBar
        count={selectedRows.length > 0 ? selectedRows.length : rows.length}
        sum={totalSum}
        sumLabel={selectedRows.length > 0 ? `Selected ${sumLabel}` : sumLabel}
      />
    </Box>
  );
}
