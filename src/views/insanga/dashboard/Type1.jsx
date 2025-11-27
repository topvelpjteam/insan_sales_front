import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Radar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ScatterChart, Scatter,
  ComposedChart
} from "recharts";

// ---------------------------------------------------------
// 1. 데이터셋 정의 (색상 수정: campaigns -> #B39DDB)
// ---------------------------------------------------------
const DATASETS = {
  customers: {
    title: "총고객수", unit: "명", color: "#90CAF9",
    history: [
      { name: '1월', value: 120000 }, { name: '2월', value: 121500 }, { name: '3월', value: 122800 },
      { name: '4월', value: 123500 }, { name: '5월', value: 124200 }, { name: '6월', value: 125000 },
      { name: '7월', value: 125800 }, { name: '8월', value: 126300 }, { name: '9월', value: 126900 },
      { name: '10월', value: 127100 }, { name: '11월', value: 127300 }, { name: '12월', value: 127540, salesValue: 452 },
    ],
    scatterData: [
      { x: 250, y: 120, z: 2000 }, { x: 300, y: 150, z: 3500 }, { x: 350, y: 180, z: 4000 },
      { x: 400, y: 200, z: 5000 }, { x: 450, y: 220, z: 6000 }, { x: 500, y: 250, z: 7500 },
    ],
    breakdown: [{ name: "VIP", value: 12000 }, { name: "Gold", value: 35000 }, { name: "Silver", value: 50000 }, { name: "General", value: 30540 }]
  },
  sales: {
    title: "총매출", unit: "억", color: "#A5D6A7",
    history: [
      { name: '1월', value: 250, online: 150, offline: 100 }, { name: '2월', value: 280, online: 180, offline: 100 },
      { name: '3월', value: 310, online: 200, offline: 110 }, { name: '4월', value: 300, online: 190, offline: 110 },
      { name: '5월', value: 350, online: 230, offline: 120 }, { name: '6월', value: 380, online: 250, offline: 130 },
      { name: '7월', value: 400, online: 270, offline: 130 }, { name: '8월', value: 415, online: 280, offline: 135 },
      { name: '9월', value: 430, online: 290, offline: 140 }, { name: '10월', value: 440, online: 300, offline: 140 },
      { name: '11월', value: 448, online: 305, offline: 143 }, { name: '12월', value: 452, online: 310, offline: 142 },
    ],
    breakdown: [{ name: "온라인", value: 252 }, { name: "오프라인", value: 100 }, { name: "모바일앱", value: 80 }, { name: "B2B", value: 20 }]
  },
  campaigns: {
    title: "활성 캠페인", unit: "개", color: "#B39DDB", // 노란색(#FFF59D)에서 보라색(#B39DDB)으로 수정 (가독성 개선)
    history: [
      { name: '1월', value: 5 }, { name: '2월', value: 8 }, { name: '3월', value: 12 },
      { name: '4월', value: 10 }, { name: '5월', value: 15 }, { name: '6월', value: 18 },
      { name: '7월', value: 20 }, { name: '8월', value: 19 }, { name: '9월', value: 22 },
      { name: '10월', value: 25 }, { name: '11월', value: 28 }, { name: '12월', value: 24 },
    ],
    breakdown: [{ name: "이메일", value: 8 }, { name: "SMS", value: 5 }, { name: "푸시알림", value: 7 }, { name: "SNS광고", value: 4 }]
  },
  agents: {
    title: "상담원수", unit: "명", color: "#FFAB91",
    history: [
      { name: '1월', value: 10 }, { name: '2월', value: 11 }, { name: '3월', value: 12 },
      { name: '4월', value: 12 }, { name: '5월', value: 14 }, { name: '6월', value: 15 },
      { name: '7월', value: 15 }, { name: '8월', value: 16 }, { name: '9월', value: 17 },
      { name: '10월', value: 17 }, { name: '11월', value: 17 }, { name: '12월', value: 18 },
    ],
    breakdown: [{ name: "기술지원", value: 6 }, { name: "일반문의", value: 8 }, { name: "결제/환불", value: 3 }, { name: "VIP전담", value: 1 }]
  },
  channels: {
    title: "채널수", unit: "개", color: "#EF9A9A",
    history: [
      { name: '1월', value: 2 }, { name: '2월', value: 2 }, { name: '3월', value: 3 },
      { name: '4월', value: 3 }, { name: '5월', value: 4 }, { name: '6월', value: 4 },
      { name: '7월', value: 5 }, { name: '8월', value: 5 }, { name: '9월', value: 5 },
      { name: '10월', value: 6 }, { name: '11월', value: 6 }, { name: '12월', value: 6 },
    ],
    breakdown: [{ name: "Web", value: 1 }, { name: "iOS", value: 1 }, { name: "Android", value: 1 }, { name: "Store", value: 1 }, { name: "Call", value: 1 }, { name: "Chatbot", value: 1 }]
  },
  referrals: {
    title: "소개인수", unit: "명", color: "#80CBC4",
    history: [
      { name: '1월', value: 150 }, { name: '2월', value: 300 }, { name: '3월', value: 550 },
      { name: '4월', value: 800 }, { name: '5월', value: 1200 }, { name: '6월', value: 1500 },
      { name: '7월', value: 1800 }, { name: '8월', value: 2100 }, { name: '9월', value: 2400 },
      { name: '10월', value: 2600 }, { name: '11월', value: 2750 }, { name: '12월', value: 2840 },
    ],
    breakdown: [{ name: "친구추천", value: 1500 }, { name: "블로그", value: 800 }, { name: "제휴사", value: 400 }, { name: "기타", value: 140 }]
  }
};

