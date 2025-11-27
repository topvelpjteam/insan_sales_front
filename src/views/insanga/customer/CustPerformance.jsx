/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 고객 실적 통합
 * - 파일명 : CustPerformance.jsx
 * - URL: /insanga/customer/custperformance
 * - VB6.0 : frm_SK585_I
 *
 * 프로시저: USP_SK585_I (고객 검색), USP_SD799_U (고객 통합)
 *
 * 설명:
 *   두 개의 고객을 검색하여 FROM 고객의 모든 거래 이력을 TO 고객으로 통합합니다.
 *   FROM 고객은 삭제됩니다.
 *
 * INPUT: 검색 조건 (USP_SK585_I)
 *   - agentNm: 매장명 (LIKE 검색)
 *   - custNm: 고객명 (LIKE 검색)
 *   - custHp: 휴대폰 (LIKE 검색)
 *   - userId: 사용자 ID
 *
 * OUTPUT: 고객 목록 (7개 컬럼)
 *   - agentId, agentNm: 소속매장코드, 소속매장명
 *   - custId, custNm: 고객코드, 고객명 (복호화)
 *   - custHp: 휴대폰번호 (복호화)
 *   - lastVisitD: 최종방문일
 *   - janMail: 잔여마일리지
 *
 * 통합 작업 (USP_SD799_U):
 *   - brandId: 브랜드코드 (필수)
 *   - fromCustId: FROM 고객코드 (삭제될 고객)
 *   - toCustId: TO 고객코드 (통합될 고객)
 ********************************************************************/

import React, { useState, useCallback } from "react";

import { useApiCallService } from "@/system/ApiCallService";
import { useLoading } from "@/system/hook/LoadingContext";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import { useCustomContents } from "@/system/hook/ManagerProvider";
import { useSelector } from "react-redux";
import { getAgentData } from "@/system/store/redux/agent";
import Properties from "@/system/Properties";
import { gridNoColumn } from "@/system/hook/CommonHook";
import { Input, Button, Select, Tooltip } from "antd";

const CustPerformance = ({ tabKey }) => {
  const user = useSelector((state) => state.user.user);
  const agentData = useSelector(getAgentData);

  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal, showConfirmModal } = useCustomContents();

  // 검색 조건 초기값 (USP_SK585_I 프로시저 데이터 기반)
  // - 매장명: "압구정" (현대백화점 압구정본점 등 검색 가능)
  // - 고객명: "강" (강씨 성을 가진 고객 검색 가능)
  const [fromFilters, setFromFilters] = useState({
    agentNm: "압구정",
    custNm: "",
    custHp: "",
  });

  const [toFilters, setToFilters] = useState({
    agentNm: "압구정",
    custNm: "강",
    custHp: "",
  });

  const [fromRowData, setFromRowData] = useState([]);
  const [toRowData, setToRowData] = useState([]);

  const [selectedFromCustomer, setSelectedFromCustomer] = useState(null);
  const [selectedToCustomer, setSelectedToCustomer] = useState(null);

  // 그리드 컬럼 정의 (USP_SK585_I 프로시저 OUTPUT 기준)
  const columnGroups = [
    gridNoColumn(),
    {
      headerName: "소속매장",
      field: "agentNm",
      flex: 1.5,
      minWidth: 120,
      cellClass: "text-left",
      tooltipField: "agentNm",
    },
    {
      headerName: "고객명",
      field: "custNm",
      flex: 1,
      minWidth: 80,
      cellClass: "text-left",
    },
    {
      headerName: "고객코드",
      field: "custId",
      flex: 1,
      minWidth: 80,
      cellClass: "text-center",
    },
    {
      headerName: "휴대폰번호",
      field: "custHp",
      flex: 1,
      minWidth: 110,
      cellClass: "text-center",
    },
    {
      headerName: "최종방문일",
      field: "lastVisitD",
      flex: 1,
      minWidth: 90,
      cellClass: "text-center",
    },
    {
      headerName: "잔여마일리지",
      field: "janMail",
      flex: 1,
      minWidth: 90,
      cellClass: "text-right",
      valueFormatter: (params) => {
        if (params.value == null) return "";
        return Number(params.value).toLocaleString();
      },
    },
  ];

  const handleFromFilterChange = useCallback((key, value) => {
    setFromFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleToFilterChange = useCallback((key, value) => {
    setToFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // FROM 고객 검색 (USP_SK585_I 프로시저 사용)
  const searchFromCustomers = useCallback(async () => {
    try {
      showLoading();

      const payload = {
        action: "selectSK585List",
        payload: {
          agentNm: fromFilters.agentNm || "",
          custNm: fromFilters.custNm || "",
          custHp: fromFilters.custHp || "",
          userId: user?.emplId || "ADMIN",
        },
      };

      console.log("FROM 고객 검색 요청:", payload);

      const res = await request(
        "domain/insanga/store/customer",
        payload,
        {},
        "post",
        "json"
      );

      console.log("FROM 고객 검색 응답:", res);

      const body = res?.data?.body;
      setFromRowData(body || []);
      setSelectedFromCustomer(null);

      if (body && body.length > 0) {
        showToast(`${body.length}건 조회되었습니다.`, "success");
      } else {
        showToast("조회된 데이터가 없습니다.", "info");
      }
    } catch (err) {
      console.error("FROM 고객 검색 실패:", err);
      showMessageModal("조회 중 오류가 발생했습니다.");
      setFromRowData([]);
    } finally {
      hideLoading();
    }
  }, [fromFilters, request, user, showLoading, hideLoading, showToast, showMessageModal]);

  // TO 고객 검색 (USP_SK585_I 프로시저 사용)
  const searchToCustomers = useCallback(async () => {
    try {
      showLoading();

      const payload = {
        action: "selectSK585List",
        payload: {
          agentNm: toFilters.agentNm || "",
          custNm: toFilters.custNm || "",
          custHp: toFilters.custHp || "",
          userId: user?.emplId || "ADMIN",
        },
      };

      console.log("TO 고객 검색 요청:", payload);

      const res = await request(
        "domain/insanga/store/customer",
        payload,
        {},
        "post",
        "json"
      );

      console.log("TO 고객 검색 응답:", res);

      const body = res?.data?.body;
      setToRowData(body || []);
      setSelectedToCustomer(null);

      if (body && body.length > 0) {
        showToast(`${body.length}건 조회되었습니다.`, "success");
      } else {
        showToast("조회된 데이터가 없습니다.", "info");
      }
    } catch (err) {
      console.error("TO 고객 검색 실패:", err);
      showMessageModal("조회 중 오류가 발생했습니다.");
      setToRowData([]);
    } finally {
      hideLoading();
    }
  }, [toFilters, request, user, showLoading, hideLoading, showToast, showMessageModal]);

  const handleFromRowSelected = useCallback((event) => {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      setSelectedFromCustomer(selectedRows[0]);
      console.log("FROM 고객 선택:", selectedRows[0]);
    } else {
      setSelectedFromCustomer(null);
    }
  }, []);

  const handleToRowSelected = useCallback((event) => {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      setSelectedToCustomer(selectedRows[0]);
      console.log("TO 고객 선택:", selectedRows[0]);
    } else {
      setSelectedToCustomer(null);
    }
  }, []);

  const handleMerge = useCallback(async () => {
    if (!selectedFromCustomer) {
      showMessageModal("삭제할 고객을 선택해주세요.");
      return;
    }

    if (!selectedToCustomer) {
      showMessageModal("통합대상 고객을 선택해주세요.");
      return;
    }

    if (selectedFromCustomer.custId === selectedToCustomer.custId) {
      showMessageModal("동일한 고객은 통합할 수 없습니다.");
      return;
    }

    showConfirmModal(
      `[${selectedFromCustomer.custNm}(${selectedFromCustomer.custId})]의 모든 거래 이력을 [${selectedToCustomer.custNm}(${selectedToCustomer.custId})]로 통합합니다.\n\nFROM 고객은 삭제됩니다. 계속하시겠습니까?`,
      async () => {
        try {
          showLoading();

          const payload = {
            action: "mergeCustomer",
            payload: {
              brandId: user?.brandId || "00001",
              fromCustId: selectedFromCustomer.custId,
              toCustId: selectedToCustomer.custId,
              userId: user?.emplId || "ADMIN",
            },
          };

          console.log("고객 통합 요청:", payload);

          const res = await request(
            "domain/insanga/store/customer",
            payload,
            {},
            "post",
            "json"
          );

          console.log("고객 통합 응답:", res);

          if (res?.data?.body?.status === "SUCCESS") {
            showToast("고객 실적이 통합되었습니다.", "success");
            setFromRowData([]);
            setToRowData([]);
            setSelectedFromCustomer(null);
            setSelectedToCustomer(null);
          } else {
            showMessageModal(res?.data?.body?.message || "고객 통합에 실패했습니다.");
          }
        } catch (err) {
          console.error("고객 통합 실패:", err);
          showMessageModal("고객 통합 중 오류가 발생했습니다.");
        } finally {
          hideLoading();
        }
      }
    );
  }, [selectedFromCustomer, selectedToCustomer, request, user, showLoading, hideLoading, showToast, showMessageModal, showConfirmModal]);

  // 파스텔 글라스모피즘 스타일 정의
  const glassStyleFrom = {
    background: "linear-gradient(135deg, rgba(254, 215, 215, 0.6) 0%, rgba(254, 202, 202, 0.4) 100%)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(252, 165, 165, 0.4)",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(252, 165, 165, 0.15)",
  };

  const glassStyleTo = {
    background: "linear-gradient(135deg, rgba(191, 219, 254, 0.6) 0%, rgba(147, 197, 253, 0.4) 100%)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(147, 197, 253, 0.4)",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(147, 197, 253, 0.15)",
  };

  const searchBoxStyle = {
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid rgba(255, 255, 255, 0.5)",
  };

  const titleStyleFrom = {
    background: "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)",
    color: "#7f1d1d",
    padding: "12px 16px",
    borderRadius: "8px 8px 0 0",
    fontWeight: 600,
    fontSize: "14px",
    letterSpacing: "0.5px",
  };

  const titleStyleTo = {
    background: "linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)",
    color: "#1e3a5f",
    padding: "12px 16px",
    borderRadius: "8px 8px 0 0",
    fontWeight: 600,
    fontSize: "14px",
    letterSpacing: "0.5px",
  };

  // 선택된 고객 카드 스타일
  const selectedCardStyle = {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "8px",
    padding: "12px 16px",
    margin: "0 16px",
    border: "2px solid",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  // 통합작업 버튼 툴팁 메시지
  const getMergeButtonTooltip = () => {
    if (!selectedFromCustomer && !selectedToCustomer) {
      return "양쪽 영역에서 각각 고객을 선택해주세요";
    }
    if (!selectedFromCustomer) {
      return "왼쪽 영역에서 삭제할 고객을 선택해주세요";
    }
    if (!selectedToCustomer) {
      return "오른쪽 영역에서 통합대상 고객을 선택해주세요";
    }
    return "선택한 고객 실적을 통합합니다";
  };

  return (
    <div className="content-registe-container">
      <div className="content-main-area" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)" }}>
        <div style={{ display: "flex", gap: "24px", height: "100%", padding: "16px" }}>
          {/* FROM 고객 검색 영역 (삭제할 고객) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, ...glassStyleFrom }}>
            <div style={titleStyleFrom}>
              통합할 고객검색 (삭제할 고객코드)
            </div>

            <div style={{ padding: "16px" }}>
              <div style={searchBoxStyle}>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px", minWidth: "140px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>매장명</label>
                    <Input
                      value={fromFilters.agentNm}
                      onChange={(e) => handleFromFilterChange("agentNm", e.target.value)}
                      placeholder="매장명 입력"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 180px", minWidth: "140px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>고객명</label>
                    <Input
                      value={fromFilters.custNm}
                      onChange={(e) => handleFromFilterChange("custNm", e.target.value)}
                      placeholder="고객명 입력"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 180px", minWidth: "140px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>휴대폰</label>
                    <Input
                      value={fromFilters.custHp}
                      onChange={(e) => handleFromFilterChange("custHp", e.target.value)}
                      placeholder="휴대폰번호 입력"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>
                  <div style={{ flex: "0 0 100px" }}>
                    <Button
                      type="primary"
                      danger
                      onClick={searchFromCustomers}
                      style={{ width: "100%", height: "36px", fontWeight: 600 }}
                    >
                      검색
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="ag-theme-alpine" style={{ flex: 1, margin: "0 16px", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <AgGridReact
                rowData={fromRowData}
                columnDefs={columnGroups}
                defaultColDef={{
                  sortable: Properties.grid.default.colDef.sortable,
                  filter: Properties.grid.default.colDef.filter,
                  resizable: Properties.grid.default.colDef.resizable,
                  minWidth: Properties.grid.default.colDef.minWidth,
                  tooltipValueGetter: (params) => params.value,
                }}
                rowHeight={Properties.grid.default.data.height}
                headerHeight={Properties.grid.default.header.height}
                domLayout={Properties.grid.default.domLayout}
                rowSelection="single"
                onSelectionChanged={handleFromRowSelected}
                suppressRowClickSelection={false}
                tooltipShowDelay={200}
                tooltipMouseTrack={true}
                pagination={Properties.grid.default.pagination}
                paginationPageSize={Properties.grid.default.pageSize}
                paginationPageSizeSelector={Properties.grid.default.pageSizeList}
                suppressPaginationPanel={false}
              />
            </div>

            {/* FROM 선택된 고객 표시 영역 */}
            <div style={{
              ...selectedCardStyle,
              borderColor: selectedFromCustomer ? "#f87171" : "#e5e7eb",
              marginTop: "12px",
              marginBottom: "16px",
              minHeight: "70px",
            }}>
              {selectedFromCustomer ? (
                <div>
                  <div style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600, marginBottom: "6px" }}>
                    삭제될 고객 (FROM)
                  </div>
                  <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>고객명: </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{selectedFromCustomer.custNm}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>고객코드: </span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{selectedFromCustomer.custId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>매장: </span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{selectedFromCustomer.agentNm}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  minHeight: "46px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}>
                  위 목록에서 삭제할 고객을 선택해주세요
                </div>
              )}
            </div>
          </div>

          {/* TO 고객 검색 영역 (통합대상) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, ...glassStyleTo }}>
            <div style={titleStyleTo}>
              통합대상 고객검색
            </div>

            <div style={{ padding: "16px" }}>
              <div style={searchBoxStyle}>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px", minWidth: "140px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>매장명</label>
                    <Input
                      value={toFilters.agentNm}
                      onChange={(e) => handleToFilterChange("agentNm", e.target.value)}
                      placeholder="매장명 입력"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 180px", minWidth: "140px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>고객명</label>
                    <Input
                      value={toFilters.custNm}
                      onChange={(e) => handleToFilterChange("custNm", e.target.value)}
                      placeholder="고객명 입력"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 180px", minWidth: "140px" }}>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>휴대폰</label>
                    <Input
                      value={toFilters.custHp}
                      onChange={(e) => handleToFilterChange("custHp", e.target.value)}
                      placeholder="휴대폰번호 입력"
                      style={{ width: "100%", height: "36px" }}
                    />
                  </div>
                  <div style={{ flex: "0 0 100px" }}>
                    <Button
                      type="primary"
                      onClick={searchToCustomers}
                      style={{ width: "100%", height: "36px", fontWeight: 600 }}
                    >
                      검색
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 통합 작업 영역 */}
            <div style={{
              margin: "0 16px 16px 16px",
              padding: "16px",
              background: "rgba(255, 251, 235, 0.9)",
              borderRadius: "8px",
              border: "1px solid rgba(251, 191, 36, 0.3)",
            }}>
              {/* 통합 미리보기 */}
              {selectedFromCustomer && selectedToCustomer ? (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "8px" }}>
                    <div style={{
                      background: "rgba(254, 202, 202, 0.8)",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "1px solid #fca5a5",
                    }}>
                      <div style={{ fontSize: "10px", color: "#dc2626", fontWeight: 600 }}>삭제</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#7f1d1d" }}>{selectedFromCustomer.custNm}</div>
                    </div>
                    <div style={{ fontSize: "20px", color: "#f59e0b" }}>→</div>
                    <div style={{
                      background: "rgba(191, 219, 254, 0.8)",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "1px solid #93c5fd",
                    }}>
                      <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: 600 }}>유지</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e3a5f" }}>{selectedToCustomer.custNm}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  textAlign: "center",
                  padding: "8px 0",
                  marginBottom: "12px",
                  color: "#6b7280",
                  fontSize: "13px",
                }}>
                  {getMergeButtonTooltip()}
                </div>
              )}

              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#92400e" }}>
                    통합사유
                  </label>
                  <Input.TextArea
                    rows={2}
                    placeholder="통합 사유를 입력하세요"
                    style={{ width: "100%", resize: "none" }}
                  />
                </div>
                <div style={{ flex: "0 0 120px" }}>
                  <Tooltip title={getMergeButtonTooltip()} placement="top">
                    <Button
                      type="primary"
                      onClick={handleMerge}
                      style={{
                        width: "100%",
                        height: "58px",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                      disabled={!selectedFromCustomer || !selectedToCustomer}
                    >
                      통합작업
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="ag-theme-alpine" style={{ flex: 1, margin: "0 16px", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <AgGridReact
                rowData={toRowData}
                columnDefs={columnGroups}
                defaultColDef={{
                  sortable: Properties.grid.default.colDef.sortable,
                  filter: Properties.grid.default.colDef.filter,
                  resizable: Properties.grid.default.colDef.resizable,
                  minWidth: Properties.grid.default.colDef.minWidth,
                  tooltipValueGetter: (params) => params.value,
                }}
                rowHeight={Properties.grid.default.data.height}
                headerHeight={Properties.grid.default.header.height}
                domLayout={Properties.grid.default.domLayout}
                rowSelection="single"
                onSelectionChanged={handleToRowSelected}
                suppressRowClickSelection={false}
                tooltipShowDelay={200}
                tooltipMouseTrack={true}
                pagination={Properties.grid.default.pagination}
                paginationPageSize={Properties.grid.default.pageSize}
                paginationPageSizeSelector={Properties.grid.default.pageSizeList}
                suppressPaginationPanel={false}
              />
            </div>

            {/* TO 선택된 고객 표시 영역 */}
            <div style={{
              ...selectedCardStyle,
              borderColor: selectedToCustomer ? "#60a5fa" : "#e5e7eb",
              marginTop: "12px",
              marginBottom: "16px",
              minHeight: "70px",
            }}>
              {selectedToCustomer ? (
                <div>
                  <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600, marginBottom: "6px" }}>
                    통합대상 고객 (TO)
                  </div>
                  <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>고객명: </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{selectedToCustomer.custNm}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>고객코드: </span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{selectedToCustomer.custId}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>매장: </span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{selectedToCustomer.agentNm}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  minHeight: "46px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}>
                  위 목록에서 통합대상 고객을 선택해주세요
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustPerformance);
