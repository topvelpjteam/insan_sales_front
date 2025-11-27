/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 매장별 주간 고객수 현황
 * - 파일명 : AgentWeekCustCnt.jsx
 * - URL: /insanga/customer/agentweekcustcnt
 * - VB6.0 화면: frm_SK535_Q (매장별 주간 고객수 현황)
 * - 프로시저: USP_SK535_Q
 *
 * INPUT (4개 파라미터):
 *   - @YM: 조회 년월 (CHAR(6), YYYYMM)
 *   - @BRAND_ID: 브랜드코드 (VARCHAR(4))
 *   - @AGENT_LIST: 매장코드 목록 (VARCHAR(300), 콤마구분)
 *   - @USER_ID: 사용자 ID (VARCHAR(30))
 *
 * OUTPUT: 매장별 주간 고객수 현황 (12개 컬럼)
 *   - WEEK_GROUP: 주차 (1~5주)
 *   - GBN: 구분 (1=당년, 2=전년)
 *   - S_DATE: 시작일자
 *   - E_DATE: 종료일자
 *   - AGENT_ID: 매장코드
 *   - AGENT_NM: 매장명
 *   - TOT_CUST_CNT: 총고객수
 *   - B_WEEK_RATE: 전주대비율(%)
 *   - NEW_CUST_CNT: 신규고객수
 *   - OLD_CUST_CNT: 기존고객수
 *   - FREE_CUST_CNT: 무료고객수
 *   - GAIB_CUST_CNT: 가입고객수
 *
 * 그리드 표시 형태 (VB6.0 원본 피벗 형식):
 *   - 행: 매장별 3행 (당년, 전년, 전년비)
 *   - 열: 주차별 (1주~5주) x (신규, 기존, 프리, 가입, 총구매객, 전주비)
 *
 * 작성자: 김정명
 * 작성일: 2025-11-25
 ********************************************************************/

import React, { useState, useEffect, useCallback, useMemo } from "react";

// 시스템 기본정보
import Properties from "@/system/Properties";

// API 호출
import { useApiCallService } from "@/system/ApiCallService";

// UpperPanel (상단 가로 배치형 검색 필터)
import UpperPanel from "@/components/layout/UpperPanel";

// 로딩 바
import { useLoading } from "@/system/hook/LoadingContext";

// AG Grid
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

// 메시지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// Redux 상태 관리
import { useSelector } from "react-redux";

// Redux 셀렉터
import { getAgentData } from "@/system/store/redux/agent";

// 날짜 유틸
import dayjs from "dayjs";

// 유틸 함수
import { numberFormatter } from "@/system/utils/common";

// 차트 라이브러리
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// DashBoard에서 사용하는 브랜드 팔레트와 맞춘 컬러 세트
const DASHBOARD_PALETTE = {
  primary: "#335EEA",
  info: "#7C69EF",
  success: "#42BA96",
  warning: "#ffc35a",
  danger: "#DF4759",
  teal: "#30b0c7",
  gray: "#869ab8",
  grid: "#e6eaf4",
};

