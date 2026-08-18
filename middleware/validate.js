const validate = (req, res, next) => {
  if (!req.body.title || typeof req.body.title !== "string") {
    return res.status(400).json({
      error: "Title is required and must be a string",
    });
  }

  if (
    req.body.description !== undefined &&
    typeof req.body.description !== "string"
  ) {
    return res.status(400).json({
      error: "Description must be a string",
    });
  }

  next();
};

module.exports = validate;
