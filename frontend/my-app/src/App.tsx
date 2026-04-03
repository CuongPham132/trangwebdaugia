import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './stores';
import { useEffect, lazy, Suspense } from 'react';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
import { AdminLayout } from './layout/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { syncServerTime } from './utils/timeHelper';
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

function App() {
  useEffect(() => {
    // ⭐ Sync server time immediately on app load
    syncServerTime();
  }, []);

  return (
    <Provider store={store}>
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
    </Provider>
  );
}

export default App;
