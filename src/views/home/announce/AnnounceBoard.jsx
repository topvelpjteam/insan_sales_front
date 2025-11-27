import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-alpine.css";
import Properties from "@/system/Properties";
import Paging from "@/components/common/Paging";
import FrameModal from "@/components/popup/FrameModal";

import { useLoading } from "@/system/hook/LoadingContext"; // ✅ 추가
//import { useLogout } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";

ModuleRegistry.registerModules([AllCommunityModule]); // AG GRID사용을 위한 코드

const AnnounceBoard = ({ tabKey }) => {
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading(); // ✅ 글로벌 로딩 훅 사용

  const [pageSize, setPageSize] = useState(Properties.grid.default.pageSize);
  const [pageNo, setPageNo] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    category: "",
    important: "",
    search: "",
  });
  const [codes, setCodes] = useState({
    announceCategory: [],
    dataStatus: [],
    yesNoCode: [],
  });
  const [rowData, setRowData] = useState([]);
  const [modal, setModal] = useState({ visible: false, id: null });

  /** 🔹 공통 코드 조회 : 페이지 로딩시 실행됨. */
  const fetchCodes = useCallback(async () => {
    try {
      const codeGroups = [
        { key: "announceCategory", codeGroupCode: "announceCategory" },
        { key: "dataStatus", codeGroupCode: "dataStatus" },
        { key: "yesNoCode", codeGroupCode: "yesNoCode" },
      ];

      const results = await Promise.all(
        codeGroups.map(async ({ key, codeGroupCode }) => {
          const res = await request(
            "domain/system/codeSystem",
            { action: "selectCodeNameList", payload: { codeGroupCode } },
            {},
            "post"
          );
          return { key, data: res?.data?.body || [] };
        })
      );

      const updated = results.reduce((acc, { key, data }) => {
        acc[key] = Array.isArray(data) ? data : [];
        return acc;
      }, {});
      setCodes(updated);
    } catch (err) {
      console.error("공통 코드 조회 실패:", err);
    }
  }, []);

  /** 🔹리스트 조회 */
  const fetchData = useCallback(
    async (page = 1, size = pageSize) => {
      try {
        showLoading();
        const payload = {
          action: "selectPageList",
          payload: {
            announceCategoryId: filters.category,
            importantYnCode: filters.important,
            searchWord: filters.search,
            orderItems: "announce_date desc",
            pageSize: size,
            pageNo: page,
          },
        };

        const res = await request("domain/system/announce", payload, {}, "post");
        const body = res?.data?.body;
        setRowData(body?.pagingList || []);
        setTotalPages(body?.pagingInfo?.pageCount || 1);
        setPageNo(page);
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    [filters, pageSize]
  );

  /** 초기 데이터 로드 */
  useEffect(() => {
    (async () => {
      await fetchCodes();
      await fetchData(1);
    })();
  }, [fetchCodes, fetchData]);

  /** 컬럼 정의 : 컬럼을 파일로 따로 작성 할 지 고민 중.. */
  const colDefs = useMemo(
    () => [
      {
        headerName: "No.",
        valueGetter: (params) => (pageNo - 1) * pageSize + params.node.rowIndex + 1,
        width: 80,
        cellStyle: { ...Properties.grid.centerCellStyle, fontSize: 13 },
      },
      {
        field: "announceDate",
        headerName: "공지일",
        flex: 1,
        cellStyle: Properties.grid.centerCellStyle,
      },
      {
        field: "title",
        headerName: "제목",
        flex: 2,
        valueGetter: ({ data }) => {
          const important = data.importantYnCode === "Y" ? `${data.importantYnName} / ` : "";
          return `${data.announceCategoryName} / ${important}${data.title}`;
        },
        cellStyle: Properties.grid.leftCellStyle,
      },
      {
        field: "workerLoginName",
        headerName: "작성자",
        flex: 1,
        cellStyle: Properties.grid.leftCellStyle,
      },
      {
        field: "viewCount",
        headerName: "조회수",
        width: 100,
        cellStyle: Properties.grid.rightCellStyle,
      },
    ],
    [pageNo, pageSize]
  );

  /** 검색 핸들러 */
  const handleSearch = () => fetchData(1);
  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") fetchData(1);
    },
    [fetchData]
  );

  /** 더블 클릭 시 상세보기 */
  const handleRowDoubleClick = ({ data }) => {
    if (data?.announceId) setModal({ visible: true, id: data.announceId });
  };

  return (
    <div className="announce-container">
      {/* 🔍 검색 영역 */}
      <div className="announce-search-bar">
        <div className="announce-search-group">
          <table className="announce-table">
            <tbody>
              <tr>
                <th>공지분류</th>
                <td>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                    className="announce-select"
                  >
                    <option value="">전체</option>
                    {codes.announceCategory.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.codeName}
                      </option>
                    ))}
                  </select>
                </td>
                <th>중요여부</th>
                <td>
                  <select
                    value={filters.important}
                    onChange={(e) => handleFilterChange("important", e.target.value)}
                    className="announce-select"
                  >
                    <option value="">전체</option>
                    {codes.yesNoCode.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.codeName}
                      </option>
                    ))}
                  </select>
                </td>
                <th>검색어</th>
                <td>
                  <input
                    type="text"
                    placeholder="검색어 입력"
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="announce-input"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* 🔹 검색 버튼 우측 정렬 div */}
          <div className="announce-search-btn-wrapper">
            <button
              onClick={() => {
                handleSearch();
              }}
              className="announce-btn"
            >
              검색
            </button>
            {/* <button onClick={handleSearch} className="announce-btn" disabled={loading}>
              {loading ? <span className="loader"></span> : "검색"}
            </button> */}
          </div>
        </div>
      </div>

      {/* 📋 AG Grid */}
      <div className="ag-theme-alpine announce-grid">
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 50,
          }}
          rowHeight={30}
          headerHeight={28}
          //domLayout="autoHeight"
          onRowDoubleClicked={handleRowDoubleClick}
        />
      </div>

      {/* 🔢 페이징 */}
      <Paging
        pageNo={pageNo}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={(page) => fetchData(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          fetchData(1, size);
        }}
      />

      {/* 🪟 상세보기 모달 */}
      {modal.visible && (
        <FrameModal title="상세보기" onClose={() => setModal({ visible: false, id: null })}>
          <AnnounceDetail
            announceId={modal.id}
            rowData={rowData}
            onClose={() => setModal({ visible: false, id: null })}
          />
        </FrameModal>
      )}
    </div>
  );
};

