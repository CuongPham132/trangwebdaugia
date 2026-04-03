# Auction System - Development Phases (Detailed Plan)

## ✅ COMPLETED PHASES (1-2d)

### Phase 1: Wallet System
- ✅ Database schema (wallet, wallet_transaction tables)
- ✅ Wallet service (10 data operations + 6 business logic functions)
- ✅ Backend endpoints (5 endpoints: get, transactions, deposit, withdraw, check-balance)
- ✅ Middleware authentication

### Phase 2a: Payment Processing
- ✅ Automatic settlement when auction ends
- ✅ Winner's locked balance deduction
- ✅ Seller's balance credit
- ✅ Transaction logging

### Phase 2b: Profile Updates
- ✅ Username change with uniqueness validation
- ✅ Password change with current password verification
- ✅ Profile update endpoint

### Phase 2c: Bid Retraction
- ✅ Delete non-winning bids
- ✅ Automatic refund mechanism
- ✅ Validation logic

### Phase 2d: Error Standardization
- ✅ Centralized ERROR_CODES (27+ codes)
- ✅ Global error middleware
- ✅ Updated all 9 controllers (48+ endpoints)
- ✅ Documentation created

**Total Completed:** 48+ backend endpoints standardized

---

## 🚀 REMAINING PHASES (3-7)

### **PHASE 3: Redux Store Implementation** (Frontend State Management)
**Objective:** Centralized state management for auth, products, bids, wallet, users

