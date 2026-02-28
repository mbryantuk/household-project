import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Box } from '@mui/joy';

/**
 * VirtualList
 * Item 249: Frontend List Virtualization
 * A wrapper around react-virtuoso for maintaining 60fps on long lists.
 */
export default function VirtualList({
  data = [],
  renderItem,
  height = 500,
  itemContent,
  ...props
}) {
  return (
    <Box
      sx={{
        height,
        width: '100%',
        overflow: 'hidden',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Virtuoso
        style={{ height: '100%', width: '100%' }}
        data={data}
        itemContent={(index, item) =>
          itemContent ? itemContent(index, item) : renderItem(item, index)
        }
        {...props}
      />
    </Box>
  );
}
