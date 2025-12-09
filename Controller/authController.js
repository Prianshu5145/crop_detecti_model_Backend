const User = require('../Model/User.js');
const jwt = require('jsonwebtoken');



const sendWhatsappOtp = require('../Utils/sendWhatsappOtp');


const createToken = (user) => 
  jwt.sign({ id: user._id }, "Priyanshu", { expiresIn: '7d' });
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,             // false on localhost, true in prod
  sameSite: isProduction ? 'None' : 'Lax', // Lax for localhost
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 1 week
};



exports.sendOtpToWhatsapp = async (req, res) => {
  const { mobile_number } = req.body;

  if (!mobile_number || !/^[6-9]\d{9}$/.test(mobile_number)) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
  }

  let user = await User.findOne({ mobile_number });

  // If user exists and is blocked
  if (user && user.status === 'blocked') {
    return res.status(403).json({ error: 'Something went wrong' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // If user does not exist, create new
  if (!user) {
  user = new User({ mobile_number });

  // Delay WhatsApp Welcome Template by 15 seconds
  setTimeout(() => {
    sendWhatsappOtp(mobile_number, otp)
      .catch((err) => {
        console.error('WhatsApp OTP send failed:', err.message || err.response?.data);
      });
  }, 15000); // 15000ms = 15 seconds
}


  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  // Respond immediately
  res.json({ message: 'OTP is being sent to WhatsApp' });

  // Now send the OTP in background
  sendWhatsappOtp(mobile_number, otp).catch((err) => {
    console.error('WhatsApp OTP send failed:', err.message || err.response?.data);
  });
};



exports.verifyOtpAndLoginWithWhatsapp = async (req, res) => {
  const { mobile_number, otp } = req.body;

  if (!mobile_number || !otp)
    return res.status(400).json({ error: 'Mobile number and OTP required' });

  try {
    const user = await User.findOne({ mobile_number });
    if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    user.otp = null;
    user.otpExpiry = null;

    const token = createToken(user);
    user.currentSessionToken = token;
    await user.save();

    res.cookie("token", token, cookieOptions);
    res.json({ user: {
   
    mobile_number: user.mobile_number,
    role: user.role,
    // Add any other fields you want to expose
  }, token });
  } catch (err) {
    console.error('WhatsApp OTP login error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
// exports.googleLogin = async (req, res) => {
//     const { email,googleId} = req.body;
  
//     if (!email) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }
  
//     try {
//       let user = await User.findOne({ email });
  
//       if (!user) {
//         user = new User({
         
//           email,
//           googleId
           
//         });
//         await user.save();
//       }
  
//       const token = createToken(user);
//       user.currentSessionToken = token;
//       await user.save();
//       res.cookie("token", token, cookieOptions);
//       res.json({
//         user,
//         token
       
//       });
//     } catch (err) {
//       console.error('Google login error:', err);
//       res.status(500).json({ message: 'Something went wrong' });
//     }
//   };

exports.getAllMobileNumbers = async (req, res) => {
  try {
    const users = await User.find({}, 'mobile_number'); // Only fetch mobile_number field
    const mobileNumbers = users.map(user => user.mobile_number);
    res.status(200).json({ mobileNumbers });
  } catch (error) {
    console.error('Error fetching mobile numbers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};







exports.logout = (req, res) => {
  res.clearCookie('token', {
  httpOnly: true,
  secure: true,          // Only if using HTTPS
  sameSite: 'None',      // Required for cross-site cookies
  path: '/',             // Match cookie path
});
  res.json({ message: "Logged out" });
};

// controllers/authController.js

exports.getUserProfileWithRole = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Optional: exclude sensitive fields like password or otp
    // const user = await User.findById(req.user._id);

    // if (!user) {
    //   return res.status(404).json({ message: 'User not found' });
    // }
    const user = req.user;
    res.status(200).json({ user: {
    
    mobile_number: user.mobile_number,
    role: user.role,
    // Add any other fields you want to expose
  }, });
  } catch (err) {
    console.error('Error getting user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};








exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('mobile_number');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ mobile_number: user.mobile_number });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};






