/*********************************************************************
 * 화면명: 매장별 월간 고객수 현황
 * 파일명: AgentMonthCustCnt.jsx
 * 경로: /insanga/customer/agentmonthcustcnt
 *
 * VB6.0 화면: frm_SK540_Q (또는 SK545)
 * 프로시저: USP_SK540_Q / USP_SK545_Q
 *
 * [프로시저 상태: 확인 필요]
 * - 현재 USP_SK540_Q, USP_SK545_Q 모두 매장 목록(AGENT_ID, AGENT_NM)만 반환
 * - VB6.0 원본에서는 정상 작동하는 것으로 확인됨
 * - PDF 스크린샷만으로는 실제 사용 프로시저 확인 불가
 * - VB6.0 소스코드 또는 추가 문서 확인 필요
 *
 * 작성자: 김정명
 * 작성일: 2025-11-25
 ********************************************************************/

import React from "react";

const AgentMonthCustCnt = () => {
  return (
    <div className="content-registe-container">
      <div className="content-main-area">
        <div className="content-center-panel" style={{ width: "100%", padding: "20px" }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "400px",
            backgroundColor: "#fafafa",
            border: "1px dashed #d9d9d9",
            borderRadius: "8px"
          }}>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#333", marginBottom: "12px" }}>
              매장별 월간 고객수 현황
            </div>
            <div style={{ fontSize: "14px", color: "#666", textAlign: "center", lineHeight: "1.8" }}>
              <div>프로시저 미완성 상태입니다.</div>
              <div style={{ marginTop: "8px", padding: "12px", backgroundColor: "#fff3cd", borderRadius: "4px", color: "#856404" }}>
                USP_SK540_Q / USP_SK545_Q 프로시저가 매장 목록만 반환하고 있습니다.<br/>
                월간 고객수 데이터를 반환하도록 프로시저 개발이 필요합니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AgentMonthCustCnt);
