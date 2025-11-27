/**
 * 고객 현황 조회 화면 (SK520)
 *
 * 사용 프로시저: USP_SK520_Q
 *
 * [프로시저 정보]
 * - 기능: 고객 마스터 조회
 * - INPUT 파라미터 (17개 사용):
 *   @S_OPEN_D, @E_OPEN_D           : 개설일 범위
 *   @S_CUST_GBN, @E_CUST_GBN       : 고객구분 범위
 *   @S_AGENT, @E_AGENT             : 대리점 범위
 *   @MNG_STAFF                     : 담당직원
 *   @NATION                        : 국가
 *   @BIRTH_YN                      : 생일조회 여부
 *   @S_BIRTH, @E_BIRTH             : 생년월일 범위
 *   @D_GBN                         : 음양력 구분
 *   @SMS_CHK, @EMAIL_CHK, @DM_CHK  : 수신동의 여부
 *   @cust_data                     : 고객데이터 검색어
 *   @USER_ID                       : 사용자ID (자동 주입)
 *
 * - OUTPUT 컬럼 (45개): 고객정보, 구매통계, 마일리지, 방문이력 등
 *
 * [주의사항]
 * - JOB 파라미터는 WHERE 절 미사용으로 조회조건에서 제외
 * - VB6.0 레거시 프로시저는 수정하지 않음
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Properties from "@/system/Properties";
import { gridNoColumn, useLayoutWidths, getTabLabel } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import LeftPanel from "@/components/layout/LeftPanel";
import { useLoading } from "@/system/hook/LoadingContext";
import dayjs from "dayjs";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// 상태관리 정보
import { useSelector } from 'react-redux';

// Redux store에서 agentData, staffData 가져오기
import { getAgentData } from "@/system/store/redux/agent";
import { getStaffData } from "@/system/store/redux/staff";

// 공통 유틸 함수
import { validateFormData } from "@/system/utils/common";

// 조회 조건 초기값
const DEFAULT_FILTERS = {
  sOpenD: dayjs().subtract(3, "month").format("YYYY-MM-DD"),
  eOpenD: dayjs().format("YYYY-MM-DD"),
  sCustGbn: "",    // 고객구분 시작 (전체)
  eCustGbn: "",    // 고객구분 종료 (전체)
  sAgent: "",       // 소속 매장 시작 (전체)
  eAgent: "",       // 소속 매장 종료 (전체 - API 호출 시 ZZZZZ로 변환)
  mngStaff: "",
  nation: "",
  birthYn: "N",
  sBirth: "1976-01-01",
  eBirth: "2000-12-31",
  dGbn: "2",
  smsChk: "",
  emailChk: "",
  dmChk: "",
  custData: "",
};

// 조회 조건 폼 설정
const SEARCH_FORM = [
  {
    label: "등록 기간",
    key: "sOpenD",
    type: "dateRange",
    startKey: "sOpenD",
    endKey: "eOpenD",
    defaultValue: {
      start: dayjs().subtract(3, "month").format("YYYY-MM-DD"),
      end: dayjs().format("YYYY-MM-DD"),
    },
  },
  {
    label: "고객구분",
    key: "custGbnRange",
    type: "selectRange",
    startKey: "sCustGbn",
    endKey: "eCustGbn",
    codeKey: "custGbnData",
    defaultValue: { start: "", end: "" },
    syncOnAll: true,  // 전체 선택 시 양쪽 동기화
  },
  {
    label: "소속 매장",
    key: "agentRange",
    type: "selectRange",
    startKey: "sAgent",
    endKey: "eAgent",
    codeKey: "agentData",
    defaultValue: { start: "", end: "" },
  },
  {
    label: "담당직원",
    key: "mngStaff",
    type: "select",
    codeKey: "staffData",
    defaultValue: "",
  },
  {
    label: "국가",
    key: "nation",
    type: "select",
    codeKey: "nationData",
    defaultValue: "",
  },
  {
    label: "생일조회",
    key: "birthYn",
    type: "radio",
    codeKey: "birthYnData",
    defaultValue: "N",
  },
  {
    label: "생년월일",
    key: "birthRange",
    type: "dateRange",
    startKey: "sBirth",
    endKey: "eBirth",
    disabled: "birthYn",  // birthYn 값으로 disabled 결정
    defaultValue: {
      start: "1976-01-01",
      end: "2000-12-31",
    },
  },
  {
    label: "음/양력",
    key: "dGbn",
    type: "radio",
    codeKey: "dGbnData",
    disabled: "birthYn",  // birthYn 값으로 disabled 결정
    defaultValue: "2",
  },
  {
    label: "마케팅 수신 정보",
    key: "marketingChk",
    type: "checkGroup",
    options: [
      { key: "smsChk", label: "SMS", defaultValue: "" },
      { key: "emailChk", label: "e-mail", defaultValue: "" },
      { key: "dmChk", label: "DM", defaultValue: "" }
    ],
  },
  {
    label: "개인자료",
    key: "custData",
    type: "input",
    isEnterEvent: true,
  },
];

// 공통 코드 설정
const CODE_GROUPS = [
  { key: "custGbnData", codeGroupCode: "S37" },  // API 조회 - 고객구분 (1:신규~Z:온라인)
  { key: "nationData", codeGroupCode: "S72" },   // API 조회
  { key: "staffData" },                          // Redux
  { key: "agentData" },                          // Redux
  { key: "birthYnData" },                        // 하드코딩
  { key: "dGbnData" },                           // 하드코딩
  { key: "chkData" },                            // 하드코딩
];

// 그리드 컬럼 설정 (USP_SK520_Q 결과 컬럼)
const COLUMN_GROUPS = [
  {
    headerName: "",
    checkboxSelection: true,
    headerCheckboxSelection: true,
    width: 50,
    pinned: "left",
    cellStyle: Properties.grid.centerCellStyle,
  },
  {
    headerName: "고객ID",
    field: "custId",
    width: 100,
    cellClass: "text-center",
    pinned: "left",
  },
  {
    headerName: "고객명",
    field: "custNm",
    width: 100,
    cellClass: "text-left",
    pinned: "left",
  },
  {
    headerName: "국가",
    field: "nationNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "구분",
    field: "custGbnNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "성별",
    field: "sexGbn",
    width: 60,
    cellClass: "text-center",
  },
  {
    headerName: "생년월일",
    field: "birthD",
    width: 100,
    cellClass: "text-center",
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = params.value.replace(/\D/g, "");
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      }
      return params.value;
    },
  },
  {
    headerName: "음양",
    field: "dGbn",
    width: 60,
    cellClass: "text-center",
  },
  {
    headerName: "나이",
    field: "custAge",
    width: 60,
    cellClass: "text-right",
  },
  {
    headerName: "직업",
    field: "jobNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "대리점",
    field: "agentNm",
    width: 120,
    cellClass: "text-left",
  },
  {
    headerName: "담당직원",
    field: "staffNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "개설일",
    field: "custOpenD",
    width: 100,
    cellClass: "text-center",
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = params.value.replace(/\D/g, "");
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      }
      return params.value;
    },
  },
  {
    headerName: "등급",
    field: "gradeNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "방문횟수",
    field: "visitCnt",
    width: 80,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "구매횟수",
    field: "saleCnt",
    width: 80,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "구매수량",
    field: "saleQty",
    width: 80,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "구매금액",
    field: "saleAmt",
    width: 100,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "전년마일리지",
    field: "bMailP",
    width: 100,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "당년마일리지",
    field: "mailP",
    width: 100,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "최초방문",
    field: "firstVisit",
    width: 100,
    cellClass: "text-center",
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = params.value.replace(/\D/g, "");
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      }
      return params.value;
    },
  },
  {
    headerName: "최초구매",
    field: "firstSale",
    width: 100,
    cellClass: "text-center",
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = params.value.replace(/\D/g, "");
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      }
      return params.value;
    },
  },
  {
    headerName: "최근방문",
    field: "lastVisit",
    width: 100,
    cellClass: "text-center",
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = params.value.replace(/\D/g, "");
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      }
      return params.value;
    },
  },
  {
    headerName: "최근구매",
    field: "lastSale",
    width: 100,
    cellClass: "text-center",
    valueFormatter: (params) => {
      if (!params.value) return "";
      const date = params.value.replace(/\D/g, "");
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
      }
      return params.value;
    },
  },
  {
    headerName: "최근구매수량",
    field: "lastQty",
    width: 100,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "최근구매금액",
    field: "lastAmt",
    width: 100,
    cellClass: "text-right",
    valueFormatter: (params) => {
      if (params.value == null) return "0";
      return Number(params.value).toLocaleString();
    },
  },
  {
    headerName: "SMS",
    field: "smsChk",
    width: 60,
    cellClass: "text-center",
  },
  {
    headerName: "휴대폰",
    field: "custHp",
    width: 120,
    cellClass: "text-center",
  },
  {
    headerName: "Email",
    field: "emailChk",
    width: 60,
    cellClass: "text-center",
  },
  {
    headerName: "이메일주소",
    field: "custEmail",
    width: 180,
    cellClass: "text-left",
  },
  {
    headerName: "DM",
    field: "dmChk",
    width: 60,
    cellClass: "text-center",
  },
  {
    headerName: "우편번호",
    field: "zipId",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "주소",
    field: "custAddr",
    width: 250,
    cellClass: "text-left",
  },
  {
    headerName: "피부타입",
    field: "skinTypeNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "구매경로",
    field: "buyGbnNm",
    width: 80,
    cellClass: "text-center",
  },
  {
    headerName: "화장",
    field: "custMake",
    width: 60,
    cellClass: "text-center",
  },
  {
    headerName: "취미",
    field: "custHobb",
    width: 100,
    cellClass: "text-left",
  },
  {
    headerName: "개인자료",
    field: "custData",
    width: 200,
    cellClass: "text-left",
  },
  {
    headerName: "이전매장",
    field: "befAgentNm",
    width: 120,
    cellClass: "text-left",
  },
];

/**
 * 고객현황 조회 화면 (SK520)
 * USP_SK520_Q 프로시저 호출
 */
