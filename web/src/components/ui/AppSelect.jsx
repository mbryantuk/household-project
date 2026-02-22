import React from 'react';
import { FormControl, FormLabel, Select, Option } from '@mui/joy';

/**
 * Shared Select Component (AppSelect)
 * Enforces consistent styling and future-proofs for "Searchable" upgrades.
 *
 * @param {string} label - Label for the FormControl
 * @param {string} name - Name attribute for the input
 * @param {any} value - Controlled value
 * @param {function} onChange - Change handler (value) => void
 * @param {Array<{value: string, label: string}>} options - Dropdown options
 * @param {string} placeholder - Placeholder text
 */
export default function AppSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  ...props
}) {
  return (
    <FormControl>
      {label && <FormLabel>{label}</FormLabel>}
      <Select
        name={name}
        value={value}
        onChange={(e, newValue) => onChange && onChange(newValue)}
        placeholder={placeholder}
        {...props}
      >
        {options.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>
    </FormControl>
  );
}
