import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Sheet,
  Tabs,
  TabList,
  Tab,
  Input,
  Button,
  FormControl,
  FormLabel,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Card,
  Avatar,
  Stack,
  Chip,
  Breadcrumbs,
  Link,
  Switch,
} from '@mui/joy';
import {
  Delete,
  Payments,
  Info,
  Save,
  ArrowBack,
  Edit,
  Home,
  ChevronRight,
  ChatBubble,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';

import RecurringChargesWidget from '../ui/RecurringChargesWidget';
import EmojiPicker from '../EmojiPicker';
import AppSelect from '../ui/AppSelect';
import CommentThread from '../ui/CommentThread';
import { useEntity, useEntityMutation } from '../../hooks/useEntity';

/**
 * GenericObjectView
 * Centralized component for editing any household object (Member, Vehicle, Pet, Asset, etc.)
 */
export default function GenericObjectView({
  type,
  id,
  householdId,
  api,
  fields = [],
  costSegments = [],
  initialData = null,
  endpoint,
  onSave,
  onDelete,
  onCancel,
  scope: { isAdmin, showNotification, confirmAction },
  title,
  subtitle,
  extraTabs = [],
  defaultValues = {},
  customSubmit,
}) {
  const isNew = id === 'new';
  const queryClient = useQueryClient();

  // 1. Fetch data with TanStack Query if it's not "new"
  const {
    data: fetchedData,
    isLoading: isFetching,
    error: fetchError,
  } = useEntity(api, householdId, type, id, endpoint);

  // 2. Mutations
  const mutation = useEntityMutation(api, householdId, type, endpoint);

  // Local state for form data, synchronized with fetched data or initialData
  const [data, setData] = useState(initialData || defaultValues);
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync local data state with fetched data or initialData
  useEffect(() => {
    if (fetchedData) {
      Promise.resolve().then(() => setData(fetchedData));
    } else if (initialData) {
      Promise.resolve().then(() => setData(initialData));
    } else if (isNew) {
      Promise.resolve().then(() => setData(defaultValues));
    }
  }, [fetchedData, initialData, isNew, defaultValues]);

  const handleChange = (name, value) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (customSubmit) {
        await customSubmit(data, isNew);
        if (onSave) onSave(data);
      } else {
        const result = await mutation.mutateAsync({
          id: isNew ? null : id,
          data,
          method: isNew ? 'POST' : 'PUT',
        });
        showNotification(isNew ? 'Created successfully.' : 'Updated successfully.', 'success');
        if (onSave) onSave(result);
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error || 'Failed to save.';
      showNotification(message, 'danger');
    }
  };

  const handleDelete = () => {
    confirmAction(
      `Remove ${type}`,
      `Are you sure you want to remove this ${type}? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`${endpoint}/${id}`);

          // Invalidate the list of these entities
          queryClient.invalidateQueries({ queryKey: ['households', householdId, `${type}s`] });

          showNotification('Removed successfully.', 'neutral');
          if (onDelete) onDelete();
        } catch {
          showNotification('Failed to delete.', 'danger');
        }
      }
    );
  };

  // Group fields into sections
  const { formSections, hasAdvancedFields } = useMemo(() => {
    const sections = [{ title: 'General Info', fields: [] }];
    let advancedFound = false;

    fields.forEach((f) => {
      if (f.type === 'header') {
        sections.push({ title: f.label, fields: [] });
      } else if (f.type !== 'emoji') {
        if (f.isAdvanced) advancedFound = true;
        if (!f.isAdvanced || showAdvanced) {
          sections[sections.length - 1].fields.push(f);
        }
      }
    });
    return {
      formSections: sections.filter((s) => s.fields.length > 0),
      hasAdvancedFields: advancedFound,
    };
  }, [fields, showAdvanced]);

  const emojiField = fields.find((f) => f.type === 'emoji');
  const resolvedTitle =
    typeof title === 'function'
      ? title(data)
      : isNew
        ? `Add ${type}`
        : data.name || data.alias || data.make || 'Details';

  if (isFetching && !initialData)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );

  if (fetchError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level="h3" color="danger">
          Failed to load {type}.
        </Typography>
        <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  // Item 245: All entities support comments
  const defaultTabs = [
    { id: 'identity', label: 'Identity', icon: Info },
    { id: 'costs', label: 'Recurring Costs', icon: Payments },
    { id: 'discuss', label: 'Discussion', icon: ChatBubble },
  ];

  const totalTabs = [...defaultTabs, ...extraTabs];

  return (
    <Box data-testid="generic-object-view" sx={{ width: '100%', mx: 'auto', pb: 10 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<ChevronRight fontSize="sm" />}
        sx={{
          px: 0,
          mb: 2,
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }}
      >
        <Link color="neutral" href={`/household/${householdId}/dashboard`}>
          <Home />
        </Link>
        <Link
          color="neutral"
          href={`/household/${householdId}/house`}
          underline="hover"
          sx={{ display: { xs: 'none', sm: 'inline' } }}
        >
          House Hub
        </Link>
        <Typography
          color="neutral"
          sx={{ textTransform: 'capitalize', display: { xs: 'none', md: 'inline' } }}
        >
          {type}s
        </Typography>
        <Typography color="primary" fontWeight="lg" noWrap>
          {resolvedTitle}
        </Typography>
      </Breadcrumbs>

      {/* Hero Header Card */}
      <Card
        variant="solid"
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          alignItems: 'center',
          bgcolor: 'neutral.900',
          color: 'common.white',
          '[data-joy-color-scheme="light"] &': {
            bgcolor: 'common.white',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'neutral.200',
            boxShadow: 'sm',
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              fontSize: '3rem',
              bgcolor: 'background.surface',
              cursor: emojiField ? 'pointer' : 'default',
              boxShadow: 'md',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
            }}
            onClick={() => emojiField && setEmojiPickerOpen(true)}
          >
            {emojiField ? data[emojiField.name] || '📦' : data.name?.[0] || '📦'}
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
          <Typography level="body-md" sx={{ opacity: 0.8 }}>
            {subtitle || (isNew ? 'New Entry' : 'Details & Configuration')}
          </Typography>
          {!isNew && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}
            >
              <Chip size="sm" variant="outlined">
                ID: {id}
              </Chip>
              {data.type && (
                <Chip size="sm" variant="solid" color="neutral">
                  {data.type}
                </Chip>
              )}
            </Stack>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isNew && isAdmin && (
            <Button
              color="danger"
              variant="solid"
              startDecorator={<Delete />}
              onClick={handleDelete}
              loading={mutation.isPending}
            >
              Remove
            </Button>
          )}
        </Box>
      </Card>

      {/* Main Content Area */}
      <Sheet
        variant="outlined"
        sx={{ borderRadius: 'md', overflow: 'hidden', bgcolor: 'background.body' }}
      >
        {!isNew && (
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{ bgcolor: 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <TabList
              sx={{
                p: 0,
                gap: 0,
                overflow: 'auto',
                scrollSnapType: 'x mandatory',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {totalTabs.map((tab, idx) => (
                <Tab
                  key={tab.id}
                  variant={activeTab === idx ? 'solid' : 'plain'}
                  color="primary"
                  sx={{
                    flex: { xs: 'none', md: 1 },
                    py: 2,
                    minWidth: 120,
                    scrollSnapAlign: 'start',
                  }}
                >
                  {tab.icon && <tab.icon sx={{ mr: 1 }} />} {tab.label}
                </Tab>
              ))}
            </TabList>
          </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 4 }, pb: { xs: 10, sm: 4 }, bgcolor: 'background.surface' }}>
          {(activeTab === 0 || isNew) && (
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {hasAdvancedFields && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <FormControl orientation="horizontal" sx={{ gap: 1 }}>
                      <FormLabel sx={{ mb: 0 }}>Advanced Settings</FormLabel>
                      <Switch
                        size="sm"
                        checked={showAdvanced}
                        onChange={(e) => setShowAdvanced(e.target.checked)}
                      />
                    </FormControl>
                  </Box>
                )}
                {formSections.map((section, sIdx) => (
                  <Card
                    key={sIdx}
                    variant="outlined"
                    sx={{ p: 3, borderRadius: 'md', boxShadow: 'sm' }}
                  >
                    <Typography level="title-lg" sx={{ mb: 2, color: 'primary.500' }}>
                      {section.title}
                    </Typography>
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
                                  type={
                                    field.type === 'number'
                                      ? 'number'
                                      : field.type === 'date'
                                        ? 'date'
                                        : 'text'
                                  }
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

                <Box
                  sx={{
                    pt: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    position: { xs: 'fixed', sm: 'static' },
                    bottom: { xs: 0, sm: 'auto' },
                    left: { xs: 0, sm: 'auto' },
                    right: { xs: 0, sm: 'auto' },
                    bgcolor: { xs: 'background.surface', sm: 'transparent' },
                    p: { xs: 2, sm: 0 },
                    borderTop: { xs: '1px solid', sm: 'none' },
                    borderColor: 'divider',
                    zIndex: 1000,
                    boxShadow: { xs: '0 -4px 12px rgba(0,0,0,0.1)', sm: 'none' },
                  }}
                >
                  {onCancel && (
                    <Button
                      variant="plain"
                      color="neutral"
                      onClick={onCancel}
                      disabled={mutation.isPending}
                      sx={{ flex: { xs: 1, sm: 'none' } }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="solid"
                    size="lg"
                    startDecorator={<Save />}
                    loading={mutation.isPending}
                    sx={{ flex: { xs: 2, sm: 'none' } }}
                  >
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

          {activeTab === 2 && !isNew && (
            <CommentThread
              api={api}
              householdId={householdId}
              entityType={`${type}s`} // Use plural for table naming consistency
              entityId={id}
            />
          )}

          {extraTabs.map(
            (tab, idx) =>
              activeTab === 3 + idx &&
              !isNew && <Box key={tab.id}>{tab.content(data, handleChange, handleSubmit)}</Box>
          )}
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