const PIE_COLORS = ["#90CAF9", "#A5D6A7", "#B39DDB", "#FFAB91", "#EF9A9A", "#80CBC4"]; // PIE_COLORS 배열에도 반영
const STACK_COLORS = { online: "#A5D6A7", offline: "#E6EE9C" };

// 차트 타입 목록 정의 및 표시 이름 축약
const TREND_CHART_TYPES = [
  { value: 'Line', label: 'Line' },
  { value: 'Bar', label: 'Bar' },
  { value: 'Area', label: 'Area' },
  { value: 'StackedArea', label: 'S.Area' },
  { value: 'StackedBar', label: 'S.Bar' },
  { value: 'Scatter', label: 'Scatter' },
  { value: 'Composed', label: 'Comp.' },
];

// ---------------------------------------------------------
// 2. 커스텀 툴팁 (기존 유지)
// ---------------------------------------------------------
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const isTimeSeries = label !== undefined;

    // Composed/Stacked Chart용 상세 툴팁
    if (payload.length > 1 || payload[0].stackId) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          border: '1px solid #ddd',
          borderRadius: '10px',
          padding: '8px 12px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          fontFamily: '"Nunito", sans-serif',
          zIndex: 1000
        }}>
          {isTimeSeries && <p style={{ margin: 0, fontSize: '11px', color: '#888', fontWeight: '600' }}>{label}</p>}
          {payload.map((p, index) => (
            <p key={index} style={{ margin: '2px 0 0', fontSize: '13px', color: p.color || p.fill, fontWeight: '700' }}>
              {`${p.name}: ${p.value.toLocaleString()} ${p.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }

    // Simple Chart용 툴팁
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid #ddd',
        borderRadius: '10px',
        padding: '8px 12px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        fontFamily: '"Nunito", sans-serif',
        zIndex: 1000
      }}>
        {isTimeSeries && <p style={{ margin: 0, fontSize: '11px', color: '#888', fontWeight: '600' }}>{label}</p>}
        <p style={{ margin: isTimeSeries ? '4px 0 0' : '0', fontSize: '14px', color: payload[0].color || payload[0].fill, fontWeight: '700' }}>
          {`${payload[0].value.toLocaleString()} ${unit || ''}`}
        </p>
      </div>
    );
  }
  return null;
};

// ---------------------------------------------------------
// 3. 요약 통계 계산 함수 (기존 유지)
// ---------------------------------------------------------
const getSummaryStats = (itemData) => {
  const history = itemData.history;
  const current = history[history.length - 1].value;
  const previous = history[history.length - 2].value;

  const momChange = current - previous;
  const momPercent = (momChange / previous) * 100;
  const momSign = momChange >= 0 ? 'plus' : 'minus';
  const momIcon = momChange >= 0 ? 'ri-add-fill' : 'ri-subtract-fill';
  let activityText = '';
  let barWidth = '85%';
  const formattedPercent = momPercent.toFixed(1);

  switch (itemData.title) {
    case "총고객수":
      activityText = `신규가입: ${momChange.toLocaleString()}명`;
      barWidth = '85%';
      break;
    case "총매출":
      activityText = `증감분: ${momChange.toLocaleString()}${itemData.unit}`;
      barWidth = '92%';
      break;
    case "활성 캠페인":
      activityText = `변동: ${momChange.toLocaleString()}개`;
      barWidth = '70%';
      break;
    case "상담원수":
      activityText = `신규 충원: ${momChange.toLocaleString()}명`;
      barWidth = '75%';
      break;
    case "채널수":
      activityText = `변동: ${momChange.toLocaleString()}개`;
      if (momChange === 0) {
        activityText = "변동 없음";
        barWidth = '100%';
      }
      break;
    case "소개인수":
      activityText = `신규 추천: ${momChange.toLocaleString()}명`;
      barWidth = '88%';
      break;
    default:
      activityText = `변동: ${momChange.toLocaleString()}`;
      barWidth = '80%';
  }
  return { momSign, momIcon, formattedPercent, activityText, barWidth };
};


const Type1 = () => {
  const [trendChartType, setTrendChartType] = useState('Area');
  const [distChartType, setDistChartType] = useState('Pie');
  const [dataSubject, setDataSubject] = useState('sales');

  const currentData = DATASETS[dataSubject];

  const Gradients = (
    <defs>
      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={currentData.color} stopOpacity={0.5} />
        <stop offset="95%" stopColor={currentData.color} stopOpacity={0.05} />
      </linearGradient>
    </defs>
  );

  const axisStyle = { fontSize: '12px', fontWeight: '500', fill: '#999' };

  // 요약 박스 스타일링 함수 (강조 개선)
  const getSummaryItemStyle = (subject) => {
    const isActive = dataSubject === subject;
    return isActive
      ? {
        transform: 'scale(1.03)',
        boxShadow: `0 8px 15px 0 rgba(0, 0, 0, 0.1), 0 0 0 3px ${DATASETS[subject].color}40`,
        zIndex: 2,
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        border: `1px solid ${DATASETS[subject].color}`
      }
      : {
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        opacity: 0.9,
        border: '1px solid transparent'
      };
  };

  // ---------------------------------------------------------
  // 4. 왼쪽: 월별 성과 추이 렌더러 (확장)
  // ---------------------------------------------------------
  const renderTrendChart = () => {
    const CommonElements = (
      <>
        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e9e9e9" strokeWidth={0.8} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ ...axisStyle, dy: 10 }}
          padding={{ left: 10, right: 10 }}
        />
        <Tooltip content={<CustomTooltip unit={currentData.unit} />} cursor={{ stroke: currentData.color, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
      </>
    );

    switch (trendChartType) {
      case 'Line':
        return (
          <LineChart data={currentData.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {CommonElements}
            <YAxis axisLine={false} tickLine={false} tick={{ ...axisStyle, dx: -10 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
            <Line dataKey="value" name={currentData.title} stroke={currentData.color} strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: currentData.color }} type="monotoneX" animationDuration={1000} />
          </LineChart>
        );
      case 'Bar':
        return (
          <BarChart data={currentData.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
            {CommonElements}
            <YAxis axisLine={false} tickLine={false} tick={{ ...axisStyle, dx: -10 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
            <Bar dataKey="value" name={currentData.title} fill={currentData.color} radius={[10, 10, 0, 0]} fillOpacity={0.9} animationDuration={1000} />
          </BarChart>
        );
      case 'Area':
        return (
          <AreaChart data={currentData.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {Gradients}
            {CommonElements}
            <YAxis axisLine={false} tickLine={false} tick={{ ...axisStyle, dx: -10 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
            <Area dataKey="value" name={currentData.title} stroke={currentData.color} strokeWidth={2} fillOpacity={1} fill="url(#colorGradient)" type="monotoneX" animationDuration={1000} />
          </AreaChart>
        );

      // ----------------- 확장된 차트 -----------------
      case 'StackedArea':
        const salesData = DATASETS['sales'].history;
        return (
          <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="stackOnline" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={STACK_COLORS.online} stopOpacity={0.6} /><stop offset="95%" stopColor={STACK_COLORS.online} stopOpacity={0.1} /></linearGradient>
              <linearGradient id="stackOffline" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={STACK_COLORS.offline} stopOpacity={0.6} /><stop offset="95%" stopColor={STACK_COLORS.offline} stopOpacity={0.1} /></linearGradient>
            </defs>
            {CommonElements}
            <YAxis axisLine={false} tickLine={false} tick={{ ...axisStyle, dx: -10 }} unit="억" />
            <Area type="monotone" dataKey="online" stackId="1" name="온라인 매출" stroke={STACK_COLORS.online} fill="url(#stackOnline)" fillOpacity={1} animationDuration={1000} />
            <Area type="monotone" dataKey="offline" stackId="1" name="오프라인 매출" stroke={STACK_COLORS.offline} fill="url(#stackOffline)" fillOpacity={1} animationDuration={1000} />
          </AreaChart>
        );

      case 'StackedBar':
        const salesDataBar = DATASETS['sales'].history;
        return (
          <BarChart data={salesDataBar} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
            {CommonElements}
            <YAxis axisLine={false} tickLine={false} tick={{ ...axisStyle, dx: -10 }} unit="억" />
            <Bar dataKey="online" stackId="a" name="온라인" fill={STACK_COLORS.online} radius={[10, 10, 0, 0]} animationDuration={1000} />
            <Bar dataKey="offline" stackId="a" name="오프라인" fill={STACK_COLORS.offline} animationDuration={1000} />
          </BarChart>
        );

      case 'Scatter':
        const scatterData = DATASETS['customers'].scatterData;
        return (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e9e9" strokeWidth={0.8} />
            <XAxis type="number" dataKey="x" name="캠페인 비용 효율성" unit="점" stroke="#999" tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="월별 신규 가입" unit="명" stroke="#999" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '4 4' }} content={
              <CustomTooltip unit="" payload={[{ name: '비용 효율성', value: 'x' }, { name: '신규 가입', value: 'y' }]} />
            } />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
            <Scatter name="고객 데이터" data={scatterData} fill={DATASETS.customers.color} />
          </ScatterChart>
        );

      case 'Composed':
        const combinedData = DATASETS['customers'].history.map(c => ({
          ...c,
          sales: c.salesValue,
          customers: c.value
        }));
        return (
          <ComposedChart data={combinedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            {CommonElements}
            <YAxis yAxisId="left" label={{ value: '매출(억)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#333', fontSize: 12 } }} stroke={DATASETS.sales.color} unit="억" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: '고객수(명)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: DATASETS.customers.color, fontSize: 12 } }} stroke={DATASETS.customers.color} unit="명" tick={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="sales" name="총매출" fill={DATASETS.sales.color} radius={[5, 5, 0, 0]} barSize={20} />
            <Line yAxisId="right" dataKey="customers" name="총고객수" stroke={DATASETS.customers.color} strokeWidth={2} dot={false} type="monotoneX" />
          </ComposedChart>
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------
  // 5. 오른쪽: 분포 차트 렌더러 (기존 유지)
  // ---------------------------------------------------------
  const renderDistChart = () => {
    if (distChartType === 'Pie') {
      return (
        <PieChart>
          <Tooltip content={<CustomTooltip unit={currentData.unit} />} />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Pie
            data={currentData.breakdown}
            cx="50%"
            cy="45%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            stroke="#f9f9f9"
            strokeWidth={2}
          >
            {currentData.breakdown.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }

    if (distChartType === 'Radar') {
      return (
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={currentData.breakdown}>
          <PolarGrid stroke="#e9e9e9" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#999', fontSize: '11px', fontWeight: '600' }} />
          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
          <Radar
            name={currentData.title}
            dataKey="value"
            stroke={currentData.color}
            strokeWidth={2}
            fill={currentData.color}
            fillOpacity={0.6}
          />
          <Tooltip content={<CustomTooltip unit={currentData.unit} />} />
        </RadarChart>
      );
    }
    return null;
  };

  return (
    <div className='dashboard-1' style={{ backgroundColor: '#fff', padding: '0px' }}>
      <div className='top'>
        <h1 className='title'>CRM 전체개요</h1>
        <p className='text'>고객 관계 관리 및 마케팅 성과 종합 현황</p>
        <div className='date'>마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}</div>
      </div>

      {/* Summary Summary 영역 */}
      <div className='summary'>
        {['customers', 'sales', 'campaigns', 'agents', 'channels', 'referrals'].map((key, idx) => {
          const itemData = DATASETS[key];
          const stats = getSummaryStats(itemData);
          // campaigns 색상 변경에 맞춰 classMap도 수정할 필요가 있으나, 
          // className을 사용하지 않고 style 속성으로 색상을 직접 주입하는 방식으로
          // 강조 효과를 유지합니다. (getSummaryItemStyle 함수가 color를 사용)
          const classMap = ['primary', 'success', 'info', 'warning', 'danger', 'teal'];
          const icons = ['ri-user-5-line', 'ri-bit-coin-fill', 'ri-cake-3-fill', 'ri-customer-service-fill', 'ri-numbers-fill', 'ri-share-line'];

          return (
            <div
              key={key}
              className={`summary-item ${classMap[idx]}`}
              onClick={() => setDataSubject(key)}
              style={{ cursor: 'pointer', ...getSummaryItemStyle(key), borderRadius: '16px', overflow: 'hidden' }}
            >
              <div className='title'><i className={icons[idx]} /><h1>{itemData.title}</h1></div>
              <div className='value'>{itemData.history[itemData.history.length - 1].value.toLocaleString()}</div>
              <div className='bar'><div className='line'><span style={{ width: stats.barWidth, backgroundColor: itemData.color }}></span></div><label>{stats.barWidth}</label></div>
              <div className='text'>{stats.activityText}</div>
              <div className={`box ${stats.momSign}`} style={{ backgroundColor: itemData.color + '10', color: itemData.color }}>
                <label style={{ color: itemData.color }}>전월대비</label>
                <strong style={{ color: itemData.color }}><i className={stats.momIcon} />{stats.formattedPercent}%</strong>
              </div>
              <div className='text' style={{ marginTop: '8px' }}>상세 보기 클릭 <i className="ri-cursor-fill"></i></div>
            </div>
          )
        })}
      </div>

      {/* ------------------------------------------------- */}
      {/* 메인 차트 영역                                     */}
      {/* ------------------------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '20px', marginTop: '20px' }}>

        {/* 1. 왼쪽: 월별 성과 추이 (차트 선택 버튼화, 스크롤 제거) */}
        <div className='ds-box' style={{ flex: 2, padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', backgroundColor: '#fff' }}>
          <div className='title' style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>월별 성과 추이</h3>
              <span style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>
                <span style={{ color: currentData.color, fontWeight: '800' }}>{currentData.title}</span> 트렌드 분석
              </span>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>

              {/* 왼쪽 차트 타입 선택 버튼 그룹 (스크롤 제거) */}
              <div style={{ backgroundColor: '#f8f9fc', padding: '5px', borderRadius: '10px', display: 'flex', gap: '5px' }}>
                {TREND_CHART_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTrendChartType(type.value)}
                    style={{
                      border: 'none',
                      backgroundColor: trendChartType === type.value ? '#fff' : 'transparent',
                      color: trendChartType === type.value ? currentData.color : '#aaa',
                      boxShadow: trendChartType === type.value ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                      padding: '6px 8px',
                      flexShrink: 0,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className='chart' style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderTrendChart()}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. 오른쪽: 분포 차트 (기존 유지) */}
        <div className='ds-box' style={{ flex: 1, padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', backgroundColor: '#fff' }}>
          <div className='title' style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{currentData.title} 분포</h3>
              <span style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>세부 항목별 비중</span>
            </div>
            {/* 오른쪽 차트 타입 선택 버튼 그룹 */}
            <div style={{ marginLeft: "auto", display: 'flex', gap: '5px', backgroundColor: '#f8f9fc', padding: '5px', borderRadius: '10px' }}>
              {['Pie', 'Radar'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDistChartType(type)}
                  style={{
                    border: 'none',
                    backgroundColor: distChartType === type ? '#fff' : 'transparent',
                    color: distChartType === type ? currentData.color : '#aaa',
                    boxShadow: distChartType === type ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className='chart' style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderDistChart()}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 최근 활동 영역 (기존 유지) */}
      <div className='ds-box' style={{ marginTop: '20px', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', backgroundColor: '#fff' }}>
        <div className='title'>
          <h3>최근활동</h3>
          <span>5개</span>
          <button type="button" className='content-search-button'><i className='ri-eye-fill' />상세보기</button>
        </div>
        <ul className='recent-list'>
          <li className='info'>
            <i className='ri-cake-3-fill' />
            <div className='cont'>
              <div className='text'>신상품 출시 이메일 캠페인이 시작되었습니다.</div>
              <div className='date'>2시간전</div>
            </div>
          </li>
          <li className='warning'>
            <i className='ri-customer-service-fill' />
            <div className='cont'>
              <div className='text'>상담원 성과 목표를 달성하였습니다.</div>
              <div className='date'>4시간전</div>
            </div>
          </li>
          <li className='primary'>
            <i className='ri-user-5-line' />
            <div className='cont'>
              <div className='text'>새로운 VIP 고객이 가입했습니다.</div>
              <div className='date'>4시간전</div>
            </div>
          </li>
          <li className='success'>
            <i className='ri-bit-coin-fill' />
            <div className='cont'>
              <div className='text'>모바일 앱에서 매출이 급증했습니다.</div>
              <div className='date'>8시간전</div>
            </div>
          </li>
          <li className='teal'>
            <i className='ri-share-line' />
            <div className='cont'>
              <div className='text'>소개 프로그램에서 새로운 소개인이 등록되었습니다.</div>
              <div className='date'>10시간전</div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Type1;