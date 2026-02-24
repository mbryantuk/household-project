import { z } from 'zod';

/**
 * UUIDv7 Generator (Cross-Platform)
 * Ensures time-ordered, sequential, and unique identifiers.
 * Uses available crypto implementation (Node.js or Browser).
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);

  // Get random bytes
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else if (
    typeof (global as unknown as { crypto?: { randomFillSync?: (b: Uint8Array) => void } }).crypto
      ?.randomFillSync === 'function'
  ) {
    (
      global as unknown as { crypto: { randomFillSync: (b: Uint8Array) => void } }
    ).crypto.randomFillSync(bytes);
  } else {
    // Fallback for environments without strong crypto (rare in modern Node/Browsers)
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // 1. Timestamp: 48 bits (Big-Endian)
  const timestampHex = now.toString(16).padStart(12, '0');
  for (let i = 0; i < 6; i++) {
    bytes[i] = parseInt(timestampHex.slice(i * 2, i * 2 + 2), 16);
  }

  // 2. Version: 4 bits (set to 7)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // 3. Variant: 2 bits (set to 2 - RFC 4122)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Format as standard UUID string
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// --- SHARED ENUMS ---
export const UserRoleSchema = z.enum(['admin', 'member', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const FrequencySchema = z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'one_off']);
export type Frequency = z.infer<typeof FrequencySchema>;

const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.com',
  'yopmail.com',
  'trashmail.com',
];

export const StrictEmailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim()
  .refine(
    (email) => {
      const domain = email.split('@')[1];
      return !DISPOSABLE_EMAIL_DOMAINS.includes(domain);
    },
    { message: 'Disposable email addresses are not permitted' }
  );

// --- CORE ENTITIES ---
export const UserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  email: StrictEmailSchema,
  first_name: z.string(),
  last_name: z.string().optional(),
  avatar: z.string().optional(),
  system_role: z.string().default('user'),
  created_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const HouseholdSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().min(1),
  avatar: z.string().optional(),
  currency: z.string().default('GBP'),
  is_test: z.number().default(0),
});
export type Household = z.infer<typeof HouseholdSchema>;

export const MemberSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().min(1),
  type: z.enum(['adult', 'child', 'pet']),
  emoji: z.string().optional(),
  dob: z.string().optional(), // PII - Encrypted at rest
});
export type Member = z.infer<typeof MemberSchema>;

// --- FINANCE ---
export const RecurringCostSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  frequency: FrequencySchema,
  day_of_month: z.number().min(1).max(31).optional(),
  category_id: z.string(),
  is_active: z.number().default(1),
});
export type RecurringCost = z.infer<typeof RecurringCostSchema>;

// --- API RESPONSE WRAPPERS ---
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export * from './errors';
