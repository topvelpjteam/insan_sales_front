import React, { useEffect, useState, useRef } from "react";
import { Modal } from "antd";
import Properties from "@/system/Properties";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import AccordionSection from "@/components/etc/AccordionSection";
import { gridNoColumn } from "@/system/hook/CommonHook";

ModuleRegistry.registerModules([AllCommunityModule]);

const ExcelUploadResult = ({ title, onClose, excelData, buttons = [] }) => {
  const [columnDefs, setColumnDefs] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const gridRef = useRef();

  const validateFormData = (row, columnsInfo) => {
    const errors = [];
    columnsInfo[0].columns.forEach((col) => {
      if (col.required && !row[col.name]) {
        errors.push(`${col.label}은(는) 필수 항목입니다.`);
      }
    });
    return errors;
  };

  useEffect(() => {
    if (!excelData || excelData.length === 0) return;

    const headers = excelData[0];
    const fields = headers.map((header, index) => {
      const hasStar = header.includes("*");
      const label = header.replace("*", "").trim();
      return {
        name: `field_${index}`,
        label,
        type: "text",
        maxLength: -1,
        disabled: false,
        required: hasStar,
      };
    });

    const columnsInfo = [
      {
        title: "상품 일괄 등록",
        columns: [...fields],
      },
    ];

    // 1️⃣ 데이터 변환 및 유효성 체크
    let newRowData = excelData.slice(1).map((row, rowIndex) => {
      const obj = row.reduce((acc, value, index) => {
        acc[`field_${index}`] = value ?? null;
        return acc;
      }, {});

      const errors = validateFormData(obj, columnsInfo);
      obj.result = errors.length > 0 ? errors.join(", ") : ""; // 정상은 ""
      return obj;
    });

    // 2️⃣ 중복 체크
    const seen = {};
    newRowData = newRowData.map((row) => {
      const key = fields.map((f) => row[f.name]).join("|");
      if (seen[key]) {
        seen[key].count += 1;
        row.result = row.result ? row.result + ", 중복" : "중복";
        row.isDuplicate = true;
      } else {
        seen[key] = { count: 1, firstRow: row };
        row.isDuplicate = false;
      }
      return row;
    });

    // 3️⃣ 첫 번째 중복 행 강조
    Object.values(seen).forEach((v) => {
      if (v.count > 1) {
        v.firstRow.isDuplicate = true;
      }
    });

    // 4️⃣ 중복 건수 계산
    const totalDuplicateCount = newRowData.filter((r) => r.result.includes("중복")).length;

    setRowData(newRowData);
    setDuplicateCount(totalDuplicateCount);

    // 5️⃣ 컬럼 정의
    const newColumnDefs = [
      {
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        checkboxSelection: (params) => params.data.result === "",
        suppressCheckbox: (params) => params.data.result !== "",
        width: 40,
        suppressSizeToFit: true,
        pinned: "left",
        suppressMovable: true,
      },
      {
        ...gridNoColumn(),
        pinned: "left",
        suppressMovable: true,
        width: 60,
      },
      {
        headerName: "결과",
        field: "result",
        editable: false,
        tooltipField: "result",
        pinned: "left",
        suppressMovable: true,
        width: 150,
        cellStyle: (params) =>
          params.value && params.value !== "" ? { color: "red", fontWeight: "bold" } : {},
      },
      ...fields.map((f) => ({
        headerName: f.label + (f.required ? " *" : ""),
        field: f.name,
        editable: false,
        tooltipField: f.name,
        minWidth: 120,
        cellStyle: (params) => (params.data.isDuplicate ? { backgroundColor: "#ffe4b5" } : {}),
      })),
    ];

    setColumnDefs(newColumnDefs);
  }, [excelData]);

  // 선택 갯수 계산 & 오류/중복 선택 해제
  const onSelectionChanged = () => {
    const api = gridRef.current.api;
    const selectedRows = api.getSelectedRows();

    selectedRows.forEach((row) => {
      if (row.result !== "") {
        const node = api.getRowNode(row.id);
        if (node) node.setSelected(false, false);
      }
    });

    const normalRows = api.getSelectedRows().filter((r) => r.result === "");
    setSelectedCount(normalRows.length);
  };

  return (
    <>
      <div className="content-popup-search-wrapper content-sticky-header content-bottom-fixed">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            onClick={() => {
              // 선택된 정상 행 데이터만 버튼 함수로 전달
              const selectedRows = gridRef.current.api.getSelectedRows().filter((r) => r.result === "");
              btn.onClick(selectedRows);
            }}
            disabled={btn.disabled}
            className="content-save-button"
          >
            {btn.label}
          </button>
        ))}
      </div>
      <br />
      <AccordionSection key={"excel1"} title={title} defaultOpen={true}>
        전체: {rowData.length}건 / 오류: {rowData.filter((r) => r.result !== "" && !r.result.includes("중복")).length}건 / 중복: {duplicateCount}건 / 선택: {selectedCount}건
      </AccordionSection>

      <div className="ag-theme-alpine content-panel-popup-grid" style={{ height: "60%" }}>
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
          rowSelection="multiple"
          suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection}
          enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
          tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
          pagination={Properties.grid.default.pagination}
          paginationPageSize={Properties.grid.default.pageSize}
          paginationPageSizeSelector={Properties.grid.default.pageSizeList}
          suppressPaginationPanel={false}
          enableCellSpan={true}
          onSelectionChanged={onSelectionChanged}
        />
      </div>
    </>
  );
};

export default ExcelUploadResult;
