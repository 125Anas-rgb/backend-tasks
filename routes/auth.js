const express = require("express");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const sendEmail = require("../utils/sendEmail");

const router = express.Router();

const prisma = require("../config/db");
const { json } = require("stream/consumers");
const { use } = require("react");
const { route } = require("./auth");
const auth = require("../middleware/auth");

// const verificationToken = {
//   token: hashToken,
//   expiry: verificationExpires,
// };

router.post("/register", async (req, res) => {
  try {
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
    //the user gets rawToken
    const rawToken = crypto.randomBytes(32).toString("hex");

    //the database gets hashToken (so that original one still doesnt get exposed if someone gets in db)
    const hashToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    //creating user and adding it into db
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verificationToken: hashToken,
        verificationTokenExpires,
      },
    });

    //generating link that contains our token and mail which we will compare it later once the user login and verifies email
    const verificationLink =
      `http://localhost:5000/api/auth/verify-email` +
      `?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    //calling function : sending email to user once registered
    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: `<h1>Welcome to backend</h1>
             <p>Please verify your email address</p>
           <p>
          <a href="${verificationLink}">
            Verify Email
          </a>
        </p>
        <p>This verification link expires in 24 hours.</p>`,
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

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    //when login is successful a JWT token is creted for him

    // creating access jwt token with secret for user when he logs in
    const accessToken = jwt.sign(
      //payload (holds all info you share with token)
      {
        userId: user.id,
        email: user.email,
      },
      // signature (secret key) keeping in env
      //takes encoded version of header,payload and secret key and the algorithm from header to create a signature (last portion)
      // and when recieved again it peroform hashing by comparing with last portion of recieved signature with stored signature
      process.env.JWT_SECRET,
      //becomes invalid after 15 mints
      {
        expiresIn: "15m",
      },
    );

    //generating long lived refresh token
    const refreshToken = crypto.randomBytes(32).toString("hex");

    const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    //creating its hash to store in db
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: hashedRefreshToken,
        refreshTokenExpires,
      },
    });

    res.status(200).json({
      accessToken,
      refreshToken,
    });
  } catch (err) {
    res.status(400).json({
      message: "Internal Server Error",
    });
  }
});

//to update access token
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: "please enter the refresh token",
      });
    }

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        refreshToken: hashedRefreshToken,
        refreshTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "invalid or expired refresh token",
      });
    }

    //generate new access token for 15 mints
    const newAccessToken = jwt.sign(
      //payload (holds all info you share with token)
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      //becomes invalid after 15 mints
      {
        expiresIn: "15m",
      },
    );

    const newRefreshToken = crypto.randomBytes(32).toString("hex");

    const newRefreshTokenExpires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const hashRefreshToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: hashRefreshToken,
        refreshTokenExpires: newRefreshTokenExpires,
      },
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

//stopping refreshing sessions
router.post("/logout", auth, async (req, res) => {
  try {
    await prisma.user.update({
      where: {
        id: req.user.userId,
      },
      data: {
        refreshToken: null,
        refreshTokenExpires: null,
      },
    });

    res.status(200).json({
      message: "logout successful",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        message: "Token and email are required",
      });
    }

    //hashes the token recieved so that we can compare it with already hashed token in db
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    //finds the user with email
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification link",
      });
    }

    if (
      //if it doesnt mathes or if it is expired
      user.verificationToken !== hashedToken ||
      !user.verificationTokenExpires ||
      user.verificationTokenExpires < new Date()
    ) {
      return res.status(400).json({
        message: "Invalid or expired verification link",
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        //removing so that same verification link cant be used again
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "please enter email",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");

      const hashToken = crypto.createHash("sha256").update(token).digest("hex");

      const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordResetToken: hashToken,
          passwordResetExpires,
        },
      });

      const resetLink =
        `http://localhost:5000/api/auth/reset-password` +
        `?token=${token}&email=${encodeURIComponent(user.email)}`;

      await sendEmail({
        to: user.email,
        subject: `Forgot Password Request`,
        html: `<h1> Password Reset </h1>

            <p>We recieved your request to reset the password</p>

            <p>please click the link below to reset your password</p>
            
            <p><a href ="${resetLink}">
               Reset Password </a>
               </p>

            <p>This link expires in 15 minutes</p>   
            
            <p>If you did not make a password request , you can ignore this email </p>`,
      });
    }

    return res.status(200).json({
      message:
        "if an account with that email exists ,  a password reset link has been sent.",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    //verifying fields
    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    //verifying password
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    //
    const hashToken = crypto.createHash("sha256").update(token).digest("hex");

    //verifying hash token from db and its expiration
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    ///hasging password rto store in db
    const hashPassword = await bcrypt.hash(newPassword, 12);

    //updating
    const update = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.status(200).json({
      message: "Password reset Successfully",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
