 // src/controllers/billingController.js
// ... (existing imports)
import EarlyBirdConfig from '../model/earlybird.model.js'; // Import the new model

// ... (calculateOrderTotals helper function)

// ... (existing createRazorpayOrder function - we will modify this one)

/**
 * @desc    Get current Early Bird offer status and availability
 * @route   GET /api/v1/billing/early-bird-status
 * @access  Public (or protected if only logged-in users can see it)
 */
export const getEarlyBirdStatus = asyncHandler(async (req, res, next) => {
    let config = await EarlyBirdConfig.findOne();

    // If no config exists, create a default one (or throw error if required to be set by admin)
    if (!config) {
        config = await EarlyBirdConfig.create({}); // Creates with default values from schema
    }

    const availableSlots = config.isActive ? Math.max(0, config.maxUsers - config.usersClaimed) : 0;
    const isAvailable = availableSlots > 0;

    res.status(200).json(
        new ApiResponse(
            200,
            {
                isActive: config.isActive,
                isAvailable: isAvailable,
                maxUsers: config.maxUsers,
                usersClaimed: config.usersClaimed,
                availableSlots: availableSlots,
                offerType: config.offerType,
                discountedAmount: config.discountedAmount,
                durationDays: config.durationDays,
            },
            'Early Bird status fetched successfully!'
        )
    );
});


/**
 * @desc    Process plan selection (including Early Bird and Paid plans)
 * @route   POST /api/v1/billing/process-plan
 * @access  Protected
 * @body    { planType: "Free" | "Early Bird" | "Paid" }
 * @notes   This replaces createRazorpayOrder and handles all plan activations.
 */
export const processPlanSelection = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, 'Unauthorized: Please log in to select a plan.');
    }

    const { planType } = req.body;

    if (!planType || !['Free', 'Early Bird', 'Paid'].includes(planType)) {
        throw new ApiError(400, 'Invalid plan type provided. Must be "Free", "Early Bird", or "Paid".');
    }

    let user = await User.findById(req.user._id); // Fetch latest user data
    if (!user) {
        throw new ApiError(404, 'User not found.');
    }

    // --- Handle "Free" Plan ---
    if (planType === 'Free') {
        user.subscriptionStatus = 'Free';
        user.subscriptionExpiresAt = undefined; // No expiry for free plan
        user.earlyBirdQuotaUsed = false; // Reset if they downgrade
        await user.save({ validateBeforeSave: false });
        return res.status(200).json(new ApiResponse(200, { subscriptionStatus: 'Free' }, 'Switched to Free plan successfully.'));
    }

    // --- Handle "Early Bird" Plan ---
    if (planType === 'Early Bird') {
        let earlyBirdConfig = await EarlyBirdConfig.findOne();
        if (!earlyBirdConfig) {
            // Create default if not exists, or throw error if it's strictly admin-set
            earlyBirdConfig = await EarlyBirdConfig.create({});
        }

        // Check eligibility
        if (!earlyBirdConfig.isActive || earlyBirdConfig.usersClaimed >= earlyBirdConfig.maxUsers) {
            throw new ApiError(403, 'Early Bird offer is no longer available or has expired.');
        }
        if (user.earlyBirdQuotaUsed) { // Prevent user from claiming multiple times
            throw new ApiError(400, 'You have already claimed the Early Bird offer.');
        }

        // Apply Early Bird plan details
        user.subscriptionStatus = 'Early Bird';
        user.subscriptionExpiresAt = new Date(Date.now() + earlyBirdConfig.durationDays * 24 * 60 * 60 * 1000);
        user.earlyBirdQuotaUsed = true; // Mark as claimed

        if (earlyBirdConfig.offerType === 'free') {
            // Free Early Bird: No payment needed, just update status
            await user.save({ validateBeforeSave: false });

            // Increment claimed count
            earlyBirdConfig.usersClaimed += 1;
            await earlyBirdConfig.save({ validateBeforeSave: false });

            return res.status(200).json(new ApiResponse(200, { subscriptionStatus: 'Early Bird', offerDetails: 'Free access for ' + earlyBirdConfig.durationDays + ' days.' }, 'Early Bird plan activated successfully!'));

        } else if (earlyBirdConfig.offerType === 'discounted') {
            // Discounted Early Bird: Proceed to create Razorpay order for discounted amount
            const amount = earlyBirdConfig.discountedAmount;
            const currency = 'INR'; // Assuming INR for now

            const receiptId = `eb_${req.user._id}_${Date.now()}`;
            const orderOptions = {
                amount: amount * 100, // Amount in paise
                currency,
                receipt: receiptId,
                payment_capture: 1,
                notes: {
                    userId: req.user._id.toString(),
                    planType: 'Early Bird',
                    email: req.user.email,
                    // We'll also update user.subscriptionStatus to 'Early Bird' upon webhook success
                },
            };

            try {
                const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
                // The actual subscription status update to 'Early Bird' happens on webhook success
                return res.status(200).json(new ApiResponse(
                    200,
                    {
                        orderId: razorpayOrder.id,
                        currency: razorpayOrder.currency,
                        amount: razorpayOrder.amount,
                        receipt: razorpayOrder.receipt,
                        keyId: process.env.RAZORPAY_KEY_ID,
                        userEmail: req.user.email,
                        userName: req.user.name,
                        message: 'Proceed to payment for discounted Early Bird plan.'
                    },
                    'Razorpay order created for discounted Early Bird!'
                ));
            } catch (error) {
                console.error('Error creating Razorpay order for discounted Early Bird:', error);
                throw new ApiError(500, 'Failed to create payment order for discounted Early Bird. Please try again.');
            }
        }
    }

    // --- Handle "Paid" Plan ---
    if (planType === 'Paid') {
        // Assume 'Paid' plan has a fixed amount, or amount comes from req.body
        const amount = req.body.amount || 1999; // Example: Default paid plan is 1999 INR
        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Amount is required for Paid plan and must be positive.');
        }

        const currency = 'INR';
        const receiptId = `paid_${req.user._id}_${Date.now()}`;
        const orderOptions = {
            amount: amount * 100, // Amount in paise
            currency,
            receipt: receiptId,
            payment_capture: 1,
            notes: {
                userId: req.user._id.toString(),
                planType: 'Paid',
                email: req.user.email,
                // We'll update user.subscriptionStatus to 'Paid' upon webhook success
            },
        };

        try {
            const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
            return res.status(200).json(new ApiResponse(
                200,
                {
                    orderId: razorpayOrder.id,
                    currency: razorpayOrder.currency,
                    amount: razorpayOrder.amount,
                    receipt: razorpayOrder.receipt,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    userEmail: req.user.email,
                    userName: req.user.name,
                    message: 'Proceed to payment for Paid plan.'
                },
                'Razorpay order created for Paid plan!'
            ));
        } catch (error) {
            console.error('Error creating Razorpay order for Paid plan:', error);
            throw new ApiError(500, 'Failed to create payment order for Paid plan. Please try again.');
        }
    }
});

