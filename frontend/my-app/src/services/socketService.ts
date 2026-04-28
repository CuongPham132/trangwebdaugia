import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants';

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection
 */
export function connectSocket(): Socket {
  if (!socket) {
    // Extract base URL without /api suffix
    const baseURL = API_BASE_URL.replace('/api', '');
    
    socket = io(baseURL, {
      path: '/api/socket.io/',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  return socket;
}

/**
 * Get socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Join product room for real-time bid updates
 */
export function joinProductRoom(productId: number): void {
  if (!socket) {
    connectSocket();
  }
  socket?.emit('join-product', productId);
  console.log('🚪 Joined room: product-' + productId);
}

/**
 * Leave product room
 */
export function leaveProductRoom(productId: number): void {
  socket?.emit('leave-product', productId);
  console.log('🚪 Left room: product-' + productId);
}

/**
 * Listen for new bid events
 */
export function onNewBid(callback: (bid: any) => void): void {
  if (!socket) {
    connectSocket();
  }
  console.log('👂 Registering new-bid listener');
  socket?.on('new-bid', (data) => {
    console.log('📨 new-bid listener triggered with data:', data);
    callback(data);
  });
}

/**
 * Stop listening for new bid events. If `callback` is provided,
 * remove that specific listener; otherwise remove all listeners for the event.
 */
export function offNewBid(callback?: (bid: any) => void): void {
  if (!socket) return;
  if (callback) {
    socket.off('new-bid', callback);
    return;
  }
  socket.off('new-bid');
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected');
  }
}
