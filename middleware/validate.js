//small function that runs in between req and res
const validate = (req, res, next) => {
  //means if title dont exist {}
  if (!req.body.title) {
    return res.status(404).json({ error: "Title is Required" });
  }
  next();
};

module.exports = validate;
