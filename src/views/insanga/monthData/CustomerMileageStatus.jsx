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

// 유효성 체크를 위한 함수
import { numberFormatter, rateFormatter, addComma } from "@/system/utils/common";
/**
 * SalesStatus 컴포넌트
 */
const CustomerMileageStatus = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  const agentId = useSelector(getAgentId) || "";
  //const agentData = useSelector(getAgentData);

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
      key: "saleYymm",
      type: "yyyymm",
      defaultValue: dayjs().format("YYYY-MM"),
      callback: (value) => {
      }
    },
    { label: "고객코드(F)", key: "sCustGbn", type: "select", codeKey: "custGbnData", defaultValue: "1" },
    { label: "고객코드(T)", key: "eCustGbn", type: "select", codeKey: "custGbnData", defaultValue: "Z" },
    { label: "대상고객(F)", key: "sCustId", type: "input", codeKey: "", defaultValue: "0" },
    { label: "대상고객(T)", key: "eCustId", type: "input", codeKey: "", defaultValue: "ZZZZZZZZZZ" },
    { label: "마일리지점수(F)", key: "sMail", type: "input", codeKey: "", defaultValue: "0" },
    { label: "마일리지점수(T)", key: "eMail", type: "input", codeKey: "", defaultValue: "9999999" },

  ];

  // 공통 코드 설정
  const CODE_GROUPS = [
    { key: "custGbnData", codeGroupCode: "S37" },
  ];

  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '고객구분',
      field: 'custGbnNm',
      width: 120,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: true,
      flex: 1,
    },
    {
      headerName: '고객코드',
      field: 'custId',
      width: 150,
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
      spanRows: true,
      flex: 2,
    },
    {
      headerName: '당월발생\n마일리지',
      field: "mailPrdP",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "당월지급\n마일리지",
      field: "mailUseP",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '누적발생\n마일리지',
      field: "nmailPrdP",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "누적지급\n마일리지",
      field: "nmailUseP",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "잔여\n마일리지",
      field: "mail",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
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
    async (action = "selectSd315List") => {
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
            saleYymm: (filters.saleYymm ? filters.saleYymm.replace(/-/g, '') : '') || '',
            sCustGbn: filters.sCustGbn || '0',
            eCustGbn: filters.eCustGbn || 'ZZZZZZ',
            sCustId: filters.sCustId || '',
            eCustId: filters.eCustId || '',
            sMail: filters.sMail || '',
            eMail: filters.eMail || '',
            agentId,
            //userId: 'ADMIN' // user?.emplNo || 
          },
        };

        const res = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body = res?.data?.body;
        setRowData(setGroupData(body || []));
        //setRowData(body || []);
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

    // 전체 총계 누적
    const total = {
      saleQty: 0,
      saleAmt: 0,
      custCnt: 0,
      mailPrdP: 0,
      mailUseP: 0,
      nmailPrdP: 0,
      nmailUseP: 0,
      mail: 0
    };

    // 1) custGbn으로 그룹화
    const groupByGbn = _.groupBy(rows, "custGbn");

    Object.entries(groupByGbn).forEach(([gbn, list]) => {
      // 원본 push
      list.forEach((item) => {
        result.push({ ...item, isSummary: false, isTotal: false });

        // 전체 누적
        total.saleQty += item.saleQty || 0;
        total.saleAmt += item.saleAmt || 0;
        total.mailPrdP += item.mailPrdP || 0;
        total.mailUseP += item.mailUseP || 0;
        total.nmailPrdP += item.nmailPrdP || 0;
        total.nmailUseP += item.nmailUseP || 0;
        total.mail += item.mail || 0;
      });

      // 2) custId 고유 개수(distinct)
      const distinctCust = _.uniqBy(list, "custId");
      const custCount = distinctCust.length;
      total.custCnt += custCount;

      // 그룹 소계 계산
      const sum = {
        saleQty: _.sumBy(list, "saleQty"),
        saleAmt: _.sumBy(list, "saleAmt"),
        mailPrdP: _.sumBy(list, "mailPrdP"),
        mailUseP: _.sumBy(list, "mailUseP"),
        nmailPrdP: _.sumBy(list, "nmailPrdP"),
        nmailUseP: _.sumBy(list, "nmailUseP"),
        mail: _.sumBy(list, "mail")
      };

      // 3) 소계 타이틀 custGbnNm = "[구분계]"
      result.push({
        custGbn: gbn,
        custGbnNm: "[구분계]",
        custId: `${custCount}명`,

        // 4) 소계 값
        ...sum,

        isSummary: true,
        isTotal: false
      });
    });

    // 5) 전체 총계 row 추가
    result.push({
      custGbn: "TOTAL",
      custGbnNm: "[총계]",
      custId: `${total.custCnt}명`,

      saleQty: total.saleQty,
      saleAmt: total.saleAmt,

      mailPrdP: total.mailPrdP,
      mailUseP: total.mailUseP,
      nmailPrdP: total.nmailPrdP,
      nmailUseP: total.nmailUseP,
      mail: total.mail,

      isSummary: false,
      isTotal: true
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
      sgoods: list
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

        // if (CODE_GROUPS.some(col => col.key === "agentData")) {
        //   const newAgentData = agentData.map(item => ({
        //     code: item.agentId,
        //     codeNm: item.agentNm,
        //   }));
        //   results.push(["agentData", newAgentData]);
        // }

        // const smsData = [
        //   { code: "Y", codeNm: "Y" },
        //   { code: "N", codeNm: "N" },
        // ];

        // // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        // if (CODE_GROUPS.some(col => col.key === "smsData")) {
        //   results.push(["smsData", smsData]);
        // }

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);

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
            rowByDisplayCnt={5}
            title={`고객 마일리지 현황`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">고객 마일리지 현황</div> */}
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
              headerHeight={50}
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

export default React.memo(CustomerMileageStatus);
