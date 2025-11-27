/*********************************************************************
 * - 메뉴 : 매장관리 -> 일간자료 -> 주문별 입고 현황
 * - 파일명 : OrderByShipStatus.jsx
 * ********************************************************************/

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// 시스템 기본정보 주입
import Properties from "@/system/Properties";

// 그리드 no컬럼, 화면 layout설정 주입
import { gridNoColumn, useLayoutWidths } from "@/system/hook/CommonHook";

// api호출 주입
import { useApiCallService } from "@/system/ApiCallService";

// LeftPanel
import LeftPanel from "@/components/layout/LeftPanel";

// 로딩 바
import { useLoading } from "@/system/hook/LoadingContext";

// ag grid import
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// 상태 관리 정보 (사용자 정보 등등.)
import { useSelector } from 'react-redux';

// utils
import _ from 'lodash';

// 날짜 유틸
import dayjs from "dayjs";

// 유효성 체크를 위한 함수
import { formatDateToYYYYMMDD, numberFormatter } from "@/system/utils/common";

// 상품검색 팝업
import GoodsSearch from "@/components/popup/GoodsSearch";
import GoodsSearchEvent from "@/components/popup/GoodsSearchEvent";

// 모달 프레임.
import FrameModal from "@/components/popup/FrameModal";

// agentId 셀렉터
import { getAgentId, getAgentData } from "@/system/store/redux/agent";
import { getStaffData } from "@/system/store/redux/staff";

/**
 * GoodsBySalesAbc 컴포넌트
 */