const AgentWeekCustCnt = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  const [codeGroups] = useState([
    { key: "agentData", codeGroupCode: "" },
    { key: "brandData", codeGroupCode: "S02" },
  ]);

  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  const [rawData, setRawData] = useState([]); // 프로시저 원본 데이터
  const [weekHeaders, setWeekHeaders] = useState([]); // 주차별 헤더 정보

  // 조회 조건 폼 정의
  // 데모 데이터 특성상 당년 데이터가 없을 수 있어 작년 동월을 기본값으로 설정
  const SEARCH_FORM = [
    {
      label: "조회 년월",
      key: "ym",
      type: "yyyymm",
      defaultValue: dayjs().subtract(1, "year").format("YYYY-MM"),
    },
    {
      label: "브랜드",
      key: "brandId",
      type: "select",
      codeKey: "brandData",
      defaultValue: "",
    },
    {
      label: "매장",
      key: "agentList",
      type: "select",
      codeKey: "agentData",
      defaultValue: "",
    },
  ];

  const [filters, setFilters] = useState(
    SEARCH_FORM.reduce((acc, cur) => {
      acc[cur.key] = cur.defaultValue ?? "";
      return acc;
    }, {})
  );

  // 데이터 피벗 변환 함수
  // 프로시저 결과를 VB6.0 원본 형태로 변환
  // 백엔드 CamelCaseMap으로 camelCase 변환됨:
  //   weekGroup, gbn, sDate, eDate, agentId, agentNm,
  //   totCustCnt, bWeekRate, newCustCnt, oldCustCnt, freeCustCnt, gaibCustCnt
  const pivotData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // 디버깅: 실제 필드명 확인
    console.log("SK535 rawData[0]:", rawData[0]);
    console.log("SK535 gbn별 건수 - 당년(1):", rawData.filter(r => r.gbn === "1").length, "전년(2):", rawData.filter(r => r.gbn === "2").length);

    // 1. 주차 목록 추출 (중복 제거, 정렬)
    const weekGroups = [...new Set(rawData.map((r) => r.weekGroup))].sort((a, b) => a - b);

    // 2. 주차별 헤더 정보 생성 (시작일~종료일)
    // 당년 데이터가 없을 수 있으므로 전년 데이터도 확인
    // WEEK_GROUP = 9는 월누적 데이터
    const headers = weekGroups.map((week) => {
      // 9주는 월누적
      if (week === 9) {
        return { week, label: "월누적", isMonthTotal: true };
      }

      const weekData = rawData.find((r) => r.weekGroup === week && r.gbn === "1")
                    || rawData.find((r) => r.weekGroup === week && r.gbn === "2");
      if (weekData) {
        const sDate = weekData.sDate;
        const eDate = weekData.eDate;
        const sFormatted = sDate ? `${sDate.substring(4, 6)}/${sDate.substring(6, 8)}` : "";
        const eFormatted = eDate ? `${eDate.substring(4, 6)}/${eDate.substring(6, 8)}` : "";
        return {
          week,
          label: `${week}주 (${sFormatted}-${eFormatted})`,
          isMonthTotal: false,
        };
      }
      return { week, label: `${week}주`, isMonthTotal: false };
    });
    setWeekHeaders(headers);

    // 3. 매장 목록 추출 (TOTAL 먼저, 나머지 정렬)
    const agentIds = [...new Set(rawData.map((r) => r.agentId))];
    const sortedAgentIds = agentIds.sort((a, b) => {
      if (a === "00000") return -1;
      if (b === "00000") return 1;
      return a.localeCompare(b);
    });

    // 4. 피벗 데이터 생성
    const result = [];

    sortedAgentIds.forEach((agentId) => {
      const agentRows = rawData.filter((r) => r.agentId === agentId);
      const agentNm = agentRows[0]?.agentNm?.trim() || agentId;

      // 당년 데이터 (gbn = "1")
      const currentYearRow = { agentId, agentNm, rowType: "current", rowTypeLabel: dayjs().format("YYYY") };
      // 전년 데이터 (gbn = "2")
      const prevYearRow = { agentId, agentNm, rowType: "prev", rowTypeLabel: String(dayjs().year() - 1) };
      // 전년비 데이터 (계산)
      const ratioRow = { agentId, agentNm, rowType: "ratio", rowTypeLabel: "전년비" };

      weekGroups.forEach((week) => {
        const currentData = agentRows.find((r) => r.weekGroup === week && r.gbn === "1");
        const prevData = agentRows.find((r) => r.weekGroup === week && r.gbn === "2");

        // 당년 데이터
        currentYearRow[`w${week}_new`] = currentData?.newCustCnt ?? 0;
        currentYearRow[`w${week}_old`] = currentData?.oldCustCnt ?? 0;
        currentYearRow[`w${week}_free`] = currentData?.freeCustCnt ?? 0;
        currentYearRow[`w${week}_gaib`] = currentData?.gaibCustCnt ?? 0;
        currentYearRow[`w${week}_tot`] = currentData?.totCustCnt ?? 0;
        currentYearRow[`w${week}_rate`] = currentData?.bWeekRate ?? 0;

        // 전년 데이터
        prevYearRow[`w${week}_new`] = prevData?.newCustCnt ?? 0;
        prevYearRow[`w${week}_old`] = prevData?.oldCustCnt ?? 0;
        prevYearRow[`w${week}_free`] = prevData?.freeCustCnt ?? 0;
        prevYearRow[`w${week}_gaib`] = prevData?.gaibCustCnt ?? 0;
        prevYearRow[`w${week}_tot`] = prevData?.totCustCnt ?? 0;
        prevYearRow[`w${week}_rate`] = prevData?.bWeekRate ?? 0;

        // 전년비 계산 (당년/전년 * 100)
        const calcRatio = (cur, prev) => {
          const curVal = cur ?? 0;
          const prevVal = prev ?? 0;
          if (prevVal === 0) return curVal > 0 ? "-" : "-";
          if (curVal === 0) return "0%";
          return Math.round((curVal / prevVal) * 100) + "%";
        };

        ratioRow[`w${week}_new`] = calcRatio(currentData?.newCustCnt, prevData?.newCustCnt);
        ratioRow[`w${week}_old`] = calcRatio(currentData?.oldCustCnt, prevData?.oldCustCnt);
        ratioRow[`w${week}_free`] = calcRatio(currentData?.freeCustCnt, prevData?.freeCustCnt);
        ratioRow[`w${week}_gaib`] = calcRatio(currentData?.gaibCustCnt, prevData?.gaibCustCnt);
        ratioRow[`w${week}_tot`] = calcRatio(currentData?.totCustCnt, prevData?.totCustCnt);
        ratioRow[`w${week}_rate`] = ""; // 전주비의 전년비는 표시 안함
      });

      result.push(currentYearRow);
      result.push(prevYearRow);
      result.push(ratioRow);
    });

    return result;
  }, [rawData]);

  // 동적 컬럼 정의
  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: "구분",
        field: "agentNm",
        width: 150,
        pinned: "left",
        cellClass: "text-center",
        rowSpan: (params) => {
          if (params.data?.rowType === "current") return 3;
          return 1;
        },
        cellClassRules: {
          "merged-cell-border": (params) => params.data?.rowType === "current",
        },
        valueFormatter: (params) => {
          if (params.data?.rowType === "current") {
            return params.data?.agentId === "00000" ? "TOTAL" : params.value;
          }
          return "";
        },
      },
      {
        headerName: "기준",
        field: "rowTypeLabel",
        width: 70,
        pinned: "left",
        cellClass: "text-center",
      },
    ];

    // 주차별 컬럼 그룹 추가
    weekHeaders.forEach((header, index) => {
      const week = header.week;
      const isFirstWeek = index === 0;
      const isMonthTotal = header.isMonthTotal; // 월누적 여부

      const children = [
        {
          headerName: "신규\n(구매)",
          field: `w${week}_new`,
          width: 70,
          cellClass: (params) => params.data?.rowType === "ratio" ? "text-center" : "text-right",
          valueFormatter: (params) => {
            if (params.data?.rowType === "ratio") return params.value;
            return params.value !== undefined ? params.value.toLocaleString() : "";
          },
        },
        {
          headerName: "기존",
          field: `w${week}_old`,
          width: 60,
          cellClass: (params) => params.data?.rowType === "ratio" ? "text-center" : "text-right",
          valueFormatter: (params) => {
            if (params.data?.rowType === "ratio") return params.value;
            return params.value !== undefined ? params.value.toLocaleString() : "";
          },
        },
        {
          headerName: "프리",
          field: `w${week}_free`,
          width: 60,
          cellClass: (params) => params.data?.rowType === "ratio" ? "text-center" : "text-right",
          valueFormatter: (params) => {
            if (params.data?.rowType === "ratio") return params.value;
            return params.value !== undefined ? params.value.toLocaleString() : "";
          },
        },
        {
          headerName: "가입",
          field: `w${week}_gaib`,
          width: 60,
          cellClass: (params) => params.data?.rowType === "ratio" ? "text-center" : "text-right",
          valueFormatter: (params) => {
            if (params.data?.rowType === "ratio") return params.value;
            return params.value !== undefined ? params.value.toLocaleString() : "";
          },
        },
        {
          headerName: "총구매객",
          field: `w${week}_tot`,
          width: 80,
          cellClass: (params) => {
            const baseClass = params.data?.rowType === "ratio" ? "text-center" : "text-right";
            return `${baseClass} highlight-col`;
          },
          valueFormatter: (params) => {
            if (params.data?.rowType === "ratio") return params.value;
            return params.value !== undefined ? params.value.toLocaleString() : "";
          },
        },
      ];

      // 1주차와 월누적(9주)이 아닌 경우에만 전주비 컬럼 추가
      if (!isFirstWeek && !isMonthTotal) {
        children.push({
          headerName: "전주비",
          field: `w${week}_rate`,
          width: 70,
          cellClass: (params) => {
            if (params.data?.rowType === "ratio") return "text-center";
            const val = params.value;
            if (val > 100) return "text-right highlight-green";
            if (val < 100 && val > 0) return "text-right highlight-red";
            return "text-right";
          },
          valueFormatter: (params) => {
            if (params.data?.rowType === "ratio") return "";
            const val = params.value;
            if (val === null || val === undefined || val === 0) return "";
            return `${val}%`;
          },
        });
      }

      cols.push({
        headerName: header.label,
        children: children,
      });
    });

    return cols;
  }, [weekHeaders]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchData = useCallback(
    async (action = "selectSK535List") => {
      try {
        showLoading();

        const formatYm = (ymStr) => {
          if (!ymStr) return "";
          return ymStr.replace(/-/g, "");
        };

        const payload = {
          action,
          payload: {
            ym: formatYm(filters.ym) || dayjs().format("YYYYMM"),
            brandId: filters.brandId || "",
            agentList: filters.agentList || "",
            userId: user?.emplId || "ADMIN",
          },
        };

        console.log("매장별 주간 고객수 현황 조회 요청:", payload);

        const res = await request(
          "domain/insanga/store/customer",
          payload,
          {},
          "post",
          "json"
        );

        console.log("매장별 주간 고객수 현황 조회 응답:", res);

        const body = res?.data?.body;
        setRawData(body || []);

        if (body && body.length > 0) {
          showToast(`${body.length}건 조회되었습니다.`, "success");
        } else {
          showToast("조회된 데이터가 없습니다.", "info");
        }
      } catch (err) {
        console.error("매장별 주간 고객수 현황 조회 실패:", err);
        showMessageModal("조회 중 오류가 발생했습니다.");
        setRawData([]);
      } finally {
        hideLoading();
      }
    },
    [filters, request, user, showLoading, hideLoading, showToast, showMessageModal]
  );

  const handleSearch = useCallback(async () => {
    setRawData([]);
    await fetchData();
  }, [fetchData]);

  // 초기화 핸들러 (LeftPanel handleInit용)
  const handleInitSearch = useCallback(() => {
    const initialFilters = SEARCH_FORM.reduce((acc, cur) => {
      acc[cur.key] = cur.defaultValue ?? "";
      return acc;
    }, {});
    setFilters(initialFilters);
    setRawData([]);
  }, []);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          codeGroups
            .filter(({ codeGroupCode }) => codeGroupCode)
            .map(async ({ key, codeGroupCode }) => {
              const res = await request(
                "domain/insanga/store/system",
                {
                  action: "selectCode",
                  payload: { codeGroupCode },
                },
                {},
                "post"
              );
              return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
            })
        );

        if (codeGroups.some((col) => col.key === "agentData")) {
          const newAgentData = (agentData || []).map((item) => ({
            code: item.agentId,
            codeNm: item.agentNm,
          }));
          results.push(["agentData", newAgentData]);
        }

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request, agentData]);

  useEffect(() => {
    if (!Array.isArray(agentData)) return;

    setCodes((prev) => ({
      ...prev,
      agentData: agentData.map((item) => ({
        code: item.agentId,
        codeNm: item.agentNm,
      })),
    }));
  }, [agentData]);

  // 행 스타일 (전년비 행은 배경색 다르게)
  const getRowStyle = useCallback((params) => {
    if (params.data?.rowType === "ratio") {
      return { backgroundColor: "#f0f8ff" }; // 연한 파랑
    }
    return null;
  }, []);

  // 차트용 데이터 생성 (TOTAL 기준 주차별 총구매객 추이)
  // 월누적(WEEK_GROUP=9) 제외
  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // TOTAL(00000) 데이터만 필터링, 월누적(9) 제외
    const totalData = rawData.filter((r) => r.agentId === "00000" && r.weekGroup !== 9);
    if (totalData.length === 0) return [];

    // 주차별로 그룹핑
    const weekGroups = [...new Set(totalData.map((r) => r.weekGroup))].sort((a, b) => a - b);

    return weekGroups.map((week) => {
      const currentData = totalData.find((r) => r.weekGroup === week && r.gbn === "1");
      const prevData = totalData.find((r) => r.weekGroup === week && r.gbn === "2");

      return {
        name: `${week}주`,
        당년: currentData?.totCustCnt ?? 0,
        전년: prevData?.totCustCnt ?? 0,
      };
    });
  }, [rawData]);

  // 매장별 차트 데이터 (TOTAL 제외)
  // 당년 데이터가 있으면 성장률, 없으면 전년 고객수 기준
  const agentBarChartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return { data: [], hasCurrentYear: false };

    // TOTAL(00000) 제외한 매장 목록 추출
    const agentIds = [...new Set(rawData.map((r) => r.agentId))].filter((id) => id !== "00000");

    // 당년 데이터 존재 여부 확인
    const hasCurrentYearData = rawData.some((r) => r.gbn === "1" && r.totCustCnt > 0);

    const data = agentIds.map((agentId) => {
      const agentRows = rawData.filter((r) => r.agentId === agentId);
      const agentNm = agentRows[0]?.agentNm?.trim() || agentId;

      // 당년(gbn=1) 총합
      const currentTotal = agentRows
        .filter((r) => r.gbn === "1")
        .reduce((sum, r) => sum + (r.totCustCnt ?? 0), 0);

      // 전년(gbn=2) 총합
      const prevTotal = agentRows
        .filter((r) => r.gbn === "2")
        .reduce((sum, r) => sum + (r.totCustCnt ?? 0), 0);

      // 성장률 계산 (전년 대비 증감률)
      let growthRate = 0;
      if (prevTotal > 0 && currentTotal > 0) {
        growthRate = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
      } else if (currentTotal > 0 && prevTotal === 0) {
        growthRate = 100;
      } else if (currentTotal === 0 && prevTotal > 0) {
        growthRate = -100;
      }

      return {
        name: agentNm.length > 5 ? agentNm.substring(0, 5) + ".." : agentNm,
        fullName: agentNm,
        성장률: growthRate,
        당년: currentTotal,
        전년: prevTotal,
        고객수: hasCurrentYearData ? currentTotal : prevTotal,
      };
    });

    // 당년 데이터 있으면 성장률 기준, 없으면 고객수 기준 정렬
    if (hasCurrentYearData) {
      data.sort((a, b) => b.성장률 - a.성장률);
    } else {
      data.sort((a, b) => b.고객수 - a.고객수);
    }

    return { data, hasCurrentYear: hasCurrentYearData };
  }, [rawData]);

  // 고객 유형별 구성비 파이차트 데이터 (TOTAL 기준, 당년)
  const pieChartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // TOTAL(00000) + 당년(gbn=1) 데이터만 필터링, 월누적(9) 제외
    const totalCurrentData = rawData.filter(
      (r) => r.agentId === "00000" && r.gbn === "1" && r.weekGroup !== 9
    );

    if (totalCurrentData.length === 0) {
      // 당년 데이터 없으면 전년 데이터 사용
      const totalPrevData = rawData.filter(
        (r) => r.agentId === "00000" && r.gbn === "2" && r.weekGroup !== 9
      );
      if (totalPrevData.length === 0) return [];

      const newCust = totalPrevData.reduce((sum, r) => sum + (r.newCustCnt ?? 0), 0);
      const oldCust = totalPrevData.reduce((sum, r) => sum + (r.oldCustCnt ?? 0), 0);
      const freeCust = totalPrevData.reduce((sum, r) => sum + (r.freeCustCnt ?? 0), 0);

      return [
        { name: "신규고객", value: newCust, color: DASHBOARD_PALETTE.primary },
        { name: "기존고객", value: oldCust, color: DASHBOARD_PALETTE.teal },
        { name: "프리고객", value: freeCust, color: DASHBOARD_PALETTE.warning },
      ].filter((item) => item.value > 0);
    }

    const newCust = totalCurrentData.reduce((sum, r) => sum + (r.newCustCnt ?? 0), 0);
    const oldCust = totalCurrentData.reduce((sum, r) => sum + (r.oldCustCnt ?? 0), 0);
    const freeCust = totalCurrentData.reduce((sum, r) => sum + (r.freeCustCnt ?? 0), 0);

    return [
      { name: "신규고객", value: newCust, color: DASHBOARD_PALETTE.primary },
      { name: "기존고객", value: oldCust, color: DASHBOARD_PALETTE.teal },
      { name: "프리고객", value: freeCust, color: DASHBOARD_PALETTE.warning },
    ].filter((item) => item.value > 0);
  }, [rawData]);

  return (
    <div className="content-registe-container">
      <div
        className="content-main-area"
        style={{ flexDirection: "column", minHeight: 0, overflowY: "auto" }}
      >
        <div className="content-center-panel" style={{ width: "100%", paddingBottom: "16px" }}>
          {/* 상단 검색 조건 - UpperPanel 사용 */}
          <UpperPanel
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
            title="매장별 주간 고객수 현황"
            rowByDisplayCnt={3}
          />

          {/* 그리드 영역 */}
            <div className="ag-theme-alpine content-panel-grid" style={{ height: "400px", display: "block" }}>
            <AgGridReact
              rowData={pivotData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: false,
                filter: false,
                resizable: true,
                minWidth: 50,
              }}
              rowHeight={Properties.grid.default.data.height}
              headerHeight={40}
              groupHeaderHeight={30}
              domLayout="normal"
              suppressRowClickSelection={true}
              enableBrowserTooltips={true}
              tooltipShowDelay={0}
              getRowStyle={getRowStyle}
              suppressMovableColumns={true}
              suppressRowTransform={true}
            />
          </div>

          {/* 차트 영역 */}
          {(chartData.length > 0 || agentBarChartData.data.length > 0 || pieChartData.length > 0) && (
            <div style={{ display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" }}>
              {/* 주간 총구매객 추이 (LineChart) */}
              {chartData.length > 0 && (
                <div style={{ flex: "1 1 30%", minWidth: "350px", padding: "15px", backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: "4px" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_PALETTE.grid} />
                    <XAxis dataKey="name" tick={{ fill: DASHBOARD_PALETTE.gray, fontSize: 12 }} />
                    <YAxis tick={{ fill: DASHBOARD_PALETTE.gray, fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="당년"
                        stroke={DASHBOARD_PALETTE.primary}
                        strokeWidth={2}
                        dot={{ fill: DASHBOARD_PALETTE.primary, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: DASHBOARD_PALETTE.primary }}
                      />
                      <Line
                        type="monotone"
                        dataKey="전년"
                        stroke={DASHBOARD_PALETTE.teal}
                        strokeWidth={2}
                        dot={{ fill: DASHBOARD_PALETTE.teal, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: DASHBOARD_PALETTE.teal }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#555", marginTop: "10px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                    주간 총구매객 추이
                  </div>
                </div>
              )}

              {/* 매장별 차트 - 당년 데이터 유무에 따라 다르게 표시 */}
              {agentBarChartData.data.length > 0 && (
                <div style={{ flex: "1 1 45%", minWidth: "400px", padding: "15px", backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: "4px" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    {agentBarChartData.hasCurrentYear ? (
                      /* 당년 데이터 있음: 성장률 차트 */
                      <BarChart data={agentBarChartData.data} layout="vertical" margin={{ top: 5, right: 55, left: 50, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_PALETTE.grid} />
                        <XAxis type="number" tick={{ fill: DASHBOARD_PALETTE.gray, fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: DASHBOARD_PALETTE.gray }} width={60} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div style={{ backgroundColor: "#fff", padding: "8px 12px", border: `1px solid ${DASHBOARD_PALETTE.grid}`, borderRadius: "4px", fontSize: "12px" }}>
                                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{data.fullName}</div>
                                  <div>당년: {data.당년.toLocaleString()}명</div>
                                  <div>전년: {data.전년.toLocaleString()}명</div>
                                  <div style={{ color: data.성장률 >= 0 ? DASHBOARD_PALETTE.success : DASHBOARD_PALETTE.danger, fontWeight: "bold" }}>
                                    성장률: {data.성장률 >= 0 ? "+" : ""}{data.성장률}%
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine x={0} stroke={DASHBOARD_PALETTE.gray} />
                        <Bar
                          dataKey="성장률"
                          radius={[0, 4, 4, 0]}
                          label={{ position: "right", fontSize: 10, formatter: (value) => `${value}%` }}
                        >
                          {agentBarChartData.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.성장률 >= 0 ? DASHBOARD_PALETTE.success : DASHBOARD_PALETTE.danger} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      /* 당년 데이터 없음: 고객수 비교 차트 */
                      <BarChart data={agentBarChartData.data} layout="vertical" margin={{ top: 5, right: 55, left: 50, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_PALETTE.grid} />
                        <XAxis type="number" tick={{ fill: DASHBOARD_PALETTE.gray, fontSize: 11 }} tickFormatter={(value) => value.toLocaleString()} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: DASHBOARD_PALETTE.gray }} width={60} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div style={{ backgroundColor: "#fff", padding: "8px 12px", border: `1px solid ${DASHBOARD_PALETTE.grid}`, borderRadius: "4px", fontSize: "12px" }}>
                                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{data.fullName}</div>
                                  <div>총 고객수: {data.고객수.toLocaleString()}명</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="고객수"
                          fill={DASHBOARD_PALETTE.primary}
                          radius={[0, 4, 4, 0]}
                          label={{ position: "right", fontSize: 10, formatter: (value) => value.toLocaleString() }}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                  <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#555", marginTop: "10px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                    {agentBarChartData.hasCurrentYear ? "매장별 전년대비 고객수 성잘률" : "매장별 고객수 현황"}
                  </div>
                </div>
              )}

              {/* 고객 유형별 구성비 (PieChart) */}
              {pieChartData.length > 0 && (
                <div style={{ flex: "0 0 22%", minWidth: "250px", padding: "15px", backgroundColor: "#fff", border: "1px solid #e8e8e8", borderRadius: "4px" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: DASHBOARD_PALETTE.gray, strokeWidth: 1 }}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value.toLocaleString()}명`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#555", marginTop: "10px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                    고객 유형별 구성비
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .highlight-col {
          background-color: #fffde7 !important;
        }
        .highlight-green {
          background-color: #c8e6c9 !important;
          color: #1b5e20;
          font-weight: bold;
        }
        .highlight-red {
          background-color: #ffcdd2 !important;
          color: #b71c1c;
        }
        /* 셀 병합 스타일 */
        .merged-cell-border {
          background-color: #f5f5f5 !important;
          font-weight: 600;
          display: flex;
          align-items: center;
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(AgentWeekCustCnt);
