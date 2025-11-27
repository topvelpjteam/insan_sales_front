/*********************************************************************
 * - 메뉴 : 매장관리 -> 일간자료 -> 일간 입고 현황
 * - 파일명 : ShipInStatus.jsx
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
import { formatDateToYYYYMMDD } from "@/system/utils/common";

// 상품검색 팝업
import GoodsSearch from "@/components/popup/GoodsSearch";
import GoodsSearchEvent from "@/components/popup/GoodsSearchEvent";

// 모달 프레임.
import FrameModal from "@/components/popup/FrameModal";

// agentId 셀렉터
import { getAgentId, getAgentData } from "@/system/store/redux/agent";

// 유효성 체크를 위한 함수
import { numberFormatter, rateFormatter, addComma } from "@/system/utils/common";

/**
 * ShipInStatus 컴포넌트
 */
const AgentStockMoveStatus = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  const [rowData, setRowData] = useState([]);
  const [goodsIsDisabled, setGoodsIsDisabled] = useState(false);
  const [eventIsDisabled, setEventIsDisabled] = useState(true);

  // 상품검색 팝업
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });
  const [goodGbn, setGoodGbn] = useState("F");
  const agentData = useSelector(getAgentData);
  const agentId = useSelector(getAgentId);

  const SEARCH_FORM = [
    {
      label: "이동일자",
      key: "sDate",
      startKey: "sDateFrom",
      endKey: "sDateTo",
      type: "dateRange",
      codeKey: "",
      defaultValue: {
        start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        end: dayjs().add(1, "month").format("YYYY-MM-DD"),
      },
    },
    { label: "보낸매장(F)", key: "sTAgent", type: "select", codeKey: "agentData", defaultValue: "1" },
    { label: "보낸매장(T)", key: "eTAgent", type: "select", codeKey: "agentData", defaultValue: "Z" },

    {
      label: "상품코드(F)", key: "sGoods", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: (value) => {
        setGoodGbn("F");
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    }, {
      label: "상품코드(T)", key: "eGoods", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: (value) => {
        setGoodGbn("T");
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },
  ];

  const CODE_GROUPS = [
    { key: "agentData", codeGroupCode: "" },
  ];

  const COLUMN_GROUPS = useMemo(() => ([
    gridNoColumn(),
    {
      headerName: '주문일자',
      field: 'orderD',
      width: 120,
      minWidth: 80,
      sortable: false,
      filter: false,
      valueFormatter: (params) => {
        const openDateValue = params.data?.orderD || params.data?.orderD || params.value;
        return formatDateToYYYYMMDD(openDateValue);
      },
      spanRows: true,
      cellClass: 'text-center'
    },
    { headerName: '받는매장', field: 'tAgentNm', width: 200, cellClass: 'text-left', spanRows: true },
    { headerName: '전표', field: 'orderSequ', width: 200, cellClass: 'text-left', spanRows: true },
    { headerName: '상품코드', field: 'goodsId', width: 170, cellClass: 'text-left' },
    { headerName: '상품명', field: 'goodsNm', width: 250, cellClass: 'text-left' },
    { headerName: "수량", field: "orderQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
    { headerName: "단가", field: "orderDan", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
    { headerName: "공급가", field: "orderAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
    { headerName: "부가세", field: "orderVat", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
    { headerName: "합계", field: "orderTotalAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
    { headerName: "판매가액", field: "sobijaAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
    {
      headerName: '입고일자',
      field: 'saleD',
      width: 120,
      minWidth: 80,
      sortable: false,
      filter: false,
      valueFormatter: (params) => {
        const openDateValue = params.data?.orderD || params.data?.orderD || params.value;
        return formatDateToYYYYMMDD(openDateValue);
      },
      cellClass: 'text-center'
    },

    { headerName: '비고', field: 'memo', width: 250, cellClass: 'text-left' },
  ]), []);

  const [filters, setFilters] = useState(SEARCH_FORM.reduce((acc, cur) => {
    acc[cur.key] = "";
    if (cur.type === "dateRange") {
      acc[cur.startKey] = cur.defaultValue?.start || "";
      acc[cur.endKey] = cur.defaultValue?.end || "";
    }
    return acc;
  }, {}));

  const [codes, setCodes] = useState(CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {}));

  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } = useLayoutWidths(true, 30, false, 0);

  const handleFilterChange = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), []);

  const fetchData = useCallback(
    async (action = "selectSd265List") => {
      try {
        if (!agentId) {
          showMessageModal({ title: "알림", content: "매장코드를 선택 하세요." });
          return;
        }
        showLoading();
        const payload = {
          action,
          payload: {
            sDate: filters.sDateFrom.replace(/-/g, '') || '',
            eDate: filters.sDateTo.replace(/-/g, '') || '',
            sTAgent: filters.sTAgent || '',
            eTAgent: filters.eTAgent || '',
            sGoods: Array.isArray(filters.sGoods) ? filters.sGoods.join(',') : (filters.sGoods || '') || '0',
            eGoods: Array.isArray(filters.eGoods) ? filters.eGoods.join(',') : (filters.eGoods || '') || 'ZZZ',
            agentId: agentId,
            userId: user?.emplNo
          },
        };
        const res = await request("domain/insanga/store/daily", payload, {}, "post", 'json');
        setRowData(setSummary(setAmt(res?.data?.body || [])));
        //setRowData(res?.data?.body || []);
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );
  const setAmt = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    return rowData.map(item => ({
      ...item,
      orderAmt: Number(item.orderAmt) || 0,
      orderVat: Number(item.orderVat) || 0,
      orderTotalAmt: (Number(item.orderAmt) || 0) + (Number(item.orderVat) || 0), // ★ 계산 추가
    }));
  }, []);


  const setSummary = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    // 합산할 컬럼 정의
    const sumFields = ["orderQty", "orderAmt", "orderVat", "orderTotalAmt", "sobijaAmt"];

    // 안전 합산 함수
    const sumValues = (arr, field) =>
      arr.reduce((acc, cur) => acc + (Number(cur[field]) || 0), 0);

    let result = [];

    // 1차 그룹: orderD
    const orderDGroups = _.groupBy(rowData, "orderD");

    Object.entries(orderDGroups).forEach(([orderD, orderDGroup]) => {
      // 2차 그룹: tAgentNm
      const tAgentGroups = _.groupBy(orderDGroup, "tAgentNm");

      Object.entries(tAgentGroups).forEach(([tAgentNm, tAgentGroup]) => {
        // 실제 데이터 push
        result.push(...tAgentGroup);

        // (1) orderD + tAgentNm 소계
        const tAgentSummary = {
          orderD,
          tAgentNm: "(매장계)",
          goodsNm: '',
          _isSummary: true,
        };

        sumFields.forEach((f) => {
          tAgentSummary[f] = sumValues(tAgentGroup, f);
        });

        result.push(tAgentSummary);
      });

      // (2) orderD 소계
      const orderDSummary = {
        orderD,
        tAgentNm: "(일자계)",
        goodsNm: '',
        _isSummary: true,
      };

      sumFields.forEach((f) => {
        orderDSummary[f] = sumValues(orderDGroup, f);
      });

      result.push(orderDSummary);
    });

    // (3) 전체 합계
    const totalSummary = {

      tAgentNm: "(총계)",
      _isTotal: true,
    };

    sumFields.forEach((f) => {
      totalSummary[f] = sumValues(rowData, f);
    });

    result.push(totalSummary);

    return result;
  }, []);

  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  const handleRowDoubleClick = useCallback(({ data }) => { }, []);
  const handleGoodsSearchClose = useCallback(() => setGoodsSearchModal({ visible: false, id: '', row: {} }), []);
  const handleGoodsSelected = useCallback((rows) => {
    if (goodGbn === "F") {
      const list = rows
        .map(item => item.goodsId)
        .filter(v => v)
        .join(",");
      setFilters(prev => ({
        ...prev,
        sGoods: list
      }));
    } else if (goodGbn === "T") {
      const list = rows
        .map(item => item.goodsId)
        .filter(v => v)
        .join(",");
      setFilters(prev => ({
        ...prev,
        eGoods: list
      }));
    }
    handleGoodsSearchClose();
  }, [goodGbn, handleGoodsSearchClose]);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
            let res = await request("domain/insanga/store/system", { action: "selectCode", payload: { codeGroupCode } }, {}, "post");
            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        if (CODE_GROUPS.some(col => col.key === "agentData")) {
          const newAgentData = agentData.map(item => ({
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
  }, [request]);

  const columnDefs = useMemo(() => {
    const hasNoColumn = COLUMN_GROUPS.some(col => col.headerName === 'No.');
    if (hasNoColumn) return COLUMN_GROUPS;
    const newColumnDefs = [...COLUMN_GROUPS];
    newColumnDefs.splice(1, 0, gridNoColumn());
    return newColumnDefs;
  }, [COLUMN_GROUPS]);

  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      <div className="content-main-area">

        <div className="content-center-panel" style={{ width: `100%` }}>
          <LeftPanel
            codes={codes}
            filters={filters}
            handleFilterChange={handleFilterChange}
            searchForm={SEARCH_FORM}
            buttons={[{ key: "search", label: "검색", className: "content-search-button", onClick: handleSearch }]}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            leftWidth={leftWidth}
            rowByDisplayCnt={3}
            title={`일간 입고 현황`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">일간 입고 현황</div> */}
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
              getRowClass={(params) => {
                if (params.data?._isTotal) return 'total-row';
                if (params.data?._isSummary) return 'summary-row';
                return '';
              }}
            />
          </div>

          {goodsSearchModal.visible && (
            <FrameModal title="상품 검색" width="1024px" height="768px" closeOnOverlayClick={false} onClose={handleGoodsSearchClose}>
              <GoodsSearch onGoodsSelected={handleGoodsSelected} isAgentCheck={false} />
            </FrameModal>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AgentStockMoveStatus);
