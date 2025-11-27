/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 고객별 재구매 현황
 * - 파일명 : RepurchByStatus.jsx
 * - URL: /insanga/customer/repurchbystatus
 * - 프로시저: USP_SK565_Q
 *
 * INPUT (12개 파라미터):
 *   - sDate: 시작일 (YYYYMMDD)
 *   - eDate: 종료일 (YYYYMMDD)
 *   - eDate2: 종료일2 (YYYYMMDD)
 *   - brandId: 브랜드코드
 *   - gbn: 구분 (Mtype, Btype, GOODS)
 *   - btypeList1: 1차구매 대분류 목록 (콤마구분)
 *   - mtypeList1: 1차구매 중분류 목록 (콤마구분)
 *   - goodsList1: 1차구매 상품코드 목록 (콤마구분)
 *   - btypeList2: 2차구매 대분류 목록 (콤마구분)
 *   - mtypeList2: 2차구매 중분류 목록 (콤마구분)
 *   - goodsList2: 2차구매 상품코드 목록 (콤마구분)
 *   - userId: 사용자 ID (자동 주입)
 *
 * OUTPUT: 고객별 재구매 현황 (107개 컬럼)
 *   - custId, custNm, typeGbn, typeGbnNm: 고객 기본정보 (4개)
 *   - day01~day20: 회차별 구매일 (20개)
 *   - qty01~qty20: 회차별 수량 (20개)
 *   - amt01~amt20: 회차별 금액 (20개)
 *   - gap02~gap20: 회차 간격 (19개)
 *   - reTotQty, reTotAmt: 재구매 총 수량/금액 (2개)
 *   - totQty, totAmt: 전체 총 수량/금액 (2개)
 *   - custCnt01~custCnt20: 회차별 총 고객수 (20개)
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
import dayjs from "dayjs";
import { numberFormatter } from "@/system/utils/common";

const RepurchByStatus = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  const [codeGroups, setCodeGroups] = useState([
    { key: "brandData", codeGroupCode: "S02" },
    { key: "gbnData", codeGroupCode: "" },
  ]);

  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  const [rowData, setRowData] = useState([]);

  // SEARCH_FORM 정의
  // defaultValue: 실제 데이터가 존재하는 값으로 설정 (조회 버튼만 누르면 데이터 로딩)
  // DB 데이터 존재 기간: 2022-12-08 ~ 2025-10-20
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
      label: "종료일2",
      key: "eDate2",
      type: "date",
      defaultValue: "2025-12-31",
    },
    {
      label: "브랜드코드",
      key: "brandId",
      type: "select",
      codeKey: "brandData",
      defaultValue: "",
    },
    {
      label: "구분",
      key: "gbn",
      type: "select",
      codeKey: "gbnData",
      defaultValue: "Mtype",
    },
    {
      label: "1차구매 대분류",
      key: "btypeList1",
      type: "text",
      defaultValue: "",
    },
    {
      label: "1차구매 중분류",
      key: "mtypeList1",
      type: "text",
      defaultValue: "",
    },
    {
      label: "1차구매 상품코드",
      key: "goodsList1",
      type: "text",
      defaultValue: "",
    },
    {
      label: "2차구매 대분류",
      key: "btypeList2",
      type: "text",
      defaultValue: "",
    },
    {
      label: "2차구매 중분류",
      key: "mtypeList2",
      type: "text",
      defaultValue: "",
    },
    {
      label: "2차구매 상품코드",
      key: "goodsList2",
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
      headerName: "고객ID",
      field: "custId",
      width: 120,
      cellClass: "text-center",
      sortable: false,
      filter: false,
    },
    {
      headerName: "고객명",
      field: "custNm",
      width: 120,
      cellClass: "text-left",
      sortable: false,
      filter: false,
    },
    {
      headerName: "구분코드",
      field: "typeGbn",
      width: 100,
      cellClass: "text-center",
      sortable: false,
      filter: false,
    },
    {
      headerName: "구분명",
      field: "typeGbnNm",
      width: 150,
      cellClass: "text-left",
      sortable: false,
      filter: false,
    },
    {
      headerName: "1차일",
      field: "day01",
      width: 100,
      cellClass: "text-center",
      sortable: false,
      filter: false,
    },
    {
      headerName: "1차수량",
      field: "qty01",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "1차금액",
      field: "amt01",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "2차일",
      field: "day02",
      width: 100,
      cellClass: "text-center",
      sortable: false,
      filter: false,
    },
    {
      headerName: "2차수량",
      field: "qty02",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "2차금액",
      field: "amt02",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "2차간격",
      field: "gap02",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "3차일",
      field: "day03",
      width: 100,
      cellClass: "text-center",
      sortable: false,
      filter: false,
    },
    {
      headerName: "3차수량",
      field: "qty03",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "3차금액",
      field: "amt03",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "3차간격",
      field: "gap03",
      width: 100,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "재구매총수량",
      field: "reTotQty",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "재구매총금액",
      field: "reTotAmt",
      width: 150,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "전체총수량",
      field: "totQty",
      width: 120,
      cellClass: "text-right",
      sortable: false,
      filter: false,
      valueFormatter: numberFormatter,
    },
    {
      headerName: "전체총금액",
      field: "totAmt",
      width: 150,
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
    async (action = "selectSK565List") => {
      try {
        showLoading();

        const formatDate = (dateStr) => {
          if (!dateStr) return "";
          return dateStr.replace(/-/g, "");
        };

        const payload = {
          action,
          payload: {
            sDate: formatDate(filters.sDate) || dayjs().subtract(1, "year").format("YYYYMMDD"),
            eDate: formatDate(filters.eDate) || dayjs().format("YYYYMMDD"),
            eDate2: formatDate(filters.eDate2) || dayjs().format("YYYYMMDD"),
            brandId: filters.brandId || "",
            gbn: filters.gbn || "Mtype",
            btypeList1: filters.btypeList1 || "",
            mtypeList1: filters.mtypeList1 || "",
            goodsList1: filters.goodsList1 || "",
            btypeList2: filters.btypeList2 || "",
            mtypeList2: filters.mtypeList2 || "",
            goodsList2: filters.goodsList2 || "",
            userId: user?.emplId || "ADMIN",
          },
        };

        console.log("고객별 재구매 현황 조회 요청:", payload);

        const res = await request(
          "domain/insanga/store/customer",
          payload,
          {},
          "post",
          "json"
        );

        console.log("고객별 재구매 현황 조회 응답:", res);

        const body = res?.data?.body;
        setRowData(body || []);

        if (body && body.length > 0) {
          showToast(`${body.length}건 조회되었습니다.`, "success");
        } else {
          showToast("조회된 데이터가 없습니다.", "info");
        }
      } catch (err) {
        console.error("고객별 재구매 현황 조회 실패:", err);
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

        const gbnOptions = [
          { code: "Mtype", codeNm: "중분류" },
          { code: "Btype", codeNm: "대분류" },
          { code: "GOODS", codeNm: "상품" },
        ];
        results.push(["gbnData", gbnOptions]);

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request]);

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
            고객별 재구매 현황
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

export default React.memo(RepurchByStatus);
