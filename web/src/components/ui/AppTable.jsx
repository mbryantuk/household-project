import React, { useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Sheet, Typography } from '@mui/joy';
import { styled } from '@mui/joy/styles';
import StatusBar from './StatusBar';

const StyledDataGridContainer = styled(Sheet)(({ theme }) => ({
  height: 500,
  width: '100%',
  '& .MuiDataGrid-root': {
    border: 'none',
    color: 'var(--joy-palette-text-primary)',
    fontFamily: 'var(--joy-fontFamily-body)',
    '& .MuiDataGrid-cell': {
      borderColor: 'var(--joy-palette-divider)',
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: 'var(--joy-palette-background-level1)',
      borderColor: 'var(--joy-palette-divider)',
      color: 'var(--joy-palette-text-secondary)',
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      letterSpacing: '0.1em',
    },
    '& .MuiDataGrid-footerContainer': {
      display: 'none', // We use our own StatusBar
    },
    '& .MuiDataGrid-row:hover': {
      backgroundColor: 'var(--joy-palette-background-level1)',
    },
    '& .MuiDataGrid-row.Mui-selected': {
      backgroundColor: 'var(--joy-palette-primary-softBg)',
      '&:hover': {
        backgroundColor: 'var(--joy-palette-primary-softBg)',
      },
    },
    '& .MuiCheckbox-root': {
        color: 'var(--joy-palette-primary-solidBg)',
    }
  },
}));

/**
 * AppTable - Joy UI wrapper for MUI X Data Grid.
 * Mandatory: Sorting, Filtering, and Inline Editing support.
 * Mandatory: Status Bar with Count and SUM.
 */
export default function AppTable({ 
    rows = [], 
    columns = [], 
    sumField = null, 
    sumLabel = "Total SUM",
    loading = false,
    ...props 
}) {
  const [rowSelectionModel, setRowSelectionModel] = React.useState([]);

  const selectedRows = useMemo(() => {
    return rows.filter(r => rowSelectionModel.includes(r.id));
  }, [rows, rowSelectionModel]);

  const totalSum = useMemo(() => {
    if (!sumField) return null;
    const itemsToSum = selectedRows.length > 0 ? selectedRows : rows;
    return itemsToSum.reduce((acc, curr) => acc + (parseFloat(curr[sumField]) || 0), 0);
  }, [rows, selectedRows, sumField]);

  return (
    <Box sx={{ width: '100%' }}>
        <StyledDataGridContainer variant="outlined" sx={{ borderRadius: 'sm', overflow: 'hidden' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(newRowSelectionModel) => {
                    setRowSelectionModel(newRowSelectionModel);
                }}
                rowSelectionModel={rowSelectionModel}
                density="compact"
                sx={{
                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 'bold',
                    }
                }}
                {...props}
            />
        </StyledDataGridContainer>
        <StatusBar 
            count={selectedRows.length > 0 ? selectedRows.length : rows.length} 
            sum={totalSum}
            sumLabel={selectedRows.length > 0 ? `Selected ${sumLabel}` : sumLabel}
        />
    </Box>
  );
}
