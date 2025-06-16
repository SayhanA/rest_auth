// node_mailer/email_template.js
const verificationEmailTemplate = (username, verificationCode) => {
  return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${username},</h2>
        <p>Thank you for registering. Please use the verification code below to verify your account:</p>
        <h3 style="background: #f0f0f0; padding: 10px; display: inline-block;">${verificationCode}</h3>
        <p>If you didn’t request this, please ignore this email.</p>
      </div>
    `;
};

const resetPasswordTemplate = (username, resetLink) => {
  return `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello ${username},</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetLink}" target="_blank">Reset Password</a>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      </div>
    `;
};

module.exports = {
  verificationEmailTemplate,
  resetPasswordTemplate,
};
