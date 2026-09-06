const birthdayService = require('../services/birthdayService');

/**
 * Birthday Automation Scheduler
 * Runs periodic checks to dispatch birthday perks, coupons & WhatsApp wishes
 */
function initBirthdayScheduler() {
  console.log('🎂 [BirthdayScheduler] Initialized automated daily birthday reward engine.');

  // Run initial check shortly after startup (10 seconds delay)
  setTimeout(async () => {
    try {
      await birthdayService.checkAndDispatchBirthdayRewards();
    } catch (err) {
      console.warn('⚠️ [BirthdayScheduler] Initial run warning:', err.message);
    }
  }, 10000);

  // Run recurring check every 12 hours
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await birthdayService.checkAndDispatchBirthdayRewards();
    } catch (err) {
      console.warn('⚠️ [BirthdayScheduler] Recurring run warning:', err.message);
    }
  }, TWELVE_HOURS);
}

module.exports = { initBirthdayScheduler };
