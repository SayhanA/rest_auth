const { Schema, default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      // unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Exclude password from queries by default
    },
    name: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profilePicture: {
      type: String,
      default: "https://example.com/default-profile-picture.png",
    },
    resetPasswordToken: String,
    resetPasswordExpiredAt: Date,
    verificationToken: String,
    verificationTokenExpiredAt: Date,
    refreashToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

userSchema.methods.generateVerificationToken = function () {
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    return firstDigit.toString() + remainingDigits;
  }

  const verificationToken = generateRandomFiveDigitNumber();
  this.verificationToken = verificationToken;
  this.verificationTokenExpiredAt = Date.now() + 10 * 60 * 1000; // Token valid for 10 minutes
  return verificationToken;
};

userSchema.methods.generateJWTToken = async function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };

  const options = {
    expiresIn: "5m", // Token valid for 5 minutes
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, options);
  return token;
};

userSchema.methods.generateRefreshToken = async function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };
  const options = {
    expiresIn: "30d", // Refresh token valid for 30 days
  };
  const refreshToken = jwt.sign(payload, process.env.REFREASH_TOKEN_SECRET, options);
  this.refreashToken = refreshToken;
  await this.save();
  return refreshToken;
};

userSchema.methods.generateResetPasswordToken = async function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpiredAt = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
