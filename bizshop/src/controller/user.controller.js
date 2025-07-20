// src/controllers/authController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.js"; // FIX 1: Corrected import path for User model
import jwt from 'jsonwebtoken'; // FIX 2: Added missing jwt import
import { promisify } from 'util'; // FIX 3: Added missing promisify import

// FIX 4: Import JWT secrets and expiries from config/jwt.js
import {
    ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRY,
    JWT_COOKIE_EXPIRES_IN
} from '../config/jwt.js';

// FIX 5: Cookie options should be dynamic based on environment and expiry
const getCookieOptions = (expiresInDays) => {
    return {
        expires: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // 'secure' should be true in production or when using HTTPS
        // req.secure checks if the request was made over SSL/TLS
        // req.headers['x-forwarded-proto'] checks if it's behind a proxy like Render
        secure: process.env.NODE_ENV === 'production' || res.req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'Lax', // Adjust as needed, 'None' for cross-site with secure: true
        path: '/' // Ensure cookie is available across the entire domain
    };
};

// FIX 6: generateAccessAndRefreshTokens needs 'res' to set cookies, and better error handling
const generateAccessAndRefreshTokens = async (userId, res) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Store the refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // Do not run schema validators again

        // Set cookies using the dynamic options
        res.cookie('accessToken', accessToken, getCookieOptions(parseFloat(ACCESS_TOKEN_EXPIRY) / 24)); // Assuming ACCESS_TOKEN_EXPIRY is in hours, convert to days for cookie options
        res.cookie('refreshToken', refreshToken, getCookieOptions(parseFloat(JWT_COOKIE_EXPIRES_IN)));

        return { accessToken, refreshToken };

    } catch (error) {
        // FIX 7: Proper error throwing for internal issues
        console.error(`Error in generateAccessAndRefreshTokens: ${error.message}`);
        throw new ApiError(500, 'Failed to generate tokens or save refresh token. Please try again.');
    }
};

export const signup = asyncHandler(async (req, res) => {
    const { name, email, password, passwordConfirm, role } = req.body;

    // FIX 8: Correct validation logic for required fields
    if (!name || !email || !password || !passwordConfirm) {
        throw new ApiError(400, "All required fields are missing. Please fill all the fields!");
    }

    // FIX 9: Simplified findOne query and better status code for existing user
    const existedUser = await User.findOne({ email });
    if (existedUser) {
        throw new ApiError(409, "User with this email already exists."); // 409 Conflict is more appropriate
    }

    const newUser = await User.create({
        name,
        email,
        password,
        passwordConfirm,
        role: role || "user",
    });

    // FIX 10: Better error message and status code if user creation fails
    if (!newUser) {
        throw new ApiError(500, "User could not be registered. Please try again."); // 500 Internal Server Error
    }

    // FIX 11: Generate and send tokens after successful user creation
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id, res);

    // FIX 12: Remove sensitive data before sending user object in response
    const userResponse = newUser.toObject(); // Convert Mongoose document to plain JS object
    delete userResponse.password;
    delete userResponse.passwordConfirm;
    delete userResponse.refreshToken; // Don't send refresh token in the response body

    // FIX 13: Use ApiResponse for consistent success response
    res.status(201).json(
        new ApiResponse(
            201,
            { user: userResponse, accessToken }, // Include accessToken in data for frontend
            "User signed up successfully!!"
        )
    );
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // FIX 14: Correct validation logic for login fields
    if (!email || !password) {
        throw new ApiError(400, "Please provide email and password!");
    }

    // FIX 15: Corrected typo 'exsitingUser' to 'existingUser'
    // FIX 16: Explicitly select password field as it's 'select: false' by default
    const existingUser = await User.findOne({ email }).select('+password');
    if (!existingUser) {
        throw new ApiError(401, "Incorrect email or password"); // More generic for security
    }

    // FIX 17: Pass the hashed password from the DB to correctPassword method
    const isPasswordValid = await existingUser.correctPassword(password, existingUser.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect email or password"); // More generic for security
    }

    // FIX 18: Await the token generation function
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existingUser._id, res);

    // FIX 19: Remove sensitive data before sending user object in response
    const userResponse = existingUser.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    // FIX 20: Use ApiResponse for consistent success response
    return res
        .status(200)
        .json(new ApiResponse(200, { user: userResponse, accessToken }, "User logged in successfully!!"));
});

export const logout = asyncHandler(async (req, res) => {
    // FIX 21: Ensure req.user is populated by a 'protect' middleware before this
    // For now, we'll assume req.user might be available.
    // If not, we'll just clear cookies.
    if (req.user) {
        req.user.refreshToken = undefined;
        await req.user.save({ validateBeforeSave: false });
    }

    // Clear cookies by setting them to 'loggedout' and expiring them immediately
    res.cookie('accessToken', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || res.req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'Lax',
        path: '/'
    });
    res.cookie('refreshToken', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || res.req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'Lax',
        path: '/'
    });

    res.status(200).json(new ApiResponse(200, {}, 'Logged out successfully'));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Refresh token missing. Please log in to get access.');
    }

    // Verify refresh token
    const decoded = await promisify(jwt.verify)(incomingRefreshToken, REFRESH_TOKEN_SECRET);

    // Find user based on decoded ID and stored refresh token
    const user = await User.findOne({
        _id: decoded.id,
        refreshToken: incomingRefreshToken, // Ensure the stored refresh token matches
        active: { $ne: false } // Only active users
    });

    if (!user) {
        // If user or token doesn't match, or token is invalid, clear cookies and ask for re-login
        res.cookie('accessToken', 'invalid', { expires: new Date(0), httpOnly: true, path: '/' });
        res.cookie('refreshToken', 'invalid', { expires: new Date(0), httpOnly: true, path: '/' });
        throw new ApiError(401, 'Invalid refresh token. Please log in again.');
    }

    // Generate new access and refresh tokens
    const { accessToken } = await generateAccessAndRefreshTokens(user._id, res);

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(200).json(
        new ApiResponse(
            200,
            { user: userResponse, accessToken },
            'Access token refreshed successfully!'
        )
    );
});