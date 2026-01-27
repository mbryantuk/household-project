import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Grid, CircularProgress
} from '@mui/joy';
import { 
  Info, Payments
} from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';

export default function HouseView() {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const { houseId } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/details`);
      setDetails(res.data || {});
    } catch (err) {
      console.error("Failed to fetch house details", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      await api.put(`/households/${householdId}/details`, data);
      showNotification("House details updated.", "success");
      fetchDetails();
    } catch {
      showNotification("Error saving details.", "danger");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography level="h2">Asset Registry</Typography>
        <Typography level="body-md" color="neutral">Manage your physical property and household assets.</Typography>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '500px', overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
            <TabList variant="plain" sx={{ p: 1, gap: 1, bgcolor: 'background.level1', mx: 2, mt: 2, borderRadius: 'md' }}>
                <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'}><Info /> Property Info</Tab>
                <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}><Payments /> Running Costs</Tab>
            </TabList>
        </Tabs>

        <Box sx={{ p: 4 }}>
          {activeTab === 0 && (
            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid xs={12} md={6}>
                        <FormControl><FormLabel>Property Type</FormLabel><Input name="property_type" defaultValue={details?.property_type} placeholder="e.g. Detached House" /></FormControl>
                    </Grid>
                    <Grid xs={12} md={6}>
                        <FormControl><FormLabel>Council Tax Band</FormLabel><Input name="council_tax_band" defaultValue={details?.council_tax_band} /></FormControl>
                    </Grid>
                    <Grid xs={12} md={6}>
                        <FormControl><FormLabel>Purchase Price (£)</FormLabel><Input type="number" name="purchase_price" defaultValue={details?.purchase_price} /></FormControl>
                    </Grid>
                    <Grid xs={12} md={6}>
                        <FormControl><FormLabel>Current Valuation (£)</FormLabel><Input type="number" name="current_valuation" defaultValue={details?.current_valuation} /></FormControl>
                    </Grid>
                    <Grid xs={12}><Button type="submit" size="lg">Save Property Details</Button></Grid>
                </Grid>
            </form>
          )}

          {activeTab === 1 && (
            <RecurringChargesWidget 
                api={api} householdId={householdId} household={household}
                entityType="house" entityId={houseId || 1} 
                segments={[
                    { id: 'household_bill', label: 'Bills' },
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'utility', label: 'Utilities' },
                    { id: 'subscription', label: 'Subscriptions' },
                    { id: 'warranty', label: 'Warranties' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Household Running Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
            />
          )}
        </Box>
      </Sheet>
    </Box>
  );
}
