const DeliveryAdapter = require('./DeliveryAdapter');
const crypto = require('crypto');

class MockDeliveryAdapter extends DeliveryAdapter {
  constructor() {
    super('MockDeliveryAdapter');
  }

  /**
   * Create a mock shipment
   */
  async createShipment({ order, origin, destination, items, weightKg = 0.5, courierName = 'Blue Dart' }) {
    const courierCode = courierName.toUpperCase().includes('DELHIVERY') ? 'DEL' : 'BD';
    const randDigits = Math.floor(10000000 + Math.random() * 90000000);
    const trackingNumber = `SNK-${courierCode}-${randDigits}`;
    const shipmentId = `SHP_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const trackingUrl = `https://track.snackora.in/shipment/${trackingNumber}`;

    const initialEvents = [
      {
        status: 'LABEL_CREATED',
        location: `${origin?.city || 'Bengaluru'} Warehouse Hub`,
        message: 'Shipping label generated and package manifest created.',
        timestamp: new Date()
      },
      {
        status: 'PICKED_UP',
        location: `${origin?.city || 'Bengaluru'} Warehouse Hub`,
        message: `Handed over to ${courierName} logistics courier.`,
        timestamp: new Date()
      }
    ];

    const baseRate = weightKg > 2 ? 120 : weightKg > 1 ? 80 : 50;

    return {
      shipmentId,
      trackingNumber,
      trackingUrl,
      courier: courierName,
      status: 'PICKED_UP',
      shippingFee: baseRate,
      events: initialEvents,
      rawResponse: {
        provider: 'mock',
        courierId: 104,
        serviceType: 'EXPRESS_SURFACE',
        createdDate: new Date().toISOString()
      }
    };
  }

  /**
   * Get estimated rates
   */
  async getRates({ originPincode = '560001', destinationPincode, weightKg = 0.5, cod = false }) {
    const weight = Number(weightKg) || 0.5;
    const baseMultiplier = Math.ceil(weight);

    return [
      {
        courierName: 'Blue Dart Express',
        courierCode: 'BLUEDART',
        rate: 65 * baseMultiplier + (cod ? 40 : 0),
        estimatedDays: 2,
        etd: '2-3 Business Days',
        minWeight: 0.5
      },
      {
        courierName: 'Delhivery Surface',
        courierCode: 'DELHIVERY',
        rate: 45 * baseMultiplier + (cod ? 35 : 0),
        estimatedDays: 3,
        etd: '3-4 Business Days',
        minWeight: 0.5
      },
      {
        courierName: 'Shadowfax Priority',
        courierCode: 'SHADOWFAX',
        rate: 55 * baseMultiplier + (cod ? 30 : 0),
        estimatedDays: 2,
        etd: '1-2 Business Days',
        minWeight: 0.5
      }
    ];
  }

  /**
   * Fetch simulated live tracking
   */
  async getTracking({ trackingNumber, shipmentId, courier = 'Blue Dart' }) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    return {
      trackingNumber,
      shipmentId,
      courier,
      status: 'IN_TRANSIT',
      currentLocation: 'Hub Sort Facility',
      estimatedDelivery: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      events: [
        {
          status: 'LABEL_CREATED',
          location: 'Bengaluru Fulfillment Center',
          message: 'Shipping label created and printed.',
          timestamp: twoDaysAgo
        },
        {
          status: 'PICKED_UP',
          location: 'Bengaluru Warehouse Hub',
          message: `Package picked up by ${courier} agent.`,
          timestamp: oneDayAgo
        },
        {
          status: 'IN_TRANSIT',
          location: 'Central Sorting Hub',
          message: 'In transit to local destination delivery station.',
          timestamp: now
        }
      ]
    };
  }

  /**
   * Cancel shipment
   */
  async cancelShipment({ shipmentId, trackingNumber, reason = 'Cancelled by sender' }) {
    return {
      success: true,
      shipmentId,
      trackingNumber,
      status: 'CANCELLED',
      message: `Shipment ${trackingNumber} cancelled successfully with courier.`,
      cancelledAt: new Date()
    };
  }
}

module.exports = MockDeliveryAdapter;
