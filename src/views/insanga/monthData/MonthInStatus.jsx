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
import { getAgentId } from "@/system/store/redux/agent";

// 유효성 체크를 위한 함수
import { numberFormatter, rateFormatter, addComma } from "@/system/utils/common";
/**
 * SalesStatus 컴포넌트
 */
const MonthInStatus = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  const agentId = useSelector(getAgentId) || "";

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
    {
      label: "검색년월",
      key: "stockYm",
      type: "yyyymm",
      codeKey: "",
      defaultValue: dayjs().format("YYYY-MM"),
      callback: (value) => {
      }
    },
    { label: "상품구분(F)", key: "sgGbn", type: "select", codeKey: "saleGbnData", defaultValue: "1" },
    { label: "상품구분(T)", key: "egGbn", type: "select", codeKey: "saleGbnData", defaultValue: "Z" },
    { label: "대분류", key: "btypeList", type: "multiple", codeKey: "btypeData", defaultValue: "" },
    { label: "중분류", key: "mtypeList", type: "multiple", codeKey: "mtypeData", defaultValue: "" },
    { label: "소분류", key: "stypeList", type: "multiple", codeKey: "stypeData", defaultValue: "" },
    {
      label: "상품코드", key: "goodsList", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: (value) => {
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },
    { label: "실적없는 상품 제외", key: "zeroYn", type: "check", codeKey: "checkData", defaultValue: "" },
  ];

  // 공통 코드 설정
  const CODE_GROUPS = [
    { key: "btypeData", codeGroupCode: "S05" },
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "stypeData", codeGroupCode: "S08" },
    { key: "saleGbnData", codeGroupCode: "S03" },
    { key: "checkData", codeGroupCode: "" },
  ];

  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '구분',
      field: 'goodsGbn',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false
    },
    {
      headerName: '중분류명',
      field: 'mtypeGbnNm',
      width: 200,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false
    },
    {
      headerName: '상품코드',
      field: 'goodsId',
      width: 170,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
    },
    {
      headerName: '상품명',
      field: 'goodsNm',
      width: 250,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
    },
    { headerName: '소비자가', field: 'danga', width: 100, valueFormatter: numberFormatter, cellClass: 'text-right' },
    {
      headerName: '전월재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "bstockQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "bstockQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '당월매입', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "ibgoQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "ibgoQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '기타매입', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "gibgoQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "gibgoQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '입고계', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "inQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "inQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '당월판매', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "saleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "saleQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '반품', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "backQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "backQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '판촉', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "panQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "panQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '테스터', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "testerQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "testerQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '기타출고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "gsaleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "gsaleQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '출고계', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "outQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "outQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
    {
      headerName: '당월재고', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      children: [
        { headerName: "수량", field: "nstockQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
        { headerName: "금액", field: "nstockQtyAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 120, minWidth: 120, sortable: false, filter: false },
      ],
    },
  ]);

  // 조회 조건 필터 초기화
  const [filters, setFilters] = useState(SEARCH_FORM.reduce((acc, cur) => {
    acc[cur.key] = ""; // 기본값을 모두 빈 문자열로
    // dateRange의 경우 start/end 키도 초기화
    if (cur.type === "dateRange") {
      acc[cur.startKey] = cur.defaultValue?.start || "";
      acc[cur.endKey] = cur.defaultValue?.end || "";
    }
    return acc;
  }, {}));

  // 공통코드 사용 변수
  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
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
    async (action = "selectSd302PxList") => {
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
            // 운영시에는 반드시 agentId 사용.
            // 개발용 하드코딩('5')은 위험하므로 제거했습니다.
            stockYm: (filters.stockYm ? filters.stockYm.replace(/-/g, '') : '') || '',
            sgGbn: filters.sgGbn || '0',
            egGbn: filters.egGbn || 'Z',
            btypeList: Array.isArray(filters.btypeList) ? filters.btypeList.join(',') : (filters.btypeList || ''),
            mtypeList: Array.isArray(filters.mtypeList) ? filters.mtypeList.join(',') : (filters.mtypeList || ''),
            stypeList: Array.isArray(filters.stypeList) ? filters.stypeList.join(',') : (filters.stypeList || ''),
            goodsList: Array.isArray(filters.goodsList) ? filters.goodsList.join(',') : (filters.goodsList || ''),
            zeroYn: filters.zeroYn || 'N',
            agentId: agentId, // user?.emplNo || ''
          },
        };

        const res = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body = res?.data?.body;
        setRowData(setGroupData(body || []));
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
    if (!rows || rows.length === 0) return [];

    const total = {}; // 최종 총합계
    const addTotal = (key, val) => {
      if (!total[key]) total[key] = 0;
      total[key] += Number(val) || 0;
    };

    const addGroup = (group, key, val) => {
      if (!group[key]) group[key] = 0;
      group[key] += Number(val) || 0;
    };

    const result = [];

    let curGoodsGbn = null;
    let goodsSum = null;

    let curMtype = null;
    let mtypeSum = null;

    rows.forEach((row, idx) => {
      const danga = Number(row.danga) || 0;
      const newRow = { ...row };

      // ----------------------------------------
      // goodsGbn이 바뀌면 기존 goodsGbn 소계 출력
      // ----------------------------------------
      if (curGoodsGbn !== row.goodsGbn) {
        // 기존 goodsGbn 소계 출력
        if (curGoodsGbn !== null) {
          // 먼저 mtypeGbn 소계 출력
          result.push({
            ...mtypeSum,
            mtypeGbnNm: `( ${mtypeSum.mtypeGbnNm} 소계 )`,
            isSummary: true
          });

          // goodsGbn 소계 출력
          result.push({
            ...goodsSum,
            goodsGbnNm: `( ${goodsSum.goodsGbnNm} 소계 )`,
            isSummary: true
          });
        }

        // 새로운 goodsGbn 시작
        curGoodsGbn = row.goodsGbn;
        goodsSum = {
          goodsGbn: row.goodsGbn,
          goodsGbnNm: row.goodsGbnNm
        };

        // mtypeGbn 새로 초기화
        curMtype = null;
        mtypeSum = null;
      }

      // ----------------------------------------
      // mtypeGbn이 바뀌면 기존 중분류 소계 출력
      // ----------------------------------------
      if (curMtype !== row.mtypeGbn) {
        if (curMtype !== null) {
          // 이전 중분류 소계
          result.push({
            ...mtypeSum,
            mtypeGbnNm: `( ${mtypeSum.mtypeGbnNm} 소계 )`,
            isSummary: true,
          });
        }

        curMtype = row.mtypeGbn;
        mtypeSum = {
          mtypeGbn: row.mtypeGbn,
          mtypeGbnNm: row.mtypeGbnNm
        };
      }

      // ----------------------------------------
      // ① QtyAmt 계산
      // ----------------------------------------
      Object.keys(row).forEach((key) => {
        if (key.endsWith("Qty")) {
          const qty = Number(row[key]) || 0;
          const amtKey = key.replace(/Qty$/, "QtyAmt");

          newRow[amtKey] = qty * danga;

          addTotal(key, qty);
          addTotal(amtKey, qty * danga);

          addGroup(goodsSum, key, qty);
          addGroup(goodsSum, amtKey, qty * danga);

          addGroup(mtypeSum, key, qty);
          addGroup(mtypeSum, amtKey, qty * danga);
        }
      });

      // ----------------------------------------
      // ② inQty
      // ----------------------------------------
      const inQty =
        (Number(row.ibgoQty) || 0) +
        (Number(row.gibgoQty) || 0);

      newRow.inQty = inQty;
      newRow.inQtyAmt = inQty * danga;

      ["inQty", "inQtyAmt"].forEach(k => {
        const v = k === "inQty" ? inQty : inQty * danga;
        addTotal(k, v);
        addGroup(goodsSum, k, v);
        addGroup(mtypeSum, k, v);
      });

      // ----------------------------------------
      // ③ outQty
      // ----------------------------------------
      const outQty =
        (Number(row.saleQty) || 0) +
        (Number(row.panQty) || 0) +
        (Number(row.gsaleQty) || 0) +
        (Number(row.backQty) || 0) +
        (Number(row.testerQty) || 0);

      newRow.outQty = outQty;
      newRow.outQtyAmt = outQty * danga;

      ["outQty", "outQtyAmt"].forEach(k => {
        const v = k === "outQty" ? outQty : outQty * danga;
        addTotal(k, v);
        addGroup(goodsSum, k, v);
        addGroup(mtypeSum, k, v);
      });

      result.push(newRow);

      const isLast = idx === rows.length - 1;
      if (isLast) {
        // 마지막 mtypeGbn 소계
        result.push({
          ...mtypeSum,
          mtypeGbnNm: `( ${mtypeSum.mtypeGbnNm} 소계 )`,
          isSummary: true,
        });

        // 마지막 goodsGbn 소계
        result.push({
          ...goodsSum,
          goodsGbnNm: `( ${goodsSum.goodsGbnNm} 소계 )`,
          isSummary: true,
        });
      }
    });

    // ----------------------------------------
    // 전체 총합계
    // ----------------------------------------
    total.mtypeGbnNm = "( 총 합계 )";
    total.isSummary = true;
    result.push(total);

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
          CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
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

        // ✅ vatData 직접 생성
        const checkData = [
          { code: "Y", codeNm: "제외" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "checkData")) {
          results.push(["checkData", checkData]);
        }

        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();

  }, [request]); // handleSetHeader 의존 추가

  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      <div className="content-main-area">
        {/* 좌측 조회조건 영역 - 자동 생성 */}


        <div className="content-center-panel" style={{ width: "100%" }}>
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
            title={"월간 수불 현황"}
          />
          {/* <div className="content-panel-title content-panel-title-bg">월간 수불 현황</div> */}
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
                if (params.data?.isTotal) return 'pan-summary-row';
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

export default React.memo(MonthInStatus);
