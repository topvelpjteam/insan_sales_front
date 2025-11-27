/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객정보관리 -> 고객별 마일리지 현황
 * - 파일명 : CustMileageStatus.jsx
 * - URL: /insanga/customer/custMileageStatus
 * - VB 폼ID: SK401 (고객 마일리지 수기 지급 현황)
 * - 프로시저: USP_SK401_Q
 *
 * INPUT (7개 파라미터):
 *   - sDate: 조회일자 FROM (YYYYMMDD)
 *   - eDate: 조회일자 TO (YYYYMMDD)
 *   - sAgent: 매장코드 FROM
 *   - eAgent: 매장코드 TO
 *   - sBrand: 브랜드코드 FROM
 *   - eBrand: 브랜드코드 TO
 *   - custNm: 고객명 (LIKE 검색)
 *
 * OUTPUT (10개 컬럼):
 *   - agentId: 매장코드
 *   - agentNm: 매장명
 *   - saleD: 지급일자
 *   - custId: 고객코드
 *   - custNm: 고객명
 *   - sequ: 순번
 *   - mailP: 지급점수
 *   - bigo: 비고(지급사유)
 *   - personId: 지급사원ID
 *   - personNm: 지급사원명
 ********************************************************************/

import React, { useState, useEffect, useCallback } from "react";

// 시스템 기본정보
import Properties from "@/system/Properties";

// 공통 훅
import { gridNoColumn, useLayoutWidths, getTabLabel } from "@/system/hook/CommonHook";

// API 호출
import { useApiCallService } from "@/system/ApiCallService";

// LeftPanel
import LeftPanel from "@/components/layout/LeftPanel";

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
import { numberFormatter, dateFormatter } from "@/system/utils/common";

