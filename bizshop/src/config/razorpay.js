// src/config/razorpay.js
  import Razorpay from 'razorpay';
  import dotenv from 'dotenv';
  dotenv.config({ path: './.env' });

  console.log('Razorpay Key ID being loaded:', process.env.RAZORPAY_KEY_ID); // Check this
  console.log('Razorpay Key Secret being loaded (first 5 chars):', process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.substring(0,5) : 'Not loaded'); // Check this, but don't log full secret!

  const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  export default razorpayInstance;