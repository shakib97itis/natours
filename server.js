const { default: mongoose } = require('mongoose');

const app = require('./app');

// eslint-disable-next-line no-console
console.log(`Server is running on "${process.env.NODE_ENV}" mode.`);

const PORT = process.env.PORT || 3000;
const uri = process.env.DATABASE;
const clientOptions = {
  serverApi: { version: '1', strict: true, deprecationErrors: true },
};

mongoose
  .connect(uri, clientOptions)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('database connected');

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log(err);
  });
