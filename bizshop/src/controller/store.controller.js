import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../utils/imagesUpload.js";
import Store from "../model/Store.model.js";

const createStore = asyncHandler(async (req, res) => {
  if (req.user.storeId) {
    throw new ApiError(
      401,
      "User already having the store cannot create another"
    );
  }
  // 2. Extract store data from request body
  const { name, description, email, phone, address, themeColor } = req.body;
  if (!name) {
    throw new ApiError(401, "name is required for the store");
  }
// create the new store
  const newStore = await Store.create({
    name,
    description,
    email,
    phone,
    address,
    themeColor,
    owner: req.user._id,
  });
  if (!newStore) {
    throw new ApiError(401, "user cannot creat the store ");
  }
  req.user.storeId = newStore._id;
  await req.user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, newStore, "store created successfully"));
});
const getMyStore=asyncHandler(async(req,res)=>{
         if (!req.user.storeId) {
    throw new ApiError(404, 'You do not have an associated store yet.');
  }
   const store = await Store.findOne({ owner: req.user._id });
     if (!store) {
    // This case should ideally not happen if req.user.storeId is set,
    // but it's a safeguard if the store was deleted manually from DB.
    throw new ApiError(404, 'Store not found for this user.');
  }

    res.status(200).json(
    new ApiResponse(
      200,
      store,
      'Store details fetched successfully!'
    )
  );
});

const updateMystore= asyncHandler(async(req,res)=>{
  // Check if the user has a store associated
  if (!req.user.storeId) {
    throw new ApiError(404, 'You do not have an associated store to update.');
  }
    const updatedStore = await Store.findOneAndUpdate(
    { owner: req.user._id },
    req.body, // Update with fields from request body
    {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Run schema validators on update
    }
  );
  if(!updatedStore)
  {
    throw new ApiError(401,"store is not updated !!")
  }
   res.status(200).json(
    new ApiResponse(
      200,
      updatedStore,
      'Store updated successfully!'
    )
  );
});

const deactivateMyStore = asyncHandler(async (req, res, next) => {
  if (!req.user.storeId) {
    throw new ApiError(404, 'You do not have an associated store to deactivate.');
  }

  // Find and update the store's status to 'inactive'
  const store = await Store.findOneAndUpdate(
    { owner: req.user._id },
    { status: 'inactive' },
    { new: true }
  );

  if (!store) {
    throw new ApiError(404, 'Store not found or could not be deactivated.');
  }

  // Optionally, unset the storeId from the user as well
  req.user.storeId = undefined;
  await req.user.save({ validateBeforeSave: false });

  res.status(204).json( // 204 No Content for successful operation with no response body
    new ApiResponse(
      204,
      null,
      'Store deactivated successfully!'
    )
  );
});
export { createStore,getMyStore,updateMystore,deactivateMyStore };
