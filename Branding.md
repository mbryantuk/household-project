# BRANDING GUIDELINES: TOTEM Household SaaS

## 1. Typography Standards

All typography MUST use MUI Joy UI `<Typography />` components with defined `level` props.

| Level | Usage | Weight | Size (Fixed) |
| :--- | :--- | :--- | :--- |
| `h1` | Registration/Login Page Titles | `xl` (800) | `2.25rem` (36px) |
| `h2` | Page Headers / Tabbed View Headers | `lg` (700) | `1.5rem` (24px) |
| `h3` | Section Headers (Inside Cards/Modals) | `md` (600) | `1.25rem` (20px) |
| `h4` | Sub-section Labels | `md` (600) | `1.125rem` (18px) |
| `title-lg` | Primary List Item / Modal Titles | `lg` (700) | `1.125rem` (18px) |
| `title-md` | Secondary List Item Titles | `md` (600) | `1rem` (16px) |
| `body-md` | Standard Body Text (Default) | `normal` (400) | `1rem` (16px) |
| `body-sm` | Captions / Descriptions | `normal` (400) | `0.875rem` (14px) |
| `body-xs` | Overlines / Meta Data | `normal` (400) | `0.75rem` (12px) |

## 2. Header Structure (NON-NEGOTIABLE)

Every view and every major tabbed section MUST follow this exact structure:

```jsx
<Box sx={{ mb: 4 }}>
  <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{Title}</Typography>
  <Typography level="body-md" color="neutral">{Description}</Typography>
</Box>
```

## 3. Theming Tokens

- **Colors:** Use `var(--joy-palette-...)`.
- **Spacing:** Use MUI Joy spacing scale.
- **Rounding:** Standard border radius is `md` (8px).
