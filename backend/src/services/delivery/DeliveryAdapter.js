/**
 * Base Abstract Delivery Adapter Interface
 * All courier implementations (Mock, Shiprocket, Delhivery, BlueDart) must implement these methods.
 */
class DeliveryAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Create a shipment with the courier service
   * @param {Object} params { order, origin, destination, items, weightKg, courierName }
   * @returns {Promise<{ shipmentId, trackingNumber, trackingUrl, courier, shippingFee, rawResponse }>}
   */
  async createShipment(params) {
    throw new Error(`createShipment() is not implemented in ${this.name} adapter.`);
  }

  /**
   * Get estimated delivery shipping rates and transit ETA
   * @param {Object} params { originPincode, destinationPincode, weightKg, cod }
   * @returns {Promise<Array<{ courierName, rate, estimatedDays, minWeight }>>}
   */
  async getRates(params) {
    throw new Error(`getRates() is not implemented in ${this.name} adapter.`);
  }

  /**
   * Fetch live tracking status and milestone history
   * @param {Object} params { trackingNumber, shipmentId, courier }
   * @returns {Promise<{ status, currentLocation, estimatedDelivery, events: Array<{ status, location, message, timestamp }> }>}
   */
  async getTracking(params) {
    throw new Error(`getTracking() is not implemented in ${this.name} adapter.`);
  }

  /**
   * Cancel an existing shipment with the courier
   * @param {Object} params { shipmentId, trackingNumber, reason }
   * @returns {Promise<{ success, message, rawResponse }>}
   */
  async cancelShipment(params) {
    throw new Error(`cancelShipment() is not implemented in ${this.name} adapter.`);
  }
}

module.exports = DeliveryAdapter;