const CustStatus = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);
  const staffData = useSelector(getStaffData);
  const { request } = useApiCallService();
  const { loading, showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  const [rowData, setRowData] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // layout 훅 사용
  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } =
    useLayoutWidths(true, 25, false, 0);

  // No. 컬럼 추가
  const columnDefs = useMemo(() => {
    const hasNoColumn = COLUMN_GROUPS.some((col) => col.headerName === "No.");
    if (hasNoColumn) return COLUMN_GROUPS;

    const newColumnDefs = [...COLUMN_GROUPS];
    newColumnDefs.splice(1, 0, gridNoColumn({ width: 60, pinned: "left" }));
    return newColumnDefs;
  }, []);

  // 조회 조건 변경 처리
  const handleFilterChange = useCallback(
    (key, value) => setFilters((prev) => ({ ...prev, [key]: value })),
    []
  );

  // 조회
  const fetchData = useCallback(async () => {
    try {
      showLoading();

      // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.replace(/-/g, "");
      };

      const payload = {
        action: "selectSK520List",
        payload: {
          sOpenD: formatDate(filters.sOpenD) || "20180401",
          eOpenD: formatDate(filters.eOpenD) || "20180430",
          // 고객구분: 범위 조회 (VB6.0 원본 패턴)
          sCustGbn: filters.sCustGbn || "1",
          eCustGbn: filters.eCustGbn || "Z",
          sAgent: filters.sAgent || "",
          eAgent: filters.eAgent || "ZZZZZ",
          mngStaff: filters.mngStaff || "",
          nation: filters.nation || "",
          birthYn: filters.birthYn || "N",
          sBirth: formatDate(filters.sBirth) || "19760101",
          eBirth: formatDate(filters.eBirth) || "20001231",
          dGbn: filters.dGbn || "2",
          job: filters.job || "",
          smsChk: filters.smsChk || "",
          emailChk: filters.emailChk || "",
          dmChk: filters.dmChk || "",
          custData: filters.custData || "",
          userId: user?.emplId || "ADMIN",
        },
      };

      console.log('[CustStatus] filters:', filters);
      console.log('[CustStatus] user:', user);
      console.log('[CustStatus] Query payload:', payload);

      const res = await request(
        "domain/insanga/store/customer",
        payload,
        {},
        "post",
        "json"
      );

      console.log('[CustStatus] Query response:', res);
      console.log('[CustStatus] Response status:', res.status);
      console.log('[CustStatus] Response data:', res.data);

      // 백엔드 에러 체크
      if (res.data.statusCodeValue === 500 || res.data.statusCode === 'INTERNAL_SERVER_ERROR') {
        console.error('[ERROR] Backend error:', res.data.body);
        showMessageModal({
          title: "서버 오류",
          content: res.data.body || "서버에서 오류가 발생했습니다.",
        });
        return;
      }

      // Month 표준: res.data.body에 실제 데이터 있음
      const body = res?.data?.body;
      setRowData(body || []);

      if (body && body.length > 0) {
        showToast(`${body.length}건이 조회되었습니다.`, "success");
      } else {
        showToast("조회된 데이터가 없습니다.", "info");
      }
    } catch (err) {
      console.error("데이터 조회 실패:", err);
      console.error("Error response:", err.response);
      showMessageModal({
        title: "오류",
        content: err.response?.data?.body || "데이터 조회 중 오류가 발생했습니다.",
      });
    } finally {
      hideLoading();
    }
  }, [
    filters,
    hideLoading,
    showLoading,
    request,
    user?.emplId,
    showToast,
    showMessageModal,
  ]);

  // 조회 조건 초기화
  const handleInitSearch = useCallback((resetValues) => {
    if (resetValues) {
      // SearchFilter에서 전달된 defaultValues 사용
      setFilters(prev => ({
        ...prev,
        ...resetValues
      }));
    } else {
      // 직접 초기화 버튼 클릭 시
      setFilters(DEFAULT_FILTERS);
    }
  }, []);

  // 조회
  const handleSearch = useCallback(async () => {
    // 유효성 검사 패턴 적용
    const errors = validateFormData(filters, [{ columns: SEARCH_FORM }]);
    if (errors.length > 0) {
      showMessageModal({
        title: "알림",
        content: errors[0],
      });
      return;
    }

    setRowData([]);
    fetchData();
  }, [fetchData, filters, showMessageModal]);

  // 공통 코드 조회
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS.filter(({ codeGroupCode }) => codeGroupCode).map(async ({ key, codeGroupCode }) => {
            const res = await request(
              "domain/insanga/store/system",
              { action: "selectCode", payload: { codeGroupCode } },
              {},
              "post"
            );
            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        // agentData는 Redux store에서 가져오기
        if (CODE_GROUPS.some(col => col.key === "agentData")) {
          const newAgentData = Array.isArray(agentData) ? agentData.map(item => ({
            code: item.agentId,
            codeNm: item.agentNm,
          })) : [];
          results.push(["agentData", newAgentData]);
        }

        // staffData는 Redux store에서 가져오기
        if (CODE_GROUPS.some(col => col.key === "staffData")) {
          const newStaffData = Array.isArray(staffData) ? staffData.map(item => ({
            code: item.staffId,
            codeNm: item.staffNm,
          })) : [];
          results.push(["staffData", newStaffData]);
        }

        // 하드코딩 데이터 추가
        if (CODE_GROUPS.some(col => col.key === "birthYnData")) {
          const birthYnData = [
            { code: "Y", codeNm: "사용" },
            { code: "N", codeNm: "미사용" },
          ];
          results.push(["birthYnData", birthYnData]);
        }

        if (CODE_GROUPS.some(col => col.key === "dGbnData")) {
          const dGbnData = [
            { code: "1", codeNm: "음력" },
            { code: "2", codeNm: "양력" },
          ];
          results.push(["dGbnData", dGbnData]);
        }

        if (CODE_GROUPS.some(col => col.key === "chkData")) {
          const chkData = [
            { code: "", codeNm: "전체" },
            { code: "Y", codeNm: "수신" },
            { code: "N", codeNm: "거부" },
          ];
          results.push(["chkData", chkData]);
        }

        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request, agentData, staffData]);

  // agentData, staffData 변경 시 codes 업데이트
  useEffect(() => {
    console.log('[CustStatus] staffData update start');
    console.log('staffData from Redux:', staffData);
    console.log('staffData type:', typeof staffData);
    console.log('staffData isArray:', Array.isArray(staffData));
    console.log('agentData from Redux:', agentData);
    console.log('agentData type:', typeof agentData);
    console.log('agentData isArray:', Array.isArray(agentData));

    if (!Array.isArray(agentData)) {
      console.log('[ERROR] agentData is not array, skipping...');
      return;
    }

    if (!Array.isArray(staffData)) {
      console.log('[ERROR] staffData is not array, skipping...');
      return;
    }

    const mappedStaffData = staffData.map(item => {
      console.log('Mapping staff item:', item);
      return {
        code: item.staffId,
        codeNm: item.staffNm,
      };
    });

    console.log('[SUCCESS] Mapped staffData:', mappedStaffData);

    setCodes(prev => {
      const newCodes = {
        ...prev,
        agentData: agentData.map(item => ({
          code: item.agentId,
          codeNm: item.agentNm,
        })),
        staffData: mappedStaffData,
      };
      console.log('[SUCCESS] Updated codes:', newCodes);
      return newCodes;
    });
  }, [agentData, staffData]);

  return (
    <div className="content-registe-container cust-status-custom">
      <style>{`
        /* CustStatus 화면 전용 체크박스 스타일 */
        .cust-status-custom [type="checkbox"] {
          width: 14px;
          height: 14px;
          border: 1.5px solid #d0d5db;
          background-color: white;
          background-size: 10px auto;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .cust-status-custom [type="checkbox"]:hover:not(:disabled) {
          border-color: #1890ff;
        }

        .cust-status-custom [type="checkbox"]:checked {
          background-color: #1890ff;
          border-color: #1890ff;
          background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 11.917L9.724 16.5L19 7.5' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
        }

        .cust-status-custom [type="checkbox"]:disabled {
          background-color: #f5f5f5;
          border-color: #d9d9d9;
          cursor: not-allowed;
        }

        .cust-status-custom [type="checkbox"]:checked:disabled {
          background-color: #d9d9d9;
          border-color: #d9d9d9;
          background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 11.917L9.724 16.5L19 7.5' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
        }
      `}</style>
      <div className="content-main-area">
        {/* 좌측 검색 조건 패널 */}
        <LeftPanel
          codes={codes}
          filters={filters}
          handleFilterChange={handleFilterChange}
          searchForm={SEARCH_FORM}
          buttons={[
            {
              key: "search",
              label: "검색",
              className: "content-search-button",
              onClick: handleSearch,
            },
          ]}
          handleInit={handleInitSearch}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth}
          title={getTabLabel(tabKey)}
        />

        {/* 중앙 그리드 영역 */}
        <div
          className="content-center-panel"
          style={{ width: `${centerWidth}%` }}
        >
          <div className="content-panel-title content-panel-title-bg">
            고객현황 조회
          </div>
          <div className="ag-theme-alpine content-panel-grid">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: Properties.grid.default.colDef.sortable,
                filter: Properties.grid.default.colDef.filter,
                resizable: Properties.grid.default.colDef.resizable,
                minWidth: Properties.grid.default.colDef.minWidth,
              }}
              rowHeight={Properties.grid.default.data.height}
              headerHeight={Properties.grid.default.header.height}
              domLayout={Properties.grid.default.domLayout}
              rowSelection={Properties.grid.default.rowSelection}
              suppressRowClickSelection={
                Properties.grid.default.suppressRowClickSelection
              }
              enableBrowserTooltips={
                Properties.grid.default.enableBrowserTooltips
              }
              tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
              pagination={Properties.grid.default.pagination}
              paginationPageSize={Properties.grid.default.pageSize}
              paginationPageSizeSelector={
                Properties.grid.default.pageSizeList
              }
              suppressPaginationPanel={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustStatus);