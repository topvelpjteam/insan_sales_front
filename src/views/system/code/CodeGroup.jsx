import React, { useState, useEffect, useMemo, useCallback } from "react";
import "ag-grid-community/styles/ag-theme-alpine.css";
import Properties from "@/system/Properties";
import Paging from "@/components/common/Paging";
import FrameModal from "@/components/popup/FrameModal";
import { useLoading } from "@/system/hook/LoadingContext"; // ✅ 추가


import { useApiCallService } from "@/system/ApiCallService";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

const CodeGroup = ({ tabKey }) => {

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading(); // ✅ 글로벌 로딩 훅 사용

  const [gridApi, setGridApi] = useState(null);
  const [pageSize, setPageSize] = useState(Properties.grid.default.pageSize);
  const [pageNo, setPageNo] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(1);
  const [filters, setFilters] = useState({ codeTypeCode: "", searchWord: "", worker: "", dataStatusCode: "", updateDateFrom: "", updateDateTo: "" });
  const [codes, setCodes] = useState({ codeTypeCode: [], dataStatus: [] });
  const [rowData, setRowData] = useState([]);
  const [modal, setModal] = useState({ visible: false, id: null });

  /** 공통 코드 조회 */
  const fetchCodes = useCallback(async () => {
    try {
      const groups = [
        { key: "codeTypeCode", codeGroupCode: "codeType" },
        { key: "dataStatus", codeGroupCode: "dataStatus" },
        //{ key: "yesNoCode", codeGroupCode: "yesNoCode" },
      ];

      const results = await Promise.all(
        groups.map(async ({ key, codeGroupCode }) => {
          const res = await request(
            Properties.requestUrl.codeSystem.url,
            { action: Properties.requestUrl.codeSystem.action, payload: { codeGroupCode } },
            {},
            "post"
          );
          return { key, data: res?.data?.body || [] };
        })
      );

      setCodes(
        results.reduce((acc, { key, data }) => {
          acc[key] = Array.isArray(data) ? data : [];
          return acc;
        }, {})
      );
    } catch (err) {
      console.error("공통 코드 조회 실패:", err);
    }
  }, [request]);

  /** 엑셀 다운로드를 위한 컬럼 정의 */
  const columnInfos = useMemo(() => [
    { id: 'select', type: 'checkbox', align: 'center', name: '', width: '28', visibility: true, etc: '' },
    { id: 'codeGroupCode', type: 'text', align: 'left', name: '코드그룹 코드', width: '200', visibility: true, etc: '' },
    { id: 'codeGroupName', type: 'text', align: 'left', name: '코드그룹 명', width: '250', visibility: true, etc: '' },
    { id: 'codeTypeName', type: 'text', align: 'center', name: '코드 타입', width: '120', visibility: true, etc: '' },
    { id: 'dataStatusName', type: 'text', align: 'center', name: '자료 상태', width: '100', visibility: true, etc: '' },
    { id: 'workerLoginName', type: 'text', align: 'left', name: '작업자', width: '100', visibility: true, etc: '' },
    { id: 'updateDatetime', type: 'text', align: 'center', name: '갱신일시', width: '135', visibility: true, etc: '' },
  ], []);

  const fetchData = useCallback(
    async ({ action = "selectPageList", page = 1, size = pageSize }) => {
      try {
        showLoading();
        const payload = {
          action,
          payload: {
            codeTypeCode: filters.codeTypeCode,
            searchWord: filters.searchWord,
            worker: filters.worker,
            dataStatusCode: filters.dataStatusCode,
            updateDateFrom: filters.updateDateFrom,
            updateDateTo: filters.updateDateTo,
            orderItems: "code_group_name asc",
            pageSize: size,
            pageNo: page,
          },
        };

        /** ✅ 엑셀 다운로드 요청일 경우 */
        if (action === "downloadList") {
          payload.payload['listColumnInfo'] = JSON.stringify(columnInfos);
          const res = await request(
            "domain/system/codeGroup",
            payload,
            {},
            "post",
            'blob',
          );
          if (!res?.data) {
            alert("엑셀 파일을 생성하지 못했습니다.");
            return;
          }

          // ✅ Content-Disposition에서 파일명 추출
          const disposition = res.headers?.["content-disposition"];
          let filename = "codeGroup.xlsx";

          if (disposition && disposition.includes("filename")) {
            const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;"']+)/i);
            if (match && match[1]) {
              filename = decodeURIComponent(match[1].trim().replaceAll('"', ""));
            }
          }

          // ✅ Blob 생성 (MIME 타입 명시)
          const blob = new Blob([res?.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          // ✅ 다운로드 링크 생성 및 클릭
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          return; // 다운로드 후 종료
        }

        /** ✅ 일반 목록 조회 (기존 로직) */
        const res = await request("domain/system/codeGroup", payload, {}, "post", 'json');
        const body = res?.data?.body;
        setRowData(body?.pagingList || []);
        setTotalPages(body?.pagingInfo?.pageCount || 1);
        setTotalCount(body?.pagingInfo?.totalCount || 0);
        setPageNo(page);
      } catch (err) {
        console.error("데이터 조회 실패:", err);
        alert("데이터 처리 중 오류가 발생했습니다.");
      } finally {
        //setLoading(false);
        hideLoading(); // ✅ 오버레이 제거
      }
    },
    [filters, pageSize, columnInfos, hideLoading, showLoading]
  );


  // const fetchData = useCallback(
  //   async ({ action = "selectPageList", page = 1, size = pageSize }) => {
  //     try {
  //       console.log("action", action);
  //       setLoading(true);

  //       const payload = {
  //         action,
  //         payload: {
  //           codeTypeCode: filters.codeTypeCode,
  //           searchWord: filters.searchWord,
  //           worker: filters.worker,
  //           dataStatusCode: filters.dataStatusCode,
  //           updateDateFrom: filters.updateDateFrom,
  //           updateDateTo: filters.updateDateTo,
  //           orderItems: "code_group_name asc",
  //           pageSize: size,
  //           pageNo: page,
  //         },
  //       };

  //       /** ✅ [1] 엑셀 다운로드 요청일 경우 — form submit 사용 */
  //       if (action === "downloadList") {
  //         const form = document.createElement("form");
  //         form.method = "POST";
  //         form.action = `http://localhost:5174/api/v1/domain/system/codeGroup`; // ✅ 실제 서버 주소에 맞게 수정
  //         form.style.display = "none";

  //         // JSON 전체를 하나의 hidden input으로 추가
  //         const input = document.createElement("input");
  //         input.type = "hidden";
  //         input.name = "jsonData"; // 백엔드에서 받을 파라미터명 (예: request.getParameter("jsonData"))
  //         input.value = JSON.stringify(payload);
  //         form.appendChild(input);

  //         // JWT 토큰이나 세션 값이 필요할 경우 추가
  //         // const token = localStorage.getItem("accessToken");
  //         // if (token) {
  //         //   const tokenInput = document.createElement("input");
  //         //   tokenInput.type = "hidden";
  //         //   tokenInput.name = "Authorization";
  //         //   tokenInput.value = `Bearer ${token}`;
  //         //   form.appendChild(tokenInput);
  //         // }

  //         document.body.appendChild(form);
  //         form.submit();
  //         document.body.removeChild(form);

  //         return; // ✅ 다운로드 이후 목록 조회는 하지 않음
  //       }

  //       /** ✅ [2] 일반 목록 조회 */
  //       const res = await request("domain/system/codeGroup", payload, {}, "post");
  //       const body = res?.data?.body;
  //       console.log(res);
  //       setRowData(body?.pagingList || []);
  //       setTotalPages(body?.pagingInfo?.pageCount || 1);
  //       setTotalCount(body?.pagingInfo?.totalCount || 0);
  //       setPageNo(page);
  //     } catch (err) {
  //       console.error("데이터 조회 실패:", err);
  //       alert("데이터 처리 중 오류가 발생했습니다.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   },
  //   [filters, pageSize, http]
  // );

  useEffect(() => {
    (async () => {
      await fetchCodes();
      await fetchData({ page: 1 });
    })();
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback((action) => {
    fetchData({ action: action, page: 1 });
  }, [fetchData]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") fetchData({ page: 1 });
    },
    [fetchData]
  );

  const handleRowDoubleClick = useCallback(({ data }) => {
    if (data?.announceId) setModal({ visible: true, id: data.announceId });
  }, []);

  const colDefs = useMemo(
    () => [
      {
        headerName: "",
        checkboxSelection: true, // (params) => !params.node.group, // 그룹 행에는 비활성화
        headerCheckboxSelection: true, // 헤더에 전체 선택 체크박스 표시
        width: 50,
        pinned: "left", // (선택) 왼쪽 고정
        cellStyle: Properties.grid.centerCellStyle,
      },
      {
        headerName: "No.",
        valueGetter: (params) => (pageNo - 1) * pageSize + params.node.rowIndex + 1,
        width: 80,
        cellStyle: { ...Properties.grid.centerCellStyle, fontSize: 13 },
        sortable: false,
        filter: false,
      },
      {
        field: "codeGroupCode", headerName: "코드그룹 코드", flex: 1, cellStyle: Properties.grid.leftCellStyle,
        sortable: true,
        filter: true,
      },
      { field: "codeGroupName", headerName: "코드그룹 명", flex: 1, cellStyle: Properties.grid.leftCellStyle },
      { field: "codeTypeName", headerName: "코드그룹 타입", flex: 1, cellStyle: Properties.grid.leftCellStyle },
      { field: "dataStatusName", headerName: "자료 상태", flex: 1, cellStyle: Properties.grid.centerCellStyle },
      { field: "workerLoginName", headerName: "작업자", flex: 1, cellStyle: Properties.grid.leftCellStyle },
      { field: "updateDatetime", headerName: "갱신일시", flex: 1, cellStyle: Properties.grid.centerCellStyle },
    ],
    [pageNo, pageSize]
  );
  return (
    <div className="announce-container">
      {/* 🔍 검색 영역 */}
      <div className="announce-search-bar">
        <div className="announce-search-group">
          <table className="announce-table">
            <tbody>
              <tr>
                <th>코드타입</th>
                <td>
                  <select
                    value={filters.codeTypeCode}
                    onChange={(e) => handleFilterChange("codeTypeCode", e.target.value)}
                    className="announce-select"
                  >
                    <option value="">전체</option>
                    {codes.codeTypeCode.map((c) => (
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
                    value={filters.searchWord}
                    onChange={(e) => handleFilterChange("searchWord", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="announce-input"
                  />
                </td>

                <th>작업/작성자</th>
                <td>
                  <input
                    type="text"
                    placeholder="작업/작성자"
                    value={filters.worker}
                    onChange={(e) => handleFilterChange("worker", e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="announce-input"
                  />
                </td>

                <th>자료상태</th>
                <td>
                  <select
                    value={filters.dataStatusCode}
                    onChange={(e) => handleFilterChange("dataStatusCode", e.target.value)}
                    className="announce-select"
                  >
                    <option value="">전체</option>
                    {codes.dataStatus.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.codeName}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              <tr>
                <th>갱신일</th>
                <td colSpan={7}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="date"
                      value={filters.updateDateFrom || ""}
                      onChange={(e) => handleFilterChange("updateDateFrom", e.target.value)}
                      className="announce-input"
                    />
                    <span>~</span>
                    <input
                      type="date"
                      value={filters.updateDateTo || ""}
                      onChange={(e) => handleFilterChange("updateDateTo", e.target.value)}
                      className="announce-input"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 🔹 검색 버튼 우측 정렬 div */}
          <div className="announce-search-btn-wrapper">
            {/* <button onClick={() => { handleSearch('selectPageList'); }} className="announce-btn" >
              <span className="loader"></span> : "검색"
            </button>
        */}

            <button
              onClick={() => {
                handleSearch('selectPageList');
              }}
              className="announce-btn"
            >
              검색
            </button>


            <button
              onClick={() => {
                handleSearch('downloadList');
              }}
              className="announce-btn-excel"
            >
              엑셀 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 📋 AG Grid */}
      <div className="ag-theme-alpine announce-grid">
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={{
            sortable: false,
            filter: false,
            resizable: true,
            minWidth: 50,
          }}
          rowHeight={30}
          headerHeight={28}
          //domLayout="autoHeight"
          onRowDoubleClicked={handleRowDoubleClick}
          onGridReady={(params) => setGridApi(params.api)} // 🔹 gridApi 저장
          //enableExcelExport={false}
          rowSelection="multiple"   // ✅ 필수 multiple, single
        //suppressRowClickSelection={true} // ✅ 클릭 시 행 선택 방지(체크박스만으로 선택)
        />
      </div>
      {/* ✅ 전체 화면 로딩 오버레이 */}
      {/* {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">데이터를 불러오는 중...</div>
        </div>
      )} */}
      <Paging
        pageNo={pageNo}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={(page) => fetchData({ page })}
        onPageSizeChange={(size) => {
          setPageSize(size);
          fetchData({ page: 1, size });
        }}
      />
    </div>
  );
};

export default CodeGroup;
