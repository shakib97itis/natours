const mongoose = require('mongoose');
const { z } = require('zod');

// Optional: enums are better than free strings
const difficultyEnum = z.enum(['easy', 'medium', 'difficult']);

// helper to allow date strings -> Date
const dateFromString = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : d;
  }
  return val;
}, z.date());

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
    difficulty: z.enum(['easy', 'medium', 'difficult']).optional(),

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

module.exports = {
  tourIdParamsSchema,
  createTourBodySchema,
  patchTourBodySchema,
};
