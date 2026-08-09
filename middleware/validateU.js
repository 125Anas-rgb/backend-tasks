const validateU = (req, res, next) => {
  if (req.body.title !== undefined && typeof req.body.title !== "string") {
    return res.status(400).json({
      error: "Title must be a string",
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

  if (
    req.body.completed !== undefined &&
    typeof req.body.completed !== "boolean"
  ) {
    return res.status(400).json({
      error: "completed must be a boolean (true or false)",
    });
  }

  next();
};

module.exports = validateU;