const GoodsBySalesAbc = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  const agentId = useSelector(getAgentId) || "";
  //const agentData = useSelector(getAgentData);
  const staffData = useSelector(getStaffData);
  //console.log('staffData', staffData);
  // 메세지 창 함수
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  // 그리드 데이터 변수
  const [rowData, setRowData] = useState([]);

  // 상품검색 팝업
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });
  const [goodGbn, setGoodGbn] = useState("F");

  // 조회 조건 생성 폼
  const [searchForm, setSearchForm] = useState([
    {
      label: "검색년월",
      key: "sDate",
      type: "dateRange",
      startKey: "sDate",
      endKey: "eDate",
      defaultValue: {
        start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        end: dayjs().add(0, "month").format("YYYY-MM-DD"),
      },
    },
    { label: "판매사원", key: "staffId", type: "select", codeKey: "staffData", defaultValue: "" },
    { label: "매출구분", key: "saleGbn", type: "radio", codeKey: "saleGbnData", defaultValue: "TOT" },
    { label: "졍렬구분", key: "option", type: "radio", codeKey: "sortGbnData", defaultValue: "2" },
  ]);

  // -----------------------------
  // CODE_GROUPS를 useState로 선언
  // -----------------------------
  const [codeGroups, setCodeGroups] = useState([
    { key: "staffData", codeGroupCode: "" },
    { key: "saleGbnData", codeGroupCode: "" },
    { key: "sortGbnData", codeGroupCode: "" },
  ]);

  // 공통코드 사용 변수
  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // 조회 조건 필터 초기화
  const [filters, setFilters] = useState(searchForm.reduce((acc, cur) => {
    acc[cur.key] = "";
    if (cur.type === "dateRange") {
      acc[cur.startKey] = cur.defaultValue?.start || "";
      acc[cur.endKey] = cur.defaultValue?.end || "";
    }
    return acc;
  }, {}));

  // layout 훅 사용
  const {
    sidebarOpen,
    leftWidth,
    centerWidth,
    toggleSidebar,
  } = useLayoutWidths(true, 30, false, 0);

  // 조회조건 변경 시 filters에 반영
  const handleFilterChange = useCallback((key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value })), []);

  // 초기 컬럼 그룹
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '상품코드',
      field: 'goodsId',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 2,
    },
    {
      headerName: '상품명',
      field: 'goodsNm',
      width: 300,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 3,
    },
    {
      headerName: "판매수량",
      field: "saleQty",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "판매금액",
      field: "saleAmt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "판매금액 점유율",
      field: "saleRate",
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "누적수량",
      field: "nsaleQty",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "누적금액",
      field: "nsaleAmt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "누적금액 점유율",
      field: "nsaleRate",
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
  ]);

  // -----------------------------
  // fetchData
  // -----------------------------
  const fetchData = useCallback(
    async (action = "selectSd304_2List") => {
      try {
        if (_.isEmpty(agentId)) {
          showMessageModal({
            title: "알림",
            content: "매장코드를 선택 하세요.",
            onCallback: () => { }
          });
          return;
        }
        showLoading();
        const payload = {
          action,
          payload: {
            sDate: (filters.sDate ? filters.sDate.replace(/-/g, '') : '') || '',
            eDate: (filters.eDate ? filters.eDate.replace(/-/g, '') : '') || '',
            staffId: filters.staffId || '',
            saleGbn: filters.saleGbn || 'TOT',
            option: filters.option || '0',
            agentId: agentId,
          },
        };
        const res = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body = res?.data?.body;

        payload.action = "selectSd304_1";
        const res1 = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body1 = res1?.data?.body;

        setRowData(setGroupData(body || [], body1));
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );

  // -----------------------------
  // setGroupData
  // -----------------------------
  const setGroupData = (rows, body1) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const result = [];
    const total = Number(body1.totalAmt) || 0;
    const totalQty = Number(body1.totalQty) || 0;
    let nsaleAmt = 0;
    let nsaleQty = 0;

    rows.forEach((row) => {
      const newRow = { ...row };

      const saleAmt = Number(newRow.saleAmt) || 0;
      const saleQty = Number(newRow.saleQty) || 0;

      newRow.saleRate = (saleQty > 0 && total > 0) ? ((saleQty / totalQty) * 100).toFixed(2) : "0.00";

      nsaleAmt += saleAmt;
      nsaleQty += saleQty;
      newRow.nsaleAmt = nsaleAmt;
      newRow.nsaleQty = nsaleQty;
      newRow.nsaleRate = (total > 0) ? ((nsaleQty / totalQty) * 100).toFixed(2) : "0.00";

      if (newRow.zipId) {
        const z = newRow.zipId.toString();
        if (z.length >= 6) newRow.zipId = z.substring(0, 3) + "-" + z.substring(3, 6);
      }

      result.push(newRow);
    });

    const totalSaleAmt = rows.reduce((sum, r) => sum + (Number(r.saleAmt) || 0), 0);
    const totalSaleQty = rows.reduce((sum, r) => sum + (Number(r.saleQty) || 0), 0);
    const totalSaleRate = total > 0 ? ((totalSaleQty / totalQty) * 100).toFixed(2) : "0.00";

    result.push({
      goodsId: "총계",
      saleQty: totalSaleQty,
      saleAmt: totalSaleAmt,
      saleRate: totalSaleRate,
      nsaleQty: "",
      nsaleAmt: "",
      nsaleRate: "",
      zipId: "",
      isTotal: true
    });

    return result;
  };

  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  const handleRowDoubleClick = useCallback(({ data }) => { }, []);

  const handleGoodsSearchClose = useCallback(() => {
    setGoodsSearchModal({ visible: false, id: '', row: {} });
  }, []);

  const handleGoodsSelected = useCallback((rows) => {
    const list = rows
      .map(item => item.goodsId)
      .filter(v => v)
      .join(",");
    setFilters(prev => ({
      ...prev,
      sgoods: list
    }));

    handleGoodsSearchClose();
  }, [goodGbn, handleGoodsSearchClose]);

  // -----------------------------
  // 코드 조회 - 로딩 시 최초 한번만 수행함.
  // -----------------------------
  useEffect(() => {
    const fetchCodes = async () => {
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

        if (codeGroups.some(col => col.key === "staffData")) {
          const newStaffData = staffData.map(item => ({
            code: item.staffId,
            codeNm: item.staffNm,
          }));
          results.push(["staffData", newStaffData]);
        }

        const saleGbnData = [
          { code: "OFF", codeNm: "매장" },
          { code: "ON", codeNm: "온라인" },
          { code: "TOT", codeNm: "합계" },
        ];
        if (codeGroups.some(col => col.key === "saleGbnData")) {
          results.push(["saleGbnData", saleGbnData]);
        }

        const sortGbnData = [
          { code: "1", codeNm: "판매수량순" },
          { code: "2", codeNm: "판매금액순" },
        ];
        if (codeGroups.some(col => col.key === "sortGbnData")) {
          results.push(["sortGbnData", sortGbnData]);
        }


        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, []);

  // -----------------------------
  // agentId가 변경 시 수행 됨 staffData
  // -----------------------------
  useEffect(() => {
    if (!Array.isArray(staffData)) return;

    setCodes(prev => ({
      ...prev,
      staffData: staffData.map(item => ({
        code: item.staffId,
        codeNm: item.staffNm,
      })),
    }));

    setSearchForm(prev => prev.map(item => item.key === "staffId" ? {
      ...item,
      codeKey: "staffData",
      defaultValue: "",
    } : item));

    setFilters(prev => ({ ...prev, staffId: "" }));

  }, [staffData]);

  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      <div className="content-main-area">

        <div className="content-center-panel" style={{ width: "100%" }}>
          <LeftPanel
            codes={codes}
            filters={filters}
            handleFilterChange={handleFilterChange}
            searchForm={searchForm}
            buttons={[{ key: "search", label: "검색", className: "content-search-button", onClick: handleSearch }]}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            leftWidth={leftWidth}
            rowByDisplayCnt={5}
            title={`상품별 판매 ABC`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">상품별 판매 ABC </div> */}
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
              onRowDoubleClicked={handleRowDoubleClick}
              rowSelection={Properties.grid.default.rowSelection}
              suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection}
              enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
              tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
              pagination={Properties.grid.default.pagination}
              paginationPageSize={Properties.grid.default.pageSize}
              paginationPageSizeSelector={Properties.grid.default.pageSizeList}
              suppressPaginationPanel={false}
              enableCellSpan={true}
              getRowClass={params => {
                if (params.data?.isSummary) return 'summary-row';
                if (params.data?.isTotal) return 'total-row';
                return '';
              }}
            />
          </div>

          {goodsSearchModal.visible && (
            <FrameModal title="상품 검색"
              width="1024px"
              height="768px"
              closeOnOverlayClick={false}
              onClose={handleGoodsSearchClose}>
              <GoodsSearch onGoodsSelected={handleGoodsSelected} isAgentCheck={false} />
            </FrameModal>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(GoodsBySalesAbc);
