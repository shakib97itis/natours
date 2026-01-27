const Tour = require('../models/tourModel');

/**
 * Tour controller handlers.
 * Assumes `req.validated` is populated by validation middleware.
 */

/**
 * List tours using validated query params for filters, sorting, and field selection.
 */

exports.aliasTopTours = (req, res, next) => {
  req.validated.query.limit = 5;
  req.validated.query.sort = ['-ratingsAverage', 'price'];
  req.validated.query.fields = 'name price ratingsAverage summary difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    const queryObj = { ...req.validated.query };

    // Remove unneeded query params
    ['page', 'sort', 'limit', 'fields'].forEach((el) => delete queryObj[el]);

    // Advanced filtering
    const opMap = { gte: '$gte', gt: '$gt', lte: '$lte', lt: '$lt' };
    const convertRange = (field) => {
      const value = queryObj[field];
      if (!value || typeof value !== 'object') return;
      const converted = {};
      Object.entries(value).forEach(([key, val]) => {
        const mapped = opMap[key];
        if (mapped && val !== undefined) converted[mapped] = val;
      });
      queryObj[field] = converted;
    };
    convertRange('duration');
    convertRange('price');

    // Sorting
    const queryStr = Tour.find(queryObj);
    const defaultSortFields = ['price', '-ratingsAverage'];
    const sortFields = req.validated.query.sort ?? defaultSortFields;
    const normalizedSortFields = Array.isArray(sortFields)
      ? sortFields
      : [sortFields];
    queryStr.sort(normalizedSortFields.join(' '));

    // field limiting
    const selectFields = req.validated.query.fields;
    if (selectFields) {
      queryStr.select(selectFields);
    }

    // Pagination
    const { page, limit } = req.validated.query;
    const skip = (page - 1) * limit;
    queryStr.skip(skip).limit(limit);

    if (page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error('This page does not exist');
    }
    // Query
    const tours = await queryStr;

    res.status(200).json({
      status: 'success',
      results: tours.length,
      page,
      data: {
        tours,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message,
    });
  }
};

/**
 * Fetch a single tour by validated id.
 */
exports.getTour = async (req, res) => {
  const { id } = req.validated.params;

  try {
    const tour = await Tour.findById(id);
    if (!tour) {
      throw new Error('Tour not found');
    }

    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message,
    });
  }
};

/**
 * Create a tour from a validated request body.
 */
exports.createTour = async (req, res) => {
  try {
    const { body } = req.validated;
    const newTour = await Tour.create(body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

/**
 * Return the same validation error shape as the validate middleware.
 */
function validation400(res, inPart, field, message) {
  return res.status(400).json({
    message: 'Validation failed',
    errors: [
      {
        in: inPart,
        errors: [{ path: field, message }],
      },
    ],
  });
}

/**
 * Partially update a tour with DB-aware validation and cross-field rules.
 */
exports.updateTour = async (req, res) => {
  try {
    const { id } = req.validated.params;
    const patch = req.validated.body;

    // Load existing doc (PATCH needs DB-aware validation for cross-field rules)
    const existing = await Tour.findById(id);
    if (!existing) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tour not found',
      });
    }

    // Merge existing + patch to validate business rules correctly
    const merged = { ...existing.toObject(), ...patch };

    // Cross-field business rule: discount cannot exceed price
    if (
      merged.price != null &&
      merged.priceDiscount != null &&
      merged.priceDiscount > merged.price
    ) {
      return validation400(
        res,
        'body',
        'priceDiscount',
        'priceDiscount cannot be greater than price',
      );
    }

    // Apply patch + save (runs mongoose validators reliably)
    Object.assign(existing, patch);
    const updated = await existing.save();

    res.status(200).json({
      status: 'success',
      tour: updated,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

/**
 * Delete a tour by validated id.
 */
exports.deleteTour = async (req, res) => {
  try {
    const { id } = req.validated.params;

    const deleted = await Tour.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tour not found',
      });
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Something went wrong',
    });
  }
};

exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      { $match: { ratingsAverage: { $gte: 4.5 } } },
      {
        $group: {
          _id: '$difficulty',
          numTours: { $sum: 1 },
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: {
          avgPrice: 1,
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const { year } = req.validated.params;
    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        $addFields: {
          month: '$_id',
        },
      },
      {
        $sort: {
          month: 1,
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
      {
        $limit: 12,
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
