import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import razorpayInstance from "../config/razorpay.js";


const createRazorpayPayment = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(402, "unauthirize please login to pay");
  }
  const { amount, currency = "INR", planType } = req.body; //

  if (!amount || amount <= 0) {
    throw new ApiError(
      400,
      "Amount is required and must be a positive number."
    );
  }
  if (!planType || !["Early Bird", "Paid"].includes(planType)) {
    throw new ApiError(
      400,
      'Invalid plan type provided. Must be "Early Bird" or "Paid".'
    );
  }
  const recieptId = `reciept${req.user._id}_${Date.now()} `;
  if (!recieptId) {
    throw new ApiError(
      401,
      "recieptId not available please respond it back  to  provide recipt  "
    );
  }
  const orderOptions = {
    amount: amount * 100, // Amount in smallest currency unit (e.g., 50000 paise = 500 INR)
    currency,
    receipt: recieptId,
    payment_capture: 1, // Auto capture the payment (0 for manual capture)
    notes: {
      userId: req.user._id.toString(),
      planType: planType,
      email: req.user.email, // Pass user email for auto-fill in checkout
    },
  };
 try {
    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    if (!razorpayOrder) {
      throw new ApiError(500, "Error creating Razorpay order: No response from API."); // Use 500 for server-side issues
    }
    // ... (rest of success response)
  } catch (error) {
    // Log the actual error object from Razorpay/SDK
    console.error("Razorpay API Error:", error);

    // Check for common Razorpay error structure
    if (error.error && error.error.description) {
        throw new ApiError(error.statusCode || 500, `Payment integration failed: ${error.error.description}`);
    } else if (error.message) {
        throw new ApiError(500, `Payment integration failed: ${error.message}`);
    } else {
      console.error("Razorpay API Error:", error); 
    }
  }
});
export { createRazorpayPayment };
