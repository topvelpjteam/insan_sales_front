import { createContext, useContext } from "react";

const LogoutContext = createContext({
  logout: async () => { }, // 기본 빈 함수
});

export const LogoutProvider = ({ logout, children }) => (
  <LogoutContext.Provider value={{ logout }}>
    {children}
  </LogoutContext.Provider>
);

export const useLogout = () => useContext(LogoutContext);