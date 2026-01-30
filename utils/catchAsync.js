/* eslint-disable promise/no-callback-in-promise */

module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
