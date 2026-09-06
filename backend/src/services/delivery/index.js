const MockDeliveryAdapter = require('./MockDeliveryAdapter');
const ShiprocketDeliveryAdapter = require('./ShiprocketDeliveryAdapter');

class DeliveryService {
  constructor() {
    this.adapters = {
      mock: new MockDeliveryAdapter(),
      shiprocket: new ShiprocketDeliveryAdapter()
    };

    const requestedProvider = (process.env.DELIVERY_PROVIDER || 'mock').toLowerCase();

    if (requestedProvider === 'shiprocket' && this.adapters.shiprocket.hasValidCredentials()) {
      this.activeAdapter = this.adapters.shiprocket;
      console.log('🚚 [DeliveryService] Initialized with Live Shiprocket Adapter.');
    } else {
      this.activeAdapter = this.adapters.mock;
      console.log(`🚚 [DeliveryService] Initialized with Mock Delivery Adapter (provider: ${requestedProvider}).`);
    }
  }

  getActiveProviderName() {
    return this.activeAdapter.name;
  }

  async createShipment(params) {
    return this.activeAdapter.createShipment(params);
  }

  async getRates(params) {
    return this.activeAdapter.getRates(params);
  }

  async getTracking(params) {
    return this.activeAdapter.getTracking(params);
  }

  async cancelShipment(params) {
    return this.activeAdapter.cancelShipment(params);
  }
}

// Singleton instance
const deliveryService = new DeliveryService();

module.exports = deliveryService;
