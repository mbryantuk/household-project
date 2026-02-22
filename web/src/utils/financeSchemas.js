export const METADATA_SCHEMAS = {
  insurance: [
    { key: 'policy_number', label: 'Policy Number', type: 'text' },
    { key: 'provider_contact', label: 'Provider Phone', type: 'tel' },
    {
      key: 'policy_type',
      label: 'Policy Type',
      type: 'select',
      options: ['Contents', 'Building', 'Combined', 'Life', 'Pet', 'Vehicle', 'Travel'],
    },
    { key: 'renewal_date', label: 'Renewal Date', type: 'date' },
  ],
  utility: [
    { key: 'account_number', label: 'Account Number', type: 'text' },
    {
      key: 'meter_type',
      label: 'Meter Type',
      type: 'select',
      options: ['Standard', 'Smart', 'Prepaid', 'Economy 7'],
    },
    { key: 'provider_website', label: 'Provider Website', type: 'url' },
  ],
  household_bill: [
    { key: 'account_number', label: 'Account Number', type: 'text' },
    { key: 'contract_end_date', label: 'Contract End Date', type: 'date' },
  ],
  subscription: [
    { key: 'login_email', label: 'Login Email', type: 'email' },
    { key: 'plan_tier', label: 'Plan Tier', type: 'text' },
  ],
  vehicle_tax: [{ key: 'registration', label: 'Registration Plate', type: 'text' }],
  vehicle_service: [
    { key: 'garage_name', label: 'Garage Name', type: 'text' },
    {
      key: 'service_level',
      label: 'Service Level',
      type: 'select',
      options: ['Interim', 'Full', 'Major'],
    },
  ],
  warranty: [
    { key: 'provider_name', label: 'Provider Name', type: 'text' },
    { key: 'reference_number', label: 'Reference Number', type: 'text' },
    { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
  ],
  vehicle_mot: [
    { key: 'test_centre', label: 'Test Centre', type: 'text' },
    { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
  ],
  vehicle_fuel: [
    {
      key: 'fuel_type',
      label: 'Fuel Type',
      type: 'select',
      options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'],
    },
    { key: 'loyalty_card', label: 'Loyalty Card', type: 'text' },
  ],
  other: [{ key: 'comments', label: 'Comments', type: 'text' }],
};

/**
 * Merges the global schema with household-specific overrides/additions.
 * @param {Object} householdSchema - The JSON parsed metadata_schema from the household table.
 * @returns {Object} A fully merged schema object.
 */
export const getMergedSchema = (householdSchema) => {
  if (!householdSchema) return METADATA_SCHEMAS;

  const merged = { ...METADATA_SCHEMAS };

  Object.keys(householdSchema).forEach((category) => {
    if (!merged[category]) {
      merged[category] = householdSchema[category];
    } else {
      // Merge fields - household fields with same key override globals
      const fieldMap = new Map();
      merged[category].forEach((f) => fieldMap.set(f.key, f));
      householdSchema[category].forEach((f) => fieldMap.set(f.key, f));
      merged[category] = Array.from(fieldMap.values());
    }
  });

  return merged;
};
