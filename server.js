const app = require('./app');

// eslint-disable-next-line no-console
console.log(`Server is running on "${process.env.NODE_ENV}" mode.`);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${PORT}`);
});
