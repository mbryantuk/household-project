import { z } from 'zod';

// --- SHARED ENUMS ---
export const UserRoleSchema = z.enum(['admin', 'member', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const FrequencySchema = z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'one_off']);
export type Frequency = z.infer<typeof FrequencySchema>;

// --- CORE ENTITIES ---
export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string().optional(),
  avatar: z.string().optional(),
  system_role: z.string().default('user'),
  created_at: z.string()
});
export type User = z.infer<typeof UserSchema>;

export const HouseholdSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  avatar: z.string().optional(),
  currency: z.string().default('GBP'),
  is_test: z.number().default(0)
});
export type Household = z.infer<typeof HouseholdSchema>;

export const MemberSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  type: z.enum(['adult', 'child', 'pet']),
  emoji: z.string().optional(),
  dob: z.string().optional(), // PII - Encrypted at rest
});
export type Member = z.infer<typeof MemberSchema>;

// --- FINANCE ---
export const RecurringCostSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  frequency: FrequencySchema,
  day_of_month: z.number().min(1).max(31).optional(),
  category_id: z.string(),
  is_active: z.number().default(1)
});
export type RecurringCost = z.infer<typeof RecurringCostSchema>;

// --- API RESPONSE WRAPPERS ---
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  });
