const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/database');
const { initMemcache, isUsingInMemoryFallback } = require('./config/memcache');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const instagramRoutes = require('./routes/instagram');
const flowsRoutes = require('./routes/flows');
const webhooksRoutes = require('./routes/webhooks');
const leadsRoutes = require('./routes/leads');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

const listenWithFallback = (preferredPort) => {
  const maxAttempts = config.nodeEnv === 'production' ? 1 : 10;

  return new Promise((resolve, reject) => {
    const tryListen = (offset) => {
      const port = preferredPort + offset;
      const server = app.listen(port, () => {
        resolve({ server, port });
      });

      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && offset + 1 < maxAttempts) {
          console.warn(`⚠ Port ${port} is in use, trying ${port + 1}...`);
          tryListen(offset + 1);
          return;
        }

        reject(error);
      });
    };

    tryListen(0);
  });
};

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.client.url,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Logging middleware
app.use(requestLogger);

// Rate limiting
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Memcached
    await initMemcache();

    if (isUsingInMemoryFallback()) {
      console.warn('⚠ Running with in-memory cache fallback (not recommended for production)');
    }

    // Start listening
    const PORT = config.port || 3001;
    const { port } = await listenWithFallback(PORT);
    console.log(`✓ Server running on port ${port}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
