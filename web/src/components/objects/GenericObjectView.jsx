import { useState, useEffect } from 'react';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Grid, IconButton, Tooltip, CircularProgress,
  Divider, Select, Option
} from '@mui/joy';
import { 
  Delete, Payments, Info, Save, ArrowBack
} from '@mui/icons-material';
import RecurringChargesWidget from '../ui/RecurringChargesWidget';
import EmojiPicker from '../EmojiPicker';
import AppSelect from '../ui/AppSelect';

/**
 * GenericObjectView
 * Centralized component for editing any household object (Member, Vehicle, Pet, Asset, etc.)
 * 
 * Props:
 * @param {string} type - 'member', 'vehicle', 'pet', 'asset', 'household'
 * @param {string|number} id - Object ID or 'new'
 * @param {string} householdId - Current household ID
 * @param {Object} api - Axios instance
 * @param {Array} fields - Field definitions for the Identity form
 * @param {Array} costSegments - Categories for Recurring Costs
 * @param {Object} initialData - Optional initial data (if already fetched)
 * @param {string} endpoint - API endpoint base (e.g. `/households/1/members`)
 * @param {Function} onSave - Callback after successful save
 * @param {Function} onDelete - Callback after successful delete
 * @param {Function} onCancel - Callback for back button
 * @param {Object} scope - Context object (isAdmin, showNotification, confirmAction)
 * @param {string} title - Page title (or function returning title based on data)
 * @param {string} subtitle - Page subtitle
 * @param {Array} extraTabs - Optional extra tabs [{ id, label, icon, content }]
 * @param {Object} defaultValues - Default values for new objects
 */
