const transporter = require("./node_mailer.config");
const {
  verificationEmailTemplate,
  resetPasswordTemplate,
} = require("./email_template");
const dotenv = require("dotenv");
dotenv.config();

 const sendVerificationEmail = async (
  email,
  subject,
  username,
  verificationToken
) => {
  const options = {
    from: process.env.SMTP_USER,
    to: email,
    subject,
    html: verificationEmailTemplate(username, verificationToken),
  };

  return await transporter.sendMail(options);
};

 const sendResetPasswordEmail = async (
  email,
  subject,
  username,
  resetLink
) => {
  const options = {
    from: process.env.SMTP_USER,
    to: email,
    subject,
    html: resetPasswordTemplate(username, resetLink),
  };

  return await transporter.sendMail(options);
};


module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};