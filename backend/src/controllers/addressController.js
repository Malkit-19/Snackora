const Address = require('../models/Address');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const VALID_LABELS = ['Home', 'Office', 'Other'];

/**
 * GET /api/addresses
 * List all addresses for the authenticated user
 */
const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 });

    return sendSuccess(res, 'Addresses retrieved successfully.', { addresses });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/addresses
 * Add a new address
 */
const addAddress = async (req, res, next) => {
  try {
    const {
      fullName, phone, addressLine1, addressLine2, street, address: rawAddress,
      city, state, pincode, postalCode, label, isDefault
    } = req.body;

    const line1 = (addressLine1 || street || rawAddress || '').trim();
    const pin = (pincode || postalCode || '').trim();

    // Basic validation
    if (!fullName || !fullName.trim()) {
      return sendError(res, 'Full name is required.', 400, 'VALIDATION_ERROR');
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone.trim())) {
      return sendError(res, 'A valid 10-digit Indian mobile number is required.', 400, 'VALIDATION_ERROR');
    }
    if (!line1) {
      return sendError(res, 'Address line 1 / Street is required.', 400, 'VALIDATION_ERROR');
    }
    if (!city || !city.trim()) {
      return sendError(res, 'City is required.', 400, 'VALIDATION_ERROR');
    }
    if (!state || !state.trim()) {
      return sendError(res, 'State is required.', 400, 'VALIDATION_ERROR');
    }
    if (!pin || !/^\d{6}$/.test(pin)) {
      return sendError(res, 'A valid 6-digit pincode is required.', 400, 'VALIDATION_ERROR');
    }

    const validatedLabel = VALID_LABELS.includes(label) ? label : 'Home';

    // If this is first address OR isDefault explicitly requested, set default
    const existingCount = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = isDefault === true || existingCount === 0;

    // If making this default, unset others first
    if (shouldBeDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const createdAddress = await Address.create({
      user: req.user._id,
      fullName: fullName.trim(),
      name: fullName.trim(),
      phone: phone.trim(),
      addressLine1: line1,
      addressLine2: addressLine2 ? addressLine2.trim() : undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pin,
      postalCode: pin,
      label: validatedLabel,
      isDefault: shouldBeDefault
    });

    return sendSuccess(res, 'Address added successfully.', { address: createdAddress }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/addresses/:id
 * Edit an existing address
 */
const updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return sendError(res, 'Address not found.', 404, 'NOT_FOUND');
    }

    const {
      fullName, phone, addressLine1, addressLine2,
      city, state, pincode, label, isDefault
    } = req.body;

    // Validate only provided fields
    if (phone !== undefined && !/^[6-9]\d{9}$/.test(phone.trim())) {
      return sendError(res, 'A valid 10-digit Indian mobile number is required.', 400, 'VALIDATION_ERROR');
    }
    if (pincode !== undefined && !/^\d{6}$/.test(pincode.trim())) {
      return sendError(res, 'A valid 6-digit pincode is required.', 400, 'VALIDATION_ERROR');
    }

    if (fullName !== undefined) {
      address.fullName = fullName.trim();
      address.name = fullName.trim();
    }
    if (phone !== undefined) address.phone = phone.trim();
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2.trim();
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state.trim();
    if (pincode !== undefined) {
      address.pincode = pincode.trim();
      address.postalCode = pincode.trim();
    }
    if (label !== undefined && VALID_LABELS.includes(label)) {
      address.label = label;
      address.addressType = label;
    }
    if (isDefault === true && !address.isDefault) {
      await Address.updateMany({ user: req.user._id, _id: { $ne: address._id } }, { isDefault: false });
      address.isDefault = true;
    }

    await address.save();

    return sendSuccess(res, 'Address updated successfully.', { address });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/addresses/:id
 * Remove an address
 */
const deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return sendError(res, 'Address not found.', 404, 'NOT_FOUND');
    }

    const wasDefault = address.isDefault;
    await address.deleteOne();

    // If deleted address was default, promote the most recent remaining address
    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return sendSuccess(res, 'Address deleted successfully.', {});
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/addresses/:id/default
 * Set a specific address as default
 */
const setDefaultAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return sendError(res, 'Address not found.', 404, 'NOT_FOUND');
    }

    // Unset existing default
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    return sendSuccess(res, 'Default address updated.', { address });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