export default function GenericObjectView({
  type, id, householdId, api, 
  fields = [], costSegments = [], initialData = null, 
  endpoint, onSave, onDelete, onCancel,
  scope: { isAdmin, showNotification, confirmAction },
  title, subtitle, extraTabs = [], defaultValues = {}
}) {
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew && !initialData);
  const [data, setData] = useState(initialData || defaultValues);
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  // Fetch data if not provided
  useEffect(() => {
    let mounted = true;
    if (!isNew && !initialData && endpoint) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (mounted) setLoading(true);
      api.get(`${endpoint}/${id}`)
        .then(res => {
            if (mounted) setData(res.data);
        })
        .catch(err => {
            console.error(err);
            if (mounted) showNotification("Failed to load details.", "danger");
        })
        .finally(() => {
            if (mounted) setLoading(false);
        });
    } else if (initialData) {
        if (mounted) setData(initialData);
    } else if (isNew) {
        if (mounted) setData(defaultValues);
    }
    return () => { mounted = false; };
  }, [id, isNew, initialData, endpoint, api, showNotification, defaultValues]);

  const handleChange = (name, value) => {
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isNew) {
        const res = await api.post(endpoint, data);
        showNotification("Created successfully.", "success");
        if (onSave) onSave(res.data);
      } else {
        await api.put(`${endpoint}/${id}`, data);
        showNotification("Updated successfully.", "success");
        if (onSave) onSave(data);
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to save.", "danger");
    }
  };

  const handleDelete = () => {
    confirmAction(
        `Remove ${type}`,
        `Are you sure you want to remove this ${type}? This action cannot be undone.`,
        async () => {
            try {
                await api.delete(`${endpoint}/${id}`);
                showNotification("Removed successfully.", "neutral");
                if (onDelete) onDelete();
            } catch {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  // Resolve Title
  const resolvedTitle = typeof title === 'function' ? title(data) : (isNew ? `Add ${type}` : (data.name || data.alias || data.make || 'Details'));
  const resolvedSubtitle = subtitle || (isNew ? 'Enter details below.' : 'View and manage details.');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {onCancel && (
                <IconButton variant="outlined" onClick={onCancel}>
                    <ArrowBack />
                </IconButton>
            )}
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                    {resolvedTitle}
                </Typography>
                <Typography level="body-md" color="neutral">
                    {resolvedSubtitle}
                </Typography>
            </Box>
        </Box>
        <Box>
            {!isNew && isAdmin && (
                <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={handleDelete}>
                    Remove
                </Button>
            )}
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '600px', overflow: 'hidden' }}>
        {!isNew && (
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
                <TabList 
                    variant="plain" 
                    sx={{ 
                        p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, 
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { display: 'none' },
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}>
                        <Info sx={{ mr: 1 }}/> Identity
                    </Tab>
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}>
                        <Payments sx={{ mr: 1 }}/> Recurring Costs
                    </Tab>
                    {extraTabs.map((tab, idx) => (
                        <Tab key={tab.id} variant={activeTab === 2 + idx ? 'solid' : 'plain'} color={activeTab === 2 + idx ? 'primary' : 'neutral'} sx={{ flex: 'none' }}>
                             {tab.icon && <tab.icon sx={{ mr: 1 }} />} {tab.label}
                        </Tab>
                    ))}
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || isNew) && (
            <Box>
                {!isNew && <Box sx={{ mb: 4 }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                        Identity
                    </Typography>
                    <Typography level="body-md" color="neutral">Core identification and properties.</Typography>
                </Box>}
                
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Emoji Picker Special Case */}
                        {fields.find(f => f.type === 'emoji') && (() => {
                            const emojiField = fields.find(f => f.type === 'emoji');
                            return (
                                <Grid xs={12} md={2}>
                                    <Tooltip title="Pick an emoji" variant="soft">
                                        <IconButton 
                                            onClick={() => setEmojiPickerOpen(true)} 
                                            variant="outlined"
                                            sx={{ width: 80, height: 80, borderRadius: 'xl' }}
                                        >
                                            <Typography level="h1">{data[emojiField.name] || '📦'}</Typography>
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            );
                        })()}

                        <Grid xs={12} md={fields.some(f => f.type === 'emoji') ? 10 : 12}>
                            <Grid container spacing={2}>
                                {fields.filter(f => f.type !== 'emoji').map((field, idx) => {
                                    const span = field.gridSpan || { xs: 12, md: 6 };
                                    
                                    if (field.type === 'header') {
                                        return (
                                            <Grid key={idx} xs={12}>
                                                <Divider sx={{ my: 1 }}>{field.label}</Divider>
                                            </Grid>
                                        );
                                    }

                                    return (
                                        <Grid key={field.name} xs={span.xs || 12} md={span.md || 6} lg={span.lg}>
                                            {field.type === 'select' ? (
                                                <AppSelect 
                                                    label={field.label}
                                                    name={field.name}
                                                    value={data[field.name]}
                                                    onChange={(v) => handleChange(field.name, v)}
                                                    options={field.options}
                                                    required={field.required}
                                                />
                                            ) : (
                                                <FormControl required={field.required}>
                                                    <FormLabel>{field.label}</FormLabel>
                                                    <Input 
                                                        name={field.name}
                                                        type={field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text')}
                                                        value={data[field.name] || ''}
                                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        startDecorator={field.startDecorator}
                                                        endDecorator={field.endDecorator}
                                                        step={field.step}
                                                    />
                                                </FormControl>
                                            )}
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Grid>

                        <Grid xs={12}>
                            <Button type="submit" variant="solid" size="lg" startDecorator={<Save />}>
                                {isNew ? `Create ${type}` : 'Save Changes'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Box>
          )}

          {activeTab === 1 && !isNew && (
            <RecurringChargesWidget 
                api={api} 
                householdId={householdId} 
                household={{ id: householdId }} // Hack if household object not full
                entityType={type} 
                entityId={id} 
                segments={typeof costSegments === 'function' ? costSegments(data) : costSegments}
                title={`${type} Recurring Costs`}
                showNotification={showNotification}
                confirmAction={confirmAction}
            />
          )}

          {extraTabs.map((tab, idx) => (
             activeTab === 2 + idx && !isNew && (
                 <Box key={tab.id}>
                     {tab.content(data, handleChange, handleSubmit)}
                 </Box>
             )
          ))}
        </Box>
      </Sheet>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            const emojiField = fields.find(f => f.type === 'emoji');
            if (emojiField) {
                handleChange(emojiField.name, emoji);
            }
            setEmojiPickerOpen(false);
        }}
        title={`Select ${type} Emoji`}
      />
    </Box>
  );
}
