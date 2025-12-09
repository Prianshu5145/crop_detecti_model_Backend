const axios = require('axios');
const https = require('https');

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000
});

const sendWhatsappOtp = async (phoneNumber, otp) => {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_ID}/messages`;

  const data = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: "authentication_template", // Must be approved in WhatsApp BM
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: otp }
          ]
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            { type: "text", text: otp }
          ]
        }
      ]
    }
  };

  const headers = {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    const res = await axios.post(url, data, {
      headers,
      httpsAgent: agent,
      timeout: 5000
    });
    return res.data;
  } catch (err) {
    console.error("WhatsApp OTP send failed:", err.response?.data || err.message);
    throw err;
  }
};

module.exports = sendWhatsappOtp;
