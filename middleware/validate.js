function formatZodError(err) {
  // err.issues => [{ path, message, code, ... }]
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
}

/**
 * validate({ body, params, query })
 * Each is a Zod schema (optional).
 * - puts parsed data into req.validated
 * - (optional) also replaces req.body/req.params/req.query with parsed data
 */
function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const errors = [];

    // eslint-disable-next-line no-restricted-syntax
    ['params', 'query', 'body'].forEach((part) => {
      const schema = schemas?.[part];
      if (!schema) return;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        errors.push({
          in: part,
          errors: formatZodError(result.error),
        });
      } else {
        validated[part] = result.data;
      }
    });

    if (errors.length) {
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    // Best practice: use validated data downstream
    req.validated = validated;

    // Optional: also overwrite req.* so controllers can keep using req.body etc.
    if (validated.body) req.body = validated.body;
    if (validated.params) req.params = validated.params;
    if (validated.query) req.query = validated.query;

    console.log(validated);
    return next();
  };
}

module.exports = validate;
