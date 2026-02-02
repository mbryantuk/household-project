import React from 'react';
import { FormControl, FormLabel, Input, Select, Option, Box, Typography, Grid, Divider } from '@mui/joy';
import { METADATA_SCHEMAS } from '../../utils/financeSchemas';

export default function MetadataFormFields({ categoryId, metadata = {}, onChange, customSchema = null }) {
    // Merge global schema with custom household schema if provided
    const baseFields = METADATA_SCHEMAS[categoryId] || [];
    const customFields = (customSchema && customSchema[categoryId]) ? customSchema[categoryId] : [];
    
    // Custom fields override base fields if keys match, otherwise they append
    const fieldMap = new Map();
    baseFields.forEach(f => fieldMap.set(f.key, f));
    customFields.forEach(f => fieldMap.set(f.key, f));
    
    const fields = Array.from(fieldMap.values());

    if (fields.length === 0) return null;

    const handleFieldChange = (key, value) => {
        onChange({
            ...metadata,
            [key]: value
        });
    };

    return (
        <Box sx={{ mt: 3, mb: 1 }}>
            <Divider sx={{ mb: 2 }}>
                <Typography level="body-xs" sx={{ textTransform: 'uppercase', letterSpacing: '0.1rem', fontWeight: 'bold', color: 'text.tertiary' }}>
                    Additional Information
                </Typography>
            </Divider>
            <Grid container spacing={1.5}>
                {fields.map(field => (
                    <Grid xs={12} sm={6} key={field.key}>
                        <FormControl size="sm">
                            <FormLabel sx={{ fontSize: 'xs' }}>{field.label}</FormLabel>
                            {field.type === 'select' ? (
                                <Select 
                                    size="sm"
                                    value={metadata[field.key] || ''} 
                                    onChange={(e, val) => handleFieldChange(field.key, val)}
                                    placeholder={`Select ${field.label}...`}
                                >
                                    {field.options.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                                </Select>
                            ) : (
                                <Input 
                                    size="sm"
                                    type={field.type} 
                                    value={metadata[field.key] || ''} 
                                    onChange={e => handleFieldChange(field.key, e.target.value)} 
                                    placeholder={field.label}
                                />
                            )}
                        </FormControl>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}