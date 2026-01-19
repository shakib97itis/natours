const express = require('express');
const tourController = require('../controllers/tourController');
const validate = require('../middleware/validate');
const {
  tourIdParamsSchema,
  createTourBodySchema,
  patchTourBodySchema,
} = require('../validation/tourValidation');

const router = express.Router();

router
  .route('/')
  .get(tourController.getAllTours)
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
