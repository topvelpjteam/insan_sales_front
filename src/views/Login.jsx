import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { user } from "@/system/store/redux/user";
import { setAgentData } from "@/system/store/redux/agent";
import { systemMenu } from "@/system/store/redux/menu";
import Properties from "@/system/Properties";
import { useTranslation } from "react-i18next";
import { loadLanguageFromApi } from "@/system/i18n/i18n";

//import { useLogout } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";

const Login = ({ onLogin }) => {

  //const { onLogout } = useLogout();
  const { request } = useApiCallService();

  const [username, setUsername] = useState("insangaAdmin001"); // systemAdmin, insangaUser001, insangaAdmin001
  const [password, setPassword] = useState("1");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 토큰 저장
  const setToken = useCallback((response) => {
    if (!response?.headers) return;

    const headers = Object.fromEntries(
      Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    const authHeader =
      headers["authorization"] ||
      headers["authentication"] ||
      headers["auth"] ||
      headers["token"];

    if (authHeader) {
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      sessionStorage.setItem("token", token);
    } else {
      console.warn("No authorization token found in login response");
    }
  }, []);

  const getAgentData = useCallback(async () => {
    const payload = {
      action: "selectAgentInfo",
      source: Properties.requestUrl.login.source,
      sourceTitle: Properties.requestUrl.login.sourceTitle,
      payload: {
        channGbn: "1",
      },
    };

    /** ✅ 일반 목록 조회 (기존 로직) */
    const res = await request("domain/insanga/store/system", payload, {}, "post", 'json');
    if (res?.data?.body) {
      await dispatch(setAgentData(res?.data?.body));
    }

  }, [dispatch, request]);

  // 메뉴 가져오기 - 관리자 메뉴 ( 추후 삭제 예정. )
  const getMenusAdmin = useCallback(async () => {
    const data = {
      action: Properties.requestUrl.menu.action,
      source: Properties.requestUrl.menu.source,
      sourceTitle: Properties.requestUrl.menu.sourceTitle,
      payload: {},
    };

    const res = await request(Properties.requestUrl.menu.url, data, {}, "post");

    if (res?.data?.body) {
      await dispatch(systemMenu(res.data.body));
    }
  }, [dispatch, request]);

  // 메뉴 가져오기 - 사용자 메뉴
  const getMenus = useCallback(async () => {
    const data = {
      action: Properties.requestUrl.menuUser.action,
      source: Properties.requestUrl.menuUser.source,
      sourceTitle: Properties.requestUrl.menuUser.sourceTitle,
      payload: {},
    };

    const res = await request(Properties.requestUrl.menuUser.url, data, {}, "post");
    if (res?.data?.body?.pagingList) {
      await dispatch(systemMenu(res?.data?.body?.pagingList));
    }
  }, [dispatch, request]);

  // 로그인 API
  const setLogin = useCallback(async () => {
    const data = {
      action: Properties.requestUrl.login.action,
      source: Properties.requestUrl.login.source,
      sourceTitle: Properties.requestUrl.login.sourceTitle,
      payload: { loginId: username, password },
    };

    const response = await request(Properties.requestUrl.login.url, data, {}, "post");
    if (response?.data?.body) {
      dispatch(user(response.data.body));
    }
    return response;
  }, [dispatch, username, password]);

  // 로그인 처리
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      try {
        const response = await setLogin();
        setToken(response);
        await getAgentData();
        await getMenusAdmin();
        const defaultLangCd = "ko"; // 사용자 정보에서 추출 해서 넣으면 됨.
        await i18n.changeLanguage(defaultLangCd);
        await loadLanguageFromApi(defaultLangCd);
        onLogin(true);
        navigate(Properties.welcomePage);
      } catch (err) {
        //console.error("Login Error:", err);
        setError(t("login_failed") || "로그인 실패");
      } finally {
        setIsLoading(false);
      }
    },
    [setLogin, setToken, getMenus, onLogin, navigate, t]
  );

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{t("login") || "로그인"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="login-input-group">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
            <label>아이디</label>
          </div>

          <div className="login-input-group">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <label>비밀번호</label>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="login_signup-link">
          {/* 계정이 없으신가요? <a href="#">회원가입</a> */}
          본사 bonsaAdmin01 / 1 <br />
          매장 insangaUser001 / 1
        </p>
      </div>
    </div>
  );
};

export default Login;