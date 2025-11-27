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
const CustomerByMidCateSalesStatus = ({ tabKey }) => {
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
    { label: "대상고객(F)", key: "sCustId", type: "input", codeKey: "", defaultValue: "0" },
    { label: "대상고객(T)", key: "eCustId", type: "input", codeKey: "", defaultValue: "ZZZZZZZZZZ" },

    { label: "중분류(F)", key: "sMtype", type: "select", codeKey: "mtypeData", defaultValue: "100" },
    { label: "중분류(T)", key: "eMtype", type: "select", codeKey: "mtypeData", defaultValue: "ZZZ" },
  ]);

  // -----------------------------
  // CODE_GROUPS를 useState로 선언
  // -----------------------------
  const [codeGroups, setCodeGroups] = useState([
    { key: "mtypeData", codeGroupCode: "S07" },
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
      headerName: '고객번호',
      field: 'custId',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      spanRows: true,
    },
    {
      headerName: '고객명',
      field: 'custNm',
      width: 300,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 2,
      spanRows: false,
    },
    {
      headerName: '중분류코드',
      field: 'mtypeGbn',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
      spanRows: false,
    },
    {
      headerName: '중분류명',
      field: 'mtypeGbnNm',
      width: 300,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 2,
      spanRows: false,
    },
    {
      headerName: '상품코드',
      field: 'goodsId',
      width: 300,
      minWidth: 80,
      cellClass: 'text-center',
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
  ]);

  // -----------------------------
  // fetchData
  // -----------------------------
  const fetchData = useCallback(
    async (action = "selectSd310List") => {
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
            sCustId: filters.sCustId || '0',
            eCustId: filters.eCustId || 'ZZZZZZZZZZZZZZ',
            sMtype: filters.sMtype || '100',
            eMtype: filters.eMtype || 'ZZZ',
            agentId: agentId,
          },
        };
        const res = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body = res?.data?.body;


        //setRowData(body || []);
        setRowData(setGroupData(body || []));
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
  const setGroupData = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const result = [];

    // 1차 custId 그룹
    const custGroups = _.groupBy(rows, "custId");

    Object.keys(custGroups).forEach((custId) => {
      const custRows = custGroups[custId];

      // 2차 mtypeGbn 그룹
      const mtypeGroups = _.groupBy(custRows, "mtypeGbn");

      Object.keys(mtypeGroups).forEach((mtype) => {
        const mtypeRows = mtypeGroups[mtype];

        // 상세 row push
        mtypeRows.forEach((r) => {
          result.push({ ...r });
        });

        // mtypeGbn 소계
        const mtypeQty = _.sumBy(mtypeRows, (r) => Number(r.saleQty) || 0);
        const mtypeAmt = _.sumBy(mtypeRows, (r) => Number(r.saleAmt) || 0);

        result.push({
          custId,
          mtypeGbn: '[분류 계]', // `${mtype} 소계`,
          saleQty: mtypeQty,
          saleAmt: mtypeAmt,
          isSummary: true,   // ⬅ 추가됨
        });
      });

      // custId 소계
      const custQty = _.sumBy(custRows, (r) => Number(r.saleQty) || 0);
      const custAmt = _.sumBy(custRows, (r) => Number(r.saleAmt) || 0);

      result.push({
        custId: '[고객 계]', //`${custId} 소계`,
        saleQty: custQty,
        saleAmt: custAmt,
        isSummary: true,     // ⬅ 추가됨
      });
    });

    // 전체 총계
    const totalQty = _.sumBy(rows, (r) => Number(r.saleQty) || 0);
    const totalAmt = _.sumBy(rows, (r) => Number(r.saleAmt) || 0);

    result.push({
      custId: '[총 계]',
      //goodsId: "총계",
      saleQty: totalQty,
      saleAmt: totalAmt,
      isTotal: true,        // ⬅ 추가됨
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

        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, []);

  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      <div className="content-main-area">

        <div className="content-center-panel" style={{ width: `100%` }}>
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
            title={`고객별 상품 중분류별 판매현황 ( 고객명 안나오는거 확인 요망 ) `}
          />
          {/* <div className="content-panel-title content-panel-title-bg"></div> */}
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
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustomerByMidCateSalesStatus);
