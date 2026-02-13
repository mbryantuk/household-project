import { useState, useEffect } from 'react';
import { Box, Typography, Select, Option, Input, Button, Stack, Sheet, IconButton, Grid, FormControl, FormLabel, Divider } from '@mui/joy';
import { Add, Delete, Save } from '@mui/icons-material';

const OBJECT_TYPES = [
    { value: 'member', label: 'Person (Adult/Child)' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'asset', label: 'Asset' },
    { value: 'pet', label: 'Pet' },
    { value: 'household', label: 'Household' }
];

// Predefined categories per object type (simplified subset for demo/selection)
const STANDARD_CATEGORIES = {
    member: [
        { id: 'insurance', label: 'Insurance' },
        { id: 'subscription', label: 'Subscriptions' },
        { id: 'pocket_money', label: 'Pocket Money' }
    ],
    vehicle: [
        { id: 'vehicle_insurance', label: 'Insurance' },
        { id: 'vehicle_tax', label: 'Tax' },
        { id: 'vehicle_service', label: 'Service' }
    ],
    asset: [
        { id: 'insurance', label: 'Insurance' },
        { id: 'warranty', label: 'Warranty' }
    ],
    household: [
        { id: 'utility', label: 'Utilities' },
        { id: 'council', label: 'Council Tax' }
    ]
};

export default function FinanceSchemaEditor({ metadataSchema, onChange }) {
    const [localSchema, setLocalSchema] = useState(metadataSchema || {});
    const [selectedType, setSelectedType] = useState('member');
    const [selectedCategory, setSelectedCategory] = useState('');
    
    // Sync if prop changes externally
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (metadataSchema) setLocalSchema(metadataSchema);
    }, [metadataSchema]);

    const handleSchemaChange = (newSchema) => {
        setLocalSchema(newSchema);
        onChange(newSchema);
    };

    const addField = () => {
        if (!selectedCategory) return;
        const currentFields = localSchema[selectedType]?.fields?.[selectedCategory] || [];
        const newField = { name: `field_${Date.now()}`, label: 'New Field', type: 'text' };
        
        const updatedSchema = {
            ...localSchema,
            [selectedType]: {
                ...localSchema[selectedType],
                fields: {
                    ...localSchema[selectedType]?.fields,
                    [selectedCategory]: [...currentFields, newField]
                }
            }
        };
        handleSchemaChange(updatedSchema);
    };

    const updateField = (idx, key, val) => {
        const currentFields = [...(localSchema[selectedType]?.fields?.[selectedCategory] || [])];
        currentFields[idx] = { ...currentFields[idx], [key]: val };
        
        // Auto-generate name slug from label if name is default/empty
        if (key === 'label' && (currentFields[idx].name.startsWith('field_') || !currentFields[idx].name)) {
            currentFields[idx].name = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }

        const updatedSchema = {
            ...localSchema,
            [selectedType]: {
                ...localSchema[selectedType],
                fields: {
                    ...localSchema[selectedType]?.fields,
                    [selectedCategory]: currentFields
                }
            }
        };
        handleSchemaChange(updatedSchema);
    };

    const removeField = (idx) => {
        const currentFields = [...(localSchema[selectedType]?.fields?.[selectedCategory] || [])];
        currentFields.splice(idx, 1);
        
        const updatedSchema = {
            ...localSchema,
            [selectedType]: {
                ...localSchema[selectedType],
                fields: {
                    ...localSchema[selectedType]?.fields,
                    [selectedCategory]: currentFields
                }
            }
        };
        handleSchemaChange(updatedSchema);
    };

    const addCustomCategory = () => {
        const catId = prompt("Enter Category ID (e.g. 'gym_membership'):");
        if (!catId) return;
        const catLabel = prompt("Enter Category Label (e.g. 'Gym & Fitness'):");
        if (!catLabel) return;

        const currentCats = localSchema[selectedType]?.categories || [];
        // Check duplicate
        if (currentCats.find(c => c.id === catId)) return alert("Category ID exists");

        const updatedSchema = {
            ...localSchema,
            [selectedType]: {
                ...localSchema[selectedType],
                categories: [...currentCats, { id: catId, label: catLabel }]
            }
        };
        handleSchemaChange(updatedSchema);
        setSelectedCategory(catId);
    };

    const activeFields = localSchema[selectedType]?.fields?.[selectedCategory] || [];
    const customCategories = localSchema[selectedType]?.categories || [];
    
    // Merge standard and custom categories for selection
    const availableCategories = [
        ...(STANDARD_CATEGORIES[selectedType] || []),
        ...customCategories
    ];

    return (
        <Stack spacing={3}>
            <Typography level="body-sm">
                Define custom fields (e.g., Policy Numbers, Renewal Dates) and categories for recurring costs. 
                These will appear when editing costs for the selected object type.
            </Typography>

            <Grid container spacing={2} alignItems="flex-end">
                <Grid xs={12} md={4}>
                    <FormControl>
                        <FormLabel>Object Type</FormLabel>
                        <Select value={selectedType} onChange={(e, v) => { setSelectedType(v); setSelectedCategory(''); }}>
                            {OBJECT_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
                    <FormControl>
                        <FormLabel>Cost Category</FormLabel>
                        <Select 
                            value={selectedCategory} 
                            onChange={(e, v) => setSelectedCategory(v)}
                            placeholder="Select Category..."
                        >
                            {availableCategories.map(c => <Option key={c.id} value={c.id}>{c.label}</Option>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
                    <Button variant="soft" color="primary" startDecorator={<Add />} onClick={addCustomCategory}>
                        New Category
                    </Button>
                </Grid>
            </Grid>

            {selectedCategory && (
                <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography level="title-sm">Custom Fields for {availableCategories.find(c => c.id === selectedCategory)?.label}</Typography>
                        <Button size="sm" startDecorator={<Add />} onClick={addField}>Add Field</Button>
                    </Box>
                    
                    {activeFields.length === 0 && (
                        <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic' }}>No custom fields defined.</Typography>
                    )}

                    <Stack spacing={2}>
                        {activeFields.map((field, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Input 
                                    placeholder="Label (e.g. Policy No)" 
                                    value={field.label} 
                                    onChange={e => updateField(idx, 'label', e.target.value)}
                                    sx={{ flex: 1 }}
                                />
                                <Select 
                                    value={field.type} 
                                    onChange={(e, v) => updateField(idx, 'type', v)}
                                    sx={{ width: 120 }}
                                >
                                    <Option value="text">Text</Option>
                                    <Option value="date">Date</Option>
                                    <Option value="number">Number</Option>
                                </Select>
                                <IconButton size="sm" color="danger" onClick={() => removeField(idx)}><Delete /></IconButton>
                            </Box>
                        ))}
                    </Stack>
                </Sheet>
            )}
        </Stack>
    );
}
