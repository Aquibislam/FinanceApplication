const User = require('../models/User');

// @desc    Save or update financial profile
// @route   POST /api/user/financial-profile
// @access  Private
exports.saveFinancialProfile = async (req, res, next) => {
  try {
    const { netPay, mutualFundSips, personalExpenses, miscellaneousExpenses } =
      req.body;

    // Basic validation: must be numbers and non-negative if provided
    const fields = {
      netPay,
      mutualFundSips,
      personalExpenses,
      miscellaneousExpenses,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: `${key} must be a non-negative number`,
          });
        }
      }
    }

    const update = {
      ...fields,
      financialProfileCompleted: true,
    };

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Financial profile saved',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          financialProfileCompleted: user.financialProfileCompleted,
          netPay: user.netPay,
          mutualFundSips: user.mutualFundSips,
          personalExpenses: user.personalExpenses,
          miscellaneousExpenses: user.miscellaneousExpenses,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile (including financial data)
// @route   GET /api/user/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          financialProfileCompleted: user.financialProfileCompleted,
          netPay: user.netPay,
          mutualFundSips: user.mutualFundSips,
          personalExpenses: user.personalExpenses,
          miscellaneousExpenses: user.miscellaneousExpenses,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile by email (including financial data)
// @route   GET /api/user/profile/:email
// @access  Private (can relax to public if needed)
exports.getProfileByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          financialProfileCompleted: user.financialProfileCompleted,
          netPay: user.netPay,
          mutualFundSips: user.mutualFundSips,
          personalExpenses: user.personalExpenses,
          miscellaneousExpenses: user.miscellaneousExpenses,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Update user profile (name and financial data)
// @route   PUT /api/user/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { email } = req.params;
    const {
      name,
      netPay,
      mutualFundSips,
      personalExpenses,
      miscellaneousExpenses,
    } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (netPay !== undefined) fieldsToUpdate.netPay = netPay;
    if (mutualFundSips !== undefined)
      fieldsToUpdate.mutualFundSips = mutualFundSips;
    if (personalExpenses !== undefined)
      fieldsToUpdate.personalExpenses = personalExpenses;
    if (miscellaneousExpenses !== undefined)
      fieldsToUpdate.miscellaneousExpenses = miscellaneousExpenses;

    // If any financial fields are updated, mark profile as completed
    const financialFields = [
      'netPay',
      'mutualFundSips',
      'personalExpenses',
      'miscellaneousExpenses',
    ];
    const hasFinancialUpdate = financialFields.some(
      (field) => field in fieldsToUpdate
    );

    if (hasFinancialUpdate) {
      fieldsToUpdate.financialProfileCompleted = true;
    }

    const user = await User.findOneAndUpdate({ email }, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          financialProfileCompleted: user.financialProfileCompleted,
          netPay: user.netPay,
          mutualFundSips: user.mutualFundSips,
          personalExpenses: user.personalExpenses,
          miscellaneousExpenses: user.miscellaneousExpenses,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
