import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants';

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection
 */
export function connectSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
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
  socket?.on('new-bid', callback);
}

/**
 * Stop listening for new bid events
 */
export function offNewBid(): void {
  socket?.off('new-bid');
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
