//small function that runs in between req and res
const validate = (req, res, next) => {
  //means if title dont exist {}
  // 1. Check if title is missing
  if (!req.body.title) {
    return res.status(400).json({ error: "Title is Required" });
  }

  next();
};

module.exports = validate;
