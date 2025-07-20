// src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import validator from 'validator'; // For email validation
import crypto from 'crypto'; // Node.js built-in module for generating random tokens
import jwt from 'jsonwebtoken'; // FIX 22: Added missing jwt import for generateAccessToken/RefreshToken

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A user must have a name'],
      trim: true,
      maxlength: [40, 'A user name must have less or equal than 40 characters'],
      minlength: [3, 'A user name must have more or equal than 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'A user must have an email'],
      unique: true,
      lowercase: true, // Convert email to lowercase before saving
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: [8, 'A password must be at least 8 characters long'],
      select: false, // Prevents the password from being returned in query results by default
    },
    passwordConfirm: { // For input validation only, not stored in DB
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // This only works on CREATE and SAVE!!! (not findByIdAndUpdate, etc.)
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
      select: false, // Prevents it from being returned even if it were stored
    },
    // --- Authentication & Security Fields ---
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false, // We usually don't want to expose this in API responses
    },
    // --- Roles & Permissions (Crucial for SaaS features like Admin/StoreOwner) ---
    role: {
      type: String,
      enum: ['user', 'storeOwner', 'admin'], // 'user' could be someone just registered, 'storeOwner' creates stores
      default: 'user',
    },
    // --- BizShop Specific: Subscription & Early Bird Features ---
    subscriptionStatus: {
      type: String,
      enum: ['Free', 'Early Bird', 'Paid'],
      default: 'Free',
    },
    subscriptionExpiresAt: Date, // For tracking when a paid or early bird subscription ends
    earlyBirdQuotaUsed: { // To track if a user has already claimed the early bird offer
      type: Boolean,
      default: false,
    },
     storeId: { // This will hold the ObjectId of the store they own
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store', // Ensure this matches the model name 'Store'
      // unique: true // If one user can only own ONE store.
      // required: true // A user needs to create a store to use BizShop.
                       // We can make this required when a store is created.
    },
    refreshToken: String, // Correctly added
    // --- Association with their created Store (Multi-tenancy) ---
    storeId: { // This will hold the ObjectId of the store they own
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store', // Reference to the 'Store' model (which we will create next)
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps automatically
    toJSON: { virtuals: true }, // Include virtual properties when converting to JSON
    toObject: { virtuals: true }, // Include virtual properties when converting to Object

  },

 
);

// --- Mongoose Middleware (Pre-save hooks) ---
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   this.passwordConfirm = undefined;
//   next();
// });

// userSchema.pre('save', function (next) {
//   if (!this.isModified('password') || this.isNew) return next();
//   this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

// userSchema.pre(/^find/, function (next) {
//   this.find({ active: { $ne: false } });
//   next();
// });

// // --- Mongoose Instance Methods ---

// // 1) Method to compare passwords during login
// userSchema.methods.correctPassword = async function (
//   candidatePassword, // This is the plain text password from req.body
//   userPassword // This is the hashed password from the DB (retrieved with select('+password'))
// ) {
//   // FIX 23: Added a check for missing arguments for robustness
//   if (!candidatePassword || !userPassword) {
//       console.error('correctPassword: Missing candidatePassword or userPassword');
//       return false;
//   }
//   return await bcrypt.compare(candidatePassword, userPassword);
// };

// // 2) Method to check if password was changed after a JWT was issued
// userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
//   if (this.passwordChangedAt) {
//     const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
//     return JWTTimestamp < changedTimestamp;
//   }
//   return false;
// };

// // 3) Method to generate a password reset token
// userSchema.methods.createPasswordResetToken = function () {
//   const resetToken = crypto.randomBytes(32).toString('hex');
//   this.passwordResetToken = crypto
//     .createHash('sha256')
//     .update(resetToken)
//     .digest('hex');
//   console.log({ resetToken }, this.passwordResetToken);
//   this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
//   return resetToken;
// };
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name, // FIX 24: Changed 'username' to 'name' to match schema
            role: this.role // FIX 25: Added 'role' for quick access in token payload
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

const User = mongoose.model('User', userSchema);

export default User;