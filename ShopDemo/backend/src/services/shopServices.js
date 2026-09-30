/**
 * ShopDemo Simulated E-Commerce Business Logic
 * Models user interactions (Products, Cart, Checkout, Login) and connects them to the
 * active simulation state so that user actions experience actual performance degradation and failure modes!
 */

const engine = require('./simulatorEngine');

const PRODUCTS = [
  {
    id: 'prod-101',
    name: 'Apex Pro Wireless Laptop',
    category: 'Computers',
    price: 1299.99,
    rating: 4.8,
    stock: 42,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    description: 'High-performance cloud developer laptop with M3 Max CPU, 32GB RAM, and 1TB NVMe SSD.'
  },
  {
    id: 'prod-102',
    name: 'CloudCam 4K AI Security',
    category: 'Smart Home',
    price: 189.50,
    rating: 4.6,
    stock: 120,
    image: 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=600',
    description: 'Ultra HD 4K night-vision security camera with real-time incident detection telemetry.'
  },
  {
    id: 'prod-103',
    name: 'CyberNoise ANC Headphones',
    category: 'Audio',
    price: 249.00,
    rating: 4.9,
    stock: 85,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    description: 'Active noise cancelling studio headphones with 40-hour battery life and spatial audio.'
  },
  {
    id: 'prod-104',
    name: 'Quantum Wrist Watch v3',
    category: 'Wearables',
    price: 320.00,
    rating: 4.5,
    stock: 19,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    description: 'Fitness & biometrics smartwatch with sapphire glass and LTE cloud sync.'
  },
  {
    id: 'prod-105',
    name: 'ErgoDesk Electric Hub',
    category: 'Furniture',
    price: 599.00,
    rating: 4.7,
    stock: 14,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600',
    description: 'Dual-motor standing desk with built-in USB-C fast charging and cable management.'
  },
  {
    id: 'prod-106',
    name: 'Stealth RGB Gaming Mouse',
    category: 'Accessories',
    price: 79.99,
    rating: 4.4,
    stock: 210,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600',
    description: 'Ultra-lightweight 26,000 DPI optical sensor gaming mouse with low-latency wireless.'
  }
];

const mockOrders = [];

// Helper to simulate dynamic latency and potential failures
const simulateRequestImpact = async (serviceName) => {
  const state = engine.getFullState();
  const m = state.metrics;
  const stage = state.scenarioStage;

  // Calculate artificial delay based on current service metrics
  let delayMs = 20;

  if (serviceName === 'database' || serviceName === 'product-service') {
    delayMs += m.dbLatency;
  } else if (serviceName === 'payment-service' || serviceName === 'payment-processor-api') {
    delayMs += m.paymentLatency;
  } else {
    delayMs += m.apiLatency;
  }

  // Artificial delay capped at 2500ms for UI responsiveness
  const actualDelay = Math.min(2500, delayMs);
  await new Promise(resolve => setTimeout(resolve, actualDelay));

  // Determine failure based on error rate or severe stage
  if (Math.random() * 100 < m.errorRate) {
    if (serviceName === 'payment-service' && m.paymentLatency > 800) {
      const err = new Error('HTTP 504 Gateway Timeout: Payment Processor API failed to respond within 3000ms');
      err.status = 504;
      throw err;
    }
    if (serviceName === 'database' && m.dbConnections >= 95) {
      const err = new Error('HTTP 503 Service Unavailable: PostgreSQL connection pool exhausted');
      err.status = 503;
      throw err;
    }
    const err = new Error(`HTTP 500 Internal Server Error in ${serviceName}: Unhandled execution exception`);
    err.status = 500;
    throw err;
  }
};

module.exports = {
  getProducts: async () => {
    await simulateRequestImpact('product-service');
    return PRODUCTS;
  },

  getProductById: async (id) => {
    await simulateRequestImpact('product-service');
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }
    return p;
  },

  checkout: async (cartItems, paymentInfo) => {
    await simulateRequestImpact('payment-service');

    const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const order = {
      orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      items: cartItems,
      totalAmount: Number(total.toFixed(2)),
      paymentStatus: 'PAID',
      shippingAddress: paymentInfo.address || '123 Cloud Server Lane, Suite 400',
      customerEmail: paymentInfo.email || 'user@company.com'
    };

    mockOrders.unshift(order);
    engine.addLog('INFO', 'order-service', `Order ${order.orderId} placed successfully for $${order.totalAmount}`);
    return order;
  },

  getOrders: async () => {
    await simulateRequestImpact('order-service');
    return mockOrders;
  },

  login: async (email, password) => {
    await simulateRequestImpact('auth-service');
    return {
      token: 'jwt-simulated-token-' + Date.now(),
      user: {
        id: 'usr-901',
        name: 'Alex Rivera',
        email: email || 'alex.rivera@cloudtech.io',
        role: 'DevOps Lead'
      }
    };
  }
};
