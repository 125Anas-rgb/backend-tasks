const multer = require("multer");

//extract the ectension from the file
const path = require("path");

const fs = require("node:fs/promises");

//creating storage configuration
const storage = multer.diskStorage({
  //mutler saves the uploaded file
  destination: async (req, file, cb) => {
    //getting upload path
    //__dirname is PS D:\Desktop\notes\backend\backend-tasks and after uploads it beocme \uploads at the end
    try {
      const uploadPath = path.join(__dirname, "..", "uploads");
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
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
  console.log("Uploaded file:", file.originalname, file.mimetype);

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
