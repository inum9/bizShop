import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../utils/imagesUpload.js";
import Product from "../model/product.model.js";

export const uploadProductImages = upload.array('images', 5);

const createProduct=asyncHandler(async (req,res)=>{
         if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners with an associated store can create products. Please create your store first.');
  }
  const storeId = req.user.storeId; 
   const images = req.files.map(file => ({ url: `/img/products/${file.filename}` }));
const { name, description, price, priceDiscount, stock, category, brand } = req.body;

         if (!name || !description || !price || !stock) {
    throw new ApiError(400, 'Please provide product name, description, price, and stock.');
  }


  // 4. Create the product in the database
  const newProduct = await Product.create({
    name,
    description,
    price,
    priceDiscount,
    stock,
    images, // Array of image objects with URLs
    category,
    brand,
    store: storeId, // Link product to the authenticated user's store using its _id
  });
if(!newProduct)
{
    throw new ApiError(401," product cannot created ")
}
return res.status(200).json(new ApiResponse(200,newProduct,"product created successfully "));
});
export{createProduct}