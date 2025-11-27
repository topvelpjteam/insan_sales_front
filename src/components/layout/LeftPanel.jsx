import React, { useState, useMemo } from "react";
import SearchFilter from "@/components/etc/SearchFilter";
import Properties from "@/system/Properties";

/**
 * 좌측 패널 컴포넌트
 * 
 * @param {object} props
 * @param {object} codes - 코드 데이터
 * @param {object} filters - 검색 필터 값
 * @param {function} handleFilterChange - 필터 값 변경 핸들러
 * @param {Array} searchForm - 검색 폼 정의
 * @param {Array} buttons - 버튼 배열
 * @param {boolean} sidebarOpen - 부모에서 전달받는 패널 열림 상태
 * @param {number} leftWidth - 부모에서 전달받는 좌측 패널 너비(%)
 */
const LeftPanel = ({
  codes,
  filters,
  handleFilterChange,
  searchForm = [],
  buttons = [],
  handleInit,
  sidebarOpen = true,
  toggleSidebar = true,
  leftWidth,
  title = '조회조건',
  rowByDisplayCnt = 1,
  initialFilters,
  isUseInitBtn = true,
}) => {
  // -----------------------------
  // 렌더링
  // -----------------------------
  return (
    // <div className="content-left-panel" style={{
    //   width: `${leftWidth}%`,
    //   overflowY: "auto",     // ← 자동 세로 스크롤
    //   overflowX: "hidden",   // ← 가로 스크롤 방지 (선택)
    // }}>
    <div className='template-T'>
      <div className='search-filter'>
        {sidebarOpen ? (
          <>
            {/* <div className="content-panel-title content-panel-title-bg">{title}</div> */}
            <div className='title'><h4>{title}</h4><i className='ri-reset-left-line primary' /></div>
            <SearchFilter
              searchForm={searchForm}
              codes={codes}
              filters={filters}
              onFilterChange={handleFilterChange}
              buttons={buttons}
              handleInit={handleInit}
              leftWidth={leftWidth}
              rowByDisplayCnt={rowByDisplayCnt}
              initialFilters={initialFilters}
              isUseInitBtn={isUseInitBtn}
            />

            {/* <button
            className="toggle-sidebar-button-left"
            onClick={() => toggleSidebar(false)}
          >
            {"<"}
          </button> */}

            {/* 개발용 centerWidth 확인 */}
            {/* <div className="debug-width-info">Center Width: {centerWidth.toFixed(2)}%</div> */}
          </>
        ) : (
          <button
            className="toggle-sidebar-button-left-closed"
            onClick={() => toggleSidebar(true)}
          >
            {">"}
          </button>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;
