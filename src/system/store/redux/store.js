import { configureStore, combineReducers } from '@reduxjs/toolkit';
import user from './user';
import menus from './menu';
import agent from './agent';
import staff from './staff';
import { persistStore, persistReducer } from 'redux-persist';
// import storage from 'redux-persist/lib/storage' // localStorage 사용
import storage from 'redux-persist/lib/storage/session'; // sessionStorage상요

const rootReducer = combineReducers({
  user, //: user,
  menus,
  agent,
  staff
});

const persistConfig = {
  key: 'root',
  storage,
  version: 1, // version 올리면 migrate 호출
  //migrate: (state) => Promise.resolve(null), // null 반환 → 초기 상태로
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // redux-persist 때문에 꺼야함
    }),
});

export const persistor = persistStore(store);