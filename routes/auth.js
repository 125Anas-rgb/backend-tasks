const express = require("express");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

const prisma = require("../config/db");

router.post("/register", async (req, res) => {
  try {
    // destruct incoming data into variables
    const { email, password, name } = req.body;

    // ensures all fields are filled
    if (!email || !password || !name) {
      return res.status(400).json({
        message: "Please Enter All Fields",
      });
    }

    // setting email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // checking email with email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // checking password
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    //checking name
    if (typeof name !== "string") {
      return res.status(400).json({
        message: "Name must be a String",
      });
    }

    // check if email already exists
    // find user which have the same typed email
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // hashing password with bcrypt
    //transforms data 2^12 seconds within second to reduce brute force attack success (trying millions of combinations)
    const hashedPassword = await bcrypt.hash(password, 12);

    // insert new row into user database record
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    //returning without password
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

module.exports = router;

router.post("/login", async (req, res) => {
  try {
    //destructing inputs to variables
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please Enter All Fields",
      });
    }

    //check if user exists by email
    const user = await prisma.user.findUnique({
      where: {
        email, // Shorthand for email: email
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    //verifying password (comparing currect input password with already stored user password)
    const correctPassword = await bcrypt.compare(password, user.password);

    if (!correctPassword) {
      return res.status(401).json({
        message: "Password is incorrect",
      });
    }

    //when login is successful a JWT token is creted for him

    // creating jwt token with secret for user when he logs in
    const token = jwt.sign(
      //payload (holds all info you share with token)
      {
        userId: user.id,
        email: user.email,
      },
      // signature (secret key) keeping in env
      //takes encoded version of header,payload and secret key and the algorithm from header to create a signature (last portion)
      // and when recieved again it peroform hashing by comparing with last portion of recieved signature with stored signature
      process.env.JWT_SECRET,
      //becomes invalid after one hour
      {
        expiresIn: "1h",
      },
    );
    res.status(200).json({
      token,
    });
  } catch (err) {
    res.status(400).json({
      message: "Internal Server Error",
    });
  }
});
