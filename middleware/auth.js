//verifies authorization with jwt token

const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  // bearer is an authorization scheme being used
  // gets token from there
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  // splitting bearer word from token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    // checks if the token is same
    //verifies current token with the stored signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attaching decoded token to the request
    // so that task route knows who the user it
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = auth;
