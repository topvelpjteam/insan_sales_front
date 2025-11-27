import { useCallback, useMemo } from "react";
import Axios from "axios";
import Properties from "@/system/Properties";
import { getMessage } from "@/system/hook/ManagerProvider";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "@/system/store/redux/user";
import { systemMenuInit } from "@/system/store/redux/menu";
import { persistor } from "@/system/store/redux/store";

/**
 * useApiCallService
 * API 공통 처리 Hook (에러/권한/토큰/메뉴)
 */
export const useApiCallService = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const showMessageModal = getMessage()?.showMessageModal;

  /**
   * ✅ 공통 로그아웃
   */
  const onLogout = useCallback(async () => {
    try {
      await requestSync(
        Properties.requestUrl.logout.url,
        {
          action: Properties.requestUrl.logout.action,
          source: Properties.requestUrl.logout.source,
          sourceTitle: Properties.requestUrl.logout.sourceTitle,
          payload: {}
        },
        {},
        "post"
      );
    } catch {
      // API 실패해도 UI 정리 처리
    } finally {
      sessionStorage.clear();
      dispatch(logout());
      dispatch(systemMenuInit());
      await persistor.flush();
      await persistor.purge();
      window.location.href = "/login";
    }
  }, [dispatch]);

  /**
   * ✅ 단일 Axios 인스턴스
   */
  const axiosInstance = useMemo(() => {
    const instance = Axios.create({
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json;charset=UTF-8",
      },
    });

    // REQUEST LOGGING (옵션)
    instance.interceptors.request.use(
      (config) => {
        // console.log("Request:", config);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // RESPONSE + ERROR 처리
    instance.interceptors.response.use(
      (res) => res,
      (error) => {
        handleError(error);
        return Promise.reject(error);
      }
    );

    return instance;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * ✅ Default Header(Token)
   */
  const getDefaultHeader = useCallback(() => {
    const token = sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /**
   * ✅ 공통 에러 처리
   */
  const handleError = useCallback(
    (error) => {
      const status = error?.response?.status;
      let msg = "서버 오류가 발생했습니다.";

      const statusMessages = {
        400: "잘못된 요청입니다. (400)",
        401: "인증이 필요합니다. (401)",
        403: "접근 권한이 없습니다. (403)",
        404: "페이지를 찾을 수 없습니다. (404)",
        405: "허용되지 않은 요청입니다. (405)",
        415: "지원하지 않는 데이터 형식입니다. (415)",
        500: "서버 오류가 발생했습니다. (500)",
        503: "서비스를 사용할 수 없습니다. (503)",
      };

      msg = statusMessages[status] ?? msg;

      if (status === 401) {
        (showMessageModal ?? alert)?.(
          { title: "알림", content: "로그인 정보가 만료되었습니다." }
        );
        onLogout();
        return;
      }

      (showMessageModal ?? alert)?.({
        title: "알림",
        content: msg,
      });
    },
    [showMessageModal, onLogout]
  );

  /**
   * ✅ Axios 기본 config
   */
  const buildAxiosConfig = useCallback(
    (url, data, params, method, responseType, responseEncoding) => ({
      url: `/api/${url}`,
      method,
      data,
      params: new URLSearchParams(params),
      headers: { ...getDefaultHeader() },
      responseType,
      responseEncoding,
    }),
    [getDefaultHeader]
  );

  /**
   * ✅ 메뉴/권한 정보 자동 주입
   */
  const applyMenuInfo = useCallback((data) => {
    const info = sessionStorage.getItem(Properties.CONSTANTS.CURRENT_MENU);
    if (!info) return data;

    const current = JSON.parse(info);
    return {
      ...data,
      source: data.source ?? current.path,
      sourceTitle: data.sourceTitle ?? current.name,
      pagePathTitle: data.pagePathTitle ?? current.name,
      permission: {
        useYn: current.useYn ?? "N",
        readYn: current.readYn ?? "N",
        selectYn: current.selectYn ?? "N",
        saveYn: current.saveYn ?? "N",
        deleteYn: current.deleteYn ?? "N",
        downloadYn: current.downloadYn ?? "N",
      },
    };
  }, []);

  /**
   * ✅ 공통 API 호출
   */
  const callApi = useCallback(
    async (
      url,
      data = {},
      params = {},
      method = "post",
      responseType = "json",
      responseEncoding = "utf8"
    ) => {
      const enrichedData = user
        ? { ...applyMenuInfo(data), userId: user.userId }
        : applyMenuInfo(data);

      const config = buildAxiosConfig(url, enrichedData, params, method, responseType, responseEncoding);

      try {
        const res = await axiosInstance(config);
        const resData = res?.data;

        // download 액션 제외
        if (
          data.action &&
          !data.action.toLowerCase().includes("download") &&
          resData.statusCodeValue !== 200
        ) {
          (showMessageModal ?? alert)?.({
            title: "에러 알림",
            content: `[${resData.statusCode}] ${resData.body}`,
            onCallback: () => {
              if (resData.statusCodeValue === 401) onLogout();
            },
          });

          throw res;
        }

        return res;
      } catch (err) {
        // 에러는 그대로 상위로 던지기
        throw err;
      }
    },
    [axiosInstance, user, applyMenuInfo, buildAxiosConfig, showMessageModal, onLogout]
  );

  /**
   * ✅ await 전용
   */
  const requestSync = useCallback(
    async (url, data = {}, params = {}, method = "post", responseType = "json", responseEncoding = "utf8") => {
      return axiosInstance(
        buildAxiosConfig(url, data, params, method, responseType, responseEncoding)
      );
    },
    [axiosInstance, buildAxiosConfig]
  );

  return { request: callApi, requestSync, onLogout };
};
