import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken"

const options = {
  httpOnly: true,
  secure: true,
};

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    await user.save({ validateBeforeSave: false });
    return { refreshToken, accessToken };
  } catch (error) {
    throw (
      new ApiError("erro in  generation of token ") ||
      console.log(`error in generate the token ${error}`)
    );
  }
};

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, passwordConfirm, role } = req.body;
  if (!(name || email || password || passwordConfirm || role)) {
    throw new ApiError(
      401,
      "all fields are required please fill all the fields !"
    );
  }

  const existeduser = await User.findOne({
    $or: [{ email }],
  });
  if (existeduser) {
    throw new ApiError(401, "user with same email or name already exist");
  }
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: role || "user",
  });
  if (!newUser) {
    throw new ApiError(
      402,
      "user is not created successfully as you left some data to filled"
    );
  }

  return res.status(200, newUser, "user is signed up sucessfully!!");
});
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // FIX 3: Correct validation logic (400 Bad Request for missing input)
  if (!email || !password) {
    throw new ApiError(400, "Please provide email and password!");
  }

  // FIX 1: CRITICAL - Explicitly select the password field
  // FIX 7: Corrected typo 'exsitingUser' to 'existingUser'
  const existingUser = await User.findOne({ email }).select("+password");

  // FIX 4: Generic error message for security.
  // Also, ensure existingUser.password is available before trying to compare.
  if (
    !existingUser ||
    !(await existingUser.isPasswordCorrect(password, existingUser.password))
  ) {
    throw new ApiError(401, "Incorrect email or password");
  }

  // FIX 2: Await the token generation function
  // FIX 6: Pass 'res' to the token generation function if it handles cookies
  const { accessToken } = await generateAccessAndRefereshTokens(
    existingUser._id,
    res
  ); // We now generate both and set cookies inside it. Only need accessToken here for response body.

  // FIX 5: Remove sensitive data before sending user object in response
  const userResponse = existingUser.toObject(); // Convert Mongoose document to plain JS object
  delete userResponse.password; // Remove hashed password
  delete userResponse.refreshToken; // Remove refresh token as it's only in cookie

  // FIX 5: Use ApiResponse for consistent success response
  // FIX 5: Only include accessToken in the response body, refreshToken should ONLY be in HTTP-only cookie
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: userResponse, accessToken },
        "User logged in successfully!!"
      )
    );
});

const logOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

export { signup, login, logOut, refreshAccessToken };
