const DeliveryAdapter = require('./DeliveryAdapter');
const https = require('https');

class ShiprocketDeliveryAdapter extends DeliveryAdapter {
  constructor(config = {}) {
    super('ShiprocketDeliveryAdapter');
    this.email = config.email || process.env.SHIPROCKET_EMAIL;
    this.password = config.password || process.env.SHIPROCKET_PASSWORD;
    this.token = null;
    this.tokenExpiry = null;
    this.baseUrl = 'apiv2.shiprocket.in';
  }

  hasValidCredentials() {
    return Boolean(this.email && this.password);
  }

  /**
   * Internal HTTPS helper for Shiprocket API
   */
  async _request(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : '';
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Snackora-Delivery-Client/1.0'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (body) headers['Content-Length'] = Buffer.byteLength(payload);

      const req = https.request({
        hostname: this.baseUrl,
        path: `/v1/external${path}`,
        method,
        headers
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || `Shiprocket API error HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Shiprocket response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  /**
   * Authenticate and get JWT token
   */
  async getAuthToken() {
    if (!this.hasValidCredentials()) {
      throw new Error(
        'Shiprocket credentials not configured. Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in environment.'
      );
    }

    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    const res = await this._request('/auth/login', 'POST', {
      email: this.email,
      password: this.password
    });

    if (res.token) {
      this.token = res.token;
      // Expires in ~10 days
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 9);
      this.tokenExpiry = expiry;
      return this.token;
    }

    throw new Error('Failed to retrieve Shiprocket authentication token.');
  }

  /**
   * Create custom adhoc order in Shiprocket and generate AWB
   */
  async createShipment({ order, origin, destination, items, weightKg = 0.5, courierName = 'Shiprocket' }) {
    const token = await this.getAuthToken();

    const orderPayload = {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_location: origin?.name || 'Primary',
      billing_customer_name: destination.fullName || 'Customer',
      billing_last_name: '',
      billing_address: destination.addressLine1,
      billing_address_2: destination.addressLine2 || '',
      billing_city: destination.city,
      billing_pincode: destination.pincode,
      billing_state: destination.state,
      billing_country: 'India',
      billing_email: order.user?.email || 'customer@snackora.in',
      billing_phone: destination.phone,
      shipping_is_billing: true,
      order_items: (items || []).map((i) => ({
        name: i.name,
        sku: i.sku,
        units: i.quantity,
        selling_price: i.price,
        discount: i.itemDiscount || 0
      })),
      payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: order.pricing?.subtotal || 0,
      length: 15,
      breadth: 15,
      height: 10,
      weight: Number(weightKg) || 0.5
    };

    const shiprocketOrder = await this._request('/orders/create/adhoc', 'POST', orderPayload, token);

    return {
      shipmentId: String(shiprocketOrder.shipment_id || shiprocketOrder.order_id),
      trackingNumber: String(shiprocketOrder.awb_code || `SR-${shiprocketOrder.order_id}`),
      trackingUrl: `https://shiprocket.co/tracking/${shiprocketOrder.awb_code || ''}`,
      courier: courierName,
      status: 'LABEL_CREATED',
      shippingFee: 0,
      events: [
        {
          status: 'LABEL_CREATED',
          location: 'Shiprocket Fulfillment Node',
          message: 'Order created in Shiprocket manifest.',
          timestamp: new Date()
        }
      ],
      rawResponse: shiprocketOrder
    };
  }

  /**
   * Check courier serviceability & rates
   */
  async getRates({ originPincode = '560001', destinationPincode, weightKg = 0.5, cod = false }) {
    const token = await this.getAuthToken();
    const query = `?pickup_postcode=${originPincode}&delivery_postcode=${destinationPincode}&weight=${weightKg}&cod=${cod ? 1 : 0}`;

    const res = await this._request(`/courier/serviceability/${query}`, 'GET', null, token);
    const availableCouriers = res.data?.available_courier_companies || [];

    return availableCouriers.map((c) => ({
      courierName: c.courier_name,
      courierCode: String(c.courier_company_id),
      rate: c.rate,
      estimatedDays: c.estimated_delivery_days,
      etd: c.etd,
      minWeight: c.min_weight
    }));
  }

  /**
   * Track AWB
   */
  async getTracking({ trackingNumber }) {
    const token = await this.getAuthToken();
    const res = await this._request(`/courier/track/awb/${trackingNumber}`, 'GET', null, token);
    const trackData = res.tracking_data || {};

    const rawActivities = trackData.shipment_track_activities || [];
    const events = rawActivities.map((a) => ({
      status: a['sr-status-label'] || a.status || 'IN_TRANSIT',
      location: a.location || 'Sorting Facility',
      message: a.activity || '',
      timestamp: new Date(a.date)
    }));

    return {
      trackingNumber,
      status: trackData.current_status || 'IN_TRANSIT',
      currentLocation: trackData.current_location || 'Hub',
      estimatedDelivery: trackData.expected_date ? new Date(trackData.expected_date) : null,
      events
    };
  }

  /**
   * Cancel order
   */
  async cancelShipment({ shipmentId, orderId }) {
    const token = await this.getAuthToken();
    const res = await this._request('/orders/cancel', 'POST', {
      ids: [orderId || shipmentId]
    }, token);

    return {
      success: true,
      shipmentId,
      status: 'CANCELLED',
      message: 'Shipment cancelled with Shiprocket.',
      rawResponse: res
    };
  }
}

module.exports = ShiprocketDeliveryAdapter;
