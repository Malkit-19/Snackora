const mongoose = require('mongoose');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');
const whatsappService = require('./whatsappService');

/**
 * Snackora — Automated Birthday Tracking & Reward Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects customer and B2B user birthdays, dynamically issues personalized
 * free cookie / surprise vouchers, creates in-app notification alerts, and
 * dispatches real-time WhatsApp greetings.
 */
class BirthdayService {
  /**
   * Process all users celebrating their birthday today
   * @param {Date} [customDate] - Optional date override for testing/simulation
   */
  async checkAndDispatchBirthdayRewards(customDate = new Date()) {
    const today = customDate instanceof Date ? customDate : new Date(customDate);
    const targetMonth = today.getMonth() + 1; // 1-12
    const targetDay = today.getDate();        // 1-31
    const currentYear = today.getFullYear();

    console.log(`🎂 [BirthdayService] Checking birthdays for Month: ${targetMonth}, Day: ${targetDay}, Year: ${currentYear}`);

    // Query active users with DOB matching target month & day, and not yet rewarded this year
    const birthdayUsers = await User.find({
      isActive: true,
      dob: { $exists: true, $ne: null },
      $expr: {
        $and: [
          { $eq: [{ $month: '$dob' }, targetMonth] },
          { $eq: [{ $dayOfMonth: '$dob' }, targetDay] },
          {
            $or: [
              { $not: ['$lastBirthdayRewardYear'] },
              { $lt: ['$lastBirthdayRewardYear', currentYear] }
            ]
          }
        ]
      }
    });

    console.log(`🎂 [BirthdayService] Found ${birthdayUsers.length} user(s) celebrating today!`);

    const results = [];

    for (const user of birthdayUsers) {
      try {
        const userPrefix = (user.name || 'SNACK')
          .replace(/[^a-zA-Z]/g, '')
          .toUpperCase()
          .slice(0, 5) || 'SNACK';
        const randomPin = Math.floor(100 + Math.random() * 900);
        const couponCode = `BDAY-${userPrefix}-${randomPin}`;

        const expiryDate = new Date(today);
        expiryDate.setDate(expiryDate.getDate() + 14); // Valid for 14 days

        // 1. Create Exclusive Birthday Coupon
        const coupon = await Coupon.create({
          code: couponCode,
          type: 'PERCENTAGE',
          value: 100, // 100% OFF on cookie / special discount
          maximumDiscount: 250, // Up to ₹250 free treat
          minimumOrder: 0,
          expiry: expiryDate,
          usageLimit: 1,
          perUserLimit: 1,
          eligibleRole: 'ALL',
          description: `🎂 Birthday Special: Free Gourmet Cookies Treat (Voucher: ${couponCode})`,
          isActive: true
        });

        // 2. Create In-App Notification
        const notification = await Notification.create({
          user: user._id,
          type: 'PROMOTION',
          title: `🎉 Happy Birthday, ${user.name}! Free Cookies Gift Inside! 🍪`,
          message: `Wishing you a delicious and joyous birthday! Here is your exclusive birthday perk: Use code '${couponCode}' for a FREE pack of gourmet butter cookies with your order.`,
          link: '/shop?category=cookies',
          read: false
        });

        // 3. Dispatch Real-Time WhatsApp Notification
        let whatsappResult = { delivered: false, reason: 'NO_PHONE' };
        if (user.phone) {
          whatsappResult = await whatsappService.sendBirthdayWish(
            user,
            couponCode,
            'FREE Box of Gourmet Handcrafted Cookies (Up to ₹250 Value)'
          );
        }

        // 4. Record Reward Year on User Model
        user.lastBirthdayRewardYear = currentYear;
        await user.save();

        results.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          couponCode,
          notificationId: notification._id,
          whatsappResult
        });
      } catch (err) {
        console.error(`❌ [BirthdayService] Error processing user ${user._id} (${user.email}):`, err.message);
      }
    }

    return {
      success: true,
      processedDate: today.toISOString().split('T')[0],
      totalCelebrated: results.length,
      users: results
    };
  }
}

module.exports = new BirthdayService();
