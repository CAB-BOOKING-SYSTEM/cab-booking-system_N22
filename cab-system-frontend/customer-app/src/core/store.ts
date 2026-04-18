import { configureStore } from "@reduxjs/toolkit";

const placeholderReducer = (state = {}) => state;

export const store = configureStore({
  reducer: placeholderReducer,
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
