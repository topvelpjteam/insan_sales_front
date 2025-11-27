import React from "react";

/**
 * 상단 패널 컴포넌트 (가로 배치형 검색 필터)
 *
 * LeftPanel과 유사한 인터페이스를 사용하되, 상단 가로 배치 레이아웃 적용
 * 피벗 테이블, 차트 등 넓은 영역이 필요한 화면에서 사용
 *
 * @param {object} props
 * @param {object} codes - 코드 데이터
 * @param {object} filters - 검색 필터 값
 * @param {function} handleFilterChange - 필터 값 변경 핸들러
 * @param {Array} searchForm - 검색 폼 정의
 * @param {Array} buttons - 버튼 배열
 * @param {function} handleInit - 초기화 핸들러
 * @param {string} title - 패널 제목 (선택)
 * @param {boolean} isUseInitBtn - 초기화 버튼 사용 여부 (기본값: true)
 *
 * 작성자: 김정명
 * 작성일: 2025-11-25
 */
const UpperPanel = ({
  codes = {},
  filters = {},
  handleFilterChange,
  searchForm = [],
  buttons = [],
  handleInit,
  title,
  isUseInitBtn = true,
}) => {
  // 필드 타입별 렌더링
  const renderField = (field) => {
    const { key, type, codeKey, startKey, endKey } = field;

    switch (type) {
      case "yyyymm":
        return (
          <input
            type="month"
            value={filters[key] || ""}
            onChange={(e) => handleFilterChange(key, e.target.value)}
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={filters[key] || ""}
            onChange={(e) => handleFilterChange(key, e.target.value)}
          />
        );

      case "dateRange":
        return (
          <div className="upper-panel-range">
            <input
              type="date"
              value={filters[startKey] || ""}
              onChange={(e) => handleFilterChange(startKey, e.target.value)}
            />
            <span>~</span>
            <input
              type="date"
              value={filters[endKey] || ""}
              onChange={(e) => handleFilterChange(endKey, e.target.value)}
            />
          </div>
        );

      case "select":
        return (
          <select
            value={filters[key] || ""}
            onChange={(e) => handleFilterChange(key, e.target.value)}
          >
            <option value="">전체</option>
            {(codes[codeKey] || []).map((item) => (
              <option key={item.code} value={item.code}>
                {item.codeNm}
              </option>
            ))}
          </select>
        );

      case "input":
      default:
        return (
          <input
            type="text"
            value={filters[key] || ""}
            onChange={(e) => handleFilterChange(key, e.target.value)}
            placeholder={field.placeholder || ""}
          />
        );
    }
  };

  return (
    <div className="upper-panel-container">
      {title && <div className="upper-panel-title">{title}</div>}
      <div className="upper-panel-row">
        {searchForm.map((field, idx) => (
          <div key={field.key || idx} className="upper-panel-item">
            <label>{field.label}</label>
            {renderField(field)}
          </div>
        ))}
        <div className="upper-panel-buttons">
          {isUseInitBtn && (
            <button className="content-init-button" onClick={handleInit}>
              초기화
            </button>
          )}
          {buttons.map((btn) => (
            <button
              key={btn.key}
              className="content-search-button"
              onClick={btn.onClick}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .upper-panel-container {
          background: #fafafa;
          border: 1px solid #e8e8e8;
          border-radius: 4px;
          padding: 12px 16px;
          margin-bottom: 12px;
        }
        .upper-panel-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 10px;
        }
        .upper-panel-row {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .upper-panel-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .upper-panel-item label {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          white-space: nowrap;
          min-width: 60px;
        }
        .upper-panel-item input,
        .upper-panel-item select {
          height: 30px;
          padding: 0 8px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          font-size: 13px;
          min-width: 140px;
        }
        .upper-panel-item input:focus,
        .upper-panel-item select:focus {
          border-color: #1890ff;
          outline: none;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
        .upper-panel-range {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .upper-panel-range input {
          min-width: 130px;
        }
        .upper-panel-range span {
          color: #666;
        }
        .upper-panel-buttons {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        .upper-panel-btn-reset,
        .upper-panel-btn-search {
          height: 30px;
          padding: 0 16px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upper-panel-btn-reset {
          background: #fff;
          border: 1px solid #d9d9d9;
          color: #666;
        }
        .upper-panel-btn-reset:hover {
          border-color: #1890ff;
          color: #1890ff;
        }
        .upper-panel-btn-search {
          background: #1890ff;
          border: 1px solid #1890ff;
          color: #fff;
        }
        .upper-panel-btn-search:hover {
          background: #40a9ff;
          border-color: #40a9ff;
        }
      `}</style>
    </div>
  );
};

export default UpperPanel;
