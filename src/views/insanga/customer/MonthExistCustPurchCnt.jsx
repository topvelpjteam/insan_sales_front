/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 월간 고객구매회차 현황
 * - 파일명 : MonthExistCustPurchCnt.jsx
 * - URL: /insanga/customer/monthexistcustpurchcnt
 * - VB6.0 화면: frm_SK550_Q (기존고객), frm_SK552_Q (신규고객)
 * - 프로시저: USP_SK550_Q (기존고객), USP_SK552_Q (신규고객)
 *
 * 통합 화면: 기존고객 + 신규고객 구매회차 현황을 좌우로 배치
 *
 * INPUT (4개 파라미터 - 두 프로시저 동일):
 *   - @YM: 조회 년월 (CHAR(6), YYYYMM)
 *   - @BRAND_ID: 브랜드코드 (VARCHAR(4))
 *   - @AGENT_LIST: 매장코드 목록 (VARCHAR(300), 콤마구분)
 *   - @USER_ID: 사용자 ID (VARCHAR(30))
 *
 * OUTPUT (두 프로시저 동일한 구조):
 *   - AGENT_ID, AGENT_NM: 매장정보
 *   - CNT_1~4, TOT_CNT: 회차별/총 고객수
 *   - AMT_1~4, TOT_AMT: 회차별/총 금액
 *   - AUS: 평균단가, IPT: 인당평균
 *
 * 작성자: 김정명
 * 작성일: 2025-11-26
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

// 차트
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 메시지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// Redux 상태 관리
import { useSelector } from "react-redux";

// Redux 셀렉터
import { getAgentData } from "@/system/store/redux/agent";

// 날짜 유틸
import dayjs from "dayjs";

// ============================================
// 컴포넌트 외부 상수 정의 (리렌더링 방지)
// ============================================

// 도넛 차트 색상 정의
const DONUT_COLORS = ["#4CAF50", "#2196F3", "#FF9800", "#F44336"];

// 코드 그룹 정의 (변경되지 않는 상수)
const CODE_GROUPS = [
  { key: "agentData", codeGroupCode: "" },
  { key: "brandData", codeGroupCode: "S02" },
];

// 조회 조건 폼 정의 (변경되지 않는 상수)
const SEARCH_FORM = [
  {
    label: "조회 년월",
    key: "ym",
    type: "yyyymm",
    defaultValue: "2024-10",
  },
  {
    label: "브랜드",
    key: "brandId",
    type: "select",
    codeKey: "brandData",
    defaultValue: "",
  },
  {
    label: "거래처",
    key: "agentList",
    type: "select",
    codeKey: "agentData",
    defaultValue: "",
  },
];

// 초기 필터 값 생성
const getInitialFilters = () => {
  return SEARCH_FORM.reduce((acc, cur) => {
    acc[cur.key] = cur.defaultValue ?? "";
    return acc;
  }, {});
};

// 피벗 행 정의 (변경되지 않는 상수)
// totalKey: 스네이크케이스/카멜케이스 둘 다 지원 (SK550: tot_cnt, SK552: totCnt)
const PIVOT_ROWS = [
  { group: "구매고객", label: "1회", cntKey: "cnt_1", totalKeys: ["tot_cnt", "totCnt"] },
  { group: "구매고객", label: "2회", cntKey: "cnt_2", totalKeys: ["tot_cnt", "totCnt"] },
  { group: "구매고객", label: "3회", cntKey: "cnt_3", totalKeys: ["tot_cnt", "totCnt"] },
  { group: "구매고객", label: "4회이상", cntKey: "cnt_4", totalKeys: ["tot_cnt", "totCnt"] },
  { group: "구매고객", label: "계", cntKeys: ["tot_cnt", "totCnt"], totalKeys: null },
  { group: "구매금액", label: "1회", cntKey: "amt_1", totalKeys: ["tot_amt", "totAmt"] },
  { group: "구매금액", label: "2회", cntKey: "amt_2", totalKeys: ["tot_amt", "totAmt"] },
  { group: "구매금액", label: "3회", cntKey: "amt_3", totalKeys: ["tot_amt", "totAmt"] },
  { group: "구매금액", label: "4회이상", cntKey: "amt_4", totalKeys: ["tot_amt", "totAmt"] },
  { group: "구매금액", label: "계", cntKeys: ["tot_amt", "totAmt"], totalKeys: null },
  { group: "", label: "평균단가", cntKey: "aus", totalKeys: null },
  { group: "", label: "객단가", cntKey: "ipt", totalKeys: null },
];

// 그리드 높이 계산 (12행 + 헤더 + 스크롤바 영역)
const GRID_HEIGHT = 12 * Properties.grid.default.data.height + 70 + 30 + 12;

