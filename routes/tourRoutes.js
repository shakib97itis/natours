const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const validate = require('../middleware/validate');
const {
  tourIdParamsSchema,
  tourQuerySchema,
  createTourBodySchema,
  patchTourBodySchema,
  emptyStrict,
  monthlyPlanParamsSchema,
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

router
  .route('/monthly-plan/:year')
  .get(
    validate({ params: monthlyPlanParamsSchema }),
    tourController.getMonthlyPlan,
  );

router.route('/stats').get(tourController.getTourStats);

router
  .route('/')
  .get(
    validate({ query: tourQuerySchema }),
    authController.protect,
    tourController.getAllTours,
  )
  .post(validate({ body: createTourBodySchema }), tourController.createTour);

router
  .route('/:id')
  .get(validate({ params: tourIdParamsSchema }), tourController.getTour)
  .patch(
    validate({ params: tourIdParamsSchema, body: patchTourBodySchema }),
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour,
  )
  .delete(
    validate({ params: tourIdParamsSchema }),
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
