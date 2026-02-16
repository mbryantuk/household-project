import { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Grid, IconButton, Tooltip, CircularProgress,
  Divider, Card, Avatar, Stack, Chip, Breadcrumbs, Link
} from '@mui/joy';
import { 
  Delete, Payments, Info, Save, ArrowBack, Edit, Home, ChevronRight
} from '@mui/icons-material';
import RecurringChargesWidget from '../ui/RecurringChargesWidget';
import EmojiPicker from '../EmojiPicker';
import AppSelect from '../ui/AppSelect';

/**
 * GenericObjectView
 * Centralized component for editing any household object (Member, Vehicle, Pet, Asset, etc.)
 */
export default function GenericObjectView({
  type, id, householdId, api, 
  fields = [], costSegments = [], initialData = null, 
  endpoint, onSave, onDelete, onCancel,
  scope: { isAdmin, showNotification, confirmAction },
  title, subtitle, extraTabs = [], defaultValues = {},
  customSubmit
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
      if (customSubmit) {
          await customSubmit(data, isNew);
          if (onSave) onSave(data);
      } else {
          if (isNew) {
            const res = await api.post(endpoint, data);
            showNotification("Created successfully.", "success");
            if (onSave) onSave(res.data);
          } else {
            await api.put(`${endpoint}/${id}`, data);
            showNotification("Updated successfully.", "success");
            if (onSave) onSave(data);
          }
      }
    } catch (err) {
      console.error(err);
      // Let customSubmit handle its own specific error notifications if it wants, 
      // but generic fallback here.
      if (!customSubmit) showNotification("Failed to save.", "danger");
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

  // Group fields into sections
  const formSections = useMemo(() => {
      const sections = [{ title: 'General Info', fields: [] }];
      fields.forEach(f => {
          if (f.type === 'header') {
              sections.push({ title: f.label, fields: [] });
          } else if (f.type !== 'emoji') { // Emoji is handled in Hero
              sections[sections.length - 1].fields.push(f);
          }
      });
      return sections.filter(s => s.fields.length > 0);
  }, [fields]);

  const emojiField = fields.find(f => f.type === 'emoji');
  const resolvedTitle = typeof title === 'function' ? title(data) : (isNew ? `Add ${type}` : (data.name || data.alias || data.make || 'Details'));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', mx: 'auto', pb: 10 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<ChevronRight fontSize="sm" />} sx={{ px: 0, mb: 2 }}>
        <Link color="neutral" href={`/household/${householdId}/dashboard`}><Home /></Link>
        <Link color="neutral" href={`/household/${householdId}/house`} underline="hover">House Hub</Link>
        <Typography color="neutral" sx={{ textTransform: 'capitalize' }}>{type}s</Typography>
        <Typography color="primary" fontWeight="lg">{resolvedTitle}</Typography>
      </Breadcrumbs>

      {/* Hero Header Card */}
      <Card 
        variant="solid" 
        sx={{ 
            mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'center',
            bgcolor: 'neutral.900',
            color: 'common.white',
            '[data-joy-color-scheme="light"] &': { 
                bgcolor: 'common.white', 
                color: 'text.primary', 
                border: '1px solid', 
                borderColor: 'neutral.200',
                boxShadow: 'sm'
            }
        }}
      >
        <Box sx={{ position: 'relative' }}>
            <Avatar 
                sx={{ 
                    width: 80, height: 80, fontSize: '3rem',
                    bgcolor: 'background.surface',
                    cursor: emojiField ? 'pointer' : 'default',
                    boxShadow: 'md',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder'
                }}
                onClick={() => emojiField && setEmojiPickerOpen(true)}
            >
                {emojiField ? (data[emojiField.name] || '📦') : (data.name?.[0] || '📦')}
            </Avatar>
            {emojiField && (
                <IconButton 
                    size="sm" 
                    variant="solid" 
                    color="primary" 
                    sx={{ position: 'absolute', bottom: -5, right: -5, borderRadius: '50%' }}
                    onClick={() => setEmojiPickerOpen(true)}
                >
                    <Edit fontSize="small" />
                </IconButton>
            )}
        </Box>
        <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography level="h2">{resolvedTitle}</Typography>
            <Typography level="body-md" sx={{ opacity: 0.8 }}>{subtitle || (isNew ? 'New Entry' : 'Details & Configuration')}</Typography>
            {!isNew && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                    <Chip size="sm" variant="outlined">ID: {id}</Chip>
                    {data.type && <Chip size="sm" variant="solid" color="neutral">{data.type}</Chip>}
                </Stack>
            )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
            {!isNew && isAdmin && (
                <Button color="danger" variant="solid" startDecorator={<Delete />} onClick={handleDelete}>
                    Remove
                </Button>
            )}
        </Box>
      </Card>

      {/* Main Content Area */}
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', bgcolor: 'background.body' }}>
        {!isNew && (
            <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)} 
                sx={{ bgcolor: 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <TabList sx={{ 
                    p: 0, 
                    gap: 0, 
                    overflow: 'auto', 
                    scrollSnapType: 'x mandatory', 
                    '&::-webkit-scrollbar': { display: 'none' } 
                }}>
                    <Tab 
                        variant={activeTab === 0 ? 'solid' : 'plain'} 
                        color="primary" 
                        sx={{ flex: { xs: 'none', md: 1 }, py: 2, minWidth: 120, scrollSnapAlign: 'start' }}
                    >
                        <Info sx={{ mr: 1 }}/> Identity
                    </Tab>
                    <Tab 
                        variant={activeTab === 1 ? 'solid' : 'plain'} 
                        color="primary" 
                        sx={{ flex: { xs: 'none', md: 1 }, py: 2, minWidth: 120, scrollSnapAlign: 'start' }}
                    >
                        <Payments sx={{ mr: 1 }}/> Recurring Costs
                    </Tab>
                    {extraTabs.map((tab, idx) => (
                        <Tab 
                            key={tab.id} 
                            variant={activeTab === 2 + idx ? 'solid' : 'plain'} 
                            color="primary" 
                            sx={{ flex: { xs: 'none', md: 1 }, py: 2, minWidth: 120, scrollSnapAlign: 'start' }}
                        >
                             {tab.icon && <tab.icon sx={{ mr: 1 }} />} {tab.label}
                        </Tab>
                    ))}
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.surface' }}>
          {(activeTab === 0 || isNew) && (
            <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                    {formSections.map((section, sIdx) => (
                        <Card key={sIdx} variant="outlined" sx={{ p: 3, borderRadius: 'md', boxShadow: 'sm' }}>
                            <Typography level="title-lg" sx={{ mb: 2, color: 'primary.500' }}>{section.title}</Typography>
                            <Grid container spacing={2}>
                                {section.fields.map((field) => {
                                    const span = field.gridSpan || { xs: 12, md: 6 };
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
                        </Card>
                    ))}

                    <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {onCancel && <Button variant="plain" color="neutral" onClick={onCancel}>Cancel</Button>}
                        <Button type="submit" variant="solid" size="lg" startDecorator={<Save />}>
                            {isNew ? `Create ${type}` : 'Save Changes'}
                        </Button>
                    </Box>
                </Stack>
            </form>
          )}

          {activeTab === 1 && !isNew && (
            <RecurringChargesWidget 
                api={api} 
                householdId={householdId} 
                household={{ id: householdId }} // Hack if household object not full
                entityType={type} 
                entityId={id} 
                segments={typeof costSegments === 'function' ? costSegments(data) : costSegments}
                title={`${resolvedTitle.endsWith('s') ? resolvedTitle + "'" : resolvedTitle + "'s"} Recurring Costs`}
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