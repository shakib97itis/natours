exports.getAllTours = (_req, res) => {
  res.status(200).json({
    status: 'success',
    results: '',
    data: {},
  });
};

exports.getTour = (req, res) => {
  // const { id } = req.params;
  res.status(200).json({
    status: 'success',
    data: {},
  });
};

exports.createTour = async (req, res) => {
  try {
    res.status(201).json({
      status: 'success',
      data: {},
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Something went wrong',
    });
  }
};

exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: 'updated tour data',
  });
};

exports.deleteTour = (req, res) => {
  res.status(204).json({
    status: 'success',
    data: 'no data',
  });
};
