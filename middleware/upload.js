const multer = require("multer");

//extract the ectension from the file
const path = require("path");

//creating storage configuration
const storage = multer.diskStorage({
  //mutler saves the uploaded file
  destination: (req, file, cb) => {
    //cb means callBack
    //mutler saves file in upload directory
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    //generating unique file names
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    //null means no error
    cb(null, uniqueName);
  },
});

//function that tells wether file should be accepted or rejected
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];

  //if file mimetype have any allowedtypes
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPG, JPEG, and PDF files are allowed"));
  }
};

//Actual mutler middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    //5Mb
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
