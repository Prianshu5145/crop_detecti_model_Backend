const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const Disease = require("../Model/Disease");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.detectCropDisease = async (req, res) => {
  try {
    // 1️⃣ Ensure File Exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded"
      });
    }

    // 2️⃣ Upload to Cloudinary
    const base64Image = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

    const upload = await cloudinary.uploader.upload(dataURI, {
      folder: "kisan_saathi"
    });

    const imageUrl = upload.secure_url;

    // 3️⃣ Hit ML API
    const response = await axios.get(
      `https://cropdiseasedetectionmodel-production.up.railway.app/predict?image_path=${encodeURIComponent(imageUrl)}`
    );

    const predictedClass = response.data?.predicted_class;
    const confidence = response.data?.confidence;

    if (!predictedClass) {
      return res.status(400).json({
        success: false,
        message: "Detection failed"
      });
    }

    // 4️⃣ SEARCH DB DIRECTLY WITH MODEL OUTPUT
    const disease = await Disease.findOne({ diseaseName: predictedClass });

    if (!disease) {
      return res.status(404).json({
        success: false,
        message: "Disease not found in database",
        detected: { predictedClass, confidence },
        imageUrl
      });
    }

    // 5️⃣ SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      imageUrl,
      detected: {
        predictedClass,
        confidence
      },
      diseaseInfo: disease,
      warning:
        "⚠️ AI early detection — verify with an agricultural expert if possible."
    });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
