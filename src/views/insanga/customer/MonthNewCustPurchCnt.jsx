/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 월간 신규고객 구매회차 현황
 * - 파일명 : MonthNewCustPurchCnt.jsx
 * - URL: /insanga/customer/monthnewcustpurchcnt
 *
 * 상태: 월간 고객구매회차 현황(MonthExistCustPurchCnt)으로 통합됨
 *
 * 작성자: 김정명
 * 작성일: 2025-11-26
 ********************************************************************/

import React from "react";
import { Card, Alert, Typography, Space, Button } from "antd";
import { InfoCircleOutlined, SwapOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text, Paragraph } = Typography;

const MonthNewCustPurchCnt = () => {
  const navigate = useNavigate();

  const handleGoToMergedPage = () => {
    navigate("/insanga/customer/monthexistcustpurchcnt");
  };

  return (
    <div className="content-registe-container">
      <div className="content-main-area">
        <div className="content-center-panel" style={{ width: "100%", padding: "20px" }}>
          <Card
            style={{
              maxWidth: 700,
              margin: "40px auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <SwapOutlined style={{ fontSize: 64, color: "#1890ff" }} />
              </div>

              <Alert
                message="화면 통합 안내"
                description={
                  <div>
                    <Paragraph>
                      <Text strong>월간 신규고객 구매회차 현황</Text> 화면은
                      <Text strong> 월간 고객구매회차 현황</Text> 화면으로 통합되었습니다.
                    </Paragraph>
                    <Paragraph style={{ marginBottom: 0 }}>
                      통합된 화면에서 기존고객과 신규고객 구매회차 현황을 함께 확인할 수 있습니다.
                    </Paragraph>
                  </div>
                }
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />

              <Card type="inner" title="통합 내용" size="small">
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <Text type="secondary">기존 화면</Text>
                    <br />
                    <Text>월간 기존고객 구매회차 현황 (SK550)</Text>
                    <br />
                    <Text>월간 신규고객 구매회차 현황 (SK552)</Text>
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    <Text type="secondary">통합 화면</Text>
                    <br />
                    <Text strong>월간 고객구매회차 현황</Text>
                    <br />
                    <Text>- 기존고객/신규고객 피벗 그리드 상하 배치</Text>
                    <br />
                    <Text>- 동일 조회조건으로 동시 조회</Text>
                  </div>
                </Space>
              </Card>

              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleGoToMergedPage}
                  icon={<SwapOutlined />}
                >
                  통합 화면으로 이동
                </Button>
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MonthNewCustPurchCnt);
