/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 구매횟차별 구매고객수 현황
 * - 파일명 : PurchByCustCntStatus.jsx
 * - 설명 : 구매 횟수별(1회, 2회, 3회, 4회 이상) 고객 분포 조회
 * - VB6.0 : frm_SK575_Q
 * ********************************************************************/

import React, { useState, useEffect, useCallback, useMemo } from "react";

// 시스템 기본 정보
import Properties from "@/system/Properties";

// 공통 훅
import { gridNoColumn, useLayoutWidths, getTabLabel } from "@/system/hook/CommonHook";

// API 호출 서비스
import { useApiCallService } from "@/system/ApiCallService";

// 레이아웃 컴포넌트
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

// 유틸리티 라이브러리
import _ from "lodash";
import dayjs from "dayjs";

// 공통 유틸 함수
import { numberFormatter, formatDateToYYYYMMDD, validateFormData } from "@/system/utils/common";

const PurchByCustCntStatus = ({ tabKey }) => {
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
  // 3. State 선언
  // ========================================
  const [rowData, setRowData] = useState([]);
  const [codes, setCodes] = useState({});
  
  // 공통코드 그룹 정의
  const [codeGroups, setCodeGroups] = useState([
    { key: "brandData", codeGroupCode: "S02" }, // 브랜드
    { key: "agentData", codeGroupCode: "" },    // 대리점 (Redux)
  ]);

  // ========================================
  // 4. SEARCH_FORM 정의
  // defaultValue: 실제 데이터가 존재하는 값으로 설정 (조회 버튼만 누르면 데이터 로딩)
  // DB 데이터 존재 기간: 2022-12-08 ~ 2025-10-20
  // ========================================
  const SEARCH_FORM = useMemo(() => [
    {
      label: "조회기간",
      key: "sDate",
      type: "dateRange",
      startKey: "sDate",
      endKey: "eDate",
      required: true,
      defaultValue: {
        start: "2025-01-01",
        end: "2025-10-20",
      },
    },
    {
      label: "대비기간",
      key: "sCDate",
      type: "dateRange",
      startKey: "sCDate",
      endKey: "eCDate",
      required: true,
      defaultValue: {
        start: "2024-01-01",
        end: "2024-10-20",
      },
    },
    {
      label: "브랜드",
      key: "brandId",
      type: "select",
      codeKey: "brandData",
      required: true,
      defaultValue: "",
    },
    {
      label: "매장",
      key: "agentList",
      type: "multiple",
      codeKey: "agentData",
      defaultValue: "",
    },
  ], []);

  // filters 초기화
  const [filters, setFilters] = useState(
    SEARCH_FORM.reduce((acc, cur) => {
      if (cur.type === "dateRange") {
        acc[cur.startKey] = cur.defaultValue?.start || "";
        acc[cur.endKey] = cur.defaultValue?.end || "";
      } else {
        acc[cur.key] = cur.defaultValue ?? "";
      }
      return acc;
    }, {})
  );

  // ========================================
  // 5. Layout 훅
  // ========================================
  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } =
    useLayoutWidths(true, 30, false, 0);

  // ========================================
  // 6. 컬럼 정의 (columnGroups)
  // ========================================
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn({ pinned: "left" }),
    {
      headerName: "매장코드",
      field: "agentId",
      width: 80,
      cellClass: "text-center",
      sortable: true,
      filter: true,
      pinned: "left",
    },
    {
      headerName: "매장명",
      field: "agentNm",
      width: 120,
      cellClass: "text-left",
      sortable: true,
      filter: true,
      pinned: "left",
    },
    {
      headerName: "구매회수",
      field: "cnt",
      width: 80,
      cellClass: "text-center",
      sortable: true,
      valueFormatter: (params) => {
        return params.value >= 4 ? "4회이상" : `${params.value}회`;
      }
    },
    {
      headerName: "조회기간",
      children: [
        {
          headerName: "고객수",
          field: "custCnt",
          width: 90,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "구매금액",
          field: "saleAmt",
          width: 110,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "구매수량",
          field: "saleQty",
          width: 90,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "AUS",
          field: "aus",
          width: 90,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "IPT",
          field: "ipt",
          width: 80,
          cellClass: "text-right",
          valueFormatter: (params) => {
            return params.value ? Number(params.value).toFixed(1) : "0.0";
          },
        },
      ],
    },
    {
      headerName: "대비기간",
      children: [
        {
          headerName: "고객수",
          field: "prevCustCnt",
          width: 90,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "구매금액",
          field: "prevSaleAmt",
          width: 110,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "구매수량",
          field: "prevSaleQty",
          width: 90,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "AUS",
          field: "prevAus",
          width: 90,
          cellClass: "text-right",
          valueFormatter: numberFormatter,
        },
        {
          headerName: "IPT",
          field: "prevIpt",
          width: 80,
          cellClass: "text-right",
          valueFormatter: (params) => {
            return params.value ? Number(params.value).toFixed(1) : "0.0";
          },
        },
      ],
    },
  ]);

  // ========================================
  // 7. 핸들러 함수
  // ========================================
  
  // 필터 변경
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 데이터 조회
  const fetchData = useCallback(async () => {
    // 유효성 검증 (표준함수 사용)
    const errors = validateFormData(filters, [{ columns: SEARCH_FORM }]);
    if (errors.length > 0) {
      showMessageModal({
        title: "알림",
        content: errors[0],
      });
      return;
    }

    try {
      showLoading();

      // 널 세이프티 및 날짜 포맷 변환
      const sDate = filters.sDate ? filters.sDate.replace(/-/g, "") : "";
      const eDate = filters.eDate ? filters.eDate.replace(/-/g, "") : "";
      const sCDate = filters.sCDate ? filters.sCDate.replace(/-/g, "") : "";
      const eCDate = filters.eCDate ? filters.eCDate.replace(/-/g, "") : "";
      const brandId = filters.brandId || "100";

      const payload = {
        action: "selectSK575List",
        payload: {
          sDate,
          eDate,
          sCDate,
          eCDate,
          brandId,
          agentList: Array.isArray(filters.agentList) 
            ? filters.agentList.join(",") 
            : (filters.agentList || ""),
          userId: user?.emplId || "ADMIN",
        },
      };

      const res = await request(
        "domain/insanga/store/customer",
        payload,
        {},
        "post",
        "json"
      );

      if (res?.data?.body) {
        let data = res.data.body;

        // 프론트엔드 매장 필터링 (프로시저 미지원)
        if (filters.agentList && filters.agentList.length > 0) {
          const selectedAgents = Array.isArray(filters.agentList)
            ? filters.agentList
            : filters.agentList.split(",");
            
          data = data.filter(item => selectedAgents.includes(item.agentId));
        }

        setRowData(data);
        showToast(`${data.length}건 조회되었습니다.`, "success");
      } else {
        setRowData([]);
        showToast("조회된 데이터가 없습니다.", "info");
      }
    } catch (err) {
      console.error("데이터 조회 실패:", err);
      setRowData([]);
    } finally {
      hideLoading();
    }
  }, [filters, request, showLoading, hideLoading, showToast, user, showMessageModal, SEARCH_FORM]);

  // 검색 버튼
  const handleSearch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // ========================================
  // 8. 초기 데이터 로드
  // ========================================
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          codeGroups.map(async ({ key, codeGroupCode }) => {
            if (key === "agentData") return [key, []]; // Redux에서 처리

            const res = await request(
              "domain/insanga/store/system",
              { action: "selectCode", payload: { codeGroupCode } },
              {},
              "post"
            );
            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        const newCodes = Object.fromEntries(results);

        // Redux 데이터 매핑
        if (Array.isArray(agentData)) {
          newCodes.agentData = agentData.map((item) => ({
            code: item.agentId,
            codeNm: item.agentNm,
          }));
        }

        setCodes(newCodes);
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };

    fetchCodes();
  }, [request, codeGroups, agentData]);

  // ========================================
  // 9. JSX 렌더링
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
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth}
          title={getTabLabel(tabKey)}
        />
        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">
            구매횟차별 구매고객수 현황
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
              pagination={Properties.grid.default.pagination}
              paginationPageSize={Properties.grid.default.pageSize}
              suppressPaginationPanel={false}
              overlayNoRowsTemplate={Properties.grid.default.overlayNoRowsTemplate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PurchByCustCntStatus);
