const express = require('express');
const tourController = require('../controllers/tourController');
const validate = require('../middleware/validate');
const {
  tourIdParamsSchema,
  tourQuerySchema,
  createTourBodySchema,
  patchTourBodySchema,
  emptyStrict,
} = require('../validators/tourValidation');

/**
 * Tour routes with request validation.
 */
const router = express.Router();

router
  .route('/top-5')
  .get(
    validate({ query: emptyStrict }),
    tourController.aliasTopTours,
    tourController.getAllTours,
  );

router.route('/stats').get(tourController.getTourStats);

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
