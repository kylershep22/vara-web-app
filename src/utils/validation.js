// src/utils/validation.js
import * as yup from 'yup';

// ========== AUTHENTICATION SCHEMAS ==========

/**
 * Email validation schema
 */
export const emailSchema = yup
  .string()
  .email('Please enter a valid email address')
  .required('Email is required')
  .trim()
  .lowercase();

/**
 * Password validation schema
 */
export const passwordSchema = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )
  .required('Password is required');

/**
 * Login schema
 */
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Password is required') // Don't validate format on login
});

/**
 * Registration schema
 */
export const registrationSchema = yup.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password')
});

// ========== PROFILE SCHEMAS ==========

/**
 * Username validation
 */
export const usernameSchema = yup
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .matches(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .required('Username is required')
  .trim();

/**
 * Display name validation
 */
export const displayNameSchema = yup
  .string()
  .min(1, 'Display name must be at least 1 character')
  .max(50, 'Display name must be less than 50 characters')
  .required('Display name is required')
  .trim();

/**
 * Bio validation
 */
export const bioSchema = yup
  .string()
  .max(500, 'Bio must be less than 500 characters')
  .nullable();

/**
 * Profile update schema
 */
export const profileSchema = yup.object({
  displayName: displayNameSchema,
  username: usernameSchema.nullable(),
  bio: bioSchema,
  privacy: yup
    .string()
    .oneOf(['public', 'connections', 'private'], 'Invalid privacy setting')
    .default('public')
});

// ========== GOAL SCHEMAS ==========

/**
 * Goal validation schema
 */
export const goalSchema = yup.object({
  title: yup
    .string()
    .min(1, 'Goal title is required')
    .max(200, 'Goal title must be less than 200 characters')
    .required('Goal title is required')
    .trim(),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable(),
  category: yup
    .string()
    .oneOf(['health', 'career', 'relationships', 'personal', 'financial', 'other'], 'Invalid category')
    .required('Category is required'),
  targetDate: yup
    .date()
    .nullable()
    .min(new Date(), 'Target date must be in the future'),
  status: yup
    .string()
    .oneOf(['active', 'completed', 'paused', 'abandoned'], 'Invalid status')
    .default('active')
});

// ========== HABIT SCHEMAS ==========

/**
 * Habit validation schema
 */
export const habitSchema = yup.object({
  title: yup
    .string()
    .min(1, 'Habit title is required')
    .max(100, 'Habit title must be less than 100 characters')
    .required('Habit title is required')
    .trim(),
  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  frequency: yup
    .string()
    .oneOf(['daily', 'weekly', 'custom'], 'Invalid frequency')
    .default('daily'),
  streak: yup
    .number()
    .integer()
    .min(0, 'Streak cannot be negative')
    .default(0),
  color: yup
    .string()
    .matches(/^#[0-9A-F]{6}$/i, 'Invalid color format')
    .nullable()
});

// ========== TASK SCHEMAS ==========

/**
 * Task validation schema
 */
export const taskSchema = yup.object({
  title: yup
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be less than 200 characters')
    .required('Task title is required')
    .trim(),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable(),
  priority: yup
    .string()
    .oneOf(['low', 'medium', 'high'], 'Invalid priority')
    .default('medium'),
  status: yup
    .string()
    .oneOf(['todo', 'in-progress', 'completed'], 'Invalid status')
    .default('todo'),
  dueDate: yup
    .date()
    .nullable()
});

// ========== JOURNAL SCHEMAS ==========

/**
 * Journal entry validation schema
 */
export const journalEntrySchema = yup.object({
  title: yup
    .string()
    .max(200, 'Title must be less than 200 characters')
    .nullable()
    .trim(),
  content: yup
    .string()
    .min(1, 'Journal entry cannot be empty')
    .max(50000, 'Journal entry is too long (max 50,000 characters)')
    .required('Content is required'),
  mood: yup
    .string()
    .oneOf(['great', 'good', 'okay', 'bad', 'terrible'], 'Invalid mood')
    .nullable(),
  tags: yup
    .array()
    .of(yup.string().max(30, 'Tag must be less than 30 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .nullable()
});

// ========== COMMUNITY SCHEMAS ==========

/**
 * Group validation schema
 */
export const groupSchema = yup.object({
  name: yup
    .string()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters')
    .required('Group name is required')
    .trim(),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable(),
  type: yup
    .string()
    .oneOf(['public', 'private'], 'Invalid group type')
    .default('public'),
  category: yup
    .string()
    .oneOf(['support', 'fitness', 'meditation', 'general', 'other'], 'Invalid category')
    .nullable()
});

/**
 * Post validation schema (group forum posts)
 */
export const postSchema = yup.object({
  title: yup
    .string()
    .min(1, 'Post title is required')
    .max(200, 'Post title must be less than 200 characters')
    .required('Post title is required')
    .trim(),
  content: yup
    .string()
    .min(1, 'Post content is required')
    .max(10000, 'Post content is too long (max 10,000 characters)')
    .required('Content is required'),
  groupId: yup
    .string()
    .required('Group ID is required')
});

/**
 * Community post validation schema (public feed posts)
 * Simpler than group posts - no title or groupId required
 */
export const communityPostSchema = yup.object({
  content: yup
    .string()
    .min(1, 'Post content is required')
    .max(10000, 'Post content is too long (max 10,000 characters)')
    .required('Content is required'),
  groupId: yup
    .string()
    .nullable() // Optional - can be null for public posts
});

// ========== MESSAGE SCHEMAS ==========

/**
 * Direct message validation schema
 */
export const messageSchema = yup.object({
  content: yup
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters')
    .required('Message content is required')
    .trim(),
  receiverId: yup
    .string()
    .required('Receiver ID is required')
});

// ========== SEARCH SCHEMAS ==========

/**
 * Search query validation
 */
export const searchSchema = yup.object({
  query: yup
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must be less than 100 characters')
    .required('Search query is required')
    .trim()
});

// ========== FILE UPLOAD SCHEMAS ==========

/**
 * Avatar upload validation (client-side)
 */
export const avatarUploadSchema = yup.object({
  file: yup
    .mixed()
    .required('File is required')
    .test('fileSize', 'File size must be less than 5MB', (value) => {
      return value && value.size <= 5 * 1024 * 1024;
    })
    .test('fileType', 'Only image files are allowed', (value) => {
      return value && ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(value.type);
    })
});

// ========== HELPER FUNCTIONS ==========

/**
 * Validates data against a schema and returns errors
 *
 * @param {Object} data - Data to validate
 * @param {yup.Schema} schema - Yup schema to validate against
 * @returns {Promise<{ valid: boolean, errors: Object }>}
 */
export const validateData = async (data, schema) => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { valid: true, errors: {} };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors = {};
      err.inner.forEach((error) => {
        if (error.path) {
          errors[error.path] = error.message;
        }
      });
      return { valid: false, errors };
    }
    throw err;
  }
};

/**
 * Validates a single field against a schema
 *
 * @param {string} fieldName - Name of the field to validate
 * @param {*} value - Value to validate
 * @param {yup.Schema} schema - Yup schema containing the field
 * @returns {Promise<{ valid: boolean, error: string|null }>}
 */
export const validateField = async (fieldName, value, schema) => {
  try {
    await schema.validateAt(fieldName, { [fieldName]: value });
    return { valid: true, error: null };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return { valid: false, error: err.message };
    }
    throw err;
  }
};

/**
 * Validates data synchronously (throws on error)
 *
 * @param {Object} data - Data to validate
 * @param {yup.Schema} schema - Yup schema to validate against
 * @returns {Object} Validated and transformed data
 * @throws {yup.ValidationError}
 */
export const validateDataSync = (data, schema) => {
  return schema.validateSync(data, { abortEarly: false });
};

/**
 * Strips unknown fields from data based on schema
 *
 * @param {Object} data - Data to strip
 * @param {yup.Schema} schema - Yup schema defining allowed fields
 * @returns {Object} Data with only known fields
 */
export const stripUnknown = (data, schema) => {
  try {
    return schema.cast(data, { stripUnknown: true });
  } catch (err) {
    return data;
  }
};