const CustMileageStatus = ({ tabKey }) => {
  // ========================================
  // 1. Redux 상태 조회
  // ========================================
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);

  // ========================================
  // 2. 훅 초기화
  // ========================================
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  // ========================================
  // 3. 코드 그룹 정의
  // ========================================
  const [codeGroups] = useState([
    { key: "agentData", codeGroupCode: "" },
    { key: "brandData", codeGroupCode: "S02" },
  ]);

  // ========================================
  // 4. codes State 초기화
  // ========================================
  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // ========================================
  // 5. 그리드 데이터
  // ========================================
  const [rowData, setRowData] = useState([]);

  // ========================================
  // 6. SEARCH_FORM 정의 (VB 화면 기준)
  // 프로시저: USP_SK401_Q - 고객 마일리지 수동 지급 현황
  // 조회조건: 조회일자(FROM/TO), 매장코드(FROM/TO), 브랜드코드(FROM/TO), 고객명
  // ========================================
  const SEARCH_FORM = [
    {
      label: "조회일자",
      type: "dateRange",
      startKey: "sDate",
      endKey: "eDate",
      defaultValue: {
        start: dayjs().startOf("month").format("YYYY-MM-DD"),
        end: dayjs().format("YYYY-MM-DD"),
      },
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
      label: "브랜드",
      key: "brandRange",
      type: "selectRange",
      startKey: "sBrand",
      endKey: "eBrand",
      codeKey: "brandData",
      defaultValue: { start: "", end: "" },
    },
    {
      label: "고객명",
      key: "custNm",
      type: "input",
      defaultValue: "",
    },
  ];

  // ========================================
  // 7. filters State - SEARCH_FORM 기반 자동 초기화
  // ========================================
  const [filters, setFilters] = useState(
    SEARCH_FORM.reduce((acc, cur) => {
      switch (cur.type) {
        case "dateRange":
        case "dayRange":
        case "selectRange":
          acc[cur.startKey] = cur.defaultValue?.start || "";
          acc[cur.endKey] = cur.defaultValue?.end || "";
          break;
        case "numberRange":
          acc[cur.minKey] =
            cur.defaultValue?.min !== undefined && !isNaN(cur.defaultValue.min)
              ? Number(cur.defaultValue.min)
              : "";
          acc[cur.maxKey] =
            cur.defaultValue?.max !== undefined && !isNaN(cur.defaultValue.max)
              ? Number(cur.defaultValue.max)
              : "";
          break;
        default:
          acc[cur.key] = cur.defaultValue ?? "";
      }
      return acc;
    }, {})
  );

  // ========================================
  // 8. columnGroups State (VB 그리드 컬럼 기준)
  // ========================================
  const [columnGroups] = useState([
    gridNoColumn(),
    {
      headerName: "매장코드",
      field: "agentId",
      width: 100,
      cellClass: "text-center",
    },
    {
      headerName: "매장명",
      field: "agentNm",
      width: 150,
      cellClass: "text-left",
    },
    {
      headerName: "지급일자",
      field: "saleD",
      width: 110,
      cellClass: "text-center",
      valueFormatter: dateFormatter,
    },
    {
      headerName: "고객코드",
      field: "custId",
      width: 100,
      cellClass: "text-center",
    },
    {
      headerName: "고객명",
      field: "custNm",
      width: 120,
      cellClass: "text-left",
    },
    {
      headerName: "Sequ",
      field: "sequ",
      width: 70,
      cellClass: "text-center",
    },
    {
      headerName: "지급점수",
      field: "mailP",
      width: 100,
      cellClass: "text-right",
      valueFormatter: numberFormatter,
    },
    {
      headerName: "비고(지급사유)",
      field: "bigo",
      width: 200,
      cellClass: "text-left",
    },
    {
      headerName: "지급사원",
      field: "personNm",
      width: 100,
      cellClass: "text-center",
    },
  ]);

  // ========================================
  // 9. Layout 훅
  // ========================================
  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } =
    useLayoutWidths(true, 30, false, 0);

  // ========================================
  // 10. 조회 조건 변경 핸들러
  // ========================================
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ========================================
  // 11. 데이터 조회 함수
  // ========================================
  const fetchData = useCallback(
    async (action = "selectSK401List") => {
      try {
        showLoading();

        // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
        const formatDate = (dateStr) => {
          if (!dateStr) return "";
          return dateStr.replace(/-/g, "");
        };

        const payload = {
          action,
          payload: {
            sDate: formatDate(filters.sDate) || dayjs().startOf("month").format("YYYYMMDD"),
            eDate: formatDate(filters.eDate) || dayjs().format("YYYYMMDD"),
            sAgent: filters.sAgent || "",
            eAgent: filters.eAgent || "ZZZZZ",
            sBrand: filters.sBrand || "",
            eBrand: filters.eBrand || "ZZ",
            custNm: filters.custNm || "",
          },
        };

        console.log("고객별마일리지현황 조회 요청:", payload);

        const res = await request(
          "domain/insanga/store/customer",
          payload,
          {},
          "post",
          "json"
        );

        console.log("고객별마일리지현황 조회 응답:", res);

        const body = res?.data?.body;
        setRowData(body || []);

        if (body && body.length > 0) {
          showToast(body.length + "건 조회되었습니다.", "success");
        } else {
          showToast("조회된 데이터가 없습니다.", "info");
        }
      } catch (err) {
        console.error("고객별마일리지현황 조회 실패:", err);
        showMessageModal("조회 중 오류가 발생했습니다.");
        setRowData([]);
      } finally {
        hideLoading();
      }
    },
    [filters, request, showLoading, hideLoading, showToast, showMessageModal]
  );

  // ========================================
  // 12. 검색 버튼 핸들러
  // ========================================
  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  // ========================================
  // 13. 초기화 핸들러 (LeftPanel handleInit용)
  // ========================================
  const handleInitSearch = useCallback(() => {
    const initialFilters = SEARCH_FORM.reduce((acc, cur) => {
      switch (cur.type) {
        case "dateRange":
        case "dayRange":
        case "selectRange":
          acc[cur.startKey] = cur.defaultValue?.start || "";
          acc[cur.endKey] = cur.defaultValue?.end || "";
          break;
        case "numberRange":
          acc[cur.minKey] =
            cur.defaultValue?.min !== undefined && !isNaN(cur.defaultValue.min)
              ? Number(cur.defaultValue.min)
              : "";
          acc[cur.maxKey] =
            cur.defaultValue?.max !== undefined && !isNaN(cur.defaultValue.max)
              ? Number(cur.defaultValue.max)
              : "";
          break;
        default:
          acc[cur.key] = cur.defaultValue ?? "";
      }
      return acc;
    }, {});
    setFilters(initialFilters);
    setRowData([]);
  }, []);

  // ========================================
  // 14. 공통 코드 로드 (useEffect)
  // ========================================
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
  }, [request, agentData, codeGroups]);

  // ========================================
  // 15. Redux 데이터 변경 감지 (useEffect)
  // ========================================
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

  // ========================================
  // 16. JSX 렌더링
  // ========================================
  return (
    <div className="content-registe-container">
      <div className="content-main-area">
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

        <div className="content-center-panel" style={{ width: centerWidth + "%" }}>
          <div className="content-panel-title content-panel-title-bg">
            고객별 마일리지 현황
          </div>
          <div className="ag-theme-alpine content-panel-grid">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnGroups}
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
              suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection}
              enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
              tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
              pagination={Properties.grid.default.pagination}
              paginationPageSize={Properties.grid.default.pageSize}
              paginationPageSizeSelector={Properties.grid.default.pageSizeList}
              suppressPaginationPanel={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustMileageStatus);
