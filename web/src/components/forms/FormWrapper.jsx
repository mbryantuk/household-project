import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Button, Alert } from '@mui/joy';

/**
 * Base Form Wrapper using React Hook Form & Zod (Item 117).
 * Centralizes form validation, error handling, and state management.
 */
export function FormWrapper({
  schema,
  defaultValues,
  onSubmit,
  children,
  submitLabel = 'Save',
  isLoading = false,
  error = null,
}) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

  const handleFormSubmit = async (data) => {
    try {
      await onSubmit(data, reset);
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Stack spacing={2}>
        {error && <Alert color="danger">{error}</Alert>}

        {/* Pass control to children via cloneElement or render prop if needed, 
            but standard use case is to wrap inputs in Controller components where used. */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.props.name) {
            return (
              <Controller
                name={child.props.name}
                control={control}
                render={({ field }) =>
                  React.cloneElement(child, {
                    ...field,
                    error: !!errors[child.props.name],
                    helperText: errors[child.props.name]?.message,
                  })
                }
              />
            );
          }
          return child;
        })}

        <Button
          type="submit"
          loading={isSubmitting || isLoading}
          disabled={!isValid && false} // Optional: strict disable if invalid
        >
          {submitLabel}
        </Button>
      </Stack>
    </form>
  );
}
