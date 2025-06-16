const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");


const dbConfig = {
  url: process.env.DATABASE_URL,
  // options: {
  //   useNewUrlParser: true,
  //   useUnifiedTopology: true,
  // },
};

const connectDB = async () => {
  try {
   const conn = await mongoose.connect(dbConfig.url);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit the process with failure
  }
};
module.exports = connectDB;
