// src/utils/imageUpload.js
import multer from 'multer';
import path from 'path'; // Node.js built-in module for working with file paths
import { fileURLToPath } from 'url'; // Node.js utility to convert file URLs to paths in ESM
import { ApiError } from './ApiError.js'; // Assuming ApiError is in utils

// In ES Modules, __dirname is not directly available.
// We derive it using import.meta.url and Node.js's 'path' module.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configure storage: Where to save files and how to name them
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // This constructs the absolute path to your 'public/img/products' folder.
    // path.join combines path segments.
    // __dirname is the directory of this current file (src/utils).
    // '..' goes up one level (to src/).
    // '..' again goes up another level (to your project root: bizshop-backend/).
    // Then it goes into 'public', 'img', 'products'.
    cb(null, path.join(__dirname, '..', '..', 'public', 'img', 'products'));
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions and security issues.
    // Example: product-1678901234567-123456789.jpeg
    const ext = file.mimetype.split('/')[1]; // Extracts 'jpeg', 'png', etc.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `product-${uniqueSuffix}.${ext}`);
  },
});

// 2. Configure file filter: Only allow image files
// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) {
//     cb(null, true); // Accept the file
//   } else {
//     // Reject the file with an error using our custom ApiError
//     cb(new ApiError(400, 'Not an image! Please upload only images.'), false);
//   }
// };

// 3. Initialize Multer upload instance
export const upload = multer({
  storage: multerStorage,

  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB (5 * 1024 * 1024 bytes)
  },
});