**Tasks:**
- [ ] 3.1: Create Redux store structure with slices
  - **Time:** 30 mins
  - **Components:**
    - Auth slice (user login/logout, token storage)
    - Product slice (product listings, filtering)
    - Bid slice (user's bids, bid history)
    - Wallet slice (balance, transactions)
    - User slice (profile data)
  - **Files to create:**
    - `frontend/my-app/src/stores/authSlice.ts`
    - `frontend/my-app/src/stores/productSlice.ts`
    - `frontend/my-app/src/stores/bidSlice.ts`
    - `frontend/my-app/src/stores/walletSlice.ts`
    - `frontend/my-app/src/stores/userSlice.ts`

- [ ] 3.2: Create async thunks for API calls
  - **Time:** 1 hour
  - **Thunks needed:**
    - User: register, login, logout, updateProfile
    - Products: fetchProducts, searchProducts, createProduct
    - Bids: placeBid, viewBidHistory, retractBid
    - Wallet: fetchWallet, deposit, withdraw
  - **Files to create:**
    - `frontend/my-app/src/stores/thunks.ts`

- [ ] 3.3: Update components to use Redux
  - **Time:** 1 hour
  - **Components to update:**
    - LoginPage: dispatch login thunk, store token
    - ProfilePage: fetch user data from Redux store
    - MarketplacePage: connect to product slice
    - ProductDetailPage: connect to bid slice
    - BidModal: dispatch placeBid thunk
    - Header: display logged-in user from Redux

- [ ] 3.4: Add Redux DevTools for debugging
  - **Time:** 15 mins
  - **Package:** redux-devtools-extension

**Estimated Duration:** 2-3 hours
**Dependencies:** Completed backend, Socket.io not needed yet
**Blocking:** Phase 4 (real-time), Phase 6 (dashboard)

---

### **PHASE 4: Real-Time Updates with Socket.io** (Live Data Synchronization)
**Objective:** Live bidding, price updates, auction status notifications

**Tasks:**
- [ ] 4.1: Setup Socket.io on backend
  - **Time:** 30 mins
  - **Files to create:**
    - `backend/socket/socketHandler.js` (main socket server)
    - `backend/socket/bidHandler.js` (bid-related events)
    - `backend/socket/auctionHandler.js` (auction-related events)
  - **Events to emit:**
    - `newBid`: price update, bidder info
    - `bidPlaced`: notify other users on product page
    - `auctionEnding`: 5-min warning
    - `auctionEnded`: final result

- [ ] 4.2: Integrate Socket.io with Express server
  - **Time:** 20 mins
  - **Step:**
    - Install socket.io, socket.io-client
    - Create socket instance in server.js
    - Setup CORS for socket connections
    - Bind socket handlers to events

- [ ] 4.3: Setup Socket.io client on frontend
  - **Time:** 30 mins
  - **Files to create:**
    - `frontend/my-app/src/services/socket.ts` (socket connection)
  - **Setup:**
    - Connect to localhost:3000 (development) or prod URL
    - Emit login event when user logs in
    - Store socket instance in React context or Redux

- [ ] 4.4: Update frontend components for real-time
  - **Time:** 1 hour
  - **Components:**
    - ProductDetailPage: listen to `newBid` event, update price/bid count live
    - BidInfo: show live bid updates
    - CountdownTimer: sync time from server
    - ProductGrid: show live auction status

- [ ] 4.5: Handle connection states
  - **Time:** 20 mins
  - **Features:**
    - Connection/disconnection indicators
    - Reconnect logic
    - Message queue for offline bids

**Estimated Duration:** 2-3 hours
**Dependencies:** Phase 3 (Redux), Backend API complete
**Blocks:** Phase 5 (notifications), Phase 6 (live dashboard)

---

### **PHASE 5: Notification System** (Email & In-App)
**Objective:** Alert users to important events (outbid, auction won, payment received)

**Tasks:**
- [ ] 5.1: Setup email service backend
  - **Time:** 30 mins
  - **Package:** nodemailer
  - **Files to create:**
    - `backend/services/emailService.js` (SMTP config, send functions)
    - `backend/services/emailTemplates.js` (HTML email templates)
  - **Templates:**
    - Auction won
    - Outbid alert
    - Payment received
    - Account registered

- [ ] 5.2: Email triggers (update controllers)
  - **Time:** 45 mins
  - **Triggers:**
    - bidController.ts: Send outbid email to previous highest bidder
    - auctionController.ts: Send won/lost emails when auction ends
    - walletController.ts: Send deposit confirmation email
    - userController.ts: Send welcome email on registration
  - **Files to update:**
    - `backend/controllers/bidController.js`
    - `backend/controllers/auctionController.js`
    - `backend/controllers/walletController.js`
    - `backend/controllers/userController.js`

- [ ] 5.3: In-app notification toast
  - **Time:** 30 mins
  - **Tool:** Ant Design Toast (already imported)
  - **Files to create:**
    - `frontend/my-app/src/components/NotificationCenter.tsx`
  - **Notifications:**
    - Socket.io real-time events → toast
    - Success/error messages from API calls

- [ ] 5.4: Notification history page (optional)
  - **Time:** 45 mins
  - **Page:** Show past notifications
  - **File:** `frontend/my-app/src/pages/NotificationsPage.tsx`

**Estimated Duration:** 2-3 hours
**Dependencies:** Phase 3 (Redux), Phase 4 (Socket.io), Backend API complete
**Blocking:** Phase 6 (seller dashboard mentions notifications)

---

### **PHASE 6: Seller Dashboard & Analytics** (Advanced Seller Tools)
**Objective:** Dashboard for sellers to track sales, revenue, and manage auctions

**Tasks:**
- [ ] 6.1: Create seller-only routes (require role check)
  - **Time:** 15 mins
  - **Backend endpoint:** Already has requireAdmin check, extend to seller check
  - **File:** `backend/middlewares/auth.js`

- [ ] 6.2: Backend seller analytics endpoints
  - **Time:** 1 hour
  - **Endpoints:**
    - GET `/api/seller/stats` → total sales, revenue, active listings
    - GET `/api/seller/products?status=` → list seller's products with status
    - GET `/api/seller/revenue/monthly` → monthly revenue chart data
    - GET `/api/seller/top-sold` → best performing products
  - **Files to create:**
    - `backend/controllers/sellerController.js`
    - `backend/routes/sellerRoutes.js`

- [ ] 6.3: Frontend seller dashboard page
  - **Time:** 1 hour
  - **File:** Update `frontend/my-app/src/pages/SellerDashboardPage.tsx` (partial exists)
  - **Sections:**
    - Dashboard overview (total sales, revenue, active auctions)
    - Revenue chart (Chart.js or Recharts)
    - Product performance list
    - Active auctions status

- [ ] 6.4: Dashboard Redux integration
  - **Time:** 30 mins
  - **Add to Redux:**
    - Seller slice with stats thunks
    - Connect SellerDashboardPage to Redux

- [ ] 6.5: Product management in dashboard
  - **Time:** 45 mins
  - **Features:**
    - Pause/resume auctions (new backend endpoint)
    - Delete products
    - Bulk operations (optional)
    - Update product info
  - **New endpoints needed:**
    - PATCH `/api/products/:product_id/pause`
    - PATCH `/api/products/:product_id/resume`
    - DELETE `/api/products/:product_id` (enhance existing)

**Estimated Duration:** 3-4 hours
**Dependencies:** Phase 3 (Redux), Phase 4 (Socket.io), Phase 5 (Notifications)
**Blocking:** None

---

### **PHASE 7: Advanced Search & Filtering** (Discoverability)
**Objective:** Help users find products easily with filters, search, and sorting

**Tasks:**
- [ ] 7.1: Backend search & filter endpoints
  - **Time:** 45 mins
  - **Endpoint:**
    - GET `/api/products/search?q=&category=&minPrice=&maxPrice=&sort=`
    - Params: category_id, min_price, max_price, auction_status, sort_by (price, newest, trending)
  - **Files to update:**
    - `backend/controllers/productController.js` - enhance searchProduct()
    - `backend/models/productModel.js` - add filter/sort queries

- [ ] 7.2: Frontend FilterBar component
  - **Time:** 1 hour
  - **Component:** Update `frontend/my-app/src/components/FilterBar.tsx`
  - **Filters:**
    - Category dropdown
    - Price range slider
    - Auction status (active, ended, upcoming)
    - Sort dropdown (price: asc/desc, newest, trending)
  - **UI Kit:** Ant Design (Slider, Select, Input)

- [ ] 7.3: Frontend search integration
  - **Time:** 30 mins
  - **Component:** Update `frontend/my-app/src/components/SearchBar.tsx`
  - **Features:**
    - Full-text search on product name/description
    - Auto-suggest (optional)
    - Search history (optional)

- [ ] 7.4: Product grid with dynamic load
  - **Time:** 45 mins
  - **Component:** Update `frontend/my-app/src/components/ProductGrid.tsx`
  - **Features:**
    - Pagination (10-20 items per page)
    - Apply filters dynamically
    - Handle loading/error states
    - Sort by user selection

- [ ] 7.5: URL query string sync (optional but recommended)
  - **Time:** 30 mins
  - **Feature:** Save search/filter state to URL
    - Example: `/marketplace?category=3&min=100&max=5000&sort=price_asc&page=1`
    - Allow sharing/bookmarking searches
  - **Package:** query-string or URLSearchParams

**Estimated Duration:** 3-4 hours
**Dependencies:** Phase 3 (Redux), Backend API complete
**Blocking:** None

---

## 📊 PHASE EXECUTION SUMMARY

| Phase | Title | Duration | Priority | Dependencies |
|-------|-------|----------|----------|--------------|
| 1 | Wallet System | ✅ Complete | Critical | None |
| 2a | Payment Processing | ✅ Complete | Critical | Phase 1 |
| 2b | Profile Updates | ✅ Complete | High | None |
| 2c | Bid Retraction | ✅ Complete | High | None |
| 2d | Error Standardization | ✅ Complete | Critical | None |
| **3** | **Redux Store** | **2-3h** | **Critical** | None |
| **4** | **Socket.io Real-Time** | **2-3h** | **High** | Phase 3 |
| **5** | **Notifications** | **2-3h** | **High** | Phase 3, 4 |
| **6** | **Seller Dashboard** | **3-4h** | **Medium** | Phase 3, 4, 5 |
| **7** | **Search & Filtering** | **3-4h** | **Medium** | Phase 3 |

**Total Remaining Time:** ~15-20 hours

---

## 🎯 RECOMMENDED EXECUTION ORDER

1. **Phase 3 → Phase 4 → Phase 5** (Form core feature set in order)
2. **Phase 6 & 7 can run in parallel** (Independent of each other)

**Optimal Path:** 3 → 4 → 5 → (6 + 7 in parallel)

---

## 💡 QUICK START: PHASE 3 NEXT

**What to do next:**
1. Start Phase 3: Redux store implementation
2. Create Redux slices for: auth, products, bids, wallet, user
3. Create async thunks for API calls
4. Update header/login page to use Redux
5. Test with existing backend endpoints

**Command to start:**
```bash
cd frontend/my-app
npm install redux @reduxjs/toolkit react-redux
npm install -D redux-devtools-extension
```

Would you like me to start implementing **Phase 3 (Redux Store)**?
