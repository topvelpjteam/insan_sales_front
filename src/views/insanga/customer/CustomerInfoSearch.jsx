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
import { formatDateToYYYYMMDD } from "@/system/utils/common";

// 상품검색 팝업
import GoodsSearch from "@/components/popup/GoodsSearch";
import GoodsSearchEvent from "@/components/popup/GoodsSearchEvent";

// 모달 프레임.
import FrameModal from "@/components/popup/FrameModal";

// agentId 셀렉터
import { getAgentId, getAgentData } from "@/system/store/redux/agent";
import { getStaffData } from "@/system/store/redux/staff";

// 유효성 체크를 위한 함수
import { numberFormatter, rateFormatter, addComma } from "@/system/utils/common";
/**
 * SalesStatus 컴포넌트
 */
const CustomerInfoSearch = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  const agentId = useSelector(getAgentId) || "";
  const agentData = useSelector(getAgentData);
  const staffData = useSelector(getStaffData);

  // 메세지 창 함수
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  // 그리드 데이터 변수
  const [rowData, setRowData] = useState([]);

  // 상품검색 팝업 선택 가능여부
  const [goodsIsDisabled, setGoodsIsDisabled] = useState(false);

  // 상품검색 팝업
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });
  const [goodGbn, setGoodGbn] = useState("F");

  // 조회 조건 생성 폼 (변경 없음)
  const SEARCH_FORM = [
    // {
    //   label: "검색기간",
    //   key: "sOpenD",
    //   type: "dateRange",
    //   startKey: "sOpenD",
    //   endKey: "eOpenD",
    //   defaultValue: {
    //     start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
    //     end: dayjs().add(0, "month").format("YYYY-MM-DD"),
    //   },
    // },
    { label: "매장코드(F)", key: "sAgent", type: "select", codeKey: "agentData", defaultValue: "" },
    { label: "매장코드(T)", key: "eAgent", type: "select", codeKey: "agentData", defaultValue: "" },
    { label: "브랜드코드(F)", key: "sBrand", type: "select", codeKey: "breandData", defaultValue: "" },
    { label: "브랜드코드(T)", key: "eBrand", type: "select", codeKey: "breandData", defaultValue: "" },
    {
      label: "판매일자",
      key: "sDate",
      type: "dateRange",
      startKey: "sDate",
      endKey: "eDate",
      defaultValue: {
        start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        end: dayjs().add(0, "month").format("YYYY-MM-DD"),
      },
    },
    {
      label: "판매금액",
      key: "sAmt",
      type: "numberRange",
      minKey: "sAmt",
      maxKey: "eAmt",
      defaultValue: { min: -999999999, max: 999999999 },
    },
    {
      label: "방문횟수",
      key: "sVisit",
      type: "numberRange",
      minKey: "sVisit",
      maxKey: "eVisit",
      defaultValue: { min: 0, max: 999 },
    },
    {
      label: "구매횟수",
      key: "sCnt",
      type: "numberRange",
      minKey: "sCnt",
      maxKey: "eCnt",
      defaultValue: { min: -999999999, max: 999999999 },
    },
    {
      label: "마일리지 년월",
      key: "mailYym",
      type: "yyyymm",
      defaultValue: dayjs().format("YYYY-MM"),
      callback: (value) => {
      }
    },
    {
      label: "잔여마일리지",
      key: "sMail",
      type: "numberRange",
      minKey: "sMail",
      maxKey: "eMail",
      defaultValue: { min: -99999, max: 999999999 },
    },
    { label: "대분류", key: "btypeList", type: "multiple", codeKey: "btypeData", defaultValue: "" },
    { label: "중분류", key: "mtypeList", type: "multiple", codeKey: "mtypeData", defaultValue: "" },
    { label: "소분류", key: "stypeList", type: "multiple", codeKey: "stypeData", defaultValue: "" },
    {
      label: "상품코드", key: "goodsList", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: (value) => {
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },
    { label: "판매사원", key: "staffId", type: "select", codeKey: "staffData", defaultValue: "" },
    { label: "담당사원", key: "mngStaff", type: "select", codeKey: "", defaultValue: "" },
    {
      label: "년령범위",
      key: "sAge",
      type: "numberRange",
      minKey: "sAge",
      maxKey: "eAge",
      defaultValue: { min: 0, max: 99 },
    },
    {
      label: "신규고객등록일",
      key: "sNcust",
      type: "dateRange",
      startKey: "sNcust",
      endKey: "eNcust",
      defaultValue: {
        start: dayjs().subtract(240, "month").format("YYYY-MM-DD"),
        end: dayjs().add(0, "month").format("YYYY-MM-DD"),
      },
    },
    { label: "고객구분", key: "custgbnList", type: "select", codeKey: "custGbnData", defaultValue: "1" },
    { label: "주소", key: "addr", type: "input", codeKey: "", defaultValue: "" },
    { label: "DM수신", key: "dmChk", type: "select", codeKey: "yesOrNoData", defaultValue: "" },
    { label: "SMS수신", key: "smsChk", type: "select", codeKey: "yesOrNoData", defaultValue: "" },
    { label: "E-MAIL수신", key: "emailChk", type: "select", codeKey: "yesOrNoData", defaultValue: "" },
    // {
    //   label: "생일",
    //   key: "sOpenD2",
    //   type: "day",
    //   defaultValue: dayjs().format("MM-DD"),
    //   callback: (value) => {
    //   }
    // },
    // {
    //   label: "나이",
    //   key: "age111",
    //   type: "number",
    //   defaultValue: 20,
    //   isEnterEvent: true,
    // },
    // {
    //   label: "년령범위",
    //   key: "sAge",
    //   type: "dayRange",
    //   startKey: "sAge",
    //   endKey: "eAge",
    //   defaultValue: {
    //     start: dayjs().subtract(1, "month").format("MM-DD"),
    //     end: dayjs().add(0, "month").format("MM-DD"),
    //   },
    // },
  ];

  // 공통 코드 설정
  // const CODE_GROUPS = [
  //   { key: "btypeData", codeGroupCode: "S05" },
  //   { key: "mtypeData", codeGroupCode: "S07" },
  //   { key: "stypeData", codeGroupCode: "S08" },
  //   { key: "custGbnData", codeGroupCode: "S37" },
  //   { key: "agentData", codeGroupCode: "" },
  //   { key: "yesOrNoData", codeGroupCode: "" },
  //   { key: "breandData", codeGroupCode: "" },
  //   { key: "staffData", codeGroupCode: "" },
  // ];
  // -----------------------------
  // CODE_GROUPS를 useState로 선언
  // -----------------------------
  const [codeGroups, setCodeGroups] = useState([
    { key: "btypeData", codeGroupCode: "S05" },
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "stypeData", codeGroupCode: "S08" },
    { key: "custGbnData", codeGroupCode: "S37" },
    { key: "agentData", codeGroupCode: "" },
    { key: "yesOrNoData", codeGroupCode: "" },
    { key: "breandData", codeGroupCode: "" },
    { key: "staffData", codeGroupCode: "" },
  ]);

  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '매장명',
      field: 'agentNm',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      spanRows: true,
      flex: 3,
    },
    {
      headerName: '고객코드',
      field: 'custId',
      width: 170,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: true,
      flex: 2,
    },
    {
      headerName: '고객명',
      field: 'custNm',
      width: 120,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
    {
      headerName: '담당사원',
      field: 'mngStaff',
      width: 120,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
    {
      headerName: '고객구분',
      field: 'custGbnNm',
      width: 170,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
    {
      headerName: '전화번호',
      field: 'custTel',
      width: 120,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
    {
      headerName: "금액",
      field: "amt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '등록일자',
      field: 'custOpenD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.custOpenD || params.data.custOpenD;
        const formatted = formatDateToYYYYMMDD(openDateValue);
        // console.log('🔍 그리드 거래시작일자 포맷팅:', {
        //   원본값: openDateValue,
        //   원본타입: typeof openDateValue,
        //   변환값: formatted,
        //   전체데이터: params.data
        // });
        return formatted;
      }
    },
    {
      headerName: '최종구매일자',
      field: 'lastSaleD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.lastSaleD || params.data.lastSaleD;
        const formatted = formatDateToYYYYMMDD(openDateValue);
        // console.log('🔍 그리드 거래시작일자 포맷팅:', {
        //   원본값: openDateValue,
        //   원본타입: typeof openDateValue,
        //   변환값: formatted,
        //   전체데이터: params.data
        // });
        return formatted;
      }
    },
    {
      headerName: '최종방문일자',
      field: 'lastVisitD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.lastVisitD || params.data.lastVisitD;
        const formatted = formatDateToYYYYMMDD(openDateValue);
        // console.log('🔍 그리드 거래시작일자 포맷팅:', {
        //   원본값: openDateValue,
        //   원본타입: typeof openDateValue,
        //   변환값: formatted,
        //   전체데이터: params.data
        // });
        return formatted;
      }
    },
    {
      headerName: '생년월일',
      field: 'custBirthD',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.custBirthD || params.data.custBirthD;
        const formatted = formatDateToYYYYMMDD(openDateValue);
        // console.log('🔍 그리드 거래시작일자 포맷팅:', {
        //   원본값: openDateValue,
        //   원본타입: typeof openDateValue,
        //   변환값: formatted,
        //   전체데이터: params.data
        // });
        return formatted;
      }
    },
    {
      headerName: "방문횟수",
      field: "visitCnt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "구매횟수",
      field: "saleCnt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "발생마일리지",
      field: "prdP",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "잔여마일리지",
      field: "janP",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: 'SMS 수신',
      field: 'smsChk',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 2,
    },
  ]);

  const [filters, setFilters] = useState(
    SEARCH_FORM.reduce((acc, cur) => {
      switch (cur.type) {
        case "dateRange":
        case "dayRange":
          acc[cur.startKey] = cur.defaultValue?.start || "";
          acc[cur.endKey] = cur.defaultValue?.end || "";
          break;
        case "numberRange":
          //console.log('acc,', cur.defaultValue.min, cur.defaultValue.max);
          acc[cur.minKey] =
            cur.defaultValue?.min !== undefined && !isNaN(cur.defaultValue.min)
              ? Number(cur.defaultValue.min)
              : "";
          acc[cur.maxKey] =
            cur.defaultValue?.max !== undefined && !isNaN(cur.defaultValue.max)
              ? Number(cur.defaultValue.max)
              : "";
          break;
        // case "number":
        //   acc[cur.key] =
        //     cur.defaultValue !== undefined && !isNaN(cur.defaultValue)
        //       ? Number(cur.defaultValue)
        //       : "";
        //   break;
        default:
          acc[cur.key] = cur.defaultValue ?? "";
      }
      return acc;
    }, {})
  );
  // 공통코드 사용 변수
  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // layout 훅 사용
  const {
    sidebarOpen,
    leftWidth,
    centerWidth,
    toggleSidebar,
  } = useLayoutWidths(true, 30, false, 0);

  // 조회조건 변경 시 filters에 반영하기 위한 함수.
  const handleFilterChange = useCallback((key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value })), []);


  // -----------------------------
  // 조회버튼 클릭시 실행 함수.
  // -----------------------------
  const fetchData = useCallback(
    async (action = "selectSk003List") => {
      try {
        // if (_.isEmpty(agentId)) {
        //   showMessageModal({
        //     title: "알림",
        //     content: "매장코드를 선택 하세요.",
        //     onCallback: () => { }
        //   });
        //   return;
        // }
        showLoading();
        const payload = {
          action,
          payload: {
            sAgent: filters.sAgent || '0',
            eAgent: filters.eAgent || 'ZZZ',
            sBrand: filters.sCustGbn || 'AB',
            eBrand: filters.eCustGbn || 'ZZZ',
            sDate: (filters.sDate ? filters.sDate.replace(/-/g, '') : '') || '',
            eDate: (filters.eDate ? filters.eDate.replace(/-/g, '') : '') || '',
            sAmt: filters.sAmt || '-999999999',
            eAmt: filters.eAmt || '999999999',
            sVisit: filters.sVisit || '0',
            eVisit: filters.eVisit || '999',
            sCnt: filters.sCnt || '0',
            eCnt: filters.eCnt || '99',
            mailYym: (filters.mailYym ? filters.mailYym.replace(/-/g, '') : '') || '',
            //eBirthM: (filters.eBirthM ? filters.eBirthM.replace(/-/g, '') : '') || '',
            sMail: filters.sMail || '-99999',
            eMail: filters.eMail || '999999999',
            btypeList: Array.isArray(filters.btypeList) ? filters.btypeList.join(',') : (filters.btypeList || ''),
            mtypeList: Array.isArray(filters.mtypeList) ? filters.mtypeList.join(',') : (filters.mtypeList || ''),
            stypeList: Array.isArray(filters.stypeList) ? filters.stypeList.join(',') : (filters.stypeList || ''),
            goodsList: Array.isArray(filters.goodsList) ? filters.goodsList.join(',') : (filters.goodsList || ''),

            staffId: filters.staffId || '',
            mngStaff: filters.mngStaff || '',
            sAge: filters.sAge || '0',
            eAge: filters.eAge || '99',

            sNcust: (filters.sNcust ? filters.sNcust.replace(/-/g, '') : '') || '',
            eNcust: (filters.eNcust ? filters.eNcust.replace(/-/g, '') : '') || '',

            custgbnList: Array.isArray(filters.custgbnList) ? filters.custgbnList.join(',') : (filters.custgbnList || ''),

            addr: filters.addr || '',
            dmChk: filters.dmChk || '',
            smsChk: filters.smsChk || '',
            emailChk: filters.emailChk || '',
            currYear: '',
            userId: 'ADMIN' // user?.emplNo || 
          },
        };

        const res = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body = res?.data?.body;
        //setRowData(setGroupData(body || []));
        setRowData(body || []);
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    // 의존성: filters, request, agentId, user
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );

  const setGroupData = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const result = [];

    let globalQty = 0;   // 전체 누적
    let globalAmt = 0;

    // ---------------------------
    // 전체 중복 제거 고객수 계산
    // ---------------------------
    const uniqueCustCount = _.uniqBy(rows, "custId").length;

    // 1) agentId 기준 1차 그룹
    const groupedAgent = _.groupBy(rows, (r) => r.agentId);

    Object.keys(groupedAgent).forEach((agentId) => {

      let agentQty = 0;   // agentId 소계 누적
      let agentAmt = 0;

      // 2) agentId 내부에서 custId 기준 2차 그룹
      const groupedCust = _.groupBy(groupedAgent[agentId], (r) => r.custId);

      Object.keys(groupedCust).forEach((custId) => {

        let custQty = 0;   // custId 소계 누적
        let custAmt = 0;

        // 2-1) 실제 데이터 push
        groupedCust[custId].forEach((item) => {
          const saleQty = Number(item.saleQty || 0);
          const saleAmt = Number(item.saleAmt || 0);

          custQty += saleQty;
          custAmt += saleAmt;

          agentQty += saleQty;
          agentAmt += saleAmt;

          globalQty += saleQty;
          globalAmt += saleAmt;

          result.push({
            ...item,
            isSummary: false,
            isTotal: false,
          });
        });

        // 2-2) agentId + custId 소계
        result.push({
          agentNm: "[고객 소계]",
          custId: "",
          custNm: "",
          saleD: "",
          saleQty: custQty,
          saleAmt: custAmt,
          isSummary: true,
          isTotal: false,
        });
      });

      // 3) agentId 소계
      result.push({
        agentNm: "[매장 소계]",
        custId: "",
        custNm: "",
        saleD: "",
        saleQty: agentQty,
        saleAmt: agentAmt,
        isSummary: true,
        isTotal: false,
      });
    });

    // 4) 전체 총계
    result.push({
      agentNm: "[총 계]",
      custId: "[총 고객수] " + uniqueCustCount + "명",
      custNm: "",
      saleD: "",
      saleQty: globalQty,
      saleAmt: globalAmt,
      isSummary: false,
      isTotal: true,
    });

    return result;
  };

  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  // -----------------------------
  // 그리드 더블 클릭 (현재 빈 상태, 확장 가능)
  // -----------------------------  
  const handleRowDoubleClick = useCallback(({ data }) => {
    // 예: 상세 모달 호출 등 확장 가능
    // showPopupModal({ title: '상세', content: <Detail data={data} /> })
    //console.log('double clicked row:', data);
  }, []);

  // 상품 모달 창 닫기
  const handleGoodsSearchClose = useCallback(() => {
    setGoodsSearchModal({ visible: false, id: '', row: {} });
  }, []);

  // 상품 선택 시
  const handleGoodsSelected = useCallback((rows) => {
    const list = rows
      .map(item => item.goodsId)
      .filter(v => v)
      .join(",");
    setFilters(prev => ({
      ...prev,
      goodsList: list
    }));

    handleGoodsSearchClose();
  }, [goodGbn, handleGoodsSearchClose]);

  // --------------------------------------------------------
  // 메인 페이지 초기 로딩 - 코드 조회 등 기타 필요 작업 수행.
  // --------------------------------------------------------
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          codeGroups.map(async ({ key, codeGroupCode }) => {
            let res = await request(
              "domain/insanga/store/system",
              { action: "selectCode", payload: { codeGroupCode } },
              {},
              "post"
            );
            let values = [];
            if (key === "sioIdData" || key === "eioIdData") {
              values = [key, (Array.isArray(res?.data?.body) ? res.data.body : []).filter(item => /^[247]/.test(item.code))];
            } else {
              values = [key, (Array.isArray(res?.data?.body) ? res.data.body : [])];
            }
            return values;
          })
        );

        if (codeGroups.some(col => col.key === "agentData")) {
          const newAgentData = agentData.map(item => ({
            code: item.agentId,
            codeNm: item.agentNm,
          }));
          results.push(["agentData", newAgentData]);
        }

        if (codeGroups.some(col => col.key === "staffData")) {
          const newStaffData = staffData.map(item => ({
            code: item.staffId,
            codeNm: item.staffNm,
          }));
          results.push(["staffData", newStaffData]);
        }

        const yesOrNoData = [
          { code: "Y", codeNm: "Yes" },
          { code: "N", codeNm: "No" },
        ];

        // ✅ codeGroups 안에 setData가 포함되어 있다면 결과에 추가
        if (codeGroups.some(col => col.key === "yesOrNoData")) {
          results.push(["yesOrNoData", yesOrNoData]);
        }

        const breandData = [
          { code: "AB", codeNm: "AB" },
          { code: "ZZ", codeNm: "기타" },
        ];

        // ✅ codeGroups 안에 setData가 포함되어 있다면 결과에 추가
        if (codeGroups.some(col => col.key === "breandData")) {
          results.push(["breandData", breandData]);
        }

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);

      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();

  }, [request]); // handleSetHeader 의존 추가

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

    // setSearchForm(prev => prev.map(item => item.key === "staffId" ? {
    //   ...item,
    //   codeKey: "staffData",
    //   defaultValue: "",
    // } : item));

    // const first = staffData[0]?.staffId || "";
    // const last = staffData[staffData.length - 1]?.staffId || "";
    // //console.log(first, last);
    // setFilters(prev => ({
    //   ...prev,
    //   sStaffId: first,
    //   eStaffId: last,
    // }));
  }, [staffData]);


  // const applyDefaultStaffRange = (stData) => {
  //   if (!stData || stData.length === 0) return;

  //   const first = stData[0]?.code || "";
  //   const last = stData[stData.length - 1]?.code || "";

  //   // filters 업데이트
  //   setFilters(prev => ({
  //     ...prev,
  //     sStaffId: first,
  //     eStaffId: last,
  //   }));
  // };

  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      <div className="content-main-area">

        <div className="content-center-panel" style={{ width: `100%` }}>
          {/* 좌측 조회조건 영역 - 자동 생성 */}
          <LeftPanel
            codes={codes}
            filters={filters}
            handleFilterChange={handleFilterChange}
            searchForm={SEARCH_FORM}
            buttons={[
              { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
            ]}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            leftWidth={leftWidth}
            rowByDisplayCnt={4}
            title={`고객 정보 조회`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">고객 정보 조회</div> */}
          <div className="ag-theme-alpine content-panel-grid">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnGroups}
              // defaultColGroupDef={{
              //   headerClass: 'ag-center-header', // 선택사항: 모든 그룹 헤더 중앙
              // }}
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

          {/* 상품검색 모달 */}
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

export default React.memo(CustomerInfoSearch);
