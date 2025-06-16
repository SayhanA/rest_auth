const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const dotenv = require("dotenv");
const User = require("../modules/user");
dotenv.config();

const isAuthenticated = (req, res, next) => {
  try {
    const token = req?.headers?.cookie?.split("=")[1];

    if (!token) {
      return next(
        new AppError(
          "You are not logged in, please log in to access this resource.",
          401
        )
      );
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return next(new AppError("Invalid token, please log in again.", 401));
      }

      const user = await User.findById({ _id: decoded.id }).select(
        "-password -verificationToken -verificationTokenExpiredAt"
      );

      if (!user) {
        return next(new AppError("User not found, please log in again.", 404));
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return next(
      new AppError("An error occurred while authenticating the user.", 500)
    );
  }
};

module.exports = isAuthenticated;