// ============================================
// 컴포넌트
// ============================================
const MonthExistCustPurchCnt = ({ tabKey }) => {
  // ============================================
  // Redux 상태
  // ============================================
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);

  // ============================================
  // 커스텀 훅
  // ============================================
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  // ============================================
  // 로컬 상태
  // ============================================
  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );
  const [existData, setExistData] = useState([]); // 기존고객 데이터 (SK550)
  const [newData, setNewData] = useState([]); // 신규고객 데이터 (SK552)
  const [filters, setFilters] = useState(getInitialFilters);

  // ============================================
  // useCallback - 메모이제이션된 함수들
  // ============================================

  // 피벗 데이터 변환 함수
  const transformToPivot = useCallback((rawData) => {
    if (!rawData || rawData.length === 0) {
      return { pivotData: [], columnDefs: [] };
    }

    // 거래처 목록
    const agents = rawData.map((r) => ({
      agentId: r.agentId,
      agentNm: r.agentNm?.trim() || r.agentId,
    }));

    // 여러 키 중 존재하는 값을 가져오는 헬퍼 함수
    const getValueFromKeys = (record, keys) => {
      if (!keys) return null;
      if (typeof keys === "string") return Number(record[keys]) || 0;
      // 배열인 경우 첫 번째로 존재하는 키의 값 반환
      for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null) {
          return Number(record[key]) || 0;
        }
      }
      return 0;
    };

    // 피벗 데이터 생성
    const data = PIVOT_ROWS.map((row, rowIndex) => {
      const rowData = {
        rowIndex,
        group: row.group,
        label: row.label,
        isTotal: row.label === "계",
        isAusIpt: row.label === "평균단가" || row.label === "객단가",
      };

      agents.forEach((agent, agentIndex) => {
        const agentRecord = rawData.find((r) => r.agentId === agent.agentId);
        if (agentRecord) {
          // cntKey 또는 cntKeys에서 값 가져오기
          const cntValue = row.cntKeys
            ? getValueFromKeys(agentRecord, row.cntKeys)
            : Number(agentRecord[row.cntKey]) || 0;
          rowData[`agent_${agentIndex}_cnt`] = cntValue;

          // 비중 계산: totalKeys가 있으면 비중 계산
          if (row.totalKeys) {
            const totalValue = getValueFromKeys(agentRecord, row.totalKeys);
            const rate = totalValue > 0 ? (cntValue / totalValue) * 100 : 0;
            rowData[`agent_${agentIndex}_rate`] = rate;
          } else {
            rowData[`agent_${agentIndex}_rate`] = null;
          }
        }
      });

      return rowData;
    });

    // 컬럼 정의 생성
    const cols = [
      {
        headerName: "구분",
        field: "group",
        width: 80,
        pinned: "left",
        cellClass: "text-center font-bold",
        rowSpan: (params) => {
          if (!params.data?.group) return 1;
          if (params.data?.label === "1회") return 5;
          return 1;
        },
        cellClassRules: {
          "merged-cell-border": (params) => params.data?.label === "1회",
        },
        valueFormatter: (params) => {
          if (params.data?.label === "1회") return params.value;
          return "";
        },
      },
      {
        headerName: "회차",
        field: "label",
        width: 70,
        pinned: "left",
        cellClass: "text-center",
      },
    ];

    agents.forEach((agent, agentIndex) => {
      const agentName = agent.agentId === "00000" ? "Total" : agent.agentNm;

      cols.push({
        headerName: agentName,
        children: [
          {
            headerName: "건수",
            field: `agent_${agentIndex}_cnt`,
            width: 90,
            cellClass: "text-right",
            valueFormatter: (params) => {
              if (params.value === null || params.value === undefined) return "";
              const val = Number(params.value);
              if (isNaN(val)) return params.value;
              if (params.data?.label === "객단가") return val.toFixed(1);
              return val.toLocaleString();
            },
          },
          {
            headerName: "비중",
            field: `agent_${agentIndex}_rate`,
            width: 60,
            cellClass: "text-right",
            valueFormatter: (params) => {
              if (params.data?.isTotal || params.data?.isAusIpt) return "";
              if (params.value === null || params.value === undefined) return "";
              const val = Number(params.value);
              if (isNaN(val)) return "";
              return val.toFixed(1) + "%";
            },
          },
        ],
      });
    });

    return { pivotData: data, columnDefs: cols };
  }, []);

  // 도넛 차트용 데이터 생성 (Total 기준)
  const getDonutChartData = useCallback((rawData) => {
    if (!rawData || rawData.length === 0) return [];

    // Total 데이터 찾기 (agentId === "00000")
    const totalRecord = rawData.find((r) => r.agentId === "00000");
    const targetRecord = totalRecord || rawData[0];

    if (!targetRecord) return [];

    return [
      { name: "1회", value: Number(targetRecord.cnt_1) || 0 },
      { name: "2회", value: Number(targetRecord.cnt_2) || 0 },
      { name: "3회", value: Number(targetRecord.cnt_3) || 0 },
      { name: "4회이상", value: Number(targetRecord.cnt_4) || 0 },
    ];
  }, []);

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 데이터 조회 함수
  const fetchData = useCallback(async () => {
    try {
      showLoading();

      const formatYm = (ymStr) => {
        if (!ymStr) return "";
        return ymStr.replace(/-/g, "");
      };

      const basePayload = {
        ym: formatYm(filters.ym) || dayjs().format("YYYYMM"),
        brandId: filters.brandId || "",
        agentList: filters.agentList || "",
        userId: user?.emplId || "ADMIN",
      };

      console.log("월간 고객구매회차 현황 조회 요청:", basePayload);

      // 두 프로시저 병렬 호출
      const [existRes, newRes] = await Promise.all([
        request(
          "domain/insanga/store/customer",
          { action: "selectSK550List", payload: basePayload },
          {},
          "post",
          "json"
        ),
        request(
          "domain/insanga/store/customer",
          { action: "selectSK552List", payload: basePayload },
          {},
          "post",
          "json"
        ),
      ]);

      console.log("기존고객(SK550) 응답:", existRes);
      console.log("신규고객(SK552) 응답:", newRes);

      const existBody = existRes?.data?.body || [];
      const newBody = newRes?.data?.body || [];

      setExistData(existBody);
      setNewData(newBody);

      const totalCnt = existBody.length + newBody.length;
      if (totalCnt > 0) {
        showToast(`기존고객 ${existBody.length}건, 신규고객 ${newBody.length}건 조회되었습니다.`, "success");
      } else {
        showToast("조회된 데이터가 없습니다.", "info");
      }
    } catch (err) {
      console.error("월간 고객구매회차 현황 조회 실패:", err);
      showMessageModal("조회 중 오류가 발생했습니다.");
      setExistData([]);
      setNewData([]);
    } finally {
      hideLoading();
    }
  }, [filters, request, user, showLoading, hideLoading, showToast, showMessageModal]);

  // 검색 버튼 핸들러
  const handleSearch = useCallback(async () => {
    setExistData([]);
    setNewData([]);
    await fetchData();
  }, [fetchData]);

  // 초기화 버튼 핸들러
  const handleInitSearch = useCallback(() => {
    setFilters(getInitialFilters());
    setExistData([]);
    setNewData([]);
  }, []);

  // 행 스타일 함수
  const getRowStyle = useCallback((params) => {
    if (params.data?.isTotal) {
      return { backgroundColor: "#e8f4e8", fontWeight: "bold" };
    }
    if (params.data?.isAusIpt) {
      return { backgroundColor: "#fff8e1" };
    }
    return null;
  }, []);

  // ============================================
  // useMemo - 메모이제이션된 값들
  // ============================================

  // 기존고객 피벗 데이터
  const existPivot = useMemo(
    () => transformToPivot(existData),
    [existData, transformToPivot]
  );

  // 신규고객 피벗 데이터
  const newPivot = useMemo(
    () => transformToPivot(newData),
    [newData, transformToPivot]
  );

  // 기존고객 도넛 차트 데이터
  const existDonutData = useMemo(
    () => getDonutChartData(existData),
    [existData, getDonutChartData]
  );

  // 신규고객 도넛 차트 데이터
  const newDonutData = useMemo(
    () => getDonutChartData(newData),
    [newData, getDonutChartData]
  );

  // 도넛 차트 총계 (기존고객)
  const existTotalCount = useMemo(
    () => existDonutData.reduce((sum, item) => sum + item.value, 0),
    [existDonutData]
  );

  // 도넛 차트 총계 (신규고객)
  const newTotalCount = useMemo(
    () => newDonutData.reduce((sum, item) => sum + item.value, 0),
    [newDonutData]
  );

  // ============================================
  // useEffect - 사이드 이펙트
  // ============================================

  // 공통 코드 조회
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS
            .filter(({ codeGroupCode }) => codeGroupCode)
            .map(async ({ key, codeGroupCode }) => {
              const res = await request(
                "domain/insanga/store/system",
                { action: "selectCode", payload: { codeGroupCode } },
                {},
                "post"
              );
              return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
            })
        );

        if (CODE_GROUPS.some((col) => col.key === "agentData")) {
          const newAgentData = (agentData || []).map((item) => ({
            code: item.agentId,
            codeNm: item.agentNm,
          }));
          results.push(["agentData", newAgentData]);
        }

        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request, agentData]);

  // agentData 변경 시 codes 업데이트
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

  // ============================================
  // 렌더링
  // ============================================
  return (
    <div className="content-registe-container month-cust-purch-cnt">
      <div className="content-main-area">
        <div className="content-center-panel" style={{ width: "100%" }}>
          {/* 상단 검색 조건 */}
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
            title="월간 고객구매회차 현황"
            rowByDisplayCnt={3}
          />

          {/* 안내 문구 */}
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#d32f2f", fontSize: "13px", fontWeight: "500" }}>
              * 구매금액이 0원이하인 고객은 제외
            </span>
            <span style={{ color: "#666", fontSize: "12px" }}>
              TIP: 가로 스크롤은 Shift + 마우스휠로 조작할 수 있습니다
            </span>
          </div>

          {/* 1. 피벗 그리드 (좌우 배치) */}
          <div style={{ display: "flex", flexDirection: "row", gap: "16px", marginBottom: "20px" }}>
            {/* 기존고객 구매회차 현황 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: "10px 16px",
                backgroundColor: "#1976d2",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                borderRadius: "4px 4px 0 0"
              }}>
                기존고객 구매회차 현황
              </div>
              <div className="ag-theme-alpine" style={{ height: GRID_HEIGHT }}>
                <AgGridReact
                  rowData={existPivot.pivotData}
                  columnDefs={existPivot.columnDefs}
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
                  getRowStyle={getRowStyle}
                  suppressMovableColumns={true}
                  suppressRowTransform={true}
                />
              </div>
            </div>

            {/* 신규고객 구매회차 현황 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: "10px 16px",
                backgroundColor: "#388e3c",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                borderRadius: "4px 4px 0 0"
              }}>
                신규고객 구매회차 현황
              </div>
              <div className="ag-theme-alpine" style={{ height: GRID_HEIGHT }}>
                <AgGridReact
                  rowData={newPivot.pivotData}
                  columnDefs={newPivot.columnDefs}
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
                  getRowStyle={getRowStyle}
                  suppressMovableColumns={true}
                  suppressRowTransform={true}
                />
              </div>
            </div>
          </div>

          {/* 2. 도넛 차트 (좌우 배치) */}
          <div style={{ display: "flex", flexDirection: "row", gap: "16px", marginBottom: "20px" }}>
            {/* 기존고객 도넛 차트 */}
            <div style={{ flex: 1, minWidth: 0, backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "16px" }}>
              <div style={{ textAlign: "center", fontWeight: "600", fontSize: "14px", color: "#1976d2", marginBottom: "10px" }}>
                기존고객 구매회차 분포
              </div>
              <div style={{ position: "relative", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={existDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(1)}%` : ""}
                      labelLine={false}
                    >
                      {existDonutData.map((entry, index) => (
                        <Cell key={`exist-cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()}명`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                {/* 중앙 총계 표시 */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>총 고객</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1976d2" }}>
                    {existTotalCount.toLocaleString()}명
                  </div>
                </div>
              </div>
            </div>

            {/* 신규고객 도넛 차트 */}
            <div style={{ flex: 1, minWidth: 0, backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "16px" }}>
              <div style={{ textAlign: "center", fontWeight: "600", fontSize: "14px", color: "#388e3c", marginBottom: "10px" }}>
                신규고객 구매회차 분포
              </div>
              <div style={{ position: "relative", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={newDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(1)}%` : ""}
                      labelLine={false}
                    >
                      {newDonutData.map((entry, index) => (
                        <Cell key={`new-cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()}명`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                {/* 중앙 총계 표시 */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>총 고객</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#388e3c" }}>
                    {newTotalCount.toLocaleString()}명
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .font-bold {
          font-weight: 600;
        }
        .merged-cell-border {
          background-color: #f5f5f5 !important;
          font-weight: 600;
          display: flex;
          align-items: center;
          border-bottom: none !important;
        }
        /* AG Grid 스크롤바 두께 조정 */
        .month-cust-purch-cnt .ag-body-horizontal-scroll {
          height: 14px !important;
          min-height: 14px !important;
        }
        .month-cust-purch-cnt .ag-body-vertical-scroll {
          width: 14px !important;
          min-width: 14px !important;
        }
        .month-cust-purch-cnt .ag-body-horizontal-scroll-viewport,
        .month-cust-purch-cnt .ag-body-vertical-scroll-viewport {
          height: 14px !important;
          min-height: 14px !important;
        }
        .month-cust-purch-cnt .ag-horizontal-scroll-bar,
        .month-cust-purch-cnt .ag-vertical-scroll-bar {
          height: 14px !important;
          min-height: 14px !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(MonthExistCustPurchCnt);
