const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const engine = require('./services/simulatorEngine');
const SentinelPublisher = require('./services/sentinelPublisher');

const shopRoutes = require('./routes/shopRoutes');
const chaosRoutes = require('./routes/chaosRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');

const app = express();
const PORT = process.env.PORT || 5100;

app.use(cors());
app.use(express.json());

// Attach HTTP routes
app.use('/api/shop', shopRoutes);
app.use('/api/chaos', chaosRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ShopDemo Production Backend & Chaos Controller' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Sentinel Publisher
const sentinelPublisher = new SentinelPublisher(engine);

// Wire engine tick to WebSockets
engine.on('tick', (state) => {
  io.emit('simulator-tick', state);
});

io.on('connection', (socket) => {
  // Send immediate state snapshot upon client connection
  socket.emit('simulator-tick', engine.getFullState());
});

// Start simulation loop (2-second tick interval)
engine.startSimulationLoop(2000);

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛒 ShopDemo Simulated Environment Server running on port ${PORT}`);
  console.log(`   - E-Commerce API: http://localhost:${PORT}/api/shop`);
  console.log(`   - Chaos Control API: http://localhost:${PORT}/api/chaos`);
  console.log(`   - Telemetry Stream: http://localhost:${PORT}/api/telemetry/live`);
  console.log(`======================================================\n`);
});
