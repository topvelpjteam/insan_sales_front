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
const ShipInStatus = ({ tabKey }) => {
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
      label: "입고일자",
      key: "sinD",
      startKey: "sinDFrom",
      endKey: "sinDTo",
      type: "dateRange",
      codeKey: "",
      defaultValue: {
        start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        end: dayjs().add(1, "month").format("YYYY-MM-DD"),
      },
    },
    { label: "입고구분(F)", key: "sioId", type: "select", codeKey: "shipInData", defaultValue: "210" },
    { label: "입고구분(T)", key: "eioId", type: "select", codeKey: "shipInData", defaultValue: "710" },
    { label: "대분류", key: "btypeList", type: "multiple", codeKey: "btypeData", defaultValue: "" },
    { label: "중분류", key: "mtypeList", type: "multiple", codeKey: "mtypeData", defaultValue: "" },
    { label: "소분류", key: "stypeList", type: "multiple", codeKey: "stypeData", defaultValue: "" },
    { label: "상품구분", key: "ggbnList", type: "multiple", codeKey: "saleGbnData", defaultValue: "" },
    {
      label: "상품코드", key: "goodsList", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: () => {
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },
    { label: "LOT/입고관리번호", key: "lotList", type: "input", codeKey: "", isEnterEvent: true, defaultValue: "" },
  ];

  const CODE_GROUPS = [
    { key: "btypeData", codeGroupCode: "S05" },
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "stypeData", codeGroupCode: "S08" },
    { key: "shipInData", codeGroupCode: "S19" },
    { key: "saleGbnData", codeGroupCode: "S03" },
  ];

  const COLUMN_GROUPS = useMemo(() => ([
    gridNoColumn(),
    {
      headerName: '입고일자',
      field: 'saleD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      valueFormatter: (params) => formatDateToYYYYMMDD(params.value || params.data?.saleD),
      spanRows: true
    },
    { headerName: '전표', field: 'saleSequ', width: 100, cellClass: 'text-center', spanRows: true },
    { headerName: '입고구분', field: 'ioGbnNm', width: 100, cellClass: 'text-left', spanRows: true },
    { headerName: '순번', field: 'saleNo', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '상품코드', field: 'goodsId', width: 170, cellClass: 'text-left' },
    { headerName: '상품명', field: 'goodsNm', width: 250, cellClass: 'text-left' },
    { headerName: '수량', field: 'saleQty', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '단가', field: 'saleDan', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '매가(확인필요)', field: 'orgSupplyDan', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '공급가', field: 'supplyDan', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '부가세', field: 'saleVat', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '합계', field: 'supplyAmt', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '판매가액', field: 'saleAmt', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    { headerName: '비고', field: 'memo', width: 300, cellClass: 'text-left' },
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
    async (action = "selectUspSd201p") => {
      try {
        if (!agentId) {
          showMessageModal({ title: "알림", content: "매장코드를 선택 하세요." });
          return;
        }
        showLoading();
        const payload = {
          action,
          payload: {
            sinD: filters.sinDFrom.replace(/-/g, '') || '',
            einD: filters.sinDTo.replace(/-/g, '') || '',
            sioId: filters.sioId || '',
            eioId: filters.eioId || '',
            btypeList: Array.isArray(filters.btypeList) ? filters.btypeList.join(',') : (filters.btypeList || ''),
            mtypeList: Array.isArray(filters.mtypeList) ? filters.mtypeList.join(',') : (filters.mtypeList || ''),
            stypeList: Array.isArray(filters.stypeList) ? filters.stypeList.join(',') : (filters.stypeList || ''),
            goodsList: Array.isArray(filters.goodsList) ? filters.goodsList.join(',') : (filters.goodsList || ''),
            ggbnList: Array.isArray(filters.ggbnList) ? filters.ggbnList.join(',') : (filters.ggbnList || ''),
            lotList: Array.isArray(filters.lotList) ? filters.lotList.join(',') : (filters.lotList || ''),
            agentId: agentId,
          },
        };
        const res = await request("domain/insanga/store/daily", payload, {}, "post", 'json');
        setRowData(summary(res?.data?.body || []));
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );

  // -----------------------------
  // 소계 + 전체 합계 계산
  // -----------------------------
  const summary = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    const result = [];

    // 전체 누적 합계 객체
    const totalAll = {
      saleQty: 0,
      saleAmt: 0,
      saleVat: 0,
      supplyAmt: 0,
      saleDan: 0,
      supplyDan: 0,
      orgSupplyDan: 0,
    };

    // 합계 계산 헬퍼
    const sumFields = (items) => ({
      saleQty: _.sumBy(items, 'saleQty') || 0,
      saleAmt: _.sumBy(items, 'saleAmt') || 0,
      saleVat: _.sumBy(items, 'saleVat') || 0,
      supplyAmt: _.sumBy(items, 'supplyAmt') || 0,
      saleDan: _.sumBy(items, 'saleDan') || 0,
      supplyDan: _.sumBy(items, 'supplyDan') || 0,
      orgSupplyDan: _.sumBy(items, 'orgSupplyDan') || 0,
    });

    // 소계/합계 행 생성 헬퍼
    const pushSummary = (name, sums, keys = {}) => {
      result.push({
        saleD: '',
        saleSequ: '',
        ioId: '',
        ioGbnNm: '',
        goodsId: '',
        goodsNm: name,
        saleQty: sums.saleQty,
        saleAmt: sums.saleAmt,
        saleVat: sums.saleVat,
        supplyAmt: sums.supplyAmt,
        saleDan: sums.saleDan,
        supplyDan: sums.supplyDan,
        orgSupplyDan: sums.orgSupplyDan,
        saleNo: '-',
        bigo: '',
        memo: '',
        _isSummary: true,
        ...keys,
      });
    };

    // 1. saleD별 그룹
    const groupedBySaleD = _.groupBy(rowData, 'saleD');
    Object.entries(groupedBySaleD).forEach(([saleD, groupD]) => {

      // 2. saleSequ별 그룹
      const groupedBySaleSequ = _.groupBy(groupD, 'saleSequ');
      Object.entries(groupedBySaleSequ).forEach(([saleSequ, groupSequ]) => {

        // 3. ioId별 그룹
        const groupedByIoId = _.groupBy(groupSequ, 'ioId');
        Object.entries(groupedByIoId).forEach(([ioId, groupIo]) => {
          result.push(...groupIo);

          const sumsIo = sumFields(groupIo);
          // ▶ 입고별 소계
          pushSummary('▶ 일/전표/입고별 소계', sumsIo, {
            saleD: groupIo[0].saleD,
            saleSequ: groupIo[0].saleSequ,
            ioId: groupIo[0].ioId,
            ioGbnNm: groupIo[0].ioGbnNm,
          });

          // 전체 합계 누적
          Object.keys(totalAll).forEach(key => totalAll[key] += sumsIo[key]);
        });

        // ▶ 전표별 소계
        const sumsSequ = sumFields(groupSequ);
        pushSummary('▶ 일/전표별 소계', sumsSequ, {
          saleD: groupSequ[0].saleD,
          saleSequ: groupSequ[0].saleSequ,
          ioId: '',
          ioGbnNm: '',
        });
      });

      // ▶ 일별 소계
      const sumsD = sumFields(groupD);
      pushSummary('▶ 일별 소계', sumsD, {
        saleD: groupD[0].saleD,
        saleSequ: '',
        ioId: '',
        ioGbnNm: '',
      });
    });

    // ▶ 전체 합계
    pushSummary('▶ 전체 합계', totalAll, { _isTotal: true });

    return result;
  }, []);

  // const summary = useCallback((rowData) => {
  //   if (!Array.isArray(rowData) || rowData.length === 0) return [];

  //   const result = [];

  //   // 누적 합계 객체 생성
  //   const totalAll = {
  //     saleQty: 0,
  //     saleAmt: 0,
  //     saleVat: 0,
  //     supplyAmt: 0,
  //     saleDan: 0,
  //     supplyDan: 0,
  //     orgSupplyDan: 0,
  //   };

  //   // 합계 계산 헬퍼
  //   const sumFields = (items) => ({
  //     saleQty: _.sumBy(items, 'saleQty') || 0,
  //     saleAmt: _.sumBy(items, 'saleAmt') || 0,
  //     saleVat: _.sumBy(items, 'saleVat') || 0,
  //     supplyAmt: _.sumBy(items, 'supplyAmt') || 0,
  //     saleDan: _.sumBy(items, 'saleDan') || 0,
  //     supplyDan: _.sumBy(items, 'supplyDan') || 0,
  //     orgSupplyDan: _.sumBy(items, 'orgSupplyDan') || 0,
  //   });

  //   // 그룹별 소계 추가 헬퍼
  //   const pushSummary = (base, name, sums, keys = {}) => {
  //     result.push({
  //       saleD: base.saleD || '',
  //       saleSequ: base.saleSequ || '',
  //       ioId: base.ioId || '',
  //       ioGbnNm: base.ioGbnNm || '',
  //       goodsId: '',
  //       goodsNm: name,
  //       saleQty: sums.saleQty,
  //       saleAmt: sums.saleAmt,
  //       saleVat: sums.saleVat,
  //       supplyAmt: sums.supplyAmt,
  //       saleDan: sums.saleDan,
  //       supplyDan: sums.supplyDan,
  //       orgSupplyDan: sums.orgSupplyDan,
  //       saleNo: '-',
  //       bigo: '',
  //       memo: '',
  //       _isSummary: true,
  //       ...keys, // _isTotal 같은 추가 플래그
  //     });
  //   };

  //   // 1. saleD별 그룹
  //   const groupedBySaleD = _.groupBy(rowData, 'saleD');
  //   Object.entries(groupedBySaleD).forEach(([saleD, groupD]) => {

  //     // 2. saleSequ별 그룹
  //     const groupedBySaleSequ = _.groupBy(groupD, 'saleSequ');
  //     Object.entries(groupedBySaleSequ).forEach(([saleSequ, groupSequ]) => {

  //       // 3. ioId별 그룹
  //       const groupedByIoId = _.groupBy(groupSequ, 'ioId');
  //       Object.entries(groupedByIoId).forEach(([ioId, groupIo]) => {
  //         result.push(...groupIo);

  //         const sumsIo = sumFields(groupIo);
  //         pushSummary(groupIo[0], '▶ 일/전표/입고별 소계', sumsIo);

  //         // 전체 합계에 누적
  //         Object.keys(totalAll).forEach(key => totalAll[key] += sumsIo[key]);
  //       });

  //       const sumsSequ = sumFields(groupSequ);
  //       pushSummary(groupSequ[0], '▶ 일/전표별 소계', sumsSequ);
  //     });

  //     const sumsD = sumFields(groupD);
  //     pushSummary(groupD[0], '▶ 일별 소계', sumsD);
  //   });

  //   // 전체 합계
  //   pushSummary({}, '▶ 전체 합계', totalAll, { _isTotal: true });

  //   return result;
  // }, []);

  // const summary = useCallback((rowData) => {
  //   if (!Array.isArray(rowData) || rowData.length === 0) return [];

  //   const result = [];
  //   let totalQtyAll = 0, totalAmtAll = 0, totalVatAll = 0, totalSupplyAmtAll = 0;

  //   // 1. saleD별 그룹
  //   const groupedBySaleD = _.groupBy(rowData, 'saleD');

  //   Object.entries(groupedBySaleD).forEach(([saleD, groupD]) => {
  //     let totalQtyD = 0, totalAmtD = 0, totalVatD = 0, totalSupplyAmtD = 0;

  //     // 2. saleD + saleSequ별 그룹
  //     const groupedBySaleSequ = _.groupBy(groupD, item => item.saleSequ);
  //     Object.entries(groupedBySaleSequ).forEach(([saleSequ, groupSequ]) => {
  //       let totalQtySequ = 0, totalAmtSequ = 0, totalVatSequ = 0, totalSupplyAmtSequ = 0;

  //       // 3. saleD + saleSequ + ioId별 그룹
  //       const groupedByIoId = _.groupBy(groupSequ, item => item.ioId);
  //       Object.entries(groupedByIoId).forEach(([ioId, groupIo]) => {
  //         result.push(...groupIo);

  //         const totalQty = _.sumBy(groupIo, 'saleQty') || 0;
  //         const totalAmt = _.sumBy(groupIo, 'saleAmt') || 0;
  //         const totalVat = _.sumBy(groupIo, 'saleVat') || 0;
  //         const totalSupplyAmt = _.sumBy(groupIo, 'supplyAmt') || 0;

  //         totalQtySequ += totalQty;
  //         totalAmtSequ += totalAmt;
  //         totalVatSequ += totalVat;
  //         totalSupplyAmtSequ += totalSupplyAmt;

  //         totalQtyD += totalQty;
  //         totalAmtD += totalAmt;
  //         totalVatD += totalVat;
  //         totalSupplyAmtD += totalSupplyAmt;

  //         totalQtyAll += totalQty;
  //         totalAmtAll += totalAmt;
  //         totalVatAll += totalVat;
  //         totalSupplyAmtAll += totalSupplyAmt;

  //         const base = groupIo[0];
  //         // saleD + saleSequ + ioId별 소계
  //         result.push({
  //           saleD: base.saleD,
  //           saleSequ: base.saleSequ,
  //           ioId: base.ioId,
  //           ioGbnNm: base.ioGbnNm,
  //           goodsId: '',
  //           goodsNm: '▶ 일/전표/입고별 소계',
  //           saleQty: totalQty,
  //           saleAmt: totalAmt,
  //           saleVat: totalVat,
  //           supplyAmt: totalSupplyAmt,
  //           saleNo: '-',
  //           saleDan: '',
  //           supplyDan: '',
  //           orgSupplyDan: '',
  //           bigo: '',
  //           memo: '',
  //           _isSummary: true,
  //         });
  //       });

  //       // saleD + saleSequ별 소계
  //       const baseSequ = groupSequ[0];
  //       result.push({
  //         saleD: baseSequ.saleD,
  //         saleSequ: baseSequ.saleSequ,
  //         ioId: '',
  //         ioGbnNm: '',
  //         goodsId: '',
  //         goodsNm: '▶ 일/전표별 소계 ',
  //         saleQty: totalQtySequ,
  //         saleAmt: totalAmtSequ,
  //         saleVat: totalVatSequ,
  //         supplyAmt: totalSupplyAmtSequ,
  //         saleNo: '-',
  //         saleDan: '',
  //         supplyDan: '',
  //         orgSupplyDan: '',
  //         bigo: '',
  //         memo: '',
  //         _isSummary: true,
  //       });
  //     });

  //     // saleD별 소계
  //     const baseD = groupD[0];
  //     result.push({
  //       saleD: baseD.saleD,
  //       saleSequ: '',
  //       ioId: '',
  //       ioGbnNm: '',
  //       goodsId: '',
  //       goodsNm: '▶ 일별 소계',
  //       saleQty: totalQtyD,
  //       saleAmt: totalAmtD,
  //       saleVat: totalVatD,
  //       supplyAmt: totalSupplyAmtD,
  //       saleNo: '',
  //       saleDan: '',
  //       supplyDan: '',
  //       orgSupplyDan: '',
  //       bigo: '',
  //       memo: '',
  //       _isSummary: true,
  //     });
  //   });

  //   // 전체 합계
  //   result.push({
  //     saleD: '',
  //     saleSequ: '',
  //     ioId: '',
  //     ioGbnNm: '',
  //     goodsId: '',
  //     goodsNm: '▶ 전체 합계',
  //     saleQty: totalQtyAll,
  //     saleAmt: totalAmtAll,
  //     saleVat: totalVatAll,
  //     supplyAmt: totalSupplyAmtAll,
  //     saleNo: '',
  //     saleDan: '',
  //     supplyDan: '',
  //     orgSupplyDan: '',
  //     bigo: '',
  //     memo: '',
  //     _isTotal: true,
  //   });

  //   return result;
  // }, []);

  // const summary = useCallback((rowData) => {
  //   if (!Array.isArray(rowData) || rowData.length === 0) return [];

  //   const grouped = _.groupBy(rowData, item => `${item.saleD}_${item.saleSequ}_${item.ioId}`);
  //   const result = [];

  //   let totalQtyAll = 0, totalAmtAll = 0, totalVatAll = 0, totalSupplyAmtAll = 0;

  //   Object.entries(grouped).forEach(([key, group]) => {
  //     result.push(...group);

  //     const totalQty = _.sumBy(group, 'saleQty') || 0;
  //     const totalAmt = _.sumBy(group, 'saleAmt') || 0;
  //     const totalVat = _.sumBy(group, 'saleVat') || 0;
  //     const totalSupplyAmt = _.sumBy(group, 'supplyAmt') || 0;

  //     totalQtyAll += totalQty;
  //     totalAmtAll += totalAmt;
  //     totalVatAll += totalVat;
  //     totalSupplyAmtAll += totalSupplyAmt;

  //     const base = group[0];
  //     result.push({
  //       saleD: base.saleD,
  //       saleSequ: base.saleSequ,
  //       ioId: base.ioId,
  //       ioGbnNm: base.ioGbnNm,
  //       goodsId: '',
  //       goodsNm: '▶ 소계',
  //       saleQty: totalQty,
  //       saleAmt: totalAmt,
  //       saleVat: totalVat,
  //       supplyAmt: totalSupplyAmt,
  //       saleNo: '',
  //       saleDan: '',
  //       supplyDan: '',
  //       orgSupplyDan: '',
  //       bigo: '',
  //       memo: '',
  //       _isSummary: true,
  //     });
  //   });

  //   // 전체 합계
  //   result.push({
  //     saleD: '',
  //     saleSequ: null,
  //     ioId: '',
  //     ioGbnNm: '',
  //     goodsId: '',
  //     goodsNm: '▶ 전체 합계',
  //     saleQty: totalQtyAll,
  //     saleAmt: totalAmtAll,
  //     saleVat: totalVatAll,
  //     supplyAmt: totalSupplyAmtAll,
  //     saleNo: '',
  //     saleDan: '',
  //     supplyDan: '',
  //     orgSupplyDan: '',
  //     bigo: '',
  //     memo: '',
  //     _isTotal: true,
  //   });

  //   return result;
  // }, []);

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
            rowByDisplayCnt={4}
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

export default React.memo(ShipInStatus);
