import { configureStore } from '@reduxjs/toolkit';

// Placeholder reducers - thêm slice của bạn ở đây
const rootReducer = {
  // Ví dụ:
  // auth: authSlice,
  // products: productsSlice,
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
