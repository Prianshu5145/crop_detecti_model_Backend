const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./Config/db.js");
const diseaseRoutes = require("./Routes/DiseaseRoute.js");
const auth = require("./Routes/authRoute.js");
const detect = require("./Routes/detectDiease.js")
dotenv.config();

const app = express();
app.use(cookieParser());

// CORS
const allowedOrigins = ["http://localhost:5173", "https://a2df81f5.crop-detection-model-frontend.pages.dev"];

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
  })
);

app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/diseases", diseaseRoutes);
app.use("/api/user", auth);
app.use("/api/detect",detect );

app.get("/", (req, res) => {
  res.send("🌱 Plant Disease API is running...");
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
