export function validateRequest(schemas) {
  return (req, _res, next) => {
    try {
      req.validated = {
        params: schemas.params ? schemas.params.parse(req.params) : {},
        query: schemas.query ? schemas.query.parse(req.query) : {},
        body: schemas.body ? schemas.body.parse(req.body) : {}
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
