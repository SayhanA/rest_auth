const { register, verifyOtp, login, user, forgotPassword, resetPassword, getAccessToken, logout } = require("../controllers/user.js");
const express = require("express");
const isAuthenticated = require("../middlewars/isAuthenticated.js");
const router = express.Router();

//POST: /api/auth/register
router.post("/register", register);

//POST: /api/auth/verify_otp
router.post("/verify_otp", verifyOtp)

//POST: /api/auth/login
router.post("/login", login);

//GET: /api/auth/user
router.get("/user", isAuthenticated, user);

//POST: /api/auth/forgot_password
router.post("/forgot_password", forgotPassword);

//POST: /api/auth/reset_password/:token
router.post("/reset_password/:token", resetPassword)

// GET: /api/auth/access_token
router.get("/access_token", getAccessToken); 

// GET: /api/auth/logout
router.get("/logout", isAuthenticated, logout);

module.exports = router;
