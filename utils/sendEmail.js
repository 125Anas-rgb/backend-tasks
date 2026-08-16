//nodemailer is node.js library that lets the application communicate with SMTP server
const nodemailer = require("nodemailer");

//configuring nodemailer to connect to this SMTP server so that it knows where to send email and who sended it
//transport is a delivery mechanism (acts as a bridge)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const user = async function sendEmail({ to, subject, html }) {
  //nodemailer : sends email to user using SMTP server we configured
  const info = await transporter.sendMail({
    from: `"Backend Testing" <${process.env.SMTP_USER}`,
    to,
    subject,
    html,
  });

  console.log("Email Sent:", info.messageId);
  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
};

module.exports = user;
