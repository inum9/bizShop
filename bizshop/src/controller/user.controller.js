import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../model/user.model.js";

const signup =asyncHandler(async(req,res)=>{
             const { name, email, password, passwordConfirm, role } = req.body;
             if(!(name||email||password||passwordConfirm||role))
             {
                throw new ApiError(401,"all fields are required please fill all the fields !");
             }

            const existeduser=  await User.findOne({
                $or:[{email}]
             });
             if(existeduser)
             {
                throw new ApiError(401,"user with same email or name already exist")
             }
            const newUser= await User.create({
                name,email,password,passwordConfirm,role:role||"user"
             });
             if(!newUser)
             {
                throw new ApiError(402,"user is not created successfully as you left some data to filled");
             }
             
             return res.status(200,newUser,"user is signed up sucessfully!!");

});

export {signup}