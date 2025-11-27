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
const CustomerBySalesAbc = ({ tabKey }) => {
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
      key: "sYymm",
      type: "yyyymmRange",
      startKey: "sYymm",
      endKey: "eYymm",
      defaultValue: {
        start: dayjs().subtract(1, "month").format("YYYY-MM"),
        end: dayjs().add(1, "month").format("YYYY-MM"),
      },
    },
    { label: "졍렬구분", key: "sortGbn", type: "radio", codeKey: "sortGbnData", defaultValue: "1" },
  ];

  // 공통 코드 설정
  const CODE_GROUPS = [
    { key: "sortGbnData", codeGroupCode: "" },
  ];

  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '고객코드',
      field: 'custId',
      width: 150,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      spanRows: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '고객명',
      field: 'custNm',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
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
      //pinned: 'left', lockPosition: true, suppressMovable: true
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
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: "판매금액 점유율",
      field: "saleRate",
      //valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
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
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: "누적금액 점유율",
      field: "nsaleRate",
      //valueFormatter: numberFormatter,
      cellClass: "text-right summary-col",
      width: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '핸드폰번호',
      field: 'custHp',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '고객전화번호',
      field: 'custTel',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '우편번호',
      field: 'zipId',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
    },
    {
      headerName: '주소',
      field: 'address',
      width: 250,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 1,
      //pinned: 'left', lockPosition: true, suppressMovable: true
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
    async (action = "selectSd303P2") => {
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
            sYymm: (filters.sYymm ? filters.sYymm.replace(/-/g, '') : '') || '',
            eYymm: (filters.eYymm ? filters.eYymm.replace(/-/g, '') : '') || '',
            sortGbn: filters.sortGbn || '0',
            agentId: agentId, // user?.emplNo || ''
          },
        };
        //console.log(filters);
        const res = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body = res?.data?.body;

        payload.action = "selectSd303P";
        const res1 = await request("domain/insanga/store/month", payload, {}, "post", 'json');
        const body1 = res1?.data?.body;
        const totalAmt = body1?.totalAmt;

        setRowData(setGroupData(body || [], totalAmt));
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    // 의존성: filters, request, agentId, user
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );

  const setGroupData = (rows, totalAmt) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const result = [];
    const total = Number(totalAmt) || 0;
    let nsaleAmt = 0; // 누적 SALE_AMT

    rows.forEach((row) => {
      const newRow = { ...row };

      // saleAmt 숫자 변환
      const saleAmt = Number(newRow.saleAmt) || 0;

      // ① saleRate 계산 (항상 소수점 2자리 유지)
      if (saleAmt > 0 && total > 0) {
        newRow.saleRate = ((saleAmt / total) * 100).toFixed(2);
      } else {
        newRow.saleRate = "0.00";
      }

      // ② 누적 nsaleAmt & nsaleRate
      nsaleAmt += saleAmt;
      newRow.nsaleAmt = nsaleAmt;

      if (total > 0) {
        newRow.nsaleRate = ((nsaleAmt / total) * 100).toFixed(2);
      } else {
        newRow.nsaleRate = "0.00";
      }

      // ③ zipId 포맷 (123456 → 123-456)
      if (newRow.zipId) {
        const z = newRow.zipId.toString();
        if (z.length >= 6) {
          newRow.zipId = z.substring(0, 3) + "-" + z.substring(3, 6);
        }
      }

      result.push(newRow);
    });

    // ------------------------------
    // ④ 마지막 총계 행
    // ------------------------------
    const totalSaleAmt = rows.reduce((sum, r) => sum + (Number(r.saleAmt) || 0), 0);

    const totalSaleRate =
      total > 0 ? ((totalSaleAmt / total) * 100).toFixed(2) : "0.00";

    result.push({
      custId: "총계",
      saleAmt: totalSaleAmt,
      saleRate: totalSaleRate,
      nsaleAmt: "",
      nsaleRate: "",
      zipId: "",
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

        const sortGbnData = [
          { code: "0", codeNm: "방문횟수" },
          { code: "1", codeNm: "금액순" },
        ];
        if (CODE_GROUPS.some(col => col.key === "sortGbnData")) {
          results.push(["sortGbnData", sortGbnData]);
        }

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);
        //-------------------------------------------
        // ⭐ agent column 자동 추가 (함수 호출)
        //-------------------------------------------
        // const agentColumns = buildAgentColumns(finalCodes.agentData);
        // setColumnGroups(prev => [...prev, ...agentColumns]);

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

        <div className="content-center-panel" style={{ width: "100%" }}>
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
            title={`고객별 판매 ABC`}
          />
          <div className="content-panel-title content-panel-title-bg"> </div>
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

export default React.memo(CustomerBySalesAbc);
