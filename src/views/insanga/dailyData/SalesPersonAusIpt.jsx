/*********************************************************************
 * - 메뉴 : 매장관리 -> 일간자료 -> 판매사원별 AUS ~ IPT
 * - 파일명 : SalesPersonAusIpt.jsx
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
 * SalesStatus 컴포넌트
 */
const SalesPersonAusIpt = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  //const agentId = useSelector(getAgentId) || "";

  const agentData = useSelector(getAgentData);

  // 메세지 창 함수
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  // 그리드 데이터 변수
  const [rowData, setRowData] = useState([]);

  // 상품검색 팝업 선택 가능여부
  const [goodsIsDisabled, setGoodsIsDisabled] = useState(false);

  // 프로모션 상품검색 팝업 가능여부
  const [eventIsDisabled, setEventIsDisabled] = useState(true);

  // 상품검색 팝업
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });

  // 조회 조건 생성 폼 (변경 없음)
  const SEARCH_FORM = [
    {
      label: "조회일자",
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
    { label: "매장코드(F)", key: "sAgent", type: "select", codeKey: "agentData", defaultValue: "1" },
    { label: "매장코드(T)", key: "eAgent", type: "select", codeKey: "agentData", defaultValue: "Z" },
    { label: "대분류", key: "btypeList", type: "multiple", codeKey: "btypeData" },
    { label: "중분류", key: "mtypeList", type: "multiple", codeKey: "mtypeData" },
    { label: "소분류", key: "stypeList", type: "multiple", codeKey: "stypeData" },

    {
      label: "상품코드", key: "goodsList", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: (value) => {
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },
    { label: "매출구분", key: "saleGbn", type: "radio", codeKey: "saleGbnData", defaultValue: "OFF" },
  ];

  // 공통 코드 설정
  const CODE_GROUPS = [
    { key: "btypeData", codeGroupCode: "S05" },
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "stypeData", codeGroupCode: "S08" },
    { key: "saleGbnData", codeGroupCode: "" },
    { key: "agentData", codeGroupCode: "" },
  ];

  // 그리드 컬럼 설정 (기존 컬럼 유지)
  const COLUMN_GROUPS = useMemo(() => ([
    gridNoColumn(),
    {
      headerName: '매장명',
      field: 'storeNm',
      width: 150,
      minWidth: 80,
      sortable: false,
      filter: false,
    },
    {
      headerName: '사원명',
      field: 'staffNm',
      width: 100,
      minWidth: 80,
      sortable: false,
      filter: false,
    },
    {
      headerName: '신규고객', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      // headerStyle: {
      //   justifyContent: 'center',   // ✅ 수평 중앙정렬
      //   textAlign: 'center',        // ✅ 텍스트 중앙정렬
      //   display: 'flex',            // ✅ flex로 중앙 배치 가능
      //   alignItems: 'center',       // ✅ 수직 중앙정렬
      // },
      children: [
        { headerName: "고객수", field: "newCustCnt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "비율", field: "newCustRate", valueFormatter: rateFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출금액", field: "newSaleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출수량", field: "newSaleAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "AUS", field: "newAus", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "IPT", field: "newIpt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '재방문고객', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      // headerStyle: {
      //   justifyContent: 'center',   // ✅ 수평 중앙정렬
      //   textAlign: 'center',        // ✅ 텍스트 중앙정렬
      //   display: 'flex',            // ✅ flex로 중앙 배치 가능
      //   alignItems: 'center',       // ✅ 수직 중앙정렬
      // },
      children: [
        { headerName: "고객수", field: "reCustCnt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "비율", field: "reCustRate", valueFormatter: rateFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출금액", field: "reSaleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출수량", field: "reSaleAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "AUS", field: "reAus", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "IPT", field: "reIpt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: '프리고객', // ✅ 2단 헤더 그룹
      //marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      // headerStyle: {
      //   justifyContent: 'center',   // ✅ 수평 중앙정렬
      //   textAlign: 'center',        // ✅ 텍스트 중앙정렬
      //   display: 'flex',            // ✅ flex로 중앙 배치 가능
      //   alignItems: 'center',       // ✅ 수직 중앙정렬
      // },
      children: [
        { headerName: "고객수", field: "freeCustCnt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "비율", field: "freeCustRate", valueFormatter: rateFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출금액", field: "freeSaleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출수량", field: "freeSaleAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "AUS", field: "freeAus", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "IPT", field: "freeIpt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
    {
      headerName: 'Total', // ✅ 2단 헤더 그룹
      marryChildren: true,     // 상단 그룹 고정 옵션
      headerClass: 'ag-header-group-center',
      // headerStyle: {
      //   justifyContent: 'center',   // ✅ 수평 중앙정렬
      //   textAlign: 'center',        // ✅ 텍스트 중앙정렬
      //   display: 'flex',            // ✅ flex로 중앙 배치 가능
      //   alignItems: 'center',       // ✅ 수직 중앙정렬
      // },
      children: [
        { headerName: "고객수", field: "totCustCnt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "비율", field: "totCustRate", valueFormatter: rateFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출금액", field: "totSaleQty", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "매출수량", field: "totSaleAmt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "AUS", field: "totAus", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
        { headerName: "IPT", field: "totIpt", valueFormatter: numberFormatter, cellClass: 'text-right', width: 80, minWidth: 80, sortable: false, filter: false },
      ],
    },
  ]), []);

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
    async (action = "selectSk407List") => {
      try {
        showLoading();
        const payload = {
          action,
          payload: {
            // 운영시에는 반드시 agentId 사용.
            // 개발용 하드코딩('5')은 위험하므로 제거했습니다.
            sDate: filters.sDateFrom.replace(/-/g, '') || '',
            eDate: filters.sDateTo.replace(/-/g, '') || '',
            sAgent: filters.sAgent || '',
            eAgent: filters.eAgent || '',
            btypeList: Array.isArray(filters.btypeList) ? filters.btypeList.join(',') : (filters.btypeList || ''),
            mtypeList: Array.isArray(filters.mtypeList) ? filters.mtypeList.join(',') : (filters.mtypeList || ''),
            stypeList: Array.isArray(filters.stypeList) ? filters.stypeList.join(',') : (filters.stypeList || ''),
            goodsList: Array.isArray(filters.goodsList) ? filters.goodsList.join(',') : (filters.goodsList || ''),
            saleGbn: filters.saleGbn,
            userId: 'ADMIN', // user?.emplNo || ''
          },
        };

        const res = await request("domain/insanga/store/daily", payload, {}, "post", 'json');
        const body = res?.data?.body;
        setRowData(body || []);
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    // 의존성: filters, request, agentId, user
    [filters, request, user?.emplNo, showLoading, hideLoading, showMessageModal]
  );

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
      sGoods: list
    }));
    handleGoodsSearchClose();
  }, [handleGoodsSearchClose]); // 변경 될때 반영 처리 filters

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

        const saleGbnData = [
          { code: "OFF", codeNm: "매장" },
          { code: "ON", codeNm: "온라인" },
          { code: "TOT", codeNm: "합계" },
        ];
        if (CODE_GROUPS.some(col => col.key === "saleGbnData")) {
          results.push(["saleGbnData", saleGbnData]);
        }

        // const saleData = [
        //   { code: "G", codeNm: "상품" },
        //   { code: "P", codeNm: "프로모션" },
        // ];
        // if (CODE_GROUPS.some(col => col.key === "saleData")) {
        //   results.push(["saleData", saleData]);
        // }


        //agentData
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

  // -----------------------------
  // 그리드내의 No.컬럼 추가 설정.
  // -----------------------------
  const columnDefs = useMemo(() => {
    const hasNoColumn = COLUMN_GROUPS.some(col => col.headerName === 'No.');
    if (hasNoColumn) {
      return COLUMN_GROUPS;
    }
    const newColumnDefs = [...COLUMN_GROUPS];
    newColumnDefs.splice(1, 0, gridNoColumn());
    return newColumnDefs;
  }, [COLUMN_GROUPS]);

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
            title={`판매 사원별 AUS ~ IPT`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">판매 사원별 AUS ~ IPT</div> */}
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

export default React.memo(SalesPersonAusIpt);
