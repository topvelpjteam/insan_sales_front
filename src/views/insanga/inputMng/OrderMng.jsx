import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import _ from "lodash";
import dayjs from "dayjs";

// 시스템 기본정보 주입
import Properties from "@/system/Properties";
import { gridNoColumn, useLayoutWidths } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import LeftPanel from "@/components/layout/LeftPanel";
import { useLoading } from "@/system/hook/LoadingContext";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import { useCustomContents } from "@/system/hook/ManagerProvider";
import { useSelector } from "react-redux";
import { formatDateToYYYYMMDD, numberFormatter, rateFormatter, addComma } from "@/system/utils/common";
import { getAgentId, getAgentData, getWareHouseData } from "@/system/store/redux/agent";

import GoodsSearch from "@/components/popup/GoodsSearch";
import GoodsSearchEvent from "@/components/popup/GoodsSearchEvent";
import FrameModal from "@/components/popup/FrameModal";

/**
 * CustomerInfoSearch (리팩터링/최적화 버전)
 *
 * - 기존 로직 유지
 * - useMemo/useCallback으로 핸들러/컬럼 캐싱
 * - fetch/코드 로드 안정화
 * - 에디팅 대기/정지 로직 개선
 */

// --- 유틸: debounce (간단) ---
const useDebouncedCallback = (fn, delay, deps = []) => {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, deps); // deps는 외부에서 제어
};

