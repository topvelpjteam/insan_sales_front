import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSelector } from "react-redux";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import _ from "lodash";

import Properties from "@/system/Properties";
import { gridNoColumn, useLayoutWidths } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import { useCustomContents } from "@/system/hook/ManagerProvider";
import { useLoading } from "@/system/hook/LoadingContext";

import LeftPanel from "@/components/layout/LeftPanel";
import { getAgentId } from "@/system/store/redux/agent";

ModuleRegistry.registerModules([AllCommunityModule]);


// 유효성 체크를 위한 함수
import { formatDateToYYYYMMDD } from "@/system/utils/common";

const SEARCH_FORM = [
  { label: "대분류", key: "btypeGbn", type: "select", codeKey: "btypeData" },
  { label: "중분류", key: "mtypeGbn", type: "select", codeKey: "mtypeData" },
  { label: "소분류", key: "stypeGbn", type: "select", codeKey: "stypeData" },
  { label: "검색어", key: "searchGoodsNm", type: "input", codeKey: "", isEnterEvent: true },
];

const CODE_GROUPS = [
  { key: "btypeData", codeGroupCode: "S05" },
  { key: "mtypeData", codeGroupCode: "S07" },
  { key: "stypeData", codeGroupCode: "S08" },
];

const GoodsSearch = ({ onGoodsSelected, isAgentCheck = true }) => {
  const user = useSelector((state) => state.user.user);
  const agentId = useSelector(getAgentId) ?? ""; // ✅ 안정성 강화

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showMessageModal } = useCustomContents();

  const [rowData, setRowData] = useState([]);
  const [filters, setFilters] = useState(SEARCH_FORM.reduce((acc, cur) => {
    acc[cur.key] = ""; // 기본값을 모두 빈 문자열로
    return acc;
  }, {}));

  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  const gridRef = useRef(null);

  const { sidebarOpen, leftWidth, toggleSidebar } = useLayoutWidths(true, 100);

  const handleFilterChange = useCallback(
    (key, value) => setFilters((prev) => ({ ...prev, [key]: value })),
    []
  );

  /** ✅ 공통코드 최초 한 번만 로딩 */
  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
            const res = await request(
              "domain/insanga/store/system",
              { action: "selectCode", payload: { codeGroupCode } },
              {},
              "post"
            );
            return [key, res?.data?.body ?? []];
          })
        );
        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [request]);

  const fetchData = useCallback(async () => {
    if (isAgentCheck && !agentId) {
      showMessageModal({
        title: "알림",
        content: "매장코드를 선택하세요.",
      });
      return;
    }

    showLoading();
    try {
      const res = await request(
        "domain/insanga/store/goods",
        {
          action: "selectProduct",
          payload: {
            ...filters,
            searchUserId: user?.emplNo ?? "", // ✅ fallback 제거
            agentId: (isAgentCheck) ? "" : agentId,
          },
        },
        {},
        "post",
        "json"
      );

      setRowData(res?.data?.body ?? []);
    } catch (err) {
      console.error(err);
      showMessageModal({
        title: "알림",
        content: "데이터 조회 실패",
      });
    } finally {
      hideLoading();
    }
  }, [filters, agentId, request]);

  const handleSearch = useCallback(() => {
    setRowData([]);
    fetchData();
  }, [fetchData]);

  /** ✅ 선택된 상품 상위에 전달 */
  const handleGoodsSelected = useCallback(() => {
    const selectedRows = gridRef.current?.api?.getSelectedRows?.() ?? [];

    if (!selectedRows.length) {
      showMessageModal({
        title: "알림",
        content: "선택된 상품이 없습니다.",
      });
      return;
    }

    onGoodsSelected?.(selectedRows);
    gridRef.current.api.deselectAll(); // ✅ 성능영향 없음
  }, [onGoodsSelected, showMessageModal]);

  /** ✅ useMemo 최소 의존성 설정 */
  const columnDefs = useMemo(() => {
    const columns = [
      {
        headerName: "",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: "left",
        cellStyle: Properties.grid.centerCellStyle,
      },
      gridNoColumn(),
      {
        headerName: "대분류",
        field: "btypeGbn",
        width: 160,
        sortable: true,
        editable: false,
        cellStyle: { textAlign: "left" },

        // ✅ 콤보박스 에디터 (맨 위에 공백 옵션 추가)
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["", ...(codes.btypeData?.map(item => item.codeNm) ?? [])],
        },

        // ✅ 표시값(codeNm) → 실제 코드(code)
        valueSetter: (params) => {
          if (!params.newValue) {
            // ✅ 빈 값일 경우 코드 삭제 처리
            params.data.btypeGbn = "";
            return true;
          }
          const found = codes.btypeData?.find(item => item.codeNm === params.newValue);
          if (found) {
            params.data.btypeGbn = found.code;
            return true;
          }
          return false;
        },

        // ✅ 셀 표시용: 코드명 변환
        valueFormatter: (params) => {
          if (!params.value) return "";
          const found = codes.btypeData?.find(item => item.code === params.value);
          return found ? found.codeNm : params.value;
        },

        // ✅ Tooltip (코드명 + 코드)
        tooltipValueGetter: (params) => {
          if (!params.value) return "";
          const found = codes.btypeData?.find(item => item.code === params.value);
          return found ? `${found.codeNm} (${found.code})` : params.value;
        },
      },

      {
        headerName: "중분류",
        field: "mtypeGbn",
        width: 160,
        sortable: true,
        editable: false,
        cellStyle: { textAlign: "left" },

        // ✅ 콤보박스 에디터 (맨 위에 공백 옵션 추가)
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["", ...(codes.mtypeData?.map(item => item.codeNm) ?? [])],
        },

        // ✅ 표시값(codeNm) → 실제 코드(code)
        valueSetter: (params) => {
          if (!params.newValue) {
            // ✅ 빈 값일 경우 코드 삭제 처리
            params.data.mtypeGbn = "";
            return true;
          }
          const found = codes.mtypeData?.find(item => item.codeNm === params.newValue);
          if (found) {
            params.data.mtypeGbn = found.code;
            return true;
          }
          return false;
        },

        // ✅ 셀 표시용: 코드명 변환
        valueFormatter: (params) => {
          if (!params.value) return "";
          const found = codes.mtypeData?.find(item => item.code === params.value);
          return found ? found.codeNm : params.value;
        },

        // ✅ Tooltip (코드명 + 코드)
        tooltipValueGetter: (params) => {
          if (!params.value) return "";
          const found = codes.mtypeData?.find(item => item.code === params.value);
          return found ? `${found.codeNm} (${found.code})` : params.value;
        },
      },
      {
        headerName: "소분류",
        field: "stypeGbn",
        width: 160,
        sortable: true,
        editable: false,
        cellStyle: { textAlign: "left" },

        // ✅ 콤보박스 에디터 (맨 위에 공백 옵션 추가)
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["", ...(codes.stypeData?.map(item => item.codeNm) ?? [])],
        },

        // ✅ 표시값(codeNm) → 실제 코드(code)
        valueSetter: (params) => {
          if (!params.newValue) {
            // ✅ 빈 값일 경우 코드 삭제 처리
            params.data.stypeGbn = "";
            return true;
          }
          const found = codes.stypeData?.find(item => item.codeNm === params.newValue);
          if (found) {
            params.data.stypeGbn = found.code;
            return true;
          }
          return false;
        },

        // ✅ 셀 표시용: 코드명 변환
        valueFormatter: (params) => {
          if (!params.value) return "";
          const found = codes.stypeData?.find(item => item.code === params.value);
          return found ? found.codeNm : params.value;
        },

        // ✅ Tooltip (코드명 + 코드)
        tooltipValueGetter: (params) => {
          if (!params.value) return "";
          const found = codes.stypeData?.find(item => item.code === params.value);
          return found ? `${found.codeNm} (${found.code})` : params.value;
        },
      },
      { headerName: "상품코드", field: "goodsId", width: 150, cellClass: "text-center" },
      { headerName: "상품명", field: "goodsNm", width: 200, cellClass: "text-left" },
      {
        headerName: "등록일자", field: "openD", width: 120, flex: 1, cellClass: "text-center",
        valueFormatter: (params) => {
          // 여러 필드명 시도
          const openDateValue = params.data.openD || params.data.openDate;
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
        headerName: "종료일자", field: "closeD", width: 120, flex: 1, cellClass: "text-center",
        valueFormatter: (params) => {
          // 여러 필드명 시도
          const openDateValue = params.data.openD || params.data.openDate;
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
    ];

    return columns;
  }, [codes.btypeData]);

  return (
    <>
      <div className="content-popup-search-wrapper content-sticky-header content-bottom-fixed">
      </div>

      <div className="ag-theme-alpine content-panel-popup-grid" style={{ height: "80%" }}>

        <LeftPanel
          codes={codes}
          filters={filters}
          handleFilterChange={handleFilterChange}
          searchForm={SEARCH_FORM}
          buttons={[
            { key: "btnSelect", label: "선택", onClick: handleGoodsSelected },
            { key: "btnSearch", label: "검색", onClick: handleSearch },
          ]}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth}
          rowByDisplayCnt={4}
          title={`상품검색`}
        />
        <AgGridReact
          ref={gridRef}
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
          //onRowDoubleClicked={handleRowDoubleClick}
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
    </>
  );
};

export default React.memo(GoodsSearch);
