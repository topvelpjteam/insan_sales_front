/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 고객등급별 판매 현황
 * - 파일명 : GradeSalesStatus.jsx
 * - URL: /insanga/customer/gradesalesstatus
 * - VB6.0 화면: 미확인 (VB6.0 소스코드 없음)
 * - 프로시저: 미확인
 *
 * 상태: VB6.0 원본 소스코드 확인 필요
 *
 * 작성자: 김정명
 * 작성일: 2025-11-26
 ********************************************************************/

import React from "react";
import { Card, Alert, Typography, Space } from "antd";
import { ExclamationCircleOutlined, FileUnknownOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const GradeSalesStatus = () => {
  return (
    <div className="content-registe-container">
      <div className="content-main-area">
        <div className="content-center-panel" style={{ width: "100%", padding: "20px" }}>
          <Card
            style={{
              maxWidth: 800,
              margin: "40px auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <FileUnknownOutlined style={{ fontSize: 64, color: "#faad14" }} />
              </div>

              <Alert
                message="VB6.0 원본 소스코드 확인 필요"
                description={
                  <div>
                    <Paragraph>
                      <Text strong>고객등급별 판매 현황</Text> 화면은 VB6.0 원본 소스코드가
                      확인되지 않아 개발이 보류된 상태입니다.
                    </Paragraph>
                    <Paragraph>
                      개발을 진행하려면 다음 정보가 필요합니다:
                    </Paragraph>
                  </div>
                }
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
              />

              <Card type="inner" title="확인 필요 항목" size="small">
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <Text type="secondary">1. VB6.0 화면 파일명</Text>
                    <br />
                    <Text>예: frm_SK5XX_Q.frm</Text>
                  </div>
                  <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <Text type="secondary">2. 프로시저명</Text>
                    <br />
                    <Text>예: USP_SK5XX_Q</Text>
                  </div>
                  <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <Text type="secondary">3. INPUT 파라미터 정보</Text>
                    <br />
                    <Text>조회조건 (기간, 브랜드, 매장 등)</Text>
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    <Text type="secondary">4. OUTPUT 컬럼 정보</Text>
                    <br />
                    <Text>그리드에 표시할 데이터 컬럼</Text>
                  </div>
                </Space>
              </Card>

              <Card type="inner" title="예상 기능 (참고)" size="small">
                <Paragraph style={{ marginBottom: 8 }}>
                  유사 화면(연령대별 판매 현황, 구매금액별 판매 현황)을 참고하면,
                  다음과 같은 기능이 예상됩니다:
                </Paragraph>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>조회조건: 기간, 브랜드, 매장, 상품분류 등</li>
                  <li>고객등급별 고객수, 판매금액, 판매수량</li>
                  <li>등급별 비율, IPT, AUS 등 지표</li>
                </ul>
              </Card>

              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  backgroundColor: "#fafafa",
                  borderRadius: "4px",
                }}
              >
                <Text type="secondary">
                  VB6.0 소스코드 또는 프로시저 정보가 확인되면 개발을 진행하겠습니다.
                </Text>
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GradeSalesStatus);
