/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 연령대별 판매 현황
 * - 파일명 : AgeBySalesStatus.jsx
 * - URL: /insanga/customer/agebysalesstatus
 * - 프로시저: USP_SK580_Q
 *
 * INPUT (11개 파라미터):
 *   - sDate: 시작일 (YYYYMMDD)
 *   - eDate: 종료일 (YYYYMMDD)
 *   - brandId: 브랜드코드
 *   - goodsgbnList: 상품구분 목록 (콤마구분)
 *   - btypeList: 대분류 목록 (콤마구분)
 *   - mtypeList: 중분류 목록 (콤마구분)
 *   - stypeList: 소분류 목록 (콤마구분)
 *   - goodsList: 상품코드 목록 (콤마구분)
 *   - agentList: 매장코드 목록 (콤마구분)
 *   - custgbnList: 고객구분 목록 (콤마구분)
 *   - userId: 사용자 ID (자동 주입)
 *
 * OUTPUT: 연령대별 판매 현황 (12개 컬럼)
 *   - age: 연령대
 *   - custCnt: 고객수
 *   - custCntRate: 고객수비율
 *   - saleAmt: 판매금액
 *   - saleAmtRate: 판매금액비율
 *   - ipt: IPT
 *   - aus: AUS
 *   - saleCnt: 판매건수
 *   - saleQty: 판매수량
 *   - saleQtyRate: 판매수량비율
 *   - totIpt: 전체IPT
 *   - totAus: 전체AUS
 ********************************************************************/

import React, { useState, useEffect, useCallback } from "react";

import Properties from "@/system/Properties";
import { gridNoColumn, useLayoutWidths, getTabLabel } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import LeftPanel from "@/components/layout/LeftPanel";
import { useLoading } from "@/system/hook/LoadingContext";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import { useCustomContents } from "@/system/hook/ManagerProvider";
import { useSelector } from "react-redux";
import { getAgentData } from "@/system/store/redux/agent";
import dayjs from "dayjs";
import { numberFormatter } from "@/system/utils/common";

const AgeBySalesStatus = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  const [codeGroups, setCodeGroups] = useState([
    { key: "agentData", codeGroupCode: "" },
    { key: "brandData", codeGroupCode: "S02" },
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
      label: "시작일",
      key: "sDate",
      type: "date",
      defaultValue: "2025-01-01",
    },
    {
      label: "종료일",
      key: "eDate",
      type: "date",
      defaultValue: "2025-10-20",
    },
    {
      label: "브랜드코드",
      key: "brandId",
      type: "select",
      codeKey: "brandData",
      defaultValue: "AB",
    },
    {
      label: "상품구분",
      key: "goodsgbnList",
      type: "text",
      defaultValue: "",
    },
    {
      label: "대분류",
      key: "btypeList",
      type: "text",
      defaultValue: "",
    },
    {
      label: "중분류",
      key: "mtypeList",
      type: "text",
      defaultValue: "",
    },
    {
      label: "소분류",
      key: "stypeList",
      type: "text",
      defaultValue: "",
    },
    {
      label: "상품코드",
      key: "goodsList",
      type: "text",
      defaultValue: "",
    },
    {
      label: "매장코드",
      key: "agentList",
      type: "select",
      codeKey: "agentData",
      defaultValue: "",
    },
    {
      label: "고객구분",
      key: "custgbnList",
      type: "text",
      defaultValue: "",
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

  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: "연령대",
      field: "age",
      width: 120,
      cellClass: "text-center",
      sortable: false,
      filter: false,
    },
    {
      headerName: "고객수",
      field: "custCnt",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "고객수비율",
      field: "custCntRate",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
    },
    {
      headerName: "판매금액",
      field: "saleAmt",
      width: 150,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "판매금액비율",
      field: "saleAmtRate",
      width: 130,
      cellClass: "text-right",
      sortable: false,
      filter: false,
    },
    {
      headerName: "IPT",
      field: "ipt",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
    },
    {
      headerName: "AUS",
      field: "aus",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "판매건수",
      field: "saleCnt",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "판매수량",
      field: "saleQty",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "판매수량비율",
      field: "saleQtyRate",
      width: 130,
      cellClass: "text-right",
      sortable: false,
      filter: false,
    },
    {
      headerName: "전체IPT",
      field: "totIpt",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
    },
    {
      headerName: "전체AUS",
      field: "totAus",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
  ]);

  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } =
    useLayoutWidths(true, 30, false, 0);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchData = useCallback(
    async (action = "selectSK580List") => {
      try {
        showLoading();

        const formatDate = (dateStr) => {
          if (!dateStr) return "";
          return dateStr.replace(/-/g, "");
        };

        const payload = {
          action,
          payload: {
            sDate: formatDate(filters.sDate) || dayjs().subtract(1, "month").format("YYYYMMDD"),
            eDate: formatDate(filters.eDate) || dayjs().format("YYYYMMDD"),
            brandId: filters.brandId || "",
            goodsgbnList: filters.goodsgbnList || "",
            btypeList: filters.btypeList || "",
            mtypeList: filters.mtypeList || "",
            stypeList: filters.stypeList || "",
            goodsList: filters.goodsList || "",
            agentList: filters.agentList || "",
            custgbnList: filters.custgbnList || "",
            userId: user?.emplId || "ADMIN",
          },
        };

        console.log("연령대별 판매 현황 조회 요청:", payload);

        const res = await request(
          "domain/insanga/store/customer",
          payload,
          {},
          "post",
          "json"
        );

        console.log("연령대별 판매 현황 조회 응답:", res);

        const body = res?.data?.body;
        setRowData(body || []);

        if (body && body.length > 0) {
          showToast(`${body.length}건 조회되었습니다.`, "success");
        } else {
          showToast("조회된 데이터가 없습니다.", "info");
        }
      } catch (err) {
        console.error("연령대별 판매 현황 조회 실패:", err);
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
            연령대별 판매 현황
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

export default React.memo(AgeBySalesStatus);
