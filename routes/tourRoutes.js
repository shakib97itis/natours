const express = require('express');
const tourController = require('../controllers/tourController');
const validate = require('../middleware/validate');
const {
  tourIdParamsSchema,
  tourQuerySchema,
  createTourBodySchema,
  patchTourBodySchema,
} = require('../validators/tourValidation');

/**
 * Tour routes with request validation.
 */
const router = express.Router();

router
  .route('/')
  .get(validate({ query: tourQuerySchema }), tourController.getAllTours)
  .post(validate({ body: createTourBodySchema }), tourController.createTour);

router
  .route('/:id')
  .get(validate({ params: tourIdParamsSchema }), tourController.getTour)
  .patch(
    validate({ params: tourIdParamsSchema, body: patchTourBodySchema }),
    tourController.updateTour,
  )
  .delete(validate({ params: tourIdParamsSchema }), tourController.deleteTour);

module.exports = router;
