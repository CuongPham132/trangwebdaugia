import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './stores';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
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
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const SellerPostProductPage = lazy(() =>
  import('./pages/SellerPostProductPage').then((module) => ({
    default: module.SellerPostProductPage,
  }))
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Check if user is logged in by checking token in localStorage
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsLoggedIn(true);
        setUsername(userData.username || userData.fullName || 'User');
      } catch (error) {
        setIsLoggedIn(false);
        setUsername('');
      }
    } else {
      setIsLoggedIn(false);
      setUsername('');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUsername('');
    window.location.href = '/';
  };

  return (
    <Provider store={store}>
      <Router>
        <Header 
          isLoggedIn={isLoggedIn}
          username={username}
          onLogout={handleLogout}
        />
        <Suspense
          fallback={
            <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Đang tải trang...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/seller-dashboard" element={<SellerPostProductPage />} />
          </Routes>
        </Suspense>
        <Footer />
      </Router>
    </Provider>
  );
}

export default App;
