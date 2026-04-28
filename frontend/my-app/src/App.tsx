import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './stores';
import { useEffect, lazy, Suspense, useCallback } from 'react';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
import { AdminLayout } from './layout/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { syncServerTime } from './utils/timeHelper';
import { connectSocket, onNewBid, offNewBid } from './services/socketService';
import { initializeNotificationService } from './services/notificationService';
import { useQueryClient } from '@tanstack/react-query';
import type { RootState } from './stores';
import './App.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const MarketplacePage = lazy(() =>
  import('./pages/MarketplacePage').then((module) => ({
    default: module.MarketplacePage,
  }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  }))
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  }))
);
const WalletPage = lazy(() => import('./pages/WalletPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const SellerPostProductPage = lazy(() =>
  import('./pages/SellerPostProductPage').then((module) => ({
    default: module.SellerPostProductPage,
  }))
);
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

// Admin Pages
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboard,
  }))
);
const AdminUsers = lazy(() =>
  import('./pages/AdminUsersPage').then((module) => ({
    default: module.AdminUsersPage,
  }))
);
const AdminProducts = lazy(() =>
  import('./pages/AdminProductsPage').then((module) => ({
    default: module.AdminProductsPage,
  }))
);
const AdminBids = lazy(() =>
  import('./pages/AdminBidsPage').then((module) => ({
    default: module.AdminBidsPage,
  }))
);

// Inner App component that uses Redux hooks
function AppContent() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient();

  // ⭐ Memoize handler to keep same reference across renders
  // so cleanup (offNewBid) can properly remove the listener
  const handleNewBid = useCallback((data: any) => {
    try {
      console.log('🔔 [Socket] new-bid event received:', data);
      const productId = Number(data.product_id);
      const bidAmount = Number(data.bid_amount);
      if (!Number.isFinite(productId) || !Number.isFinite(bidAmount)) {
        console.warn('⚠️ Invalid productId or bidAmount:', { productId, bidAmount });
        return;
      }
      console.log(`💰 Processing bid update: product=${productId}, bid=${bidAmount}`);

      // 1) Update product-detail cache
      queryClient.setQueryData(['product-detail', productId], (old: any) => {
        if (!old) return old;
        console.log(`📝 Updated product-detail cache [product-detail, ${productId}]`);
        return {
          ...old,
          current_price: Math.max(old.current_price || 0, bidAmount),
          highest_bid: Math.max(old.highest_bid || 0, bidAmount),
        };
      });

      // 2) Update marketplace-data caches (all category variants)
      const mq = queryClient.getQueriesData(['marketplace-data']);
      console.log(`🏪 Found ${mq.length} marketplace-data cache(s) to update`, mq.map(([key]) => key));
      mq.forEach(([key, value]: any) => {
        const prev = value as { products?: any[] } | undefined;
        if (!prev || !Array.isArray(prev.products)) {
          console.warn(`  ⚠️ No products array in cache key:`, key);
          return;
        }
        console.log(`  🔄 Updating cache, has ${prev.products.length} products`);
        const updated = prev.products.map((p: any) => {
          if (Number(p.product_id) !== productId) return p;
          console.log(`  ✅ Found product ${productId} in this cache, updating price from ${p.current_price} to ${Math.max(p.current_price || 0, bidAmount)}`);
          const newHighest = Math.max(Number(p.highest_bid) || 0, bidAmount);
          const newCurrent = Math.max(Number(p.current_price) || 0, newHighest);
          return { ...p, highest_bid: newHighest, current_price: newCurrent };
        });
        queryClient.setQueryData(key, { ...prev, products: updated });
      });
      console.log('✅ Cache update complete');
    } catch (err) {
      console.error('❌ Failed to apply new-bid update to cache', err);
    }
  }, [queryClient]);

  useEffect(() => {
    // ⭐ Sync server time immediately on app load
    syncServerTime();

    // ⭐ Initialize Socket.io connection
    connectSocket();

    console.log('👂 Setting up global new-bid listener');
    onNewBid(handleNewBid);

    // ⭐ Initialize notifications when user is authenticated
    if (isAuthenticated) {
      initializeNotificationService();
      console.log('✅ Notification service initialized for authenticated user');
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up global new-bid listener');
      offNewBid(handleNewBid);
      // Cleanup if needed
    };
  }, [handleNewBid, isAuthenticated]);

  return (
    <Router>
      <Suspense fallback={<div>Đang tải...</div>}>
        <Routes>
          {/* Admin Routes - With AdminLayout - Protected */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout currentPage="/admin"><AdminDashboard /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout currentPage="/admin/users"><AdminUsers /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/admin/products" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout currentPage="/admin/products"><AdminProducts /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/admin/bids" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout currentPage="/admin/bids"><AdminBids /></AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Regular Routes - With Header/Footer */}
          <Route 
            path="/" 
            element={
              <>
                <Header />
                <HomePage />
                <Footer />
              </>
            }
          />
          <Route 
            path="/marketplace" 
            element={
              <>
                <Header />
                <MarketplacePage />
                <Footer />
              </>
            }
          />
          <Route 
            path="/product/:productId" 
            element={
              <>
                <Header />
                <ProductDetailPage />
                <Footer />
              </>
            }
          />
          <Route 
            path="/login" 
            element={
              <>
                <Header />
                <LoginPage />
                <Footer />
              </>
            }
          />
          <Route 
            path="/register" 
            element={
              <>
                <Header />
                <RegisterPage />
                <Footer />
              </>
            }
          />
          <Route 
            path="/profile" 
            element={
              <>
                <Header />
                <ProfilePage />
                <Footer />
              </>
            }
          />
          <Route 
            path="/wallet" 
            element={
              <ProtectedRoute>
                <Header />
                <WalletPage />
                <Footer />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Header />
                <OrdersPage />
                <Footer />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/payment/:orderId" 
            element={
              <ProtectedRoute>
                <Header />
                <PaymentPage />
                <Footer />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/seller-dashboard" 
            element={
              <>
                <Header />
                <SellerPostProductPage />
                <Footer />
              </>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
