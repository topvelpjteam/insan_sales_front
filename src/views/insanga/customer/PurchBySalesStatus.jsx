/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 구매금액건수별판매현황(연간)
 * - 파일명 : PurchBySalesStatus.jsx
 * - URL: /insanga/customer/purchbysalesstatus
 * - 프로시저: USP_SK595_Q
 *
 * INPUT (11개 파라미터):
 *   - brandId: 브랜드코드 (필수, AB/ZZ)
 *   - year: 조회년도 (YYYY)
 *   - goodsGbn: 상품구분 목록 (콤마구분)
 *   - btypeGbn: 대분류코드 목록 (콤마구분)
 *   - mtypeGbn: 중분류코드 목록 (콤마구분)
 *   - stypeGbn: 소분류코드 목록 (콤마구분)
 *   - goodsId: 상품코드 목록 (콤마구분)
 *   - agentId: 매장코드 목록 (콤마구분)
 *   - custGbn: 고객구분 목록 (콤마구분)
 *   - saleGbn: 판매구분 (tot:합계)
 *   - userId: 사용자 ID (자동 주입)
 *
 * OUTPUT: 구매금액건수별 판매 현황 (8개 컬럼)
 *   - gbn: 구분
 *   - ym: 년월
 *   - amtGbn: 금액구분
 *   - saleCnt: 판매건수
 *   - rate: 비율
 *   - ipt: IPT
 *   - saleQty: 판매수량
 *   - totCnt: 총건수
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

// 유틸 함수
import { numberFormatter } from "@/system/utils/common";

const PurchBySalesStatus = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  const [codeGroups, setCodeGroups] = useState([
    { key: "agentData", codeGroupCode: "" },
    { key: "brandData", codeGroupCode: "S02" },
    { key: "custGbnData", codeGroupCode: "C01" },
  ]);

  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  const [rowData, setRowData] = useState([]);

  // SEARCH_FORM 정의
  // defaultValue: 실제 데이터가 존재하는 값으로 설정 (조회 버튼만 누르면 데이터 로딩)
  // DB 데이터 존재 기간: 2022-12-08 ~ 2025-10-20
  // 주의: BRAND_ID는 TB_CS_AGENT_BRAND 테이블 기준 (AB, ZZ)
  const SEARCH_FORM = [
    {
      label: "브랜드코드",
      key: "brandId",
      type: "select",
      codeKey: "brandData",
      defaultValue: "AB",
    },
    {
      label: "조회년도",
      key: "year",
      type: "yyyy",
      defaultValue: "2025",
    },
    {
      label: "상품구분",
      key: "goodsGbn",
      type: "text",
      defaultValue: "",
    },
    {
      label: "대분류코드",
      key: "btypeGbn",
      type: "text",
      defaultValue: "",
    },
    {
      label: "중분류코드",
      key: "mtypeGbn",
      type: "text",
      defaultValue: "",
    },
    {
      label: "소분류코드",
      key: "stypeGbn",
      type: "text",
      defaultValue: "",
    },
    {
      label: "상품코드",
      key: "goodsId",
      type: "text",
      defaultValue: "",
    },
    {
      label: "매장코드",
      key: "agentId",
      type: "select",
      codeKey: "agentData",
      defaultValue: "",
    },
    {
      label: "고객구분",
      key: "custGbn",
      type: "select",
      codeKey: "custGbnData",
      defaultValue: "",
    },
    {
      label: "판매구분",
      key: "saleGbn",
      type: "radio",
      options: [
        { value: "tot", label: "합계" },
      ],
      defaultValue: "tot",
    },
  ];

  const [filters, setFilters] = useState(
    SEARCH_FORM.reduce((acc, cur) => {
      switch (cur.type) {
        case "dateRange":
        case "dayRange":
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

  // 퍼센트 포맷터
  const percentFormatter = (params) => {
    if (params.value === null || params.value === undefined || params.value === "") return "";
    const num = Number(params.value);
    if (isNaN(num)) return params.value;
    return num.toFixed(1) + "%";
  };

  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: "구분",
      field: "gbn",
      width: 80,
      cellClass: "text-center",
    },
    {
      headerName: "년월",
      field: "ym",
      width: 100,
      cellClass: "text-center",
    },
    {
      headerName: "금액구분",
      field: "amtGbn",
      width: 120,
      cellClass: "text-left",
    },
    {
      headerName: "판매건수",
      field: "saleCnt",
      width: 100,
      cellClass: "text-right",
      valueFormatter: numberFormatter,
    },
    {
      headerName: "비율",
      field: "rate",
      width: 80,
      cellClass: "text-right",
      valueFormatter: percentFormatter,
    },
    {
      headerName: "IPT",
      field: "ipt",
      width: 80,
      cellClass: "text-right",
    },
    {
      headerName: "판매수량",
      field: "saleQty",
      width: 100,
      cellClass: "text-right",
      valueFormatter: numberFormatter,
    },
    {
      headerName: "총건수",
      field: "totCnt",
      width: 100,
      cellClass: "text-right",
      valueFormatter: numberFormatter,
    },
  ]);

  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } =
    useLayoutWidths(true, 30, false, 0);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchData = useCallback(
    async (action = "selectSK595List") => {
      try {
        showLoading();

        const payload = {
          action,
          payload: {
            brandId: filters.brandId || "AB",
            year: filters.year || "2025",
            goodsGbn: filters.goodsGbn || "",
            btypeGbn: filters.btypeGbn || "",
            mtypeGbn: filters.mtypeGbn || "",
            stypeGbn: filters.stypeGbn || "",
            goodsId: filters.goodsId || "",
            agentId: filters.agentId || "",
            custGbn: filters.custGbn || "",
            saleGbn: filters.saleGbn || "tot",
            userId: user?.emplId || "ADMIN",
          },
        };

        console.log("구매금액건수별판매현황(연간) 조회 요청:", payload);

        const res = await request(
          "domain/insanga/store/customer",
          payload,
          {},
          "post",
          "json"
        );

        console.log("구매금액건수별판매현황(연간) 조회 응답:", res);

        const body = res?.data?.body;
        setRowData(body || []);

        if (body && body.length > 0) {
          showToast(`${body.length}건 조회되었습니다.`, "success");
        } else {
          showToast("조회된 데이터가 없습니다.", "info");
        }
      } catch (err) {
        console.error("구매금액건수별판매현황(연간) 조회 실패:", err);
        showMessageModal("조회 중 오류가 발생했습니다.");
        setRowData([]);
      } finally {
        hideLoading();
      }
    },
    [filters, request, user, showLoading, hideLoading, showToast, showMessageModal]
  );

  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  const handleReset = useCallback(() => {
    setFilters(
      SEARCH_FORM.reduce((acc, cur) => {
        switch (cur.type) {
          case "dateRange":
          case "dayRange":
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
    setRowData([]);
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
            {
              key: "reset",
              label: "초기화",
              className: "content-reset-button",
              onClick: handleReset,
            },
          ]}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth}
          title={getTabLabel(tabKey)}
        />

        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">
            구매금액건수별판매현황(연간)
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

export default React.memo(PurchBySalesStatus);
