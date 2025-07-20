import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import User from "../model/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const veriJwt = asyncHandler(async (req,res,next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "token not found un AuthorizeError");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedToken) {
      throw new ApiError(401, "errorin decoding the token");
    }
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user=user;
    next();
  } catch (error) {
    throw (
      new ApiError(402, " error in middleware") ||
      console.log(`error in middleware  for any reason ${error}`)
    );
  }
});

export { veriJwt };
