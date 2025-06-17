const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../node_mailer/email");

const catchAsyncError = require("../utils/CatchAsyncError");
const { validationResult } = require("express-validator");
const User = require("../modules/user");
const AppError = require("../utils/AppError");
const jwt = require("jsonwebtoken");

const register = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const existingUser = await User.findOne({ email, isVerified: true }).lean();
  if (existingUser) {
    return next(
      new AppError("User already exists, please verify your email.", 400)
    );
  }

  const registerAttempts = await User.countDocuments({
    email,
    isVerified: false,
  });
  if (registerAttempts >= 3) {
    return next(
      new AppError(
        "You have exceeded the maximum registration attempts. Please try again later.",
        429
      )
    );
  }

  const newUser = new User({
    name,
    email,
    password,
    isVerified: false,
  });

  // Generate verification token and save user
  const verificationToken = newUser.generateVerificationToken();
  await newUser.save();

  // Send email
  sendVerificationEmail(
    email,
    "Verification Token email",
    name,
    verificationToken
  );

  // Remove sensitive fields from response
  const userObj = newUser.toObject();
  delete userObj.password;
  delete userObj.verificationToken;
  delete userObj.verificationTokenExpiredAt;
  delete userObj.refreashToken;

  res.status(201).json({
    success: true,
    message: "User created successfully. Please check your email to verify.",
    data: userObj,
  });
});

const verifyOtp = catchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    
    const unVerifiedEntries = await User.find({
      email,
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!unVerifiedEntries || unVerifiedEntries.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const latestEntry = unVerifiedEntries[0];

    if (otp !== latestEntry.verificationToken) {
      return next(new AppError("Invalid OTP", 400));
    }

    if (latestEntry.verificationTokenExpiredAt < Date.now()) {
      return next(new AppError("OTP has expired", 400));
    }

    await User.deleteMany({
      _id: { $ne: latestEntry._id },
      email,
      isVerified: false,
    });

    latestEntry.isVerified = true;
    latestEntry.verificationToken = undefined;
    latestEntry.verificationTokenExpiredAt = undefined;
    const response = await latestEntry.save({ validateModifiedOnly: true });

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: {
        name: response.name,
        email: response.email,
        isVerified: response.isVerified,
        role: response.role,
        profilePicture: response.profilePicture,
      },
    });
  } catch (error) {
    console.error("Verification Error:", error);
    return next(new AppError("Error verifying OTP", 500));
  }
});

const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const user = await User.findOne({ email, isVerified: true }).select(
    "password role name email isVerified lastLogin"
  );

  if (!user) {
    return next(new AppError("Invalid email or password", 401));
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new AppError("Invalid email or password", 401));
  }

  const [accessToken] = await Promise.all([
    user.generateJWTToken(),
    User.updateOne({ _id: user._id }, { lastLogin: Date.now() }),
  ]);

  const refreshToken = await user.generateRefreshToken();

  const { _id, name, role, isVerified } = user;

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    })
    .json({
      success: true,
      message: "Login successful",
      user: { _id, name, email, role, isVerified },
    });
});

const user = catchAsyncError(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -verificationToken -verificationTokenExpiredAt -refreashToken"
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Fetch User Error:", error);
    return next(new AppError("Error fetching user data", 500));
  }
});

const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const user = await User.findOne({ email, isVerified: true }).select(
      "-password -verificationToken -verificationTokenExpiredAt"
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const resetToken = user.generateResetPasswordToken();
    const data = await user.save({ validateModifiedOnly: true });

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/user/reset_password/${resetToken}`;

    sendResetPasswordEmail(email, "Reset Your Password", user?.name, resetUrl);

    res.status(200).json({
      success: true,
      message: "Reset password email sent successfully.",
      data,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiredAt: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired reset token", 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiredAt = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

const getAccessToken = catchAsyncError(async (req, res, next) => {
  try {
    const oldAccessToken = jwt.decode(req.headers.cookie.split("=")[1]);

    const user = await User.findById(oldAccessToken.id).select(
      "-password -verificationToken -verificationTokenExpiredAt"
    );
    if (!user) {
      return next(new AppError("User not found, please log in again.", 404));
    }

    if (!user.refreashToken) {
      return next(
        new AppError(
          "You are not logged in, please log in to access this resource.",
          401
        )
      );
    }

    jwt.verify(
      user.refreashToken,
      process.env.REFREASH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          return next(
            new AppError("Invalid refreashToken, please log in again.", 401)
          );
        }

        const user = await User.findById(decoded.id).select(
          "-password -verificationToken -verificationTokenExpiredAt"
        );

        if (!user) {
          return next(
            new AppError("User not found, please log in again.", 404)
          );
        }

        const newAccessToken = await user.generateJWTToken();
        await user.generateRefreshToken();

        res
          .status(200)
          .cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          })
          .json({
            success: true,
            data: user,
          });
      }
    );
  } catch (error) {
    console.error("Get Access Token Error:", error);
    return next(new AppError("Error getting access token", 500));
  }
});

const logout = catchAsyncError(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.refreashToken = undefined;
    await user.save();

    res
      .status(200)
      .cookie("accessToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        expires: new Date(0), // Expire the cookie
      })
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    console.error("Logout Error:", error);
    return next(new AppError("Error logging out", 500));
  }
});

module.exports = {
  register,
  verifyOtp,
  login,
  user,
  forgotPassword,
  resetPassword,
  getAccessToken,
  logout,
};
