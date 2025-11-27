import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store, persistor } from '@/system/store/redux/store';
import { PersistGate } from 'redux-persist/integration/react';

import { ManagerProvider } from "@/system/hook/ManagerProvider";
//import { HttpProvider } from '@/system/hook/HttpContext'; // ✅ 추가

// 여러 Provider를 한번에 묶는 컴포넌트
const RootProviders = ({ children }) => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ManagerProvider>
        {children}
      </ManagerProvider>
    </PersistGate>
  </Provider>
);


createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <RootProviders>
    <App />
  </RootProviders>
  // </StrictMode>
);