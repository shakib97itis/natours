const Tour = require('../models/tourModel');

exports.getAllTours = async (req, res) => {
  try {
    const tours = await Tour.find();
    res.status(200).json({
      status: 'success',
      results: tours.length,
      requestedAt: req.requestTime,
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

exports.getTour = async (req, res) => {
  const { id } = req.validated.params;

  try {
    const tour = await Tour.findById(id);
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: 'Something went wrong',
    });
  }
};

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

// helper to return same error shape as your validate middleware
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

exports.updateTour = async (req, res) => {
  try {
    const { id } = req.validated.params;
    const patch = req.validated.body;

    // Load existing doc (PATCH needs DB-aware validation for cross-field rules)
    const existing = await Tour.findById(id);
    if (!existing) {
      return res.status(400).json({
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

exports.deleteTour = async (req, res) => {
  try {
    const { id } = req.validated.params;
    await Tour.findByIdAndDelete(id);
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
