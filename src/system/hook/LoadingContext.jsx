import React, { createContext, useContext, useState, useCallback } from "react";

const LoadingContext = createContext({
  showLoading: () => { },
  hideLoading: () => { },
  loading: false,
});

export const LoadingProvider = ({ children, isFull = false }) => { // isFull이 true 로더 스피너는 전체 화면을 기준으로 출력 됨.
  const [loading, setLoading] = useState(false);

  const showLoading = useCallback(() => setLoading(true), []);
  const hideLoading = useCallback(() => setLoading(false), []);

  return (
    <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
      {children}

      {isFull && loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">처리 중입니다...</div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
