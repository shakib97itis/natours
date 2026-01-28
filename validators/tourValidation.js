const mongoose = require('mongoose');
const { z } = require('zod');

/**
 * Zod schemas for validating tour params, query strings, and request bodies.
 */

const emptyStrict = z.object({}).strict();

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

/**
 * Coerce optional numeric values from strings while preserving undefined.
 */
const coerceOptionalNumber = (schema) =>
  z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (typeof val === 'string' || typeof val === 'number') return Number(val);
    return val;
  }, schema.optional());

const withPriceDiscountValidation = (schema) =>
  schema.superRefine((data, ctx) => {
    // Match a common Mongoose rule: discount must be < price
    if (data.priceDiscount != null && data.priceDiscount > data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceDiscount'],
        message: 'Discount price cannot be greater than regular price',
      });
    }
  });

const requiredNonEmptyString = (message) => z.string().min(1, message).trim();
const optionalBoundedString = (min, max) =>
  z.string().trim().min(min).max(max).optional();
// const optionalNonEmptyString = () => z.string().trim().min(1).optional();

const startDatesSchema = z.array(dateFromString);
const objectIdSchema = z
  .string()
  .trim()
  .refine(mongoose.Types.ObjectId.isValid, { message: 'Invalid tourId' });

const createTourBodySchema = withPriceDiscountValidation(
  z
    .object({
      name: requiredNonEmptyString('A tour must have a name'),
      duration: z.coerce.number().positive('A tour must have a duration'),
      maxGroupSize: z.coerce
        .number()
        .int()
        .positive('A tour must have a group size'),
      difficulty: difficultyEnum,
      ratingsAverage: z.coerce.number().min(0).max(5).optional().default(4.5),
      ratingsQuantity: z.coerce.number().int().min(0).optional().default(0),
      price: z.coerce.number().nonnegative('A tour must have a price'),
      priceDiscount: z.coerce.number().nonnegative().optional().default(0),
      summary: requiredNonEmptyString('A tour must have a summary'),
      description: z.string().trim().optional(),
      imageCover: z.string().min(1, 'A tour must have a cover image'),
      images: z.array(z.string()).optional().default([]),
      createdAt: dateFromString.optional(), // you can also omit this entirely
      startDates: startDatesSchema.optional().default([]),
      secretTour: z.boolean().optional().default(false),
    })
    .strict(),
);

const tourIdParamsSchema = z.object({
  id: objectIdSchema,
});

const monthlyPlanParamsSchema = z
  .object({
    year: z.coerce
      .number()
      .int()
      .min(1000, 'Year must be a valid 4-digit year')
      .max(9999, 'Year must be a valid 4-digit year'),
  })
  .strict();

const patchTourBodySchema = withPriceDiscountValidation(
  z
    .object({
      name: optionalBoundedString(1, 100),
      duration: z.coerce.number().int().positive().optional(),
      maxGroupSize: z.coerce.number().int().positive().optional(),
      difficulty: difficultyEnum.optional(),

      price: z.coerce.number().nonnegative().optional(),
      priceDiscount: z.coerce.number().nonnegative().optional(),

      summary: optionalBoundedString(1, 500),
      description: optionalBoundedString(1, 5000),

      imageCover: z.httpUrl().trim(),
      images: z.array(z.httpUrl().trim()).optional(),

      // If you allow updating startDates, accept ISO strings (recommended for APIs)
      startDates: startDatesSchema.optional(),
    })
    .strict(), // <- rejects unknown keys (prevents updating _id, __v, createdAt, etc.)
);

const optionalPositiveInt = coerceOptionalNumber(z.number().int().positive());
const optionalPositiveNumber = coerceOptionalNumber(z.number().positive());

/**
 * Build a range schema with optional bounds and validation between them.
 */
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
const commaListSchema = (label) =>
  z
    .string({
      invalid_type_error: `${label} must be a single query parameter`,
      required_error: `${label} must be a single query parameter`,
    })
    .trim()
    .min(1, `${label} must be a non-empty string`)
    .transform((val) => val.split(',').map((part) => part.trim()));

const sortSchema = commaListSchema('Sort')
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

const allowedSelectFields = [
  'name',
  'duration',
  'maxGroupSize',
  'difficulty',
  'ratingsAverage',
  'ratingsQuantity',
  'price',
  'priceDiscount',
  'summary',
  'description',
  'imageCover',
  'images',
  'createdAt',
  'startDates',
];

const fieldsSchema = commaListSchema('Fields')
  .superRefine((fields, ctx) => {
    const seenFields = new Set();
    let hasInclude = false;
    let hasExclude = false;

    fields.forEach((field, index) => {
      if (!field) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'Fields must not contain empty values',
        });
        return;
      }

      const isExclude = field.startsWith('-');
      const rawName = isExclude ? field.slice(1) : field;
      if (!rawName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'Fields must not contain empty values',
        });
        return;
      }

      if (rawName === '_id' || rawName === '__v') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Field "${rawName}" cannot be requested`,
        });
        return;
      }

      if (!allowedSelectFields.includes(rawName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Fields must be one of: ${allowedSelectFields.join(', ')}`,
        });
        return;
      }

      if (seenFields.has(rawName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `Field "${rawName}" is duplicated`,
        });
        return;
      }
      seenFields.add(rawName);

      if (isExclude) {
        hasExclude = true;
      } else if (!isExclude) {
        hasInclude = true;
      }
    });

    if (hasInclude && hasExclude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fields cannot mix include and exclude values',
      });
    }
  })
  .transform((fields) => fields.join(' '));

const tourQuerySchema = z
  .object({
    page: optionalPositiveInt.default(1),
    limit: optionalPositiveInt.default(10),
    sort: sortSchema.optional(),
    fields: fieldsSchema.optional(),
    difficulty: difficultyEnum.optional(),
    duration: z.union([optionalPositiveInt, durationRangeSchema]).optional(),
    price: z.union([optionalPositiveNumber, priceRangeSchema]).optional(),
  })
  .strict();

module.exports = {
  tourIdParamsSchema,
  monthlyPlanParamsSchema,
  tourQuerySchema,
  createTourBodySchema,
  patchTourBodySchema,
  emptyStrict,
};
