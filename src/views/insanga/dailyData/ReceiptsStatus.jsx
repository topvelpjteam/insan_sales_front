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
import { getAgentId } from "@/system/store/redux/agent";

// 유효성 체크를 위한 함수
import { numberFormatter, rateFormatter, addComma } from "@/system/utils/common";

/**
 * ShipInStatus 컴포넌트
 */
const ReceiptsStatus = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const agentId = useSelector(getAgentId) || "";
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  const [rowData, setRowData] = useState([]);
  const [goodsIsDisabled, setGoodsIsDisabled] = useState(false);
  const [eventIsDisabled, setEventIsDisabled] = useState(true);
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });

  const SEARCH_FORM = [
    {
      label: "출력일자",
      key: "stockD",
      type: "date",
      codeKey: "",
      defaultValue: dayjs().subtract(0, "month").format("YYYY-MM-DD"),
    },
    { label: "상품구분(F)", key: "sgbn", type: "select", codeKey: "saleGbnData", defaultValue: "1" },
    { label: "상품구분(T)", key: "egbn", type: "select", codeKey: "saleGbnData", defaultValue: "Z" },

    { label: "브랜드코드(F)", key: "sbrand", type: "select", codeKey: "brandData", defaultValue: "AB" },
    { label: "브랜드코드(T)", key: "ebrand", type: "select", codeKey: "brandData", defaultValue: "ZZ" },

    { label: "대분류", key: "btypeList", type: "multiple", codeKey: "btypeData", defaultValue: "" },
    { label: "중분류", key: "mtypeList", type: "multiple", codeKey: "mtypeData", defaultValue: "" },
    { label: "소분류", key: "stypeList", type: "multiple", codeKey: "stypeData", defaultValue: "" },
    {
      label: "상품코드", key: "goodsList", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: () => {
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },

    { label: "재고금액 적용", key: "danGbn", type: "radio", codeKey: "danGbnData", defaultValue: "1" },
    { label: "시점재고(체크 0제외)", key: "checkYn", type: "check", codeKey: "checkData", defaultValue: "" },
  ];

  const CODE_GROUPS = [
    { key: "btypeData", codeGroupCode: "S05" },
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "stypeData", codeGroupCode: "S08" },
    { key: "shipInData", codeGroupCode: "S19" },
    { key: "saleGbnData", codeGroupCode: "S03" },
    { key: "brandData", codeGroupCode: "" },
    { key: "danGbnData", codeGroupCode: "" },
    { key: "checkData", codeGroupCode: "" },
  ];

  const COLUMN_GROUPS = useMemo(() => ([
    gridNoColumn(),
    { headerName: '구분', field: 'goodsGbnNm', width: 200, cellClass: 'text-left', spanRows: true },
    { headerName: '소분류명', field: 'mtypeGbnNm', width: 200, cellClass: 'text-left', spanRows: true },
    { headerName: '상품코드', field: 'goodsId', width: 170, cellClass: 'text-left' },
    { headerName: '상품명', field: 'goodsNm', width: 250, cellClass: 'text-left' },
    //{ headerName: '전일재고', field: 'bdStock', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    {
      headerName: '전일재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "bdStock", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "bdStockAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '매입입고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "buyingQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "buyingQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '기타입고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "mfgQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "mfgQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '입고계', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "inTot", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "inTotAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '판매', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "saleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "saleQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '반품', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "backQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "backQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '증정', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "presentQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "presentQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: 'GWP', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "gwpQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "gwpQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '판촉', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "saleupQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "saleupQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '테스터', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "testerQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "testerQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '재고조정', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "othQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "othQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '출고계', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "outTot", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "outTotAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: 'A급재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "dAstock", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "dAstockAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: 'B급재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "dBstock", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "dBstockAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: 'C급재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "dCstock", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "dCstockAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '당일재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "stock", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "금액", field: "stockAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
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
    async (action = "selectSg007List") => {
      try {
        if (!agentId) {
          showMessageModal({ title: "알림", content: "매장코드를 선택 하세요." });
          return;
        }
        showLoading();
        const payload = {
          action,
          payload: {
            stockD: filters.stockD.replace(/-/g, '') || '',
            sgbn: filters.sgbn || '',
            egbn: filters.egbn || '',
            sbrand: filters.sbrand || '',
            ebrand: filters.ebrand || '',
            danGbn: filters.danGbn || '',
            checkYn: filters.checkYn || '0',
            btypeList: Array.isArray(filters.btypeList) ? filters.btypeList.join(',') : (filters.btypeList || ''),
            mtypeList: Array.isArray(filters.mtypeList) ? filters.mtypeList.join(',') : (filters.mtypeList || ''),
            stypeList: Array.isArray(filters.stypeList) ? filters.stypeList.join(',') : (filters.stypeList || ''),
            goodsList: Array.isArray(filters.goodsList) ? filters.goodsList.join(',') : (filters.goodsList || ''),
            storeId: agentId,
            userId: user?.emplNo
          },
        };
        const res = await request("domain/insanga/store/daily", payload, {}, "post", 'json');
        setRowData(setSummary(setAmt(res?.data?.body || [])));
        //setRowData(setSummary(res?.data?.body || []));
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );

  // -----------------------------
  // 금액 계산 함수
  // -----------------------------
  const setAmt = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    const NRound = (value, digits = 0) => {
      if (isNaN(value)) return 0;
      const factor = Math.pow(10, digits);
      return Math.round(value * factor) / factor;
    };

    return rowData.map((row) => {
      // nm, id 들어간 key는 제외
      const entries = Object.entries(row).filter(([key]) => !key.toLowerCase().includes("nm") && !key.toLowerCase().includes("id"));

      const supplyDan = Number(row.supplyDan || 0);
      //console.log('supplyDan', supplyDan);

      // 원본 row를 복사
      const newRow = { ...row };

      // 계산 대상 key 목록 (입고/출고 관련 qty들)
      const calcKeys = [
        "bdStock", "buyingQty", "mfgQty", "nopayQty", "inTot",
        "saleQty", "backQty", "presentQty", "gwpQty", "saleupQty",
        "testerQty", "kitQty", "studyQty", "trashQty", "lossQty",
        "useQty", "adverQty", "sampleQty", "othQty", "outTot",
        "dAstock", "dBstock", "dCstock"
      ];

      // 각 항목 금액 계산
      calcKeys.forEach((key) => {
        if (row[key] !== undefined) {
          newRow[`${key}Amt`] = NRound((Number(row[key]) || 0) * supplyDan / 1000, 0);
        }
      });

      // A/B/C급 재고 합계를 saleAmt로 설정
      const dA = Number(row.dAstock || 0);
      const dB = Number(row.dBstock || 0);
      const dC = Number(row.dCstock || 0);
      newRow.stock = dA + dB + dC;
      newRow.stockAmt = NRound((Number(newRow.stock) || 0) * supplyDan / 1000, 0);

      return newRow;
    });
  }, []);


  // -----------------------------
  // 소계 + 전체 합계 계산
  // -----------------------------
  const setSummary = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    const result = [];
    let currentGoodsGbn = null;
    let currentMtypeGbn = null;
    let groupBuffer = [];

    const sumReducer = (acc, val) => acc + (Number(val) || 0);

    // 수량·금액 관련 필드 자동 탐색
    const numericKeys = Object.keys(rowData[0] || {}).filter(
      (key) =>
        (key.toLowerCase().includes("qty") ||
          key.toLowerCase().includes("amt") ||
          key.toLowerCase().includes("stock")) &&
        !key.toLowerCase().includes("nm")
    );

    // 그룹별 합계 계산
    const calcSummary = (group) => {
      if (!group.length) return null;
      const base = group[0];
      const summaryRow = { ...base };

      numericKeys.forEach((key) => {
        summaryRow[key] = group.map((r) => Number(r[key] || 0)).reduce(sumReducer, 0);
      });

      summaryRow.goodsGbnNm = base.goodsGbnNm; //`( ${base.goodsGbnNm || ""} 소계 )`;
      summaryRow.mtypeGbnNm = '( 소 계 )'; //`( ${base.mtypeGbnNm || ""} 소계 )`;
      summaryRow._isSummary = true;
      return summaryRow;
    };

    // 전체합계용 버퍼
    const totalBuffer = [];

    // 그룹 정렬 보장
    const sorted = _.sortBy(rowData, ["goodsGbn", "mtypeGbn"]);

    for (const row of sorted) {
      totalBuffer.push(row);

      // 그룹 전환 감지
      if (row.goodsGbn !== currentGoodsGbn || row.mtypeGbn !== currentMtypeGbn) {
        // 이전 그룹 소계 정리
        if (groupBuffer.length) {
          const summary = calcSummary(groupBuffer);
          result.push(...groupBuffer, summary);
        }
        groupBuffer = [];
        currentGoodsGbn = row.goodsGbn;
        currentMtypeGbn = row.mtypeGbn;
      }

      groupBuffer.push(row);
    }

    // 마지막 그룹 소계
    if (groupBuffer.length) {
      const summary = calcSummary(groupBuffer);
      result.push(...groupBuffer, summary);
    }

    // -------------------------
    // ✅ 전체 합계 (총계) 행 추가
    // -------------------------
    const totalRow = {};
    numericKeys.forEach((key) => {
      totalRow[key] = totalBuffer.map((r) => Number(r[key] || 0)).reduce(sumReducer, 0);
    });
    totalRow.goodsGbnNm = "( 합 계 )";
    totalRow.mtypeGbnNm = "";
    totalRow._isTotal = true;

    result.push(totalRow);

    return result;
  }, []);



  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  const handleRowDoubleClick = useCallback(({ data }) => { }, []);
  const handleGoodsSearchClose = useCallback(() => setGoodsSearchModal({ visible: false, id: '', row: {} }), []);
  const handleGoodsSelected = useCallback((rows) => {
    const list = rows.map(item => item.goodsId).filter(v => v).join(",");
    setFilters(prev => ({ ...prev, goodsList: list }));
    handleGoodsSearchClose();
  }, [handleGoodsSearchClose]);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
            let res = await request("domain/insanga/store/system", { action: "selectCode", payload: { codeGroupCode } }, {}, "post");
            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );
        // ✅ vatData 직접 생성
        const brandData = [
          { code: "AB", codeNm: "AB" },
          { code: "ZZ", codeNm: "기타" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "brandData")) {
          results.push(["brandData", brandData]);
        }

        // ✅ vatData 직접 생성
        const checkData = [
          { code: "0", codeNm: "제외" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "checkData")) {
          results.push(["checkData", checkData]);
        }

        // ✅ vatData 직접 생성
        const danGbnData = [
          { code: "1", codeNm: "판매가" }, // 1,3이 있는데 일단 1로.
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "danGbnData")) {
          results.push(["danGbnData", danGbnData]);
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
            rowByDisplayCnt={5}
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

export default React.memo(ReceiptsStatus);
