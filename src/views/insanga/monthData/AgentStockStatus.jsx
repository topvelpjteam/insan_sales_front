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
const AgentStockStatus = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  const agentId = useSelector(getAgentId) || "";
  const agentData = useSelector(getAgentData);

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
      key: "yymm",
      type: "yyyymm",
      codeKey: "",
      defaultValue: dayjs().format("YYYY-MM"),
      callback: (value) => {
      }
    },
    { label: "대분류", key: "btypeList", type: "multiple", codeKey: "btypeData", defaultValue: "" },
    { label: "중분류", key: "mtypeList", type: "multiple", codeKey: "mtypeData", defaultValue: "" },
    { label: "소분류", key: "stypeList", type: "multiple", codeKey: "stypeData", defaultValue: "" },

    { label: "매장코드", key: "storeList", type: "multiple", codeKey: "agentData", defaultValue: "" },
    { label: "상품구분", key: "gbnList", type: "select", codeKey: "saleGbnData", defaultValue: "" },
    {
      label: "상품코드", key: "goodsList", type: "input-search", codeKey: "", disabled: goodsIsDisabled, callback: (value) => {
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },

    { label: "소비자가 출력", key: "zeroYn", type: "check", codeKey: "checkData", defaultValue: "" },
  ];

  // 공통 코드 설정
  const CODE_GROUPS = [
    { key: "btypeData", codeGroupCode: "S05" },
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "stypeData", codeGroupCode: "S08" },
    { key: "saleGbnData", codeGroupCode: "S03" },
    { key: "agentData", codeGroupCode: "" },
    { key: "checkData", codeGroupCode: "" },
  ];

  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '구분',
      field: 'goodsGbnNm',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false,
      pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '중분류명',
      field: 'mtypeGbn',
      width: 200,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false,
      pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '상품코드',
      field: 'goodsId',
      width: 170,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '상품명',
      field: 'goodsNm',
      width: 250,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      pinned: 'left', lockPosition: true, suppressMovable: true
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
    async (action = "selectSg010Qx02List") => {
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
            // 운영시에는 반드시 agentId 사용.
            // 개발용 하드코딩('5')은 위험하므로 제거했습니다.
            yymm: (filters.yymm ? filters.yymm.replace(/-/g, '') : '') || '',
            brandId: '', // 먼지 몰라 일단 '' 처리. filters.sgGbn || '0',
            btypeList: Array.isArray(filters.btypeList) ? filters.btypeList.join(',') : (filters.btypeList || ''),
            mtypeList: Array.isArray(filters.mtypeList) ? filters.mtypeList.join(',') : (filters.mtypeList || ''),
            stypeList: Array.isArray(filters.stypeList) ? filters.stypeList.join(',') : (filters.stypeList || ''),
            goodsList: Array.isArray(filters.goodsList) ? filters.goodsList.join(',') : (filters.goodsList || ''),
            gbnList: Array.isArray(filters.gbnList) ? filters.gbnList.join(',') : (filters.gbnList || ''),
            storeList: Array.isArray(filters.storeList) ? filters.storeList.join(',') : (filters.storeList || ''),
            userId: user?.emplNo || 'ADMIN'
            //zeroYn: filters.zeroYn || 'N',
            //agentId: agentId, // user?.emplNo || ''
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
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const validStoreIds = (codes?.agentData || []).map(a => a.code);

    // 1) 기본 그룹핑
    const grouped = _.groupBy(rows, (r) =>
      `${r.goodsGbn}|${r.mtypeGbn}|${r.goodsId}`
    );

    const productRows = [];

    Object.values(grouped).forEach((list) => {
      const base = list[0];

      const row = {
        goodsGbn: base.goodsGbn,
        goodsGbnNm: base.goodsGbnNm,
        mtypeGbn: base.mtypeGbn,
        goodsId: base.goodsId,
        goodsNm: base.goodsNm,
        isSummary: false,
        isTotal: false,
      };

      let storeTotalQty = 0;
      let storeTotalAmt = 0;

      list.forEach((item) => {
        const qtyField = `${item.storeId}Qty`;
        const amtField = `${item.storeId}Amt`;

        row[qtyField] = item.stockQty || 0;
        row[amtField] = item.stockAmt || 0;

        if (validStoreIds.includes(item.storeId)) {
          storeTotalQty += item.stockQty || 0;
          storeTotalAmt += item.stockAmt || 0;
        }
      });

      row.storeTotalQty = storeTotalQty;
      row.storeTotalAmt = storeTotalAmt;
      row.grandTotalQty = storeTotalQty;
      row.grandTotalAmt = storeTotalAmt;

      productRows.push(row);
    });

    // ================================================
    // 2) 소계 계산
    // ================================================
    const goodsGbnGroup = _.groupBy(productRows, "goodsGbn");

    const result = [];

    const allTotals = {};

    Object.keys(goodsGbnGroup).forEach((gbnKey) => {
      const listByGoodsGbn = goodsGbnGroup[gbnKey];

      // 중분류 그룹
      const mtypeGroupInGbn = _.groupBy(listByGoodsGbn, "mtypeGbn");

      // -----------------------
      // 3-1) mtypeGbn 소계
      // -----------------------
      Object.keys(mtypeGroupInGbn).forEach((mtypeKey) => {
        const items = mtypeGroupInGbn[mtypeKey];

        items.forEach(r => result.push(r));

        const summary = makeSummaryRow(items);
        summary.goodsGbn = gbnKey;
        summary.mtypeGbn = ''; //mtypeKey;
        summary.goodsNm = "(중분류계)";
        summary.isSummary = true;

        result.push(summary);
      });

      // -----------------------
      // 3-2) goodsGbn 소계
      // -----------------------
      const gbnSummary = makeSummaryRow(listByGoodsGbn);
      gbnSummary.goodsGbn = gbnKey;
      gbnSummary.goodsNm = "(구분계)";
      gbnSummary.isSummary = true;

      result.push(gbnSummary);

      // 전체 총계 누적 (pivot 컬럼 전체 누적)
      Object.keys(gbnSummary).forEach(k => {
        if (/Qty$|Amt$/.test(k)) {
          allTotals[k] = (allTotals[k] || 0) + (gbnSummary[k] || 0);
        }
      });
    });

    // -----------------------
    // 3-3) 전체 총합계 행
    // -----------------------
    const finalTotal = {
      goodsNm: "(총 계)",
      isTotal: true,
      ...allTotals,
    };

    result.push(finalTotal);

    return result;
  };
  /**
   * 공통 소계 계산 함수 (pivot 컬럼 자동 탐색)
   */
  const makeSummaryRow = (list) => {
    const row = {};

    list.forEach(item => {
      Object.keys(item).forEach(k => {
        if (/Qty$|Amt$/.test(k)) {
          row[k] = (row[k] || 0) + (item[k] || 0);
        }
      });
    });

    return row;
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
  }, [handleGoodsSearchClose]);

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

        if (CODE_GROUPS.some(col => col.key === "agentData")) {
          const newAgentData = agentData.map(item => ({
            code: item.agentId,
            codeNm: item.agentNm,
          }));
          results.push(["agentData", newAgentData]);
        }
        // ✅ vatData 직접 생성
        const checkData = [
          { code: "Y", codeNm: "출력" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "checkData")) {
          results.push(["checkData", checkData]);
        }

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);
        //-------------------------------------------
        // ⭐ agent column 자동 추가 (함수 호출)
        //-------------------------------------------
        const agentColumns = buildAgentColumns(finalCodes.agentData);
        setColumnGroups(prev => [...prev, ...agentColumns]);

      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();

  }, [request]); // handleSetHeader 의존 추가

  // agentData 기반 컬럼 생성 함수 (매장계 / 총계 포함)
  // agentData 기반 컬럼 생성 함수 (매장계 / 총계 포함)
  const buildAgentColumns = useCallback((agentList) => {
    if (!Array.isArray(agentList)) return [];

    // 1) 매장별 컬럼 그룹 (수량 / 금액)
    const agentCols = agentList.map(agent => ({
      headerName: agent.codeNm,
      marryChildren: true,
      headerClass: 'ag-header-group-center',
      children: [
        {
          headerName: "수량",
          field: `${agent.code}Qty`,
          valueFormatter: numberFormatter,
          cellClass: "text-right",
          width: 120,
          minWidth: 120,
          sortable: false,
          filter: false,
        },
        {
          headerName: "금액",
          field: `${agent.code}Amt`,
          valueFormatter: numberFormatter,
          cellClass: "text-right",
          width: 120,
          minWidth: 120,
          sortable: false,
          filter: false,
        },
      ],
    }));

    // 2) 매장계 컬럼 (수량 / 금액)
    const storeTotalCol = {
      headerName: "매장계",
      marryChildren: true,
      headerClass: "ag-header-group-center",
      children: [
        {
          headerName: "수량",
          field: "storeTotalQty",
          valueFormatter: numberFormatter,
          cellClass: "text-right summary-col",
          width: 120,
          minWidth: 120,
          sortable: false,
          filter: false,
        },
        {
          headerName: "금액",
          field: "storeTotalAmt",
          valueFormatter: numberFormatter,
          cellClass: "text-right summary-col",
          width: 120,
          minWidth: 120,
          sortable: false,
          filter: false,
        },
      ],
    };

    // 3) 총계 컬럼 (수량 / 금액)
    const grandTotalCol = {
      headerName: "총계",
      marryChildren: true,
      headerClass: "ag-header-group-center",
      children: [
        {
          headerName: "수량",
          field: "grandTotalQty",
          valueFormatter: numberFormatter,
          cellClass: "text-right summary-col",
          width: 120,
          minWidth: 120,
          sortable: false,
          filter: false,
        },
        {
          headerName: "금액",
          field: "grandTotalAmt",
          valueFormatter: numberFormatter,
          cellClass: "text-right summary-col",
          width: 120,
          minWidth: 120,
          sortable: false,
          filter: false,
        },
      ],
    };

    return [...agentCols, storeTotalCol, grandTotalCol];
  }, []);



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
            rowByDisplayCnt={4}
            title={"매장별 재고 현황 조회"}
          //leftWidth={leftWidth}
          />

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

export default React.memo(AgentStockStatus);
