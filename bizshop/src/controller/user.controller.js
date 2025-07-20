import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../model/user.model.js";

   const options = {
        httpOnly: true,
        secure: true
    }


const generateAccessAndRefereshTokens=async(userId){
    try {
                const user =await User.findById(userId);
                const accessToken=user.generateAccessToken();
                const refreshToken=user.generateRefreshToken();
                await user.save({validateBeforeSave:false});
                return {refreshToken,accessToken};
    } catch (error) {
        throw new ApiError("erro in  generation of token ")||console.log(`error in generate the token ${error}`);
        
    }
}

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
  if (!(email || password)) {
    throw new ApiError(402, "data is not correct or filled properly ");
  }
  const exsitingUser = await User.findOne({ email });
  if (!existeduser) {
    throw new ApiError(401, "user is not exist ,please register!");
  }
  const isPasswordValid = await exsitingUser.correctPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(
      402,
      " password is incorrect please provide the correct  password!!"
    );
  }
    const {accessToken,refreshToken}=generateAccessAndRefereshTokens(exsitingUser._id);

   return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user:exsitingUser,accessToken,refreshToken},"user loggedIn Succesfully!!"));
    
});

export { signup, login };
