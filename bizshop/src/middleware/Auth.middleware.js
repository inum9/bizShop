// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import User from "../model/user.model.js"; // FIX 1: Corrected import path for User model
import { asyncHandler } from "../utils/asyncHandler.js";
import { promisify } from 'util'; // FIX 2: Added promisify for jwt.verify

// FIX 3: Import ACCESS_TOKEN_SECRET from your config/jwt.js for centralized secrets


/**
 * Middleware to verify JWT and protect routes.
 * It checks for a valid access token in cookies or the Authorization header.
 * If valid, it attaches the authenticated user to `req.user`.
 */
const veriJwt = asyncHandler(async (req, res, next) => {
    let token;

    // 1) Extract token from cookies or Authorization header
    // Prioritize cookies (more secure for web apps), then check Authorization header (common for APIs/Postman)
    if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; // Extract token part after "Bearer "
    }

    // 2) If no token is found, throw an unauthorized error
    if (!token) {
        throw new ApiError(401, 'Authentication failed: Token not found. Please log in.');
    }

    // 3) Verify the token
    // Use promisify(jwt.verify) for async/await compatibility.
    // This try-catch block is necessary here because jwt.verify throws synchronous errors
    // for invalid/expired tokens, and we want to catch them specifically before asyncHandler.
    let decodedToken;
    try {
        decodedToken = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        // FIX 4: Handle specific JWT errors with appropriate 401 status codes
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(401, 'Authentication failed: Invalid token.');
        }
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Authentication failed: Token has expired. Please log in again.');
        }
        // For any other unexpected error during token verification
        throw new ApiError(500, 'Authentication failed: An unexpected error occurred during token verification.');
    }

    // 4) Check if the user still exists in the database
    // Select only necessary fields, excluding password and refresh token for security
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    // 5) If user not found (e.g., deleted after token issue), throw an unauthorized error
    if (!user) {
        throw new ApiError(401, "Authentication failed: User no longer exists or invalid access token.");
    }

    // 6) Attach the user object to the request for subsequent middleware/controllers
    req.user = user;

    // 7) Proceed to the next middleware or route handler
    next();
});

export { veriJwt };