// ... (existing handleRazorpayWebhook and getUserSubscriptionStatus functions)
// Modify handleRazorpayWebhook to increment EarlyBirdConfig.usersClaimed if planType is 'Early Bird'

// Updated handleRazorpayWebhook (ONLY if `payment.captured` has `notes.planType`)
// This assumes the `notes` sent in `orderOptions` during `processPlanSelection` are correct.
// If you're implementing this as the main webhook, replace your existing one.
export const handleRazorpayWebhook = asyncHandler(async (req, res, next) => {
    const razorpaySignature = req.headers['x-razorpay-signature'];
    const webhookSecret = RAZORPAY_WEBHOOK_SECRET;

    if (!razorpaySignature || !webhookSecret) {
        console.error('Razorpay Webhook Error: Missing signature header or webhook secret.');
        return res.status(400).json({ status: 'error', message: 'Webhook validation failed: Missing headers or secret.' });
    }

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== razorpaySignature) {
        console.error('Razorpay Webhook Error: Invalid signature.');
        return res.status(400).json({ status: 'error', message: 'Webhook validation failed: Invalid signature.' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`Razorpay Webhook Event Received: ${event}`);

    let user;
    let planTypeFromWebhook;
    let orderNotes;

    try {
        switch (event) {
            case 'payment.authorized':
            case 'payment.captured':
                const payment = payload.payment;
                orderNotes = payment.notes;
                const userId = orderNotes.userId;
                planTypeFromWebhook = orderNotes.planType; // Get planType from notes

                if (userId && planTypeFromWebhook) {
                    user = await User.findById(userId);
                    if (user) {
                        // Activate subscription
                        user.subscriptionStatus = planTypeFromWebhook;
                        user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days or get from plan details

                        // Handle Early Bird specific logic
                        if (planTypeFromWebhook === 'Early Bird' && !user.earlyBirdQuotaUsed) {
                            user.earlyBirdQuotaUsed = true;
                            // Increment claimed count in EarlyBirdConfig
                            await EarlyBirdConfig.findOneAndUpdate(
                                { isActive: true, usersClaimed: { $lt: '$maxUsers' } },
                                { $inc: { usersClaimed: 1 } }
                            );
                            // Adjust subscription expiry for Early Bird if configured differently
                            const ebConfig = await EarlyBirdConfig.findOne();
                            if (ebConfig && ebConfig.offerType === 'discounted' && ebConfig.durationDays) {
                                user.subscriptionExpiresAt = new Date(Date.now() + ebConfig.durationDays * 24 * 60 * 60 * 1000);
                            }
                        }

                        await user.save({ validateBeforeSave: false });
                        console.log(`User ${user.email} subscription activated to ${planTypeFromWebhook}.`);
                    }
                }
                break;

            // ... (other payment.failed, subscription.activated/charged/cancelled cases as before)

            default:
                console.log(`Unhandled Razorpay event: ${event}`);
        }
    } catch (processError) {
        console.error('Error processing Razorpay webhook event:', processError);
    }
    res.status(200).json({ status: 'success', message: 'Webhook received' });
});