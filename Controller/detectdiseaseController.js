const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const Disease = require("../Model/Disease");
require("dotenv").config();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.detectCropDisease = async (req, res) => {
  try {
    // 1️⃣ Check if File Exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded"
      });
    }

    // 2️⃣ Convert Image → Upload to Cloudinary
    const base64Image = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

    const upload = await cloudinary.uploader.upload(dataURI, {
      folder: "kisan_saathi"
    });

    const imageUrl = upload.secure_url;

    // 3️⃣ Call ML Model API
    const firstAPI = await axios.get(
      `https://cropdiseasedetectionmodel-production.up.railway.app/predict?image_path=${encodeURIComponent(imageUrl)}`
    );

    const predictedClass = firstAPI.data?.predicted_class;
    const confidence = firstAPI.data?.confidence;

    if (!predictedClass) {
      return res.status(400).json({
        success: false,
        message: "Detection failed"
      });
    }

    // 4️⃣ CLEAN + FORMAT DISEASE NAME
    // Convert underscores → spaces
    let cleaned = predictedClass.replace(/_/g, " ");

    // Remove noisy words from model output
    cleaned = cleaned.replace(
      /\b(leaf|leaves|orange|crop|plant|disease|diseases|on|in)\b/gi,
      ""
    );

    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Title Case
    let diseaseName = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());

    console.log("Detected Disease:", diseaseName);

    // 5️⃣ SEARCH MONGODB (case-insensitive)
    const disease = await Disease.findOne({
      diseaseName: new RegExp(`^${diseaseName}$`, "i")
    });

    console.log("MongoDB Result:", disease);

    if (!disease) {
      return res.status(404).json({
        success: false,
        message: "Disease not found in database.",
        detected: { predictedClass, diseaseName, confidence }
      });
    }

    // 6️⃣ FINAL RESPONSE
    res.status(200).json({
      success: true,
      imageUrl,
      detected: {
        predictedClass,
        diseaseName,
        confidence
      },
      diseaseInfo: disease,
      warning:
        "⚠️ This is an AI-based early prediction. Do not rely completely. Consult local agriculture experts or KVK."
    });

  } catch (error) {
    console.log("Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
