const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

const allowedOrigins = [
  "https://note-app-frontend-mu.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

// Drop username index (run once only)
mongoose.connection.once("open", async () => {
  try {
    await mongoose.connection.db.collection("users").dropIndex("username_1");
    console.log("Dropped username index");
  } catch (err) {
    console.log("Index already dropped or not found");
  }
});

//Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const notesRoutes = require("./routes/notes");
app.use("/api/notes", notesRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
