const {
  register,
  verifyOtp,
  login,
  user,
  forgotPassword,
  resetPassword,
  getAccessToken,
  logout,
} = require("../controllers/user.js");
const express = require("express");
const isAuthenticated = require("../middlewars/isAuthenticated.js");
const router = express.Router();
const { body } = require("express-validator");

const nameValidation = body("name")
  .trim()
  .notEmpty()
  .withMessage("Name is required!")
  .isLength({ min: 4 })
  .withMessage("Name must be at least 4 characters long!");

const emailValidation = body("email")
  .trim()
  .notEmpty()
  .withMessage("Email is required!")
  .isEmail()
  .withMessage("Invalid email format!");

const passwordValidation = body("password")
  .trim()
  .notEmpty()
  .withMessage("Password is required!")
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters long!")
  .matches(/[a-z]/)
  .withMessage("Password must contain at least one lowercase letter!")
  .matches(/[A-Z]/)
  .withMessage("Password must contain at least one uppercase letter!")
  .matches(/[0-9]/)
  .withMessage("Password must contain at least one number!");

const otpValidation = body("otp")
  .notEmpty()
  .withMessage("OTP is required!")
  .isLength({ min: 5, max: 5 })
  .withMessage("OTP must be 5 character!");

//POST: /api/auth/register
router.post(
  "/register",
  nameValidation,
  emailValidation,
  passwordValidation,
  register
);

//POST: /api/auth/verify_otp
router.post("/verify_otp", emailValidation, otpValidation, verifyOtp);

//POST: /api/auth/login
router.post("/login", emailValidation, passwordValidation, login);

//GET: /api/auth/user
router.get("/user", isAuthenticated, user);

//POST: /api/auth/forgot_password
router.post("/forgot_password", emailValidation, forgotPassword);

//POST: /api/auth/reset_password/:token
router.post("/reset_password/:token", passwordValidation, resetPassword);

// GET: /api/auth/access_token
router.get("/access-token", getAccessToken);

// GET: /api/auth/logout
router.get("/logout", isAuthenticated, logout);

module.exports = router;
