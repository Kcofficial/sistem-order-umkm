import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
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