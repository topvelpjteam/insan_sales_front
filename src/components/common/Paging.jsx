import React, { useMemo } from "react";
import Properties from "../../system/Properties";

const Paging = ({ pageNo, totalPages, onPageChange, pageSize, totalCount, onPageSizeChange, blockSize = 5 }) => {
  // 페이지 블록 계산
  const pageBlock = useMemo(() => {
    const start = Math.floor((pageNo - 1) / blockSize) * blockSize + 1;
    const pages = [];
    for (let i = start; i < start + blockSize && i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [pageNo, totalPages, blockSize]);

  // 버튼 공통 스타일
  const baseButtonStyle = {
    height: 24,
    lineHeight: "24px",
    padding: "0 8px",
    borderRadius: 4,
    fontSize: 11,
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    transition: "all 0.2s",
  };

  const buttonStyle = (active = false) => ({
    ...baseButtonStyle,
    border: active ? "1px solid #1890ff" : "1px solid #ddd",
    backgroundColor: active ? "#e6f7ff" : "#fff",
    color: active ? "#1890ff" : "#333",
    cursor: "pointer",
  });

  const navButtonStyle = (disabled = false) => ({
    ...baseButtonStyle,
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    color: "#333",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 10 }}>
      {/* 페이지 사이즈 선택 */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span>페이지당 행수</span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: "#f9f9f9",
            color: "#333",
            cursor: "pointer",
          }}
        >
          {Properties.grid.default.pageSizeList.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      {/* 페이지 네비게이션 */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3 }}>
        <button onClick={() => onPageChange(1)} disabled={pageNo === 1} style={navButtonStyle(pageNo === 1)}>⏮</button>
        <button onClick={() => onPageChange(pageNo - 1)} disabled={pageNo === 1} style={navButtonStyle(pageNo === 1)}>◀</button>

        {pageBlock.map(p => (
          <button key={p} onClick={() => onPageChange(p)} style={buttonStyle(p === pageNo)}>{p}</button>
        ))}

        <button onClick={() => onPageChange(pageNo + 1)} disabled={pageNo === totalPages} style={navButtonStyle(pageNo === totalPages)}>▶</button>
        <button onClick={() => onPageChange(totalPages)} disabled={pageNo === totalPages} style={navButtonStyle(pageNo === totalPages)}>⏭</button>
      </div>

      {/* 페이지 정보 표시 */}
      <div style={{ fontSize: 12, color: "#555" }}>
        총 {totalCount} 건 [ 페이지 {totalPages} / {pageNo} ]
      </div>
    </div>
  );
};

export default Paging;
