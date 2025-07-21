import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../utils/imagesUpload.js";
import Product from "../model/product.model.js";
import Store from "../model/Store.model.js";

export const uploadProductImages = upload.array("images", 5);

const createProduct = asyncHandler(async (req, res, next) => {
  // 1. --- Authorization and Store Check ---
  // The 'protect' and 'restrictTo('storeOwner')' middlewares (applied in routes)
  // ensure that `req.user` is available and has the 'storeOwner' role.
  // We need `req.user.storeId` to link the product to the correct store.
  if (!req.user || !req.user.storeId) {
    throw new ApiError(
      403,
      "Forbidden: Only store owners with an associated store can create products. Please ensure your store is created and linked to your account, then re-login."
    );
  }

  const storeId = req.user.storeId; // Get the store ID from the authenticated user's session

  // // 2. --- Image Upload Validation and Processing ---
  // // Multer populates `req.files` with an array of file objects if `upload.array` is used.
  // if (!req.files || req.files.length === 0) {
  //   throw new ApiError(
  //     400,
  //     "Product images are required. Please upload at least one image."
  //   );
  // }

  // // Map uploaded files to an array of image objects with URLs (local paths for now)
  // // In a production environment, this is where you'd upload to cloud storage (e.g., Cloudinary, AWS S3)
  // const images = req.files.map((file) => ({
  //   url: `/bizshop/public/${file.filename}`,
  // }));

  // 3. --- Extract Product Data from `req.body` ---
  // Multer parses 'multipart/form-data' and populates `req.body` with text fields.
  // Ensure your client (Postman/frontend) sends text fields as 'Text' type in 'form-data'.
  const { name, description, price, priceDiscount, stock, category, brand } =
    req.body;

  // 4. --- Basic Input Validation for Required Fields ---
  // Validate that essential product fields are provided.
  if (!name || !description || !price || !stock) {
    throw new ApiError(
      400,
      "Missing required product fields: name, description, price, and stock. Please provide all."
    );
  }

  // 5. --- Data Type Coercion and Additional Validation ---
  // Ensure numerical fields are parsed correctly, as form-data sends everything as strings.
  const parsedPrice = parseFloat(price);
  const parsedPriceDiscount = priceDiscount
    ? parseFloat(priceDiscount)
    : undefined;
  const parsedStock = parseInt(stock, 10);

  // Additional server-side validation for numbers
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new ApiError(400, "Price must be a valid non-negative number.");
  }
  if (
    parsedPriceDiscount !== undefined &&
    (isNaN(parsedPriceDiscount) ||
      parsedPriceDiscount < 0 ||
      parsedPriceDiscount >= parsedPrice)
  ) {
    throw new ApiError(
      400,
      "Discount price must be a valid non-negative number and less than the regular price."
    );
  }
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new ApiError(400, "Stock must be a valid non-negative integer.");
  }

  // 6. --- Create the Product in the Database ---
  const newProduct = await Product.create({
    name,
    description,
    price: parsedPrice,
    priceDiscount: parsedPriceDiscount,
    stock: parsedStock,
    // images, // Array of image objects with URLs
    category,
    brand,
    store: storeId, // Link product to the authenticated user's store
  });

  // 7. --- Send Success Response ---
  res.status(201).json(
    new ApiResponse(
      201,
      newProduct, // The newly created product document
      "Product created successfully!"
    )
  );
});

const getAllProducts = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(
      403,
      "Forbidden: Only store owners with an associated store can view products."
    );
  }

  const storeId = req.user.storeId; // Filter products by the authenticated user's store

  // Build the query object for MongoDB
  const queryObj = { ...req.query, store: storeId }; // Start with req.query and add store filter

  // Exclude fields related to pagination, sorting, field limiting from the filter
  // const excludedFields = ["page", "sort", "limit", "fields"];
  // excludedFields.forEach((el) => delete queryObj[el]);

  // Advanced filtering for price, ratings (gte, gt, lte, lt)
  let queryString = JSON.stringify(queryObj);
  queryString = queryString.replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`
  );
  const filter = JSON.parse(queryString);

  let query = Product.find(filter); // Start building the Mongoose query

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt"); // Default sort by newest first
  }

  // Field Limiting (selecting specific fields to return)
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v"); // Exclude Mongoose's internal version key by default
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit; // Calculate documents to skip

  query = query.skip(skip).limit(limit);

  // Count total documents for pagination metadata
  const totalProducts = await Product.countDocuments(filter); // Use the same filter for count

  // Handle case where requested page exceeds available documents
  if (req.query.page && skip >= totalProducts && totalProducts > 0) {
    throw new ApiError(404, "This page does not exist");
  }

  // Execute the query
  const products = await query;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        total: totalProducts,
        results: products.length,
        page,
        limit,
        products, // The array of product documents
      },
      "Products fetched successfully!"
    )
  );
});
const getProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners can view their products.');
  }

  const storeId = req.user.storeId;
  const productId = req.params.id; // Get product ID from URL parameters

  // Find product by ID AND ensure it belongs to the authenticated user's store
  const product = await Product.findOne({ _id: productId, store: storeId });

  if (!product) {
    // If product is not found or doesn't belong to this store owner
    throw new ApiError(404, 'Product not found or you do not have permission to access it.');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      product,
      'Product fetched successfully!'
    )
  );
});
 const updateProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners can update their products.');
  }

  const storeId = req.user.storeId;
  const productId = req.params.id; // Get product ID from URL parameters

  // Handle image updates if new files are uploaded
  let images = [];
  if (req.files && req.files.length > 0) {
    // If new files are uploaded, map their paths
    images = req.files.map(file => ({ url: `/img/products/${file.filename}` }));
    // In a real app, you'd also handle deleting old images from storage here
  }

  // Create update object from req.body. Disallow updating the 'store' field directly.
  const updateData = { ...req.body };
  delete updateData.store; // Prevent users from changing a product's store
  
  // if (images.length > 0) {
  //   updateData.images = images; // Add new image URLs if provided
  // }

  // Find and update product by ID AND ensure it belongs to the authenticated user's store
  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId, store: storeId }, // Query filter: match by ID AND store
    updateData, // Data to update
    {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Run schema validators on update (e.g., priceDiscount validation)
    }
  );

  if (!updatedProduct) {
    throw new ApiError(404, 'Product not found or you do not have permission to update it.');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      updatedProduct,
      'Product updated successfully!'
    )
  );
});
 

export { createProduct, getAllProducts ,getProduct,updateProduct};
