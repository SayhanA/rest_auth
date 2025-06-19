const express = require("express");
const connectDB = require("./db/connectDB.js");
const authRoutes = require("./routes/user.js");
const { errorHandler, globalErrorHandler } = require("./utils/ErrorHandler.js");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/en/v1/auth", authRoutes);

// Middleware for handling errors
app.use(globalErrorHandler);

app.use(errorHandler);

app.listen(port, () => {
  connectDB();
  console.log(`Server is running at http://localhost:${port}`);
});
