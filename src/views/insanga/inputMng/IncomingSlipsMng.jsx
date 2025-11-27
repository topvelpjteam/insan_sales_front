/*********************************************************************
 * - 메뉴 : 매장관리 -> 일간자료 -> 주문별 입고 현황
 * - 파일명 : OrderByShipStatus.jsx
 ********************************************************************/

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSelector } from 'react-redux';
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import _ from "lodash";
import dayjs from "dayjs";

import Properties from "@/system/Properties";
import { gridNoColumn, useLayoutWidths } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import { useLoading } from "@/system/hook/LoadingContext";
import { useCustomContents } from "@/system/hook/ManagerProvider";

import LeftPanel from "@/components/layout/LeftPanel";
import { getAgentId, getAgentData } from "@/system/store/redux/agent";
import { numberFormatter, formatDateToYYYYMMDD } from "@/system/utils/common";

ModuleRegistry.registerModules([AllCommunityModule]);

const IncomingSlipsMng = () => {
  // ===================== 기본 상태 =====================
  const user = useSelector((state) => state.user.user);
  const agentId = useSelector(getAgentId) || "";
  const agentData = useSelector(getAgentData);

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal, showConfirmModal } = useCustomContents();

  const [grid1Data, setGrid1Data] = useState([]);
  const [grid2Data, setGrid2Data] = useState([]);
  const [grid3Data, setGrid3Data] = useState([]);
  const [changeDetailRows, setChangeDetailRows] = useState([]);
  const grid3DataRef = useRef([]);

  const [isMonClose, setIsMonClose] = useState(false);
  const [grid3Title, setGrid3Title] = useState("NOTIN");

  const grid1ApiRef = useRef(null);
  const grid2ApiRef = useRef(null);
  const grid3ApiRef = useRef(null);

  // ===================== 검색 폼 =====================
  const searchFormReceived = useMemo(() => [
    {
      label: "입고일자", key: "sDate", type: "dateRange", startKey: "sDate", endKey: "eDate", isEnterEvent: true,
      defaultValue: { start: dayjs().subtract(120, "month").format("YYYY-MM-DD"), end: dayjs().format("YYYY-MM-DD") }
    }
  ], []);

  const searchFormNotReceived = useMemo(() => [
    {
      label: "출고일자", key: "sOutDate", type: "dateRange", startKey: "sOutDate", endKey: "eOutDate", isEnterEvent: true,
      defaultValue: { start: dayjs().subtract(120, "month").format("YYYY-MM-DD"), end: dayjs().format("YYYY-MM-DD") }
    }
  ], []);

  const searchFormReceivedDtl = useMemo(() => [
    { label: "입고일자", key: "inDateDtl", type: "date" },
    { label: "매장코드", key: "agentId", type: "select", codeKey: "agentData", defaultValue: "", disabled: true },
  ], []);

  const initFilters = (searchForm) => searchForm.reduce((acc, cur) => {
    switch (cur.type) {
      case "dateRange":
        acc[cur.startKey] = cur.defaultValue?.start || "";
        acc[cur.endKey] = cur.defaultValue?.end || "";
        break;
      default: acc[cur.key] = cur.defaultValue ?? ""; break;
    }
    return acc;
  }, {});

  const [filters1, setFilters1] = useState(initFilters(searchFormReceived));
  const [filters2, setFilters2] = useState(initFilters(searchFormNotReceived));
  const [filters3, setFilters3] = useState(initFilters(searchFormReceivedDtl));

  const handleFilterChange = (setter) => (key, value) => setter(prev => ({ ...prev, [key]: value }));

  // ===================== 공통 코드 =====================
  const [codes, setCodes] = useState({});
  const codeGroups = [
    { key: "claimGbn", codeGroupCode: "S25" },
    { key: "agentData", codeGroupCode: "" },
    { key: "wareHouseData", codeGroupCode: "" },
  ];

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(codeGroups.map(async ({ key, codeGroupCode }) => {
          const res = await request("domain/insanga/store/system", { action: "selectCode", payload: { codeGroupCode } }, {}, "post");
          return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
        }));
        if (codeGroups.some(c => c.key === "agentData")) {
          const newAgentData = agentData.map(item => ({ code: item.agentId, codeNm: item.agentNm }));
          results.push(["agentData", newAgentData]);
        }
        setCodes(Object.fromEntries(results));
      } catch (err) { console.error("공통 코드 조회 실패:", err); }
    };
    fetchCodes();
  }, [request, agentData]);

  // ===================== 초기화 =====================
  const handleReset = useCallback(() => {
    setGrid3Title("NOTIN");
    setGrid1Data([]);
    setGrid2Data([]);
    setFilters3((prev) => ({
      ...prev,
      inDateDtl: "",
      agentId: agentId
    }));
    setChangeDetailRows([]);
    setIsMonClose(false);
  }, [agentId]);

  useEffect(() => { if (agentId) handleReset(); }, [agentId, handleReset]);

  // ===================== 그리드 컬럼 =====================
  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGrid1Groups, setColumnGrid1Groups] = useState([
    gridNoColumn(),
    {
      headerName: '입고일자',
      field: 'inD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.inD || params.data.inD;
        const formatted = formatDateToYYYYMMDD(openDateValue);
        return formatted;
      }
    },
    {
      headerName: '출고일자',
      field: 'saleD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.saleD || params.data.saleD;
        const formatted = formatDateToYYYYMMDD(openDateValue);
        return formatted;
      }
    },
    {
      headerName: '창고',
      field: 'storeId',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
    {
      headerName: 'Sequ',
      field: 'saleSequ',
      width: 120,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
    {
      headerName: "입고수량",
      field: "saleQty",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 100,
      minWidth: 100,
      sortable: false,
      filter: false,
      //flex: 1,
    },
    {
      headerName: "금액합계",
      field: "saleAmt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 100,
      minWidth: 100,
      sortable: false,
      filter: false,
      //flex: 1,
    },
    {
      headerName: "소비자가",
      field: "sobijaAmt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 100,
      minWidth: 100,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '비고', field: 'bigo', width: 250, sortable: true,
      //editable: (params) => params.data.status !== "delete",
      cellStyle: { textAlign: 'left' },
      //flex: 3
    },
  ]);
  // [미입고] 그리드 컬럼 설정.
  const columnGrid2Groups = useMemo(() => {
    return [
      gridNoColumn(),
      {
        headerName: '출고일자',
        field: 'saleD',
        width: 150,
        minWidth: 80,
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        valueFormatter: (params) => {
          // 여러 필드명 시도
          const openDateValue = params.data.saleD || params.data.saleD;
          const formatted = formatDateToYYYYMMDD(openDateValue);
          return formatted;
        },
        //flex: 2
      },
      {
        headerName: '창고',
        field: 'storeId',
        width: 150,
        minWidth: 80,
        cellClass: 'text-left',
        sortable: false,
        filter: false,
        spanRows: false,
        flex: 2,
      },
      {
        headerName: 'Sequ',
        field: 'saleSequ',
        width: 150,
        minWidth: 80,
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        //flex: 2,
      },
      {
        headerName: "수량",
        field: "saleQty",
        valueFormatter: numberFormatter,
        cellClass: "text-right summary-col",
        width: 100,
        minWidth: 100,
        sortable: false,
        filter: false,
        //flex: 1,
      },
      {
        headerName: "금액합계",
        field: "saleAmt",
        valueFormatter: numberFormatter,
        cellClass: "text-right summary-col",
        cellStyle: (params) => {
          if (Number(params.value) !== 0) {
            return { color: "red", fontWeight: "bold" };
          }
          return null;
        },
        width: 100,
        minWidth: 100,
        sortable: false,
        filter: false,
        //flex: 1,
      },
      {
        headerName: '소비자가',
        field: 'sobijaAmt',
        width: 100,
        minWidth: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right',
        //flex: 1
      },
      {
        headerName: '비고', field: 'bigo', width: 250, sortable: true,
        editable: (params) => params.data.status !== "delete",
        cellStyle: { textAlign: 'left' },
        //flex: 3
      },
    ];
  }, []);

  // [입고상세내역] 그리드 컬럼 설정.
  const columnGrid3Groups = useMemo(() => {
    return [
      {
        headerName: "",
        checkboxSelection: true, // (params) => !params.node.group, // 그룹 행에는 비활성화
        headerCheckboxSelection: true, // 헤더에 전체 선택 체크박스 표시
        width: 50,
        pinned: "left", // (선택) 왼쪽 고정
        cellStyle: Properties.grid.centerCellStyle,
      },
      { headerName: "상태", field: "status", editable: false, width: 80 },
      {
        headerName: '출고일자',
        field: 'saleD',
        width: 150,
        minWidth: 80,
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        flex: 2,
        valueFormatter: (params) => {
          // 여러 필드명 시도
          const openDateValue = params.data.saleD || params.data.saleD;
          const formatted = formatDateToYYYYMMDD(openDateValue);
          return formatted;
        }
      },
      //gridNoColumn(),
      { headerName: '창고', field: 'storeId', width: 80, sortable: true, cellClass: 'text-center' },
      { headerName: 'Sequ', field: 'saleSequ', width: 120, sortable: true, cellClass: 'text-left' },
      { headerName: 'No.', field: 'saleNo', width: 120, sortable: true, cellClass: 'text-right' },
      {
        headerName: '입고일자',
        field: 'inD',
        width: 150,
        minWidth: 80,
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        flex: 2,
        valueFormatter: (params) => {
          // 여러 필드명 시도
          const openDateValue = params.data.inD || params.data.inD;
          const formatted = formatDateToYYYYMMDD(openDateValue);
          return formatted;
        }
      },
      { headerName: '상품코드', field: 'goodsId', width: 170, sortable: true, cellClass: 'text-left' },
      { headerName: '상품명', field: 'goodsNm', width: 300, sortable: true, cellClass: 'text-left' },
      { headerName: 'Lot No.', field: 'lotNo', width: 150, sortable: true, cellClass: 'text-left' },
      {
        headerName: '유통기한',
        field: 'expD',
        width: 150,
        minWidth: 80,
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        flex: 2,
        valueFormatter: (params) => {
          // 여러 필드명 시도
          const openDateValue = params.data.expD || params.data.expD;
          const formatted = formatDateToYYYYMMDD(openDateValue);
          return formatted;
        }
      },
      { headerName: '출고구분', field: 'ioId', width: 120, sortable: true, cellClass: 'text-left' },
      {
        headerName: "원주문수량",
        field: "orgOrderQty",
        valueFormatter: numberFormatter,
        cellClass: "text-right summary-col",
        width: 120,
        minWidth: 120,
        sortable: false,
        filter: false,
        flex: 1,
      },
      {
        headerName: '실입고수량',
        field: 'saleQty',
        width: 120,
        sortable: true,
        editable: (params) => params.data.status !== "delete",
        cellEditor: 'agTextCellEditor',
        valueParser: (params) => {
          const value = params.newValue;
          if (typeof value === 'string' && value.endsWith('-')) {
            // "7-" 형태를 "-7"로 변환
            return parseFloat('-' + value.slice(0, -1));
          }
          return parseFloat(value) || 0;
        },
        cellRenderer: (params) => {
          if (params.value == null || params.value === '') return '0';
          const numValue = Number(params.value);
          if (isNaN(numValue)) return '0';

          // 마이너스 기호를 앞에 강제로 표시
          if (numValue < 0) {
            return `-${Math.abs(numValue).toLocaleString('ko-KR')}`;
          } else {
            return numValue.toLocaleString('ko-KR');
          }
        },
        cellClass: (params) => {
          // 음수인 경우 CSS 클래스 적용 (0은 제외)
          if (params.value < 0) {
            return 'negative-quantity';
          }
          return '';
        },
        onCellValueChanged: (params) => {

        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: "단가",
        field: "sobijaDan",
        valueFormatter: numberFormatter,
        cellClass: "text-right summary-col",
        width: 120,
        minWidth: 120,
        sortable: false,
        filter: false,
        flex: 1,
      },
      {
        headerName: '공급가',
        field: 'saleDan',
        width: 120,
        sortable: true,
        cellEditorParams: {
          min: 0,
          max: 100,
          precision: 2
        },
        valueFormatter: numberFormatter, // rateFormatter,
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '부가세',
        field: 'saleVat',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '합계',
        field: 'saleTot',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '소비자가',
        field: 'sobijaAmt',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '소비자단가',
        field: 'sobijaDan',
        width: 120,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '메모', field: 'memo', width: 250, sortable: true
        , editable: (params) => params.data.status !== "delete"
        , cellStyle: { textAlign: 'left' }
      },
      {
        headerName: '매장메모', field: 'agentInMemo', width: 250, sortable: true
        , editable: (params) => params.data.status !== "delete"
        , cellStyle: { textAlign: 'left' }
      },
    ];
  }, []);

  // ===================== 검색 =====================
  const handleOnSearch = useCallback(async (filters, action, setter, reqGbn) => {
    if (_.isEmpty(agentId)) { showMessageModal({ title: "알림", content: "매장코드를 선택 하세요." }); return; }
    showLoading();
    setGrid3Data([]);
    try {
      let payload = {};
      if (reqGbn === "IN") {
        //payload = { action, payload: { ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, (v || '').replace(/-/g, '')])), agentId } };
        payload = {
          action,
          payload: {
            sDate: (filters1.sDate ? filters1.sDate.replace(/-/g, '') : '') || '',
            eDate: (filters1.eDate ? filters1.eDate.replace(/-/g, '') : '') || '',
            agentId,
          },
        };
      }
      else if (reqGbn === "NOTIN") {
        payload = {
          action,
          payload: {
            sDate: (filters2.sOutDate ? filters2.sOutDate.replace(/-/g, '') : '') || '',
            eDate: (filters2.eOutDate ? filters2.eOutDate.replace(/-/g, '') : '') || '',
            agentId,
          },
        };
      }
      const res = await request("domain/insanga/store/inputMng", payload, {}, "post", "json");
      setter(res?.data?.body || []);
    } catch (err) { console.error("데이터 조회 실패:", err); }
    finally { hideLoading(); }
  }, [agentId, request, showLoading, hideLoading, showMessageModal, filters1.eDate, filters1.sDate, filters2.eOutDate, filters2.sOutDate]);

  const handleSearch1 = useCallback((reqGbn) => handleOnSearch(filters1, "selectSD106_1_List", setGrid1Data, reqGbn = "IN"), [filters1, handleOnSearch]);
  const handleSearch2 = useCallback((reqGbn) => handleOnSearch(filters2, "selectSD106_2_List", setGrid2Data, reqGbn = "NOTIN"), [filters2, handleOnSearch]);

  // ===================== 상세/월마감 =====================
  const selectYymmCloseYn = useCallback(async (reqGbn, parentData) => {
    try {
      const yyyymm = (reqGbn === "NOTIN" ? parentData.saleD : parentData.inD)?.replace(/-/g, '').substring(0, 6) || '';
      const res = await request("domain/insanga/store/inputMng", { action: "selectYymmCloseYn", payload: { yyyymm } }, {}, "post", "json");
      setIsMonClose(!(res?.data?.body?.endYn === "N"));
    } catch (err) { console.error("월마감 조회 실패:", err); }
  }, [request]);

  // ===================== 입고마감 체크 =====================
  const selectSD106_5_List = useCallback(async (parentData) => {
    try {
      //const yyyymm = parentData.saleD : parentData.inD.replace(/-/g, '').substring(0, 6) || '';
      const res = await request("domain/insanga/store/inputMng", {
        action: "selectSD106_5_List",
        payload: {
          saleDate: parentData.saleD.replace(/-/g, ''),
          storeId: parentData.storeId,
          saleSequ: parentData.saleSequ
        }
      }, {}, "post", "json");
      //setIsMonClose(!(res?.data?.body?.endYn === "N"));
      // console.log(res);
      if (res?.data?.body) {
        return res?.data?.body[0].banTag;
      }
    } catch (err) {
      console.error("월마감 조회 실패:", err);
      return "E"; // 에러시 진행 안되게 처러.
    }
  }, [request]);

  const updateInDateDtl = useCallback(async (data) => {
    const formatted = formatDateToYYYYMMDD(data.saleD);
    const agentIdRow = agentId;
    //console.log(data, agentIdRow);
    setFilters3((prev) => ({
      ...prev,
      inDateDtl: formatted,
      agentId: agentIdRow
    }));
  }, [agentId]);

  const handleOnGrid3Search = useCallback(async (reqGbn, parentData) => {
    showLoading();
    try {
      const api = reqGbn === "NOTIN" ? grid1ApiRef.current : grid2ApiRef.current;

      // API 준비 여부 확인
      if (api) {
        const selectedRows = api.getSelectedRows();

        // 선택된 행이 있을 때만 해제
        if (selectedRows && selectedRows.length > 0) {
          api.deselectAll();
        }
      }
      setGrid3Data([]);
      const action = reqGbn === "NOTIN" ? "selectSD106_4_List" : "selectSD106_3_List";
      const payload = {
        action, payload: reqGbn === "NOTIN"
          ? { saleDate: (parentData.saleD || '').replace(/-/g, ''), storeId: parentData.storeId, saleSequ: parentData.saleSequ }
          : { inDate: (parentData.inD || '').replace(/-/g, ''), saleDate: (parentData.saleD || '').replace(/-/g, ''), storeId: parentData.storeId, saleSequ: parentData.saleSequ }
      };
      const res = await request("domain/insanga/store/inputMng", payload, {}, "post", "json");
      setGrid3Data(res?.data?.body || []);
      grid3DataRef.current = _.cloneDeep(res?.data?.body || []);
      if (reqGbn === "NOTIN") updateInDateDtl(parentData);
      await selectYymmCloseYn(reqGbn, parentData);
    } catch (err) { console.error("미입고상세 조회 실패:", err); }
    finally { hideLoading(); }
  }, [request, selectYymmCloseYn, showLoading, hideLoading, updateInDateDtl]);

  // ===================== 편집/저장 =====================
  // const handleGrid3Change = useCallback(({ data }) => {
  //   const uniqueId = data.uniqueId || `${data.saleNo}_${data.saleSequ}`;
  //   const updated = { ...data, status: "update" };
  //   setChangeDetailRows(prev => {
  //     const idx = prev.findIndex(r => r.uniqueId === uniqueId);
  //     if (idx !== -1) { prev[idx] = updated; return [...prev]; }
  //     return [...prev, updated];
  //   });
  // }, []);
  // const handleGrid3Change = useCallback(({ data }) => {
  //   setChangeDetailRows(prev => {
  //     // uniqueId가 없으면 새로 생성 (optional)
  //     const uniqueId = data.uniqueId || `${data.saleNo}_${data.saleSequ}`;
  //     const updatedRow = { ...data, status: "update", uniqueId };

  //     const idx = prev.findIndex(r => r.uniqueId === uniqueId);
  //     if (idx !== -1) {
  //       // 기존 row를 상태 업데이트
  //       const newArr = [...prev];
  //       newArr[idx] = updatedRow;
  //       return newArr;
  //     } else {
  //       // 새로 추가
  //       return [...prev, updatedRow];
  //     }
  //   });
  // }, []);
  const handleGrid3Change = useCallback((params) => {
    const { data, node } = params;

    // 상태 컬럼 계산
    const newStatus =
      data.status === "create"
        ? "create"
        : data.status === "delete"
          ? "delete"
          : "update";

    // 그리드 화면에 즉시 반영
    node.setDataValue("status", newStatus);

    // state에 반영
    setChangeDetailRows((prev) => {
      const idx = prev.findIndex((r) => r.uniqueId === data.uniqueId);
      if (idx !== -1) {
        // 기존 row update
        const updated = { ...prev[idx], ...data, status: newStatus };
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      // 신규 row 추가
      return [...prev, { ...data, status: newStatus }];
    });
  }, []);

  const handleGrid3DtlSave = useCallback(async () => {
    //console.log(3, filters3);
    const api = grid3ApiRef.current;
    const selectedRows = _.cloneDeep(grid3Data); //api.getSelectedRows();
    const inDate = (filters3.inDateDtl ? filters3.inDateDtl.replace(/-/g, '') : '') || '';

    if (_.isEmpty(inDate)) { showMessageModal({ title: "알림", content: "입고일자를 선택 하세요" }); return; }
    //if (selectedRows.length === 0) { showMessageModal({ title: "알림", content: "입고 항목을 선택 하세요" }); return; }
    // // API 준비 여부 확인
    if (api) {

      if (selectedRows.length > 0) {
        for (let i = 0; i < selectedRows.length; i++) {
          const row = selectedRows[i];
          const saleD = (row.saleD ? row.saleD.replace(/-/g, '') : '') || '';
          const saleQty = Number(row.saleQty || 0);
          const orgOrderQty = Number(row.orgOrderQty || 0);

          // 날짜 비교
          if (Number(saleD) > Number(inDate)) {
            showMessageModal({
              title: "경고",
              content: `출고일(${row.saleD})이 입고일자(${filters3.inDateDtl})보다 큽니다.`
            });
            return; // 첫 번째 오류 발견 시 중단
          }

          // 수량 비교
          // if (saleQty > orgOrderQty) {
          //   showMessageModal({
          //     title: "경고",
          //     content: `실입고수량(${saleQty})이 원주문수량(${orgOrderQty})을 초과했습니다.`
          //   });
          //   return; // 첫 번째 오류 발견 시 중단
          // }
        }
      }
    }


    if (isMonClose) {
      showMessageModal({ title: "알림", content: "월마감 되어 입고 확정 할 수 없습니다." });
      return;
    }

    // 입고 확정여부 체크
    const banTag = await selectSD106_5_List(selectedRows[0]);
    if (banTag === "Y") {
      showMessageModal({ title: "알림", content: "이미 입고 확정 된 자료입니다. 확인 후 작업 하세요." });
      return;
    }


    // const firstSaleD = (grid3Data[0].saleD ? grid3Data[0].saleD.replace(/-/g, '') : '') || '';

    // // 날짜 비교 (문자열이 YYYY-MM-DD 형식일 경우)
    // if (Number(firstSaleD) > Number(inDate)) {
    //   showMessageModal({
    //     title: "경고",
    //     content: `출고일(${changeDetailRows[0].saleD})이 입고일자(${filters3.inDateDtl})보다 큽니다.`
    //   });
    //   return;
    // }


    showConfirmModal({
      title: "확인",
      content: `[${filters3.inDateDtl}] 일자로 입고 처리 하시겠습니까?`,
      confirmText: "닫기",
      cancelText: "취소",
      onConfirm: async () => {
        showLoading();
        try {
          await request("domain/insanga/store/inputMng", {
            action: "updateSD106_6", payload: {
              inDate,
              //newItems: JSON.stringify(changeDetailRows.filter(i => i.status === "create")),
              //updateItems: JSON.stringify(grid3Data.filter(i => i.status === "update")),
              updateItems: JSON.stringify(selectedRows),
              //deleteItems: JSON.stringify(changeDetailRows.filter(i => i.status === "delete")),
              userId: 'ADMIN' //user.emplNo;
            }
          }, {}, "post", "json");

          //   const api = grid2ApiRef.current;
          //  const grid2SelectRows = api.getSelectedRows();
          //handleOnGrid3Search("NOTIN", grid2SelectRows[]);

          showMessageModal({
            title: "알림",
            content: "입고 처리 과 완료 되었습니다.",
            onCallback: () => { handleSearch2(); }
          });

          //showMessageModal({ title: "알림", content: "입고 처리 과 완료 되었습니다." });
        } catch (err) { console.error(err); }
        finally { hideLoading(); }
      }
    });
  }, [filters3, grid3Data, isMonClose, request, showLoading, hideLoading, showMessageModal, showConfirmModal]);

  // ===================== 레이아웃 =====================
  const { sidebarOpen, toggleSidebar } = useLayoutWidths(true, 100, false, 0);

  // ===================== 렌더 =====================
  return (
    <div className="content-registe-container">
      {/* 상단 검색 패널 */}
      <div style={{ display: "flex", width: "100%", marginTop: "-10px" }}>
        <div style={{ width: "50%", paddingRight: "10px" }}>
          <LeftPanel
            codes={codes} filters={filters1} handleFilterChange={handleFilterChange(setFilters1)}
            searchForm={searchFormReceived} buttons={[{ key: "btnSearchIn", label: "검색", className: "content-search-button", onClick: handleSearch1 }]}
            sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} title="기 입고 내역" handleInit={setFilters1}
          />

          <div className="grid-container" style={{ height: "250px" }}>
            <AgGridReact
              ref={grid1ApiRef}
              rowData={grid1Data}
              columnDefs={columnGrid1Groups}
              defaultColDef={{
                sortable: Properties.grid.default.colDef.sortable,
                filter: Properties.grid.default.colDef.filter,
                resizable: Properties.grid.default.colDef.resizable,
                minWidth: Properties.grid.default.colDef.minWidth,
                //editable: (params) => params.data?.status !== "delete",
              }}
              rowHeight={Properties.grid.default.data.height}
              headerHeight={Properties.grid.default.header.height}
              domLayout={Properties.grid.default.domLayout}
              onGridReady={(params) => {
                //setGrid1Api(params.api);
                grid1ApiRef.current = params.api;
              }}
              rowSelection="single"
              onRowDoubleClicked={(e) => {
                const api = e.api;
                // if (e.node.isSelected()) {
                //   return;
                // }
                // if (handleIsChanged()) {
                //   showConfirmModal({
                //     title: "확인",
                //     content: "변경 사항이 존재 합니다. 확인 시 변경 항목은 초기화 됩니다.",
                //     confirmText: "닫기",
                //     cancelText: "취소",
                //     onConfirm: () => {
                //       const api = params.api;
                //       api.deselectAll(); // ✅ 기존 선택 해제
                //       params.node.setSelected(true); // ✅ 더블 클릭된 행 선택
                //       params.data.rowId = params.node.id;
                //       // 필요한 추가 처리 (예: 상세 팝업 열기 등)
                //       handleGrid1DoubleClick(params); // 기존 함수 호출
                //     },
                //     //onCancel: () => callback(false), // 필요 시 사용
                //   });
                //   return; // 변경 있음 → 모달 후 종료
                // }            
                //api.deselectAll(); // ✅ 기존 선택 해제
                e.node.setSelected(true); // ✅ 더블 클릭된 행 선택
                //e.data.rowId = e.node.id;
                setGrid3Title("IN");
                handleOnGrid3Search("IN", e.data);
              }}
            />
          </div>
        </div>
        <div style={{ width: "50%", paddingLeft: "10px" }}>
          <LeftPanel
            codes={codes} filters={filters2} handleFilterChange={handleFilterChange(setFilters2)}
            searchForm={searchFormNotReceived} buttons={[{ key: "btnSearchNotIn", label: "검색", className: "content-search-button", onClick: handleSearch2 }]}
            sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} title="미 입고 내역" handleInit={setFilters2}
          />

          <div className="grid-container" style={{ height: "250px" }}>
            <AgGridReact
              ref={grid2ApiRef}
              rowData={grid2Data}
              columnDefs={columnGrid2Groups}
              defaultColDef={{
                sortable: Properties.grid.default.colDef.sortable,
                filter: Properties.grid.default.colDef.filter,
                resizable: Properties.grid.default.colDef.resizable,
                minWidth: Properties.grid.default.colDef.minWidth,
                //editable: (params) => params.data?.status !== "delete",
              }}
              rowHeight={Properties.grid.default.data.height}
              headerHeight={Properties.grid.default.header.height}
              domLayout={Properties.grid.default.domLayout}
              onGridReady={(params) => {
                //setGrid2Api(params.api);
                grid2ApiRef.current = params.api;
              }}
              rowSelection="single"
              onRowDoubleClicked={(e) => {
                const api = e.api;
                // if (e.node.isSelected()) {
                //   return;
                // }
                // if (handleIsChanged()) {
                //   showConfirmModal({
                //     title: "확인",
                //     content: "변경 사항이 존재 합니다. 확인 시 변경 항목은 초기화 됩니다.",
                //     confirmText: "닫기",
                //     cancelText: "취소",
                //     onConfirm: () => {
                //       const api = params.api;
                //       api.deselectAll(); // ✅ 기존 선택 해제
                //       params.node.setSelected(true); // ✅ 더블 클릭된 행 선택
                //       params.data.rowId = params.node.id;
                //       // 필요한 추가 처리 (예: 상세 팝업 열기 등)
                //       handleGrid1DoubleClick(params); // 기존 함수 호출
                //     },
                //     //onCancel: () => callback(false), // 필요 시 사용
                //   });
                //   return; // 변경 있음 → 모달 후 종료
                // }            
                //api.deselectAll(); // ✅ 기존 선택 해제
                e.node.setSelected(true); // ✅ 더블 클릭된 행 선택
                //e.data.rowId = e.node.id;
                setGrid3Title("NOTIN");
                handleOnGrid3Search("NOTIN", e.data);
              }}
            />
          </div>
        </div>
      </div>

      {/* 하단 3개 그리드 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
        <LeftPanel
          codes={codes}
          filters={filters3}
          handleFilterChange={handleFilterChange(setFilters3)}
          searchForm={grid3Title === "NOTIN" ? searchFormReceivedDtl : []}
          buttons={
            grid3Title === "NOTIN"
              ? [
                {
                  key: "btnSaveInConfirm",
                  label: "입고확정",
                  className: "content-search-button",
                  onClick: handleGrid3DtlSave,
                },
              ]
              : []
          }
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          title={
            grid3Title === "IN"
              ? "기입고 상세내역"
              : grid3Title === "NOTIN"
                ? "미입고 상세내역"
                : "상세내역"
          }
          handleInit={setFilters3}
          style={{ height: "500px", marginTop: "30px" }}
          rowByDisplayCnt={6}
          isUseInitBtn={false}
        //leftWidth={leftWidth}
        />
        <div className="grid-container" style={{ height: "250px" }}>
          <AgGridReact
            ref={grid3ApiRef}
            rowData={grid3Data}
            columnDefs={columnGrid3Groups}
            defaultColDef={{
              sortable: Properties.grid.default.colDef.sortable,
              filter: Properties.grid.default.colDef.filter,
              resizable: Properties.grid.default.colDef.resizable,
              minWidth: Properties.grid.default.colDef.minWidth,
              ///editable: (params) => params.data?.status !== "delete",
            }}
            rowHeight={Properties.grid.default.data.height}
            headerHeight={Properties.grid.default.header.height}
            domLayout={Properties.grid.default.domLayout}
            onGridReady={(params) => {
              //setGrid3Api(params.api);
              grid3ApiRef.current = params.api;
            }}
            rowSelection="multiple"
            onCellValueChanged={handleGrid3Change}  // ← 여기서 호출
            getRowClass={(params) => {
              switch (params.data.status) {
                case "create":
                  return "content-row-create";
                case "update":
                  return "content-row-update";
                case "delete":
                  return "content-row-delete";
                default:
                  return "";
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default IncomingSlipsMng;
