import React, { useState, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import Properties from "@/system/Properties";
import { useApiCallService } from "@/system/ApiCallService";
import { useLoading } from "@/system/hook/LoadingContext";

ModuleRegistry.registerModules([AllCommunityModule]);

// 그리드 컬럼 설정
const COLUMN_DEFS = [
  {
    headerName: "",
    checkboxSelection: true,
    headerCheckboxSelection: false,
    width: 50,
    pinned: "left",
    cellStyle: Properties.grid.centerCellStyle,
  },
  { 
    headerName: '제품코드', 
    field: 'productId', 
    width: 120, 
    cellClass: 'text-center',
  },
  { 
    headerName: '제품명', 
    field: 'productNm', 
    width: 300, 
    cellClass: 'text-left',
  },
];

const ProductSearch = ({ onSelect }) => {
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const [rowData, setRowData] = useState([]);
  const [searchText, setSearchText] = useState("");

  // 검색
  const handleSearch = useCallback(async () => {
    try {
      showLoading();
      const res = await request(
        "domain/insanga/store/customer",
        { 
          action: "selectProductList", 
          payload: { 
            searchText: searchText || '' 
          } 
        },
        {},
        "post",
        'json'
      );
      const body = res?.data?.body;
      setRowData(body || []);
    } catch (err) {
      console.error("제품 조회 실패:", err);
    } finally {
      hideLoading();
    }
  }, [searchText, request, showLoading, hideLoading]);

  // 엔터키 이벤트
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);

  // 더블클릭 이벤트
  const handleRowDoubleClick = useCallback(({ data }) => {
    if (onSelect) {
      onSelect(data);
    }
  }, [onSelect]);

  return (
    <div className="announce-detail" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 검색 영역 */}
      <div className="content-popup-search-wrapper content-sticky-header content-top-fixed">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>제품명:</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ 
              flex: 1, 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px' 
            }}
            placeholder="제품명을 입력하세요"
          />
          <button
            className="content-search-button"
            onClick={handleSearch}
          >
            검색
          </button>
        </div>
      </div>

      {/* 그리드 영역 */}
      <div className="ag-theme-alpine" style={{ flex: 1, marginTop: '10px' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={COLUMN_DEFS}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 100,
          }}
          rowHeight={Properties.grid.default.data.height}
          headerHeight={Properties.grid.default.header.height}
          domLayout="normal"
          onRowDoubleClicked={handleRowDoubleClick}
          rowSelection="single"
          suppressRowClickSelection={false}
          enableBrowserTooltips={true}
          tooltipShowDelay={0}
        />
      </div>
    </div>
  );
};

export default React.memo(ProductSearch);

