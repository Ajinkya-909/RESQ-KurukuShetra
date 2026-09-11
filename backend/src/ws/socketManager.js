/**
 * socketManager.js — Socket.IO WebSocket event broadcaster
 *
 * Manages the Socket.IO instance and provides a typed broadcast
 * helper so routes can emit events without importing io directly.
 *
 * Usage in routes:
 *   const { broadcast } = require('../ws/socketManager');
 *   broadcast('zone.updated', { zone_id: 1, severity_level: 'critical' });
 */

let _io = null;

/**
 * Initialize the socket manager with the Socket.IO instance.
 * Called once from index.js after the HTTP server is created.
 * @param {import('socket.io').Server} io
 */
const init = (io) => {
  _io = io;

  io.on('connection', (socket) => {
    const { scenario_id } = socket.handshake.query;
    console.log(`🔌 [WS] Client connected — socket: ${socket.id}, scenario: ${scenario_id || 'none'}`);

    // Join a scenario-specific room for targeted broadcasts
    if (scenario_id) {
      socket.join(`scenario:${scenario_id}`);
      console.log(`   Joined room: scenario:${scenario_id}`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 [WS] Client disconnected — socket: ${socket.id}`);
    });
  });
};

/**
 * Broadcast an event to all connected clients.
 * @param {string} event - Event name (e.g. 'zone.updated')
 * @param {object} data - Payload to send
 */
const broadcast = (event, data) => {
  if (!_io) {
    console.warn(`⚠️  [WS] broadcast called before init — event: ${event}`);
    return;
  }
  _io.emit(event, { event, data, timestamp: new Date().toISOString() });
};

/**
 * Broadcast an event to a specific scenario room only.
 * @param {string} scenarioId - The scenario ID
 * @param {string} event - Event name
 * @param {object} data - Payload to send
 */
const broadcastToScenario = (scenarioId, event, data) => {
  if (!_io) {
    console.warn(`⚠️  [WS] broadcastToScenario called before init — event: ${event}`);
    return;
  }
  _io.to(`scenario:${scenarioId}`).emit(event, {
    event,
    data,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { init, broadcast, broadcastToScenario };
