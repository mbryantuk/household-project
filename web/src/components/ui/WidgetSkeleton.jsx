import React from 'react';
import { Skeleton, Card, CardContent, Stack, Box } from '@mui/joy';

/**
 * Loading placeholder for dashboard widgets.
 */
export default function WidgetSkeleton() {
  return (
    <Card variant="outlined" sx={{ height: '100%', minHeight: 200 }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
           <Skeleton variant="circular" width={32} height={32} />
           <Skeleton variant="text" width="50%" height={24} />
        </Stack>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton variant="rectangular" height={20} width="90%" />
            <Skeleton variant="rectangular" height={20} width="85%" />
            <Skeleton variant="rectangular" height={20} width="95%" />
            <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
        </Box>
      </CardContent>
    </Card>
  );
}
