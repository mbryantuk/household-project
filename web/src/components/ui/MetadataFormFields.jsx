import React from 'react';
import { FormControl, FormLabel, Input, Select, Option, Sheet, Typography, Grid } from '@mui/joy';
import { METADATA_SCHEMAS } from '../../utils/financeSchemas';

export default function MetadataFormFields({ categoryId, metadata = {}, onChange }) {
    const fields = METADATA_SCHEMAS[categoryId] || [];

    if (fields.length === 0) return null;

    const handleFieldChange = (key, value) => {
        onChange({
            ...metadata,
            [key]: value
        });
    };

    return (
        <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: 'md', my: 2 }}>
            <Typography level="title-sm" mb={1} textTransform="uppercase" letterSpacing="1px" fontSize="xs">
                Additional Details
            </Typography>
            <Grid container spacing={2}>
                {fields.map(field => (
                    <Grid xs={12} sm={6} key={field.key}>
                        <FormControl>
                            <FormLabel>{field.label}</FormLabel>
                            {field.type === 'select' ? (
                                <Select 
                                    value={metadata[field.key] || ''} 
                                    onChange={(e, val) => handleFieldChange(field.key, val)}
                                >
                                    {field.options.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                                </Select>
                            ) : (
                                <Input 
                                    type={field.type} 
                                    value={metadata[field.key] || ''} 
                                    onChange={e => handleFieldChange(field.key, e.target.value)} 
                                />
                            )}
                        </FormControl>
                    </Grid>
                ))}
            </Grid>
        </Sheet>
    );
}
