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
const ManagerBySalesStatus = ({ tabKey }) => {
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
      label: "검색기간",
      key: "sDate",
      type: "dateRange",
      startKey: "sDate",
      endKey: "eDate",
      defaultValue: {
        start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        end: dayjs().add(0, "month").format("YYYY-MM-DD"),
      },
    },
    { label: "담당코드(F)", key: "sStaffId", type: "select", codeKey: "staffData", defaultValue: "" },
    { label: "담당코드(T)", key: "eStaffId", type: "select", codeKey: "staffData", defaultValue: "" },
  ]);

  // -----------------------------
  // CODE_GROUPS를 useState로 선언
  // -----------------------------
  const [codeGroups, setCodeGroups] = useState([
    { key: "staffData", codeGroupCode: "" },
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
      headerName: '담당자',
      field: 'personNm',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 2,
      spanRows: true,
    },
    {
      headerName: '판매일자',
      field: 'saleD',
      width: 300,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
      valueFormatter: (params) => {
        // 여러 필드명 시도
        const openDateValue = params.data.saleD || params.data.saleD;
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
      headerName: "수량",
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
      headerName: "금액",
      field: "saleAmt",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "누적수량",
      field: "nsaleQty",
      valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "누적금액",
      field: "nsaleAmt",
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
    async (action = "selectSd307List") => {
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
            sStaffId: filters.sStaffId || '',
            eStaffId: filters.eStaffId || '',
            agentId: agentId,
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
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );

  // -----------------------------
  // setGroupData
  // -----------------------------
  const setGroupData = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const result = [];
    let globalQty = 0;   // 전체 누적
    let globalAmt = 0;

    // 1) staffId 기준 그룹
    const grouped = _.groupBy(rows, (r) => r.staffId);

    // 2) staffId 그룹 단위로 처리
    Object.keys(grouped).forEach((staffId) => {

      let subQty = 0; // 소계 누적
      let subAmt = 0;

      let nsaleQty = 0; // nsale 누적
      let nsaleAmt = 0;

      grouped[staffId].forEach((item) => {
        const saleQty = Number(item.saleQty || 0);
        const saleAmt = Number(item.saleAmt || 0);

        // 누적 값 계산
        nsaleQty += saleQty;
        nsaleAmt += saleAmt;

        subQty += saleQty;
        subAmt += saleAmt;

        globalQty += saleQty;
        globalAmt += saleAmt;

        result.push({
          ...item,
          nsaleQty,
          nsaleAmt,
          isSummary: false,
          isTotal: false,
        });
      });

      // 3) staffId 소계 추가
      result.push({
        personNm: "[담당 계]",
        //personNm: '', //grouped[staffId][0].personNm || "",
        saleD: '',
        saleQty: subQty,
        saleAmt: subAmt,
        nsaleQty: "",
        nsaleAmt: "",
        isSummary: true,
        isTotal: false,
      });
    });

    // 4) 전체 총계 추가
    result.push({
      personNm: "[총 계]",
      //personNm: "",
      saleD: "",
      saleQty: globalQty,
      saleAmt: globalAmt,
      nsaleQty: "",
      nsaleAmt: "",
      isSummary: false,
      isTotal: true,
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

        if (codeGroups.some(col => col.key === "staffData")) {
          const newStaffData = staffData.map(item => ({
            code: item.staffId,
            codeNm: item.staffNm,
          }));
          results.push(["staffData", newStaffData]);
          applyDefaultStaffRange(newStaffData);
        }

        setCodes(Object.fromEntries(results));

      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, []);

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

    const first = staffData[0]?.staffId || "";
    const last = staffData[staffData.length - 1]?.staffId || "";
    console.log(first, last);
    setFilters(prev => ({
      ...prev,
      sStaffId: first,
      eStaffId: last,
    }));
  }, [staffData]);


  const applyDefaultStaffRange = (stData) => {
    if (!stData || stData.length === 0) return;

    const first = stData[0]?.code || "";
    const last = stData[stData.length - 1]?.code || "";

    // filters 업데이트
    setFilters(prev => ({
      ...prev,
      sStaffId: first,
      eStaffId: last,
    }));
  };

  const applyDefaultStaffRange1 = useCallback(() => {
    if (!codes?.staffData || codes.staffData.length === 0) return;

    const first = codes.staffData[0]?.code || "";
    const last = codes.staffData[codes.staffData.length - 1]?.code || "";

    // searchForm 기본값 업데이트
    setSearchForm(prev =>
      prev.map(item => {
        if (item.key === "sStaffId") {
          return { ...item, defaultValue: first };
        }
        if (item.key === "eStaffId") {
          return { ...item, defaultValue: last };
        }
        return item;
      })
    );

    // filters 업데이트
    setFilters(prev => ({
      ...prev,
      sStaffId: first,
      eStaffId: last,
    }));
  }, [staffData]);

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
            rowByDisplayCnt={3}
            title={`담당자 별 판매 현황`}
          />
          {/* <div className="content-panel-title content-panel-title-bg"> </div> */}
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

export default React.memo(ManagerBySalesStatus);
