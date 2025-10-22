// server.ts - Next.js Standalone + Socket.IO
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = 3000;
const hostname = '127.0.0.1';

// Simple socket setup
const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join rooms based on role
    socket.on('join-kitchen', () => {
      socket.join('kitchen');
      console.log('Client joined kitchen room:', socket.id);
    });

    socket.on('join-customer', (orderData: { queueNumber: string }) => {
      const roomName = `customer-${orderData.queueNumber}`;
      socket.join(roomName);
      console.log('Client joined customer room:', socket.id, roomName);
    });

    // Handle new order notification
    socket.on('new-order', (orderData) => {
      // Notify kitchen staff
      io.to('kitchen').emit('order-received', orderData);
      console.log('New order sent to kitchen:', orderData);
    });

    // Handle order status updates
    socket.on('order-status-update', (data: { orderId: string; status: string; queueNumber: string }) => {
      // Notify specific customer
      io.to(`customer-${data.queueNumber}`).emit('status-updated', {
        orderId: data.orderId,
        status: data.status
      });
      
      // Also notify kitchen staff
      io.to('kitchen').emit('order-updated', data);
      
      console.log('Order status updated:', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to order system',
      timestamp: new Date().toISOString(),
    });
  });
};

// Global socket.io instance
let globalIO: Server | null = null;

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer((req, res) => {
      // Skip socket.io requests from Next.js handler
      if (req.url?.startsWith('/api/socketio')) {
        return;
      }
      handle(req, res);
    });

    // Setup Socket.IO
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    setupSocket(io);
    globalIO = io;
    
    // Make socket.io available globally for API routes
    if (typeof global !== 'undefined') {
      (global as any).socketIO = io;
    }

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`> Ready on http://${hostname}:${currentPort}`);
      console.log(`> Socket.IO server running at ws://${hostname}:${currentPort}/api/socketio`);
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Export getter for socket.io instance
export const getGlobalIO = () => globalIO;

// Start the server
createCustomServer();
