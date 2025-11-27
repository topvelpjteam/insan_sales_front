import { createContext, useContext, useMemo } from "react";
import HttpClient from "@/system/HttpClient";
import { useCustomContents } from "@/system/hook/ManagerProvider";
//import { useLogout } from "@/system/hook/LogoutContext"; // ✅ 추가

const HttpContext = createContext(null);

export const HttpProvider = ({ children }) => {

  //const { logout } = useLogout();

  const custom = useCustomContents() || {}; // ✅ undefined 방어
  const {
    showToast = () => { },
    showMessageModal = () => { },
    showConfirmModal = () => { },
    showPopupModal = () => { },
  } = custom;

  const http = useMemo(
    () =>
      new HttpClient({
        showToast,
        showMessageModal,
        showConfirmModal,
        showPopupModal,
        //logout,
      }),
    [showToast, showMessageModal, showConfirmModal, showPopupModal]
  );

  return <HttpContext.Provider value={http}>{children}</HttpContext.Provider>;
};

export const useHttp = () => useContext(HttpContext);