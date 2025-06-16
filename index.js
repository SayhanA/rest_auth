const express = require("express");
const connectDB = require("./db/connectDB.js");
const authRoutes = require("./routes/user.js");
const { errorHandler, globalErrorHandler } = require("./utils/ErrorHandler.js");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", authRoutes);

// Middleware for handling errors
app.use(globalErrorHandler);

app.use(errorHandler);

app.listen(port, () => {
  connectDB();
  console.log(`Server is running at http://localhost:${port}`);
});
