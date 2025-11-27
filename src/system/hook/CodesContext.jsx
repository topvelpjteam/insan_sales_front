import React, { createContext, useContext, useState, useEffect } from "react";
import { useApiCallService } from "@/system/ApiCallService";

// -----------------------------
// Context 정의
// -----------------------------
const CodesContext = createContext({
  codes: {},
  fetchCodes: async () => { },
});

// -----------------------------
// Provider 정의
// -----------------------------
export const CodesProvider = ({ children, codeGroups = [] }) => {
  const { request } = useApiCallService();

  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );
  const [fetched, setFetched] = useState(false);

  const fetchCodes = async () => {
    if (fetched) return; // 이미 fetch 했으면 종료
    try {
      const results = await Promise.all(
        codeGroups.map(async ({ key, codeGroupCode }) => {
          const res = await request(
            "domain/insanga/store/system",
            { action: "selectCode", payload: { codeGroupCode } },
            {},
            "post"
          );
          return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
        })
      );
      setCodes(Object.fromEntries(results));
      setFetched(true);
    } catch (err) {
      console.error("공통 코드 조회 실패:", err);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  return (
    <CodesContext.Provider value={{ codes, fetchCodes }}>
      {children}
    </CodesContext.Provider>
  );
};

// -----------------------------
// Hook 정의
// -----------------------------
export const useCodes = () => useContext(CodesContext);
