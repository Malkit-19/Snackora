const mongoose = require('mongoose');
const User = require('../models/User');
const { USER_ROLES } = require('./constants');

const ensureAdminUser = async () => {
  try {
    const ADMIN_EMAIL = 'snackora26@gmail.com';
    const ADMIN_PHONE = '+91 7021475382';

    // 1. Ensure superadmin account exists with snackora26@gmail.com
    let adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Snackora Admin',
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        password: 'Tiklam@1902',
        role: USER_ROLES.ADMIN,
        status: 'ACTIVE',
        isActive: true
      });
      console.log(`[Admin Safeguard] Created super admin account: ${ADMIN_EMAIL} with phone: ${ADMIN_PHONE}`);
    } else {
      adminUser.role = USER_ROLES.ADMIN;
      adminUser.phone = ADMIN_PHONE;
      adminUser.password = 'Tiklam@1902';
      adminUser.isActive = true;
      adminUser.status = 'ACTIVE';
      await adminUser.save();
      console.log(`[Admin Safeguard] Updated ${ADMIN_EMAIL} with phone ${ADMIN_PHONE} and active ADMIN role.`);
    }

    // 2. Set all other users in database to CUSTOMER role
    const demoteResult = await User.updateMany(
      { email: { $ne: ADMIN_EMAIL }, role: { $ne: USER_ROLES.CUSTOMER } },
      { $set: { role: USER_ROLES.CUSTOMER } }
    );
    if (demoteResult.modifiedCount > 0) {
      console.log(`[Admin Safeguard] Converted ${demoteResult.modifiedCount} user(s) to CUSTOMER role.`);
    }
  } catch (err) {
    console.warn('[Admin Safeguard Warning] Error ensuring admin account:', err.message);
  }
};


const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snackora';
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    await ensureAdminUser();
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
  }
};

module.exports = connectDB;