/* -------------------- 상세보기 -------------------- */
const AnnounceDetail = ({ announceId, rowData = [], onClose }) => {
  const { request } = useApiCallService();
  const [detail, setDetail] = useState(null);
  const [prevNext, setPrevNext] = useState({ prev: null, next: null });

  const fetchDetail = useCallback(
    async (id = announceId) => {
      try {
        await request(
          "domain/system/announce",
          { action: "updateViewCount", payload: { announceId: id } },
          {},
          "post"
        );

        const index = rowData.findIndex((r) => r.announceId === id);
        if (index === -1) return;

        setDetail(rowData[index]);
        setPrevNext({
          prev: rowData[index - 1] || null,
          next: rowData[index + 1] || null,
        });
      } catch (err) {
        console.error("상세 조회 실패:", err);
      }
    },
    [announceId, rowData]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (!detail) return <div>로딩 중...</div>;

  return (
    <div className="announce-detail">
      {/* 🔸 헤더 */}
      <div className="announce-header-info">
        <span className="category">{detail.announceCategoryName}</span>
        {detail.importantYnCode === "Y" && <span className="important active">중요</span>}
      </div>

      {/* 제목 */}
      <h2 className="announce-detail-title" title={detail.title}>
        {detail.title}
      </h2>

      {/* 기본정보 */}
      <table className="announce-table">
        <tbody>
          <tr>
            <th>작성자</th>
            <td>{detail.workerLoginName}</td>
            <th>작성일</th>
            <td>{detail.createDatetime}</td>
            <th>수정일</th>
            <td>{detail.updateDatetime}</td>
          </tr>
          <tr>
            <th>공지일</th>
            <td>{detail.announceDate}</td>
            <th>조회수</th>
            <td>{detail.viewCount}</td>
          </tr>
        </tbody>
      </table>

      {/* 내용 */}
      <div
        className="announce-content"
        dangerouslySetInnerHTML={{ __html: detail.content || "" }}
      />

      {/* 이전/다음글 + 닫기 */}
      <div className="announce-footer">
        <div className="announce-prevnext">
          {prevNext.prev ? (
            <div onClick={() => fetchDetail(prevNext.prev.announceId)} className="announce-prev">
              ◀ {prevNext.prev.title}
            </div>
          ) : (
            <div className="announce-prev disabled">◀ 이전글 없음</div>
          )}
          {prevNext.next ? (
            <div onClick={() => fetchDetail(prevNext.next.announceId)} className="announce-next">
              {prevNext.next.title} ▶
            </div>
          ) : (
            <div className="announce-next disabled">다음글 없음 ▶</div>
          )}
        </div>

        <div className="announce-close-wrapper">
          <button className="announce-close-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnounceBoard;
