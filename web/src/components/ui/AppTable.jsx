import React, { useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Sheet, Typography } from '@mui/joy';
import StatusBar from './StatusBar';

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
  const [rowSelectionModel, setRowSelectionModel] = useState([]);

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
        <Sheet 
            variant="outlined" 
            sx={{ 
                height: 500,
                width: '100%',
                borderRadius: 'sm', 
                overflow: 'hidden',
                '& .MuiDataGrid-root': {
                    border: 'none',
                    color: 'text.primary',
                    fontFamily: 'body',
                    '& .MuiDataGrid-cell': {
                        borderColor: 'divider',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'background.level1',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.1em',
                    },
                    '& .MuiDataGrid-footerContainer': {
                        display: 'none', // We use our own StatusBar
                    },
                    '& .MuiDataGrid-row:hover': {
                        backgroundColor: 'background.level1',
                    },
                    '& .MuiDataGrid-row.Mui-selected': {
                        backgroundColor: 'primary.softBg',
                        '&:hover': {
                            backgroundColor: 'primary.softBg',
                        },
                    },
                    '& .MuiCheckbox-root': {
                        color: 'primary.solidBg',
                    }
                }
            }}
        >
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
        </Sheet>
        <StatusBar 
            count={selectedRows.length > 0 ? selectedRows.length : rows.length} 
            sum={totalSum}
            sumLabel={selectedRows.length > 0 ? `Selected ${sumLabel}` : sumLabel}
        />
    </Box>
  );
}
