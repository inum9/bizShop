import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../utils/imagesUpload.js";
import Product from "../model/product.model.js";
import Store from "../model/Store.model.js";


export const createProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners with an associated store can create products. Please ensure your store is created and linked to your account, then re-login.');
  }

  const storeId = req.user.storeId;

  // --- REMOVED: Image upload validation and processing (req.files related code) ---

  // 1. --- Extract Product Data from `req.body` ---
  // Now expects 'application/json' for body parsing
  const { name, description, price, priceDiscount, stock, category, brand } = req.body;

  // 2. --- Basic Input Validation for Required Fields ---
  if (!name || !description || !price || !stock) {
    throw new ApiError(400, 'Missing required product fields: name, description, price, and stock. Please provide all.');
  }

  // 3. --- Data Type Coercion and Additional Validation ---
  const parsedPrice = parseFloat(price);
  const parsedPriceDiscount = priceDiscount ? parseFloat(priceDiscount) : undefined;
  const parsedStock = parseInt(stock, 10);

  if (isNaN(parsedPrice) || parsedPrice < 0) {
      throw new ApiError(400, 'Price must be a valid non-negative number.');
  }
  if (parsedPriceDiscount !== undefined && (isNaN(parsedPriceDiscount) || parsedPriceDiscount < 0 || parsedPriceDiscount >= parsedPrice)) {
      throw new ApiError(400, 'Discount price must be a valid non-negative number and less than the regular price.');
  }
  if (isNaN(parsedStock) || parsedStock < 0) {
      throw new ApiError(400, 'Stock must be a valid non-negative integer.');
  }

  // 4. --- Create the Product in the Database ---
  const newProduct = await Product.create({
    name,
    description,
    price: parsedPrice,
    priceDiscount: parsedPriceDiscount,
    stock: parsedStock,
    // --- REMOVED: images field ---
    category,
    brand,
    store: storeId, // Link product to the authenticated user's store
  });

  // 5. --- Send Success Response ---
  res.status(201).json(
    new ApiResponse(
      201,
      newProduct,
      'Product created successfully!'
    )
  );
});

/**
 * @desc    Get all products for the authenticated user's store
 * @route   GET /api/v1/products
 * @access  Protected (storeOwner)
 */
export const getAllProducts = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners with an associated store can view products.');
  }

  const storeId = req.user.storeId;

  const queryObj = { ...req.query, store: storeId };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  let queryString = JSON.stringify(queryObj);
  queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  const filter = JSON.parse(queryString);

  let query = Product.find(filter);

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const totalProducts = await Product.countDocuments(filter);

  if (req.query.page && skip >= totalProducts && totalProducts > 0) {
    throw new ApiError(404, 'This page does not exist');
  }

  const products = await query;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        total: totalProducts,
        results: products.length,
        page,
        limit,
        products,
      },
      'Products fetched successfully!'
    )
  );
});

/**
 * @desc    Get a single product by ID for the authenticated user's store
 * @route   GET /api/v1/products/:id
 * @access  Protected (storeOwner)
 */
export const getProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners can view their products.');
  }

  const storeId = req.user.storeId;
  const productId = req.params.id;

  const product = await Product.findOne({ _id: productId, store: storeId });

  if (!product) {
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

/**
 * @desc    Update a product by ID for the authenticated user's store
 * @route   PATCH /api/v1/products/:id
 * @access  Protected (storeOwner)
 */
export const updateProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners can update their products.');
  }

  const storeId = req.user.storeId;
  const productId = req.params.id;

  // --- REMOVED: Image update handling (req.files related code) ---

  const updateData = { ...req.body };
  delete updateData.store; // Prevent users from changing a product's store
  // --- REMOVED: updateData.images = images; ---

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId, store: storeId },
    updateData,
    {
      new: true,
      runValidators: true,
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

/**
 * @desc    Delete a product by ID for the authenticated user's store
 * @route   DELETE /api/v1/products/:id
 * @access  Protected (storeOwner)
 */
export const deleteProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.storeId) {
    throw new ApiError(403, 'Forbidden: Only store owners can delete their products.');
  }

  const storeId = req.user.storeId;
  const productId = req.params.id;

  const deletedProduct = await Product.findOneAndDelete({ _id: productId, store: storeId });

  if (!deletedProduct) {
    throw new ApiError(404, 'Product not found or you do not have permission to delete it.');
  }

  res.status(204).json(
    new ApiResponse(
      204,
      null,
      'Product deleted successfully!'
    )
  );
});