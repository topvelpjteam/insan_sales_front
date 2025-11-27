import { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import MainFrame from "./components/layout/MainFrame";
import Login from "./views/Login";
import { useSelector, useDispatch } from "react-redux";
import { persistor } from "@/system/store/redux/store";
import Properties from "@/system/Properties";
import { logout } from "@/system/store/redux/user";
import { systemMenuInit } from "@/system/store/redux/menu";
import { useTranslation } from "react-i18next";
import _ from 'lodash';
//import moment from 'moment';

import "@/assets/scss/mainTypeNormal.scss";
import "./system/i18n/i18n.js";
import { loadLanguageFromApi } from "./system/i18n/i18n.js";

function App() {

  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const user = useSelector((state) => state.user?.user);
  const dispatch = useDispatch();
  const isLoggedIn = Boolean(user?.isLoggedIn);

  useEffect(() => {
    setIsLoading(false);
  }, [isLoggedIn]);

  // 🔹 Routes 함수 분리
  //const getRoutes = (loggedIn, onLogout) => {
  const getRoutes = (loggedIn) => {
    if (!loggedIn) {
      return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Navigate to="/login" replace />} />
        </Routes>
      );
    }

    // 로그인 성공 시
    return (
      <Routes>
        <Route path="/login" element={<Navigate to={Properties.welcomePage} replace />} />
        {/* <Route path="/*" element={<MainFrame onLogout={onLogout} />} /> */}
        <Route path="/*" element={<MainFrame />} />
      </Routes>
    );
  };

  if (isLoading) {
    return <div className="loading">{t("loading") || "Loading..."}</div>;
  }

  return (
    <BrowserRouter>
      {/* {getRoutes(isLoggedIn, handleLogout)} */}
      {getRoutes(isLoggedIn)}
    </BrowserRouter>
  );
}

export default App;