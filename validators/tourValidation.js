const mongoose = require('mongoose');
const { z } = require('zod');

// Enums keep validation consistent across request types.
const difficultyEnum = z.enum(['easy', 'medium', 'difficult']);

// Allow date strings/numbers to become Date instances.
const dateFromString = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : d;
  }
  return val;
}, z.date());

const coerceOptionalNumber = (schema) =>
  z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (typeof val === 'string' || typeof val === 'number') return Number(val);
    return val;
  }, schema.optional());

const createTourBodySchema = z
  .object({
    name: z.string().min(1, 'A tour must have a name').trim(),
    duration: z.number().positive('A tour must have a duration'),
    maxGroupSize: z.number().int().positive('A tour must have a group size'),
    difficulty: difficultyEnum,
    ratingsAverage: z.number().min(1).max(5).optional().default(4.5),
    ratingsQuantity: z.number().int().min(0).optional().default(0),
    price: z.number().positive('A tour must have a price'),
    priceDiscount: z.number().min(0).optional().default(0),
    summary: z.string().min(1, 'A tour must have a summary').trim(),
    description: z.string().trim().optional(),
    imageCover: z.string().min(1, 'A tour must have a cover image'),
    images: z.array(z.string()).optional().default([]),
    createdAt: dateFromString.optional(), // you can also omit this entirely
    startDates: z.array(dateFromString).optional().default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Match a common Mongoose rule: discount must be < price
    if (data.priceDiscount != null && data.priceDiscount >= data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceDiscount'],
        message: 'Discount price should be less than regular price',
      });
    }
  });

const tourIdParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .refine(mongoose.Types.ObjectId.isValid, { message: 'Invalid tourId' }),
});

const patchTourBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    duration: z.coerce.number().int().positive().optional(),
    maxGroupSize: z.coerce.number().int().positive().optional(),
    difficulty: difficultyEnum.optional(),

    price: z.coerce.number().nonnegative().optional(),
    priceDiscount: z.coerce.number().nonnegative().optional(),

    summary: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),

    imageCover: z.string().min(1).optional(),
    images: z.array(z.string().min(1)).optional(),

    // If you allow updating startDates, accept ISO strings (recommended for APIs)
    startDates: z.array(z.coerce.date()).optional(),
  })
  .strict(); // <- rejects unknown keys (prevents updating _id, __v, createdAt, etc.)

const optionalPositiveInt = coerceOptionalNumber(z.number().int().positive());
const optionalPositiveNumber = coerceOptionalNumber(z.number().positive());

function buildRangeSchema(baseSchema, label) {
  return z
    .object({
      gte: baseSchema,
      gt: baseSchema,
      lte: baseSchema,
      lt: baseSchema,
    })
    .strict()
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
      message: `${label} range must include at least one operator`,
    })
    .superRefine((data, ctx) => {
      const hasLower = data.gte !== undefined || data.gt !== undefined;
      const hasUpper = data.lte !== undefined || data.lt !== undefined;
      if (!hasLower || !hasUpper) return;

      const lower =
        data.gt !== undefined
          ? { value: data.gt, inclusive: false }
          : { value: data.gte, inclusive: true };
      const upper =
        data.lt !== undefined
          ? { value: data.lt, inclusive: false }
          : { value: data.lte, inclusive: true };

      const allowEqual = lower.inclusive && upper.inclusive;
      const invalid = allowEqual
        ? lower.value > upper.value
        : lower.value >= upper.value;

      if (invalid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} range is invalid (lower bound must be less than upper bound)`,
        });
      }
    });
}

const durationRangeSchema = buildRangeSchema(optionalPositiveInt, 'Duration');
const priceRangeSchema = buildRangeSchema(optionalPositiveNumber, 'Price');

const allowedSortFields = ['price', 'ratingsAverage', 'duration'];
const allowedSortDirections = ['asc', 'desc'];
const sortSchema = z
  .string({
    invalid_type_error: 'Sort must be a single query parameter',
    required_error: 'Sort must be a single query parameter',
  })
  .trim()
  .min(1, 'Sort must be a non-empty string')
  .transform((val) => val.split(',').map((part) => part.trim()))
  .superRefine((fields, ctx) => {
    const seenFields = new Set();
    fields.forEach((field, index) => {
      if (!field) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'Sort must not contain empty fields',
        });
        return;
      }

      const parts = field.split(':');
      if (parts.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'Sort must use field:direction format',
        });
        return;
      }

      const [name, direction] = parts;
      if (!allowedSortFields.includes(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Sort fields must be one of: ${allowedSortFields.join(', ')}`,
        });
        return;
      }

      if (seenFields.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Sort field "${name}" is duplicated`,
        });
        return;
      }
      seenFields.add(name);

      if (!allowedSortDirections.includes(direction.toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Sort direction must be one of: ${allowedSortDirections.join(
            ', ',
          )}`,
        });
      }
    });
  })
  .transform((fields) =>
    fields.map((field) => {
      const [name, direction] = field.split(':');
      const normalized = (direction || '').toLowerCase();
      return normalized === 'desc' ? `-${name}` : name;
    }),
  );

const tourQuerySchema = z
  .object({
    page: optionalPositiveInt.default(1),
    sort: sortSchema.optional(),
    limit: optionalPositiveInt.default(100),
    difficulty: difficultyEnum.optional(),
    duration: z.union([optionalPositiveInt, durationRangeSchema]).optional(),
    price: z.union([optionalPositiveNumber, priceRangeSchema]).optional(),
  })
  .strict();

module.exports = {
  tourIdParamsSchema,
  tourQuerySchema,
  createTourBodySchema,
  patchTourBodySchema,
};
