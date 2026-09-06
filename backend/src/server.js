require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { mongoSanitizeMiddleware } = require('./middleware/mongoSanitizeMiddleware');

const config = require('./config/appConfig');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route Imports
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const addressRoutes = require('./routes/addressRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const b2bRoutes = require('./routes/b2bRoutes');
const adminB2BRoutes = require('./routes/adminB2BRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const refundRoutes = require('./routes/refundRoutes');
const adminRefundRoutes = require('./routes/adminRefundRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const adminShipmentRoutes = require('./routes/adminShipmentRoutes');
const seoRoutes = require('./routes/seoRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { cacheMiddleware } = require('./middleware/cacheMiddleware');
const { initBirthdayScheduler } = require('./jobs/birthdayScheduler');



// Initialize Express App
const app = express();

// Enable trust proxy for cloud deployment (Render, Heroku, AWS ELB)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// 1. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,      // Allows React SPA assets, CDNs, and payment scripts to load
  crossOriginEmbedderPolicy: false,  // Required for image and font CDNs
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 2. Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server, same-origin)
    if (!origin) return callback(null, true);

    // Allow localhost, 127.0.0.1, LAN, and all onrender.com subdomains, or configured origins
    const isAllowedDomain =
      /^http(s)?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
      /\.onrender\.com$/.test(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /snackora\.in$/.test(origin);

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));


// 3. Tiered Rate Limiters
// 3a. Auth limiter: 60 (prod) / 500 (dev) requests per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 60 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login/registration attempts. Please wait 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 3b. Payment limiter: 20 (prod) / 500 (dev) requests per 15 min
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'production' ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// 3c. General API limiter: 300 (prod) / 10,000 (dev) requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.env === 'production' ? config.rateLimit.max : 10000,
  skip: (req) => config.env === 'development',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});


app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/v1/auth/', authLimiter);
app.use('/api/payments/', paymentLimiter);
app.use('/api/v1/payments/', paymentLimiter);

// 4. JSON & URL-Encoded Body Parsers (upload limit raised for base64 image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4a. MongoDB Injection Sanitization — strips $ and . from request keys
app.use(mongoSanitizeMiddleware());

// 5. Request Logging (Morgan)
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 6. Health Check Endpoints
app.use('/api/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// 7. Core Domain API Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/categories', cacheMiddleware(300), categoryRoutes);      // cache 5 min
app.use('/api/v1/categories', cacheMiddleware(300), categoryRoutes);
app.use('/api/products', cacheMiddleware(300), productRoutes);          // cache 5 min
app.use('/api/v1/products', cacheMiddleware(300), productRoutes);

app.use('/api/cart', cartRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/b2b', b2bRoutes);
app.use('/api/v1/b2b', b2bRoutes);
app.use('/api/admin/b2b', adminB2BRoutes);
app.use('/api/v1/admin/b2b', adminB2BRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/v1/admin/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/v1/refunds', refundRoutes);
app.use('/api/admin/refunds', adminRefundRoutes);
app.use('/api/v1/admin/refunds', adminRefundRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/admin/reviews', reviewRoutes);
app.use('/api/v1/admin/reviews', reviewRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/v1/marketing', marketingRoutes);
app.use('/api', marketingRoutes);
app.use('/api/v1', marketingRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/admin/shipments', adminShipmentRoutes);
app.use('/api/v1/admin/shipments', adminShipmentRoutes);

// ── Cloudinary Image Upload ───────────────────────────────────────────────────
app.use('/api/upload', uploadRoutes);
app.use('/api/v1/upload', uploadRoutes);

// 8. SEO Routes — dynamic sitemap.xml and robots.txt (no /api prefix; crawler accessible)
app.use('/', seoRoutes);

// ── All-in-One Frontend Static Serving & Client-Side SPA Fallback ───────────
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  // Serve static assets from frontend/dist
  app.use(express.static(frontendDistPath));

  // SPA fallback: Route all non-API GET requests to frontend/dist/index.html (Express 5 syntax)
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/sitemap.xml' || req.path === '/robots.txt') {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Fallback root index route when frontend is not built
  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Snackora Platform API',
        version: '1.0.0',
        health: '/api/health',
        documentation: '/api/v1/health'
      },
      message: 'Welcome to Snackora Platform API'
    });
  });
}

// 8. 404 Not Found Catch-All & Global Centralized Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[Snackora Server] Running in ${config.env} mode on http://${HOST}:${PORT}`);
  // Initialize Automated Birthday Reward & WhatsApp Dispatch Scheduler
  initBirthdayScheduler();
});

process.on('unhandledRejection', (err) => {
  console.error(`[Fatal Server Error] Unhandled Rejection: ${err.message}`);
});

module.exports = app;