const CustomerInfoSearch = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const agentId = useSelector(getAgentId) || "";
  const agentData = useSelector(getAgentData) || [];
  const wareHouseData = useSelector(getWareHouseData) || [];
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  // --- 그리드 상태 ---
  const [rowData, setRowData] = useState([]);
  const [rowDataSelected, setRowDataSelected] = useState(null);
  const [grid1Api, setGrid1Api] = useState(null);

  const [rowGoodsData, setRowGoodsData] = useState([]);
  const [rowDataEtc, setRowDataEtc] = useState({});
  const [rowDataDetail, setRowDataDetail] = useState([]);
  const [grid2Api, setGrid2Api] = useState(null);
  const [grid2ColumnApi, setGrid2ColumnApi] = useState(null);

  // summary / stock / 변경된 행 추적
  const [orderSummary, setOrderSummary] = useState({});
  const [stockInfo, setStockInfo] = useState({});
  const [changeDetailRows, setChangeDetailRows] = useState([]);

  // 원본 상세 복사 보관 (비교 용)
  const rowDataDetailRef = useRef([]);
  useEffect(() => {
    if (Array.isArray(rowDataDetail)) {
      // 깊은 복사만 한 번 해둔다
      rowDataDetailRef.current = _.cloneDeep(rowDataDetail);
    }
  }, [rowDataDetail]);

  // -------------------------
  // calculateOrderSummary (최적화)
  // -------------------------
  const calculateOrderSummary = useCallback((rowDataDetail1 = null) => {
    if (rowDataDetail1 === null) {
      setOrderSummary({
        totalQuantity: 0,
        totalSupplyAmount: 0,
        totalVatAmount: 0,
        totalAmount: 0,
        totalSalesAmount: 0,
        ["판매가"]: 0,
        재고금액: 0,
        주문금액: 0,
        예상재고금액: 0,
      });
      return;
    }

    const rowDataDetailArr = Array.isArray(rowDataDetail1.resultI5) ? rowDataDetail1.resultI5
      : Array.isArray(rowDataDetail1) ? rowDataDetail1 : [];

    const stock = rowDataDetail1?.resultI7?.[0] ?? rowDataDetail1?.stockInfo ?? { stockAmt: 0 };

    if (!rowDataDetailArr.length) {
      setOrderSummary({
        totalQuantity: 0,
        totalSupplyAmount: 0,
        totalVatAmount: 0,
        totalAmount: 0,
        totalSalesAmount: 0,
        ["판매가"]: 0,
        재고금액: stock.stockAmt ?? 0,
        주문금액: 0,
        예상재고금액: stock.stockAmt ?? 0,
      });
      return;
    }

    const parseNum = (val) => {
      if (val == null || val === "") return 0;
      let s = String(val).trim();
      if (/^\d+\-$/.test(s)) return -Number(s.slice(0, -1));
      if (/^\(.+\)$/.test(s)) s = '-' + s.replace(/[(),]/g, '').replace(/\s/g, '');
      s = s.replace(/,/g, '').replace(/\s/g, '');
      const n = Number(s);
      return isNaN(n) ? 0 : n;
    };

    const summary = rowDataDetailArr.reduce((acc, item) => {
      const orderQty = parseNum(item.orderQty);
      const orderAmt = parseNum(item.orderAmt);
      const orderVat = parseNum(item.orderVat);
      const sobijaTot = parseNum(item.sobijaTot);
      const saleVal = parseNum(item["판매가"]);
      return {
        totalQuantity: acc.totalQuantity + orderQty,
        totalSupplyAmount: acc.totalSupplyAmount + orderAmt,
        totalVatAmount: acc.totalVatAmount + orderVat,
        totalAmount: acc.totalAmount + orderAmt + orderVat,
        totalSalesAmount: acc.totalSalesAmount + sobijaTot,
        ["판매가"]: acc["판매가"] + saleVal,
      };
    }, { totalQuantity: 0, totalSupplyAmount: 0, totalVatAmount: 0, totalAmount: 0, totalSalesAmount: 0, ["판매가"]: 0 });

    setOrderSummary({
      ...summary,
      재고금액: stock.stockAmt ?? 0,
      주문금액: summary["판매가"],
      예상재고금액: (stock.stockAmt ?? 0) + summary["판매가"],
    });
  }, []);

  // -------------------------
  // 검색 폼 (상수) - useMemo로 고정
  // -------------------------
  const SEARCH_FORM = useMemo(() => [
    { label: "창고코드", key: "storeId", type: "select", codeKey: "wareHouseData", defaultValue: "Z0000" },
    {
      label: "주문일자",
      key: "sOrderD",
      type: "dateRange",
      startKey: "sOrderD",
      endKey: "eOrderD",
      defaultValue: {
        start: '2020-11-05',
        end: '2025-12-19',
      },
    },
    {
      label: "출하요구일자",
      key: "sRequD",
      type: "dateRange",
      startKey: "sRequD",
      endKey: "eRequD",
      defaultValue: {
        start: '2020-11-05',
        end: '2025-12-19',
      },
    },
    { label: "검색어", key: "schTxt", type: "input", codeKey: "", defaultValue: "" },
  ], []);

  // -------------------------
  // 코드그룹 (state) 및 codes
  // -------------------------
  const [codeGroups] = useState([
    { key: "claimGbn", codeGroupCode: "S25" },
    { key: "agentData", codeGroupCode: "" },
    { key: "wareHouseData", codeGroupCode: "" },
  ]);

  const [codes, setCodes] = useState(() => codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {}));

  // -------------------------
  // 컬럼(메모이제이션)
  // -------------------------
  const columnGroups = useMemo(() => ([
    gridNoColumn(),
    {
      headerName: '주문일자',
      field: 'orderD',
      minWidth: 80,
      cellClass: 'text-center',
      flex: 2,
      valueFormatter: (params) => formatDateToYYYYMMDD(params?.data?.orderD ?? ""),
    },
    { headerName: '창고코드', field: 'storeId', minWidth: 80, cellClass: 'text-left', flex: 2 },
    { headerName: '전표', field: 'orderSequ', minWidth: 80, cellClass: 'text-center', flex: 2 },
    { headerName: '거래처명', field: 'agentNm', minWidth: 80, cellClass: 'text-left', flex: 2 },
    { headerName: '구분', field: 'ioGbnNm', minWidth: 80, cellClass: 'text-left', flex: 2 },
    { headerName: "주문수량", field: "orderQty", valueFormatter: numberFormatter, cellClass: "text-right summary-col", minWidth: 120, flex: 1 },
    { headerName: "판매금액", field: "sobijaAmt", valueFormatter: numberFormatter, cellClass: "text-right summary-col", minWidth: 120, flex: 1 },
    { headerName: "주문금액", field: "orderAmt", valueFormatter: numberFormatter, cellClass: "text-right summary-col", minWidth: 120, flex: 1 },
    {
      headerName: '출하요구일자',
      field: 'requireD',
      minWidth: 80,
      cellClass: 'text-center',
      flex: 2,
      valueFormatter: (params) => formatDateToYYYYMMDD(params?.data?.requireD ?? ""),
    },
  ]), []);

  const columnGoodsGroups = useMemo(() => ([
    gridNoColumn(),
    { headerName: "구분", field: "goodsGbnNm", editable: false, width: 80 },
    { headerName: '상품코드', field: 'goodsId', width: 200, sortable: true, cellClass: 'text-left' },
    {
      headerName: '상품명', field: 'goodsNm', width: 300, sortable: true, cellClass: 'text-left',
      valueGetter: params => `${params.data?.goodsNm ?? ''} (잔여일수 : ${params.data?.janExpD ?? ''})`,
    },
    { headerName: 'Lot No.', field: 'lotNo', width: 150, sortable: true, cellClass: 'text-left' },
    {
      headerName: '유통기한',
      field: 'expD',
      width: 150,
      cellClass: 'text-center',
      flex: 2,
      valueFormatter: (params) => formatDateToYYYYMMDD(params?.data?.expD ?? ""),
    },
    { headerName: 'BL', field: 'blNo', width: 120, sortable: true, cellClass: 'text-left' },
    { headerName: '입고정보', field: 'logiMngNo', width: 120, sortable: true, cellClass: 'text-left' },
    { headerName: "소비자가", field: "supplyDan", valueFormatter: numberFormatter, cellClass: "text-right summary-col", width: 120, flex: 1 },
    {
      headerName: "주문가능량", field: "stockQty", valueFormatter: numberFormatter, cellClass: "text-right summary-col", width: 120, flex: 1,
      cellStyle: (params) => (Number(params.value) !== 0) ? { color: "red", fontWeight: "bold" } : null,
    },
    {
      headerName: '매장재고', field: 'agentStockQty', width: 100, sortable: true,
      valueFormatter: numberFormatter, cellClass: (params) => (params.value < 0 ? 'negative-quantity' : ''), cellStyle: { textAlign: 'right' }, headerClass: 'text-right'
    },
    { headerName: '주문수량', field: 'orderAmt', width: 100, sortable: true, valueFormatter: numberFormatter, cellClass: (params) => (params.value < 0 ? 'negative-quantity' : ''), cellStyle: { textAlign: 'right' }, headerClass: 'text-right' },
  ]), []);

  const columnDetailGroups = useMemo(() => ([
    {
      headerName: "",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: "left",
      cellStyle: Properties.grid.centerCellStyle,
    },
    { headerName: "상태", field: "status", editable: false, width: 80 },
    { headerName: '전표순번', field: 'orderNo', width: 80, sortable: true, cellClass: 'text-center' },
    { headerName: '상품코드', field: 'goodsId', width: 200, sortable: true, cellClass: 'text-left' },
    { headerName: '상품명', field: 'goodsNm', width: 300, sortable: true, cellClass: 'text-left' },
    { headerName: 'Lot No.', field: 'lotNo', width: 150, sortable: true, cellClass: 'text-left' },
    {
      headerName: '유통기한',
      field: 'expD',
      width: 150,
      cellClass: 'text-center',
      flex: 2,
      valueFormatter: (params) => formatDateToYYYYMMDD(params?.data?.expD ?? ""),
    },
    { headerName: 'BL', field: 'blNo', width: 120, sortable: true, cellClass: 'text-left' },
    { headerName: '입고정보', field: 'logiMngNo', width: 120, sortable: true, cellClass: 'text-left' },

    { headerName: "매장재고", field: "매장재고", valueFormatter: numberFormatter, cellClass: "text-right summary-col", width: 120, flex: 1 },
    { headerName: "본사재고\n주문가능수량", field: "본사재고", valueFormatter: numberFormatter, cellClass: "text-right summary-col", width: 120, flex: 1 },

    {
      headerName: '주문수량',
      field: 'orderQty',
      width: 80,
      sortable: true,
      editable: (params) => params.data?.status !== "delete",
      cellEditor: 'agTextCellEditor',
      valueParser: (params) => {
        const value = params.newValue;
        if (typeof value === 'string' && value.endsWith('-')) {
          return parseFloat('-' + value.slice(0, -1));
        }
        return parseFloat(value) || 0;
      },
      cellRenderer: (params) => {
        if (params.value == null || params.value === '') return '0';
        const numValue = Number(params.value);
        if (isNaN(numValue)) return '0';
        return (numValue < 0) ? `-${Math.abs(numValue).toLocaleString('ko-KR')}` : numValue.toLocaleString('ko-KR');
      },
      cellClass: (params) => (params.value < 0 ? 'negative-quantity' : ''),
      onCellValueChanged: (params) => { /* 사용하지 않음: 전체 onCellValueChanged로 통합 */ },
      cellStyle: { textAlign: 'right' },
      headerClass: 'text-right'
    },
    {
      headerName: '마진율',
      field: 'saleRate',
      width: 120,
      sortable: true,
      cellEditorParams: { min: 0, max: 100, precision: 2 },
      valueFormatter: rateFormatter,
      cellStyle: { textAlign: 'right' },
      headerClass: 'text-right'
    },
    { headerName: '주문단가', field: 'orderDan', width: 100, valueFormatter: numberFormatter, cellStyle: { textAlign: 'right' }, headerClass: 'text-right' },
    { headerName: '주문공급가', field: 'orderAmt', width: 100, valueFormatter: numberFormatter, cellStyle: { textAlign: 'right' }, headerClass: 'text-right' },
    { headerName: '주문부가세', field: 'orderVat', width: 100, valueFormatter: numberFormatter, cellStyle: { textAlign: 'right' }, headerClass: 'text-right' },

    {
      headerName: "클레임코드",
      field: "claimGbnNm",
      width: 160,
      editable: (params) => params.data?.status !== "delete",
      cellStyle: { textAlign: "left" },
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => ({ values: ["", ...(codes.claimGbn?.map(i => i.codeNm) ?? [])] }),
      valueSetter: (params) => {
        if (!params.newValue) {
          params.data.claimId = "";
          params.data.claimGbnNm = "";
          return true;
        }
        const found = codes.claimGbn?.find(item => item.codeNm === params.newValue);
        if (found) {
          params.data.claimId = found.code;
          params.data.claimGbnNm = found.codeNm;
          return true;
        }
        return false;
      },
      valueFormatter: (params) => {
        if (!params.data?.claimId) return params.value || "";
        const found = codes.claimGbn?.find(item => item.code === params.data.claimId);
        return found ? found.codeNm : params.value;
      },
      tooltipValueGetter: (params) => {
        if (!params.data?.claimId) return "";
        const found = codes.claimGbn?.find(item => item.code === params.data.claimId);
        return found ? `${found.codeNm} (${found.code})` : params.value;
      }
    },
    { headerName: 'Memo', field: 'memo', width: 250, editable: true, cellStyle: { textAlign: 'left' } },
    { headerName: '판매단가', field: 'sobijaDan', width: 120, valueFormatter: numberFormatter, cellStyle: { textAlign: 'right' }, headerClass: 'text-right' },
    { headerName: '판매가', field: '판매가', width: 120, valueFormatter: numberFormatter, cellStyle: { textAlign: 'right' }, headerClass: 'text-right' },

    { headerName: '(ON) 수령인', field: 'recvNm', editable: (params) => params.data?.status !== "delete", width: 120, cellClass: 'text-left' },
    { headerName: '(ON) 전화번호', field: 'recvTel1', editable: (params) => params.data?.status !== "delete", width: 120, cellClass: 'text-left' },
    { headerName: '(ON) 우편번호', field: 'recvZip', editable: (params) => params.data?.status !== "delete", width: 120, cellClass: 'text-left' },
    { headerName: '(ON) 주소', field: 'recvAddr1', editable: (params) => params.data?.status !== "delete", width: 120, cellClass: 'text-left' },
  ]), [codes, /* orderSaveInfo not used here */]);

  // -------------------------
  // Filters state 초기화 (SEARCH_FORM 기반)
  // -------------------------
  const [filters, setFilters] = useState(() =>
    SEARCH_FORM.reduce((acc, cur) => {
      if (cur.type === "dateRange" || cur.type === "dayRange") {
        acc[cur.startKey] = cur.defaultValue?.start || "";
        acc[cur.endKey] = cur.defaultValue?.end || "";
      } else if (cur.type === "numberRange") {
        acc[cur.minKey] = cur.defaultValue?.min ?? "";
        acc[cur.maxKey] = cur.defaultValue?.max ?? "";
      } else {
        acc[cur.key] = cur.defaultValue ?? "";
      }
      return acc;
    }, {})
  );

  // layout 훅
  const { sidebarOpen, leftWidth, centerWidth, toggleSidebar } = useLayoutWidths(true, 30, false, 0);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // -------------------------
  // fetchCodes: 공통코드 + agent/wareHouse 합성
  // -------------------------
  useEffect(() => {
    let mounted = true;
    const fetchCodes = async () => {
      try {
        const promises = codeGroups.map(({ key, codeGroupCode }) =>
          request("domain/insanga/store/system", { action: "selectCode", payload: { codeGroupCode } }, {}, "post")
            .then(res => [key, Array.isArray(res?.data?.body) ? res.data.body : []])
            .catch(() => [key, []])
        );
        const results = await Promise.all(promises);

        const extras = [];

        // agentData (redux로부터)
        if (codeGroups.some(col => col.key === "agentData")) {
          const newAgentData = (agentData || []).map(item => ({ code: item.agentId, codeNm: item.agentNm }));
          extras.push(["agentData", newAgentData]);
        }

        // wareHouseData (redux)
        if (codeGroups.some(col => col.key === "wareHouseData")) {
          const newWareHouseData = (wareHouseData || []).map(item => ({ code: item.agentId, codeNm: item.agentNm }));
          extras.push(["wareHouseData", newWareHouseData]);
        }

        const finalEntries = [...results, ...extras];
        const finalCodes = Object.fromEntries(finalEntries);
        if (mounted) setCodes(prev => ({ ...prev, ...finalCodes }));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };

    fetchCodes();
    return () => { mounted = false; };
  }, [request, agentData, wareHouseData, codeGroups]);

  // -------------------------
  // fetchData : 메인 조회 (최적화)
  // -------------------------
  const fetchData = useCallback(async (action = "selectSe002List") => {
    try {
      setRowDataSelected(null);
      calculateOrderSummary(null);
      setRowDataDetail([]);
      setRowDataEtc({});
      setChangeDetailRows([]);
      setRowGoodsData([]);

      showLoading();
      const payload = {
        action,
        payload: {
          sOrderD: (filters.sOrderD ? filters.sOrderD.replace(/-/g, '') : '') || '',
          eOrderD: (filters.eOrderD ? filters.eOrderD.replace(/-/g, '') : '') || '',
          sRequD: (filters.sRequD ? filters.sRequD.replace(/-/g, '') : '') || '',
          eRequD: (filters.eRequD ? filters.eRequD.replace(/-/g, '') : '') || '',
          schTxt: filters.schTxt || '',
          agentId,
          storeId: filters.storeId || 'Z0000',
          brandId: 'AB',
          userId: user?.emplNo || 'ADMIN'
        },
      };

      const res = await request("domain/insanga/store/inputMng", payload, {}, "post", 'json');
      const body = res?.data?.body;
      setRowData(Array.isArray(body) ? body : []);
    } catch (err) {
      console.error("데이터 조회 실패:", err);
      showToast?.({ type: "error", message: "데이터 조회 실패" });
    } finally {
      hideLoading();
    }
  }, [filters, request, agentId, user, showLoading, hideLoading, showToast, calculateOrderSummary]); // calculateOrderSummary는 아래에 정의되므로 의존성에 추가

  // (debounced) 검색 핸들러 - 사용자가 검색 버튼을 빠르게 누를 때 보호
  const debouncedFetch = useDebouncedCallback(fetchData, 120, [fetchData]);
  const handleSearch = useCallback(async () => {
    setRowData([]);
    debouncedFetch();
  }, [debouncedFetch]);

  // -------------------------
  // 상세 더블클릭 (발주 상세 조회)
  // -------------------------
  const handleRowDoubleClick = useCallback(async (params) => {
    try {
      const data = params?.data;
      if (!data) return;

      setRowGoodsData([]);
      calculateOrderSummary(null);
      setRowDataDetail([]);
      setRowDataEtc({});
      setChangeDetailRows([]);

      showLoading();

      const payload = {
        action: "selectSe002_I_5_List",
        payload: {
          orderD: data.orderD ? data.orderD.replace(/-/g, "") : "",
          storeId: data.storeId || "",
          orderSequ: data.orderSequ || "",
          agentId: data.agentId || "",
        },
      };

      const res = await request("domain/insanga/store/inputMng", payload, {}, "post", "json");
      const body = res?.data?.body || {};

      const list = Array.isArray(body.resultI5) ? body.resultI5.map((row) => ({ ...row, status: "" })) : [];
      setRowDataDetail(list);
      setRowDataEtc(list.length ? list[list.length - 1] : {});
      setStockInfo(Array.isArray(body.resultI7) && body.resultI7.length ? body.resultI7[body.resultI7.length - 1] : {});
      setRowDataSelected(data);
      calculateOrderSummary(body);
    } catch (err) {
      console.error("데이터 조회 실패:", err);
      showToast?.({ type: "error", message: "상세 조회 실패" });
    } finally {
      hideLoading();
    }
  }, [request, calculateOrderSummary, showLoading, hideLoading, showToast]);

  // -------------------------
  // 상품검색
  // -------------------------
  const handleGoodsSearch = useCallback(async () => {
    if (!rowDataSelected) {
      showToast?.({ type: "warning", message: "전표를 선택하세요." });
      return;
    }
    showLoading();
    try {
      const payload = {
        action: "selectSe002_I_4List",
        payload: {
          orderD: rowDataSelected.orderD ? rowDataSelected.orderD.replace(/-/g, "") : "",
          storeId: rowDataSelected.storeId || "",
          agentId: rowDataSelected.agentId || "",
          goods: "",
          ioNm: "판매",
          ordSystem: rowDataSelected.ordSystem || "",
          userId: user?.emplNo || "admin",
        },
      };
      const res = await request("domain/insanga/store/inputMng", payload, {}, "post", "json");
      const body = res?.data?.body || [];
      setRowGoodsData(Array.isArray(body) ? [...body] : []);
    } catch (err) {
      console.error("상품검색 실패:", err);
      showToast?.({ type: "error", message: "상품검색 실패" });
    } finally {
      hideLoading();
    }
  }, [rowDataSelected, request, user, showLoading, hideLoading, showToast]);

  // -------------------------
  // 상품 더블클릭 -> 상세에 추가
  // -------------------------
  const handleGoodsRowDoubleClick = useCallback(({ data }) => {
    if (!data) return;
    const newRow = _.cloneDeep(rowDataEtc || {});
    Object.keys(data).forEach(key => {
      if (key in newRow && key !== "saleRate") newRow[key] = data[key];
    });
    newRow.본사재고 = data.stockQty;
    newRow.매장재고 = data.agentStockQty;
    newRow.sobijaDan = data.supplyDan;
    newRow.orderQty = 1;
    newRow.status = "create";
    newRow.orderNo = null;

    if (data.supplyDan != null && data.saleRate != null) {
      newRow.orderDan = Math.round((data.supplyDan * ((100 - newRow.saleRate) / 100)));
    }

    if (orderGridRef.current?.api) {
      const tx = orderGridRef.current.api.applyTransaction({ add: [newRow] });
      const addedNode = tx.add?.[0];
      if (addedNode) {
        // 강제로 orderQty 변경 로직 트리거
        handleOrderQtyChange({ node: addedNode, data: addedNode.data, colDef: { field: "orderQty" } });
      }
    } else {
      // 그리드 미존재 시 배열로만 반영
      setRowDataDetail(prev => [...prev, newRow]);
    }
  }, [rowDataEtc, handleOrderQtyChange]); // handleOrderQtyChange는 아래에 선언되므로 의존성에 포함

  // orderGridRef (상세 그리드)
  const orderGridRef = useRef(null);
  const orderGridGoodsRef = useRef(null);

  // -------------------------
  // 그리드 편집 종료 기다리는 유틸
  // -------------------------
  const waitForEditingStop = useCallback((timeout = 100) =>
    new Promise((resolve) => {
      if (!grid2Api) return resolve();
      let resolved = false;
      const listener = (event) => {
        if (resolved) return;
        resolved = true;
        grid2Api.removeEventListener("cellEditingStopped", listener);
        resolve(event);
      };
      grid2Api.addEventListener("cellEditingStopped", listener);
      setTimeout(() => {
        if (!resolved) {
          grid2Api.removeEventListener("cellEditingStopped", listener);
          resolve();
        }
      }, timeout);
    }), [grid2Api]);

  const orderGridWait = useCallback(async () => {
    if (!grid2Api) return;
    const editingCells = (await grid2Api.getEditingCells?.()) || [];
    if (editingCells.length > 0) {
      await grid2Api.stopEditing();
      await waitForEditingStop();
    }
  }, [grid2Api, waitForEditingStop]);

  // -------------------------
  // 주문수량 변경 핸들러 (한 곳에서 관리)
  // -------------------------
  // -------------------------
  // 주문수량 변경 핸들러 (수정됨)
  // -------------------------
  async function handleOrderQtyChange(params) {
    // params: { oldValue, newValue, data, node, colDef }
    try {
      const { data, node, colDef } = params;

      // 1. 계산 로직 수행
      // 기존 data를 기반으로 하되, 계산된 필드를 덮어쓸 객체 준비
      let calculatedFields = {};

      const field = colDef?.field;
      if (field === "orderQty") {
        let orderQty = parseFloat(data.orderQty) || 0;
        let supplyDan = parseFloat(data.sobijaDan) || 0; // sobijaDan을 supplyDan으로 사용하는 로직 유지
        let marginRate = parseFloat(data.saleRate) || 0;
        let sobijaDan = parseFloat(data.sobijaDan) || 0;

        const saleRate = 100 - marginRate;
        let supplyAmt = supplyDan * orderQty;
        if (orderQty < 0) supplyAmt = Math.abs(supplyAmt);

        let orderTotAmt = Math.round((supplyAmt * saleRate) / 100);
        let orderVat = Math.floor(orderTotAmt / 1.1 / 10);
        let orderAmt = orderTotAmt - orderVat;
        let orderDan = orderQty !== 0 ? Math.round(orderTotAmt / orderQty) : 0;

        if (orderQty < 0) {
          orderTotAmt *= -1;
          orderAmt *= -1;
          orderVat *= -1;
        }
        const salePrice = orderQty * sobijaDan;

        calculatedFields = {
          orderQty,
          supplyAmt,
          orderTot: orderTotAmt,
          orderVat,
          orderAmt,
          orderDan,
          ["판매가"]: salePrice,
        };
      }

      // 2. 최종 데이터 객체 생성 (기존 데이터 + 계산된 데이터)
      // 주의: 아직 status는 결정되지 않음
      const currentData = { ...data, ...calculatedFields };

      // 3. 원본 데이터와 비교하여 Status 결정
      // 원본 찾기 (uniqueId 기준)
      const originalRow = rowDataDetailRef.current.find(row => String(row.uniqueId) === String(currentData.uniqueId));

      // 비교할 키 목록
      const compareKeys = ["orderQty", "claimGbnNm", "memo", "recvNm", "recvTel1", "recvZip", "recvAddr1"];

      // 원본과 같은지 체크
      const isSameAsOriginal = originalRow ? compareKeys.every(key => {
        const orig = originalRow[key] ?? "";
        const curr = currentData[key] ?? "";
        // 숫자형 비교
        if (!isNaN(Number(orig)) && !isNaN(Number(curr)) && String(orig).trim() !== "" && String(curr).trim() !== "") {
          return Number(orig) === Number(curr);
        }
        // 문자열 비교
        return String(orig) === String(curr);
      }) : false;

      // Status 결정 로직
      let newStatus = currentData.status;

      if (currentData.status === 'create') {
        // 신규 추가된 행은 원복 개념이 없으므로 create 유지
        newStatus = 'create';
      } else if (currentData.status === 'delete') {
        // 삭제 상태면 유지
        newStatus = 'delete';
      } else {
        // 기존 데이터 수정인 경우
        if (isSameAsOriginal) {
          newStatus = ""; // 원본과 같으면 상태 초기화
        } else {
          newStatus = "update"; // 다르면 update
        }
      }

      // 최종 객체에 status 반영
      const finalRowData = { ...currentData, status: newStatus };

      // 4. 그리드 업데이트 (화면 반영)
      if (node && typeof node.setData === "function") {
        node.setData(finalRowData);
        // Status 값 변경에 따른 스타일 갱신을 위해 명시적 호출이 필요할 수 있음
        // node.setDataValue('status', newStatus); // setData에 포함되어 있어서 생략 가능하나 확실히 하기 위해
      } else {
        // 그리드 객체가 없는 경우 State 직접 수정
        setRowDataDetail(prev => prev.map(r => (r.uniqueId === finalRowData.uniqueId ? finalRowData : r)));
      }

      // 5. 요약 정보 재계산 (Summary)
      const newDetailList = [];
      const api = orderGridRef.current?.api || grid2Api;
      if (api) {
        api.forEachNode(n => newDetailList.push(n.data));
      } else {
        newDetailList.push(...rowDataDetail); // 이 경우 갱신 전일 수 있으니 주의 필요하나, 위 setRowDataDetail 후라면 괜찮음
      }
      // 동기화를 맞추기 위해 finalRowData가 반영된 리스트로 계산
      // (API가 있는 경우 node.setData로 이미 반영됨)
      await calculateOrderSummary({ resultI5: newDetailList, resultI7: [stockInfo] });

      // 6. 변경 목록(ChangeDetailRows) 관리 (저장용 State)
      setChangeDetailRows(prev => {
        const idx = prev.findIndex(row => String(row.uniqueId) === String(finalRowData.uniqueId));

        // A. 원본과 같아져서(Reverted) Status가 ""인 경우 -> 목록에서 제거
        if (newStatus === "") {
          if (idx !== -1) {
            const copy = [...prev];
            copy.splice(idx, 1);
            return copy;
          }
          return prev;
        }

        // B. Create, Update, Delete 인 경우 -> 목록에 추가 혹은 갱신
        else {
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = finalRowData; // 계산된 최종 데이터로 교체
            return copy;
          } else {
            return [...prev, finalRowData];
          }
        }
      });

    } catch (err) {
      console.error("handleOrderQtyChange error:", err);
    }
  }

  // -------------------------
  // 저장 로직
  // -------------------------
  const onOrderDtlSave = useCallback(async () => {
    showLoading();
    try {
      const newItems = changeDetailRows.filter(item => item.status === 'create');
      const updateItems = changeDetailRows.filter(item => item.status === 'update');
      const deleteItems = changeDetailRows.filter(item => item.status === 'delete');

      const payload = {
        newItems: JSON.stringify(newItems),
        updateItems: JSON.stringify(updateItems),
        deleteItems: JSON.stringify(deleteItems),
      };

      const res = await request("domain/insanga/store/inputMng", { action: "saveSe002_I", payload }, {}, "post", 'json');
      console.log(res);

      showMessageModal({
        title: "알림",
        content: "주문 전표 내역이 저장 되었습니다.",
        onCallback: () => {
          if (rowDataSelected) handleRowDoubleClick({ data: rowDataSelected });
        }
      });
      // 저장 성공 시 변경 목록 비우기
      setChangeDetailRows([]);
    } catch (err) {
      console.error("저장 실패:", err);
      showToast?.({ type: "error", message: "저장 실패" });
    } finally {
      hideLoading();
    }
  }, [changeDetailRows, request, showLoading, hideLoading, showMessageModal, rowDataSelected, handleRowDoubleClick, showToast]);

  const handleOrderDtlSave = useCallback(async () => {
    await orderGridWait();

    if (changeDetailRows.length === 0) {
      showMessageModal({ title: "알림", content: "변경된 내용이 없습니다.", onCallback: () => { } });
      return;
    }

    showConfirmModal({
      title: "확인",
      content: "저장하시겠습니까?",
      confirmText: "닫기",
      cancelText: "취소",
      onConfirm: () => { onOrderDtlSave(); },
    });
  }, [changeDetailRows, onOrderDtlSave, showConfirmModal, showMessageModal, orderGridWait]);

  const handleIsChanged = useCallback(() => changeDetailRows.length > 0, [changeDetailRows]);

  const handleDeleteDetail = useCallback(() => {
    if (!grid2Api) return;
    const selected = grid2Api.getSelectedNodes() || [];
    if (selected.length === 0) return;
    selected.forEach(node => {
      node.setDataValue("status", "delete");
      node.setSelected(false);
    });
  }, [grid2Api]);

  // -------------------------
  // 그리드 ref들에 대한 기본 설정
  // -------------------------
  const onGrid1Ready = useCallback((params) => {
    setGrid1Api(params.api);
  }, []);

  const onGrid2Ready = useCallback((params) => {
    setGrid2Api(params.api);
    setGrid2ColumnApi(params.columnApi);
  }, []);

  // -------------------------
  // LeftPanel 버튼 (메모이제이션)
  // -------------------------
  const leftButtons = useMemo(() => ([
    { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
  ]), [handleSearch]);

  // -------------------------
  // 마운트 시 최초 조회
  // -------------------------
  useEffect(() => {
    // 최초 자동조회는 필요시 활성화 (원문 코드에서 자동 호출 여부 불분명)
    // fetchData();
  }, []); // 의존 없음

  // -------------------------
  // JSX 렌더
  // -------------------------
  return (
    <div className="content-registe-container">
      <div className="content-main-area">
        <div className="content-center-panel" style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "auto", boxSizing: "border-box" }}>
          <LeftPanel
            codes={codes}
            filters={filters}
            handleFilterChange={handleFilterChange}
            searchForm={SEARCH_FORM}
            buttons={leftButtons}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            leftWidth={100}
            rowByDisplayCnt={4}
            title={"주문서관리"}
          />
          <div style={{ display: "flex", width: "100%", marginTop: "-10px" }}>
            <div className="ag-theme-alpine content-panel-grid" style={{ width: "70%", paddingRight: "0px", marginRight: "10px" }}>
              <div className="content-panel-title content-panel-title-bg">주문정보</div>
            </div>
            <div className="ag-theme-alpine content-panel-grid" style={{ width: "30%", paddingLeft: "0px" }}>
              <div className="content-panel-title content-panel-title-bg">요약 정보</div>
            </div>
          </div>

          <div style={{ display: "flex", width: "100%", height: "240px" }}>
            <div className="ag-theme-alpine content-panel-grid" style={{ width: "70%", paddingRight: "5px" }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={columnGroups}
                defaultColDef={{
                  sortable: Properties.grid.default.colDef.sortable,
                  filter: Properties.grid.default.colDef.filter,
                  resizable: Properties.grid.default.colDef.resizable,
                  minWidth: Properties.grid.default.colDef.minWidth,
                }}
                onGridReady={onGrid1Ready}
                rowHeight={Properties.grid.default.data.height}
                headerHeight={Properties.grid.default.header.height}
                domLayout={Properties.grid.default.domLayout}
                onRowDoubleClicked={(params) => {
                  if (params.node.isSelected()) return;
                  if (handleIsChanged()) {
                    showConfirmModal({
                      title: "확인",
                      content: "변경 사항이 존재 합니다. 확인 시 변경 항목은 초기화 됩니다.",
                      confirmText: "닫기",
                      cancelText: "취소",
                      onConfirm: () => {
                        params.api.deselectAll();
                        params.node.setSelected(true);
                        params.data.rowId = params.node.id;
                        handleRowDoubleClick(params);
                      }
                    });
                    return;
                  }
                  params.api.deselectAll();
                  params.node.setSelected(true);
                  params.data.rowId = params.node.id;
                  handleRowDoubleClick(params);
                }}
                rowSelection={"single"}
                suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection}
                enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
                tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
                pagination={Properties.grid.default.pagination}
                paginationPageSize={Properties.grid.default.pageSize}
                paginationPageSizeSelector={Properties.grid.default.pageSizeList}
                suppressPaginationPanel={false}
                enableCellSpan={true}
                getRowClass={(params) => {
                  if (params.data?.isSummary) return "summary-row";
                  if (params.data?.isTotal) return "total-row";
                  return "";
                }}
              />
            </div>

            <div className="ag-theme-alpine content-panel-grid" style={{ width: "30%", paddingLeft: "5px" }}>
              <div className="content-left-area1">
                <div className="content-query-row"><label className="content-query-label">거래처코드</label>
                  <div>
                    {rowDataEtc.agentId && <span>{rowDataEtc.agentId}</span>}
                    {rowDataEtc.agentNm && <span> / {rowDataEtc.agentNm}</span>}
                    {rowDataEtc.orderSequ && <span> / {rowDataEtc.orderSequ}</span>}
                    {rowDataEtc.channGbnNm && <span> / {rowDataEtc.channGbnNm}</span>}
                  </div>
                </div>
                <div className="content-query-row"><label className="content-query-label">마진율</label>
                  <div>{rowDataEtc.orderRate && <span>{Number(rowDataEtc.orderRate).toFixed(2)}</span>}</div>
                </div>
                <div className="content-query-row"><label className="content-query-label">출고요구일자</label>
                  <div>{rowDataEtc.requireD && <span>{formatDateToYYYYMMDD(rowDataEtc.requireD)}</span>}</div>
                </div>
                <div className="content-query-row"><label className="content-query-label">비고</label>
                  <div>{rowDataEtc.memo && <span>{rowDataEtc.memo}</span>}</div>
                </div>
                <div className="content-query-row"><label className="content-query-label">B2C주문 여부</label><div /></div>
                <div className="content-query-row"><label className="content-query-label">주소</label>
                  <div>{rowDataEtc.recvAddr1 && <span>{rowDataEtc.recvAddr1}</span>}</div>
                </div>
                <div className="content-query-row"><label className="content-query-label">받는사람</label>
                  <div>{rowDataEtc.recvNm && <span>{rowDataEtc.recvNm}</span>}</div>
                </div>
                <div className="content-query-row"><label className="content-query-label">전화번호</label>
                  <div>{rowDataEtc.recvTel1 && <span>{rowDataEtc.recvTel1}</span>}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="content-panel-title content-panel-title-bg" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>상품검색</div>
              <button key={"btnSearchGoogs"} onClick={handleGoodsSearch} className="content-search-button">검색</button>
            </div>
            <div className="ag-theme-alpine content-panel-grid" style={{ height: "200px" }}>
              <AgGridReact
                ref={orderGridGoodsRef}
                rowData={rowGoodsData}
                columnDefs={columnGoodsGroups}
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
                onRowDoubleClicked={handleGoodsRowDoubleClick}
                enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
                tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
                pagination={Properties.grid.default.pagination}
                paginationPageSize={Properties.grid.default.pageSize}
                paginationPageSizeSelector={Properties.grid.default.pageSizeList}
                suppressPaginationPanel={false}
                enableCellSpan={true}
              />
            </div>

            <div className="content-panel-title content-panel-title-bg" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>주문 전표 내역</div>
              <div className="content-button-group">
                <button key={"btnDeleteOrder"} onClick={handleDeleteDetail} className="content-delete-button">삭제</button>
                <button key={"btnSaveOrder"} onClick={handleOrderDtlSave} className="content-save-button">저장</button>
              </div>
            </div>

            <div className="content-query-row">
              [
              전표합계 - 총({addComma(rowDataDetail.length)} 건) /
              수량({addComma(orderSummary.totalQuantity ?? 0)} 개) /
              공급가({addComma(orderSummary.totalSupplyAmount ?? 0)} 원) /
              부가세({addComma(orderSummary.totalVatAmount ?? 0)} 원) /
              금액합계({addComma(orderSummary.totalAmount ?? 0)} 원) /
              판매가합계({addComma(orderSummary.판매가 ?? 0)} 원)
              ] -
              [
              재고금액({addComma(orderSummary.재고금액 ?? 0)} 원) /
              주문금액({addComma(orderSummary.판매가 ?? 0)} 원) /
              예상재고금액({addComma(orderSummary.예상재고금액 ?? 0)} 원)
              ]
            </div>

            <div className="ag-theme-alpine content-panel-grid" style={{ height: "300px" }}>
              <AgGridReact
                ref={orderGridRef}
                rowData={rowDataDetail}
                columnDefs={columnDetailGroups}
                defaultColDef={{
                  sortable: Properties.grid.default.colDef.sortable,
                  filter: Properties.grid.default.colDef.filter,
                  resizable: Properties.grid.default.colDef.resizable,
                  minWidth: Properties.grid.default.colDef.minWidth,
                }}
                rowHeight={Properties.grid.default.data.height}
                headerHeight={Properties.grid.default.header.height}
                domLayout={Properties.grid.default.domLayout}
                onGridReady={onGrid2Ready}
                getRowId={(params) => params.data.uniqueId || `${params.data.goodsId}-${params.data.seqNo || 'unknown'}`}
                onCellValueChanged={handleOrderQtyChange}
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
                  switch (params.data.status) {
                    case "create": return "content-row-create";
                    case "update": return "content-row-update";
                    case "delete": return "content-row-delete";
                    default: return "";
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustomerInfoSearch);
