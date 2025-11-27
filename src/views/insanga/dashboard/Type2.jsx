import React, { useState, useMemo } from 'react';
import { Flex } from 'antd';
import { Line, Bar, Doughnut, Radar, PolarArea, Bubble, Scatter, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, RadialLinearScale,
} from 'chart.js';

// Chart.js 필수 요소 등록
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, RadialLinearScale
);

// =================================================================
// 1. 데이터 정의 및 계산 로직 (전체 수치 일치 로직 유지)
// =================================================================

// K/B 단위 문자열을 숫자로 변환하는 헬퍼 함수
const parseKValue = (kStr) => parseFloat(kStr.replace('K', '')) * 1000;
const parseBValue = (bStr) => parseFloat(bStr.replace('₩ ', '').replace('B', '')) * 1000000000;
const parsePercent = (pStr) => parseFloat(pStr.replace('%', ''));

// 1-1. 월별 유입 데이터 (다양한 성장 패턴 반영)
const monthlyCustomerInflowData = {
  '모바일웹': [8500, 9200, 11000, 10500, 12000, 14500, 16000, 15500, 17500, 18000, 19500, 21000],
  '웹사이트': [7000, 7500, 8000, 9500, 9000, 8800, 8500, 8200, 7900, 7600, 7400, 7200],
  '직영점': [4000, 3800, 3500, 3200, 2900, 2500, 2200, 2000, 1800, 1600, 1400, 1200],
  '대리점': [1500, 1800, 3000, 5000, 2500, 1000, 500, 1200, 4000, 6000, 4500, 3500],
};

// 1-2. 데이터 품질 세부 지표 (샘플 데이터 - 기존 유지)
const dataQualityMetrics = [
  { title: '이메일 정확도', value: 92.5, status: '우수', color: 'success' },
  { title: '전화번호 정확도', value: 89.3, status: '양호', color: 'primary' },
  { title: '주소 정확도', value: 85.7, status: '양호', color: 'warning' },
  { title: '중복 제거율', value: 94.2, status: '우수', color: 'danger' },
];

// 1-3. 채널 데이터 (요약 지표의 기반이 되는 원본 데이터 역할)
const channelData = [
  // 🚨🚨🚨 요청에 따라 totalCustomers를 '58.34K'로 변경 (총합 127.54K) 🚨🚨🚨
  { channel: '모바일웹', iconClass: 'ri-smartphone-line', growthRate: '+ 15.5%', totalCustomers: '58.34K', newCustomers: '8.5K', conversionRate: '15.2%', sales: '₩ 4.5B', salesRatio: 95, growthClass: 'plus', color: 'rgb(54, 162, 235)' },
  { channel: '웹사이트', iconClass: 'ri-window-line', growthRate: '- 3.2%', totalCustomers: '32.5K', newCustomers: '5.1K', conversionRate: '8.7%', sales: '₩ 2.1B', salesRatio: 60, growthClass: 'minus', color: 'rgb(75, 192, 192)' },
  { channel: '직영점', iconClass: 'ri-store-2-line', growthRate: '- 10.8%', totalCustomers: '15.8K', newCustomers: '0.9K', conversionRate: '5.1%', sales: '₩ 0.8B', salesRatio: 20, growthClass: 'minus', color: 'rgb(255, 205, 86)' },
  { channel: '대리점', iconClass: 'ri-store-3-line', growthRate: '+ 2.7%', totalCustomers: '20.9K', newCustomers: '3.3K', conversionRate: '11.4%', sales: '₩ 1.5B', salesRatio: 45, growthClass: 'plus', color: 'rgb(255, 99, 132)' },
];

// 1-4. 전체 수치 계산 로직
const totalCustomersSumRaw = channelData.reduce((sum, d) => sum + parseKValue(d.totalCustomers), 0);
// 127540.0
const totalNewCustomersSumRaw = channelData.reduce((sum, d) => sum + parseKValue(d.newCustomers), 0);
// 8500 + 5100 + 900 + 3300 = 17800
const totalSalesSumRaw = channelData.reduce((sum, d) => sum + parseBValue(d.sales), 0);

const totalConversions = channelData.reduce((sum, d) => {
  const cust = parseKValue(d.totalCustomers);
  const rate = parsePercent(d.conversionRate);
  return sum + (cust * rate / 100);
}, 0);
// (58340 * 0.152) + (32500 * 0.087) + (15800 * 0.051) + (20900 * 0.114) = 8867.68 + 2827.5 + 805.8 + 2382.6 = 14883.58
const totalConversionRateRaw = (totalConversions / totalCustomersSumRaw) * 100;
// (14883.58 / 127540) * 100 = 11.6698%

const formatToK = (value) => `${(value / 1000).toFixed(1)}K`;
const formatToB = (value) => `₩ ${(value / 1000000000).toFixed(1)}B`;
const formatToPercent = (value) => `${value.toFixed(1)}%`;

const totalCustomerSumForMonthly = Object.values(monthlyCustomerInflowData).flatMap(arr => arr).reduce((sum, current) => sum + current, 0);
const integrationRateValue = dataQualityMetrics.find(m => m.title === '중복 제거율').value.toFixed(1);
const rawDeduplicationCount = totalCustomerSumForMonthly * 0.02;
const deduplicationCountValue = Math.round(rawDeduplicationCount / 100) * 100;
const accuracyMetrics = dataQualityMetrics.slice(0, 3);
const avgDataQualityValue = (accuracyMetrics.reduce((sum, metric) => sum + metric.value, 0) / accuracyMetrics.length).toFixed(1);


// 5. 대시보드 요약 지표 (최종 적용)
const dashboardSummary = {
  totalCustomers: formatToK(totalCustomersSumRaw), // 127.5K
  totalCustomersChange: '+ 12.5%',
  integrationRate: `${integrationRateValue}%`,
  integrationRateChange: '+ 2.1%',
  deduplicationCount: formatToK(deduplicationCountValue),
  deduplicationChange: '+ 18.5%',
  dataQuality: `${avgDataQualityValue}%`,
  dataQualityChange: '- 12.5%',
};

// 6. '전체' 채널 데이터 객체 생성
const allChannelInfo = {
  channel: '전체',
  iconClass: 'ri-global-line',
  growthRate: dashboardSummary.totalCustomersChange,
  totalCustomers: formatToK(totalCustomersSumRaw), // 127.5K
  newCustomers: formatToK(totalNewCustomersSumRaw),
  conversionRate: formatToPercent(totalConversionRateRaw), // 11.7%
  sales: formatToB(totalSalesSumRaw),
  salesRatio: 100,
  growthClass: 'plus',
  color: 'rgb(128, 128, 128)'
};
const allChannelData = [allChannelInfo, ...channelData];


// 차트 데이터 및 상수 (기존 유지)
const customerTypeDistribution = { '모바일웹': [70, 30], '웹사이트': [60, 40], '직영점': [20, 80], '대리점': [50, 50] };
const channelPerformanceData = {
  '모바일웹': [90, 80, 85, 70, 95],
  '웹사이트': [70, 90, 75, 85, 80],
  '직영점': [40, 30, 60, 95, 50],
  '대리점': [60, 70, 65, 75, 70]
};

const getAveragePerformance = () => {
  const channels = Object.keys(channelPerformanceData).filter(c => c !== '전체');
  if (channels.length === 0) return [0, 0, 0, 0, 0];

  const sum = [0, 0, 0, 0, 0];
  channels.forEach(channel => {
    channelPerformanceData[channel].forEach((value, index) => {
      sum[index] += value;
    });
  });

  return sum.map(s => Math.round(s / channels.length));
};
channelPerformanceData['전체'] = getAveragePerformance();


const totalNewCustomerRatio = (totalNewCustomersSumRaw / totalCustomersSumRaw) * 100;
const totalExistingCustomerRatio = 100 - totalNewCustomerRatio;
customerTypeDistribution['전체'] = [Math.round(totalNewCustomerRatio), Math.round(totalExistingCustomerRatio)];
// (17800 / 127540) * 100 = 13.95% -> [14, 86] (변경됨)


const correlationData = {
  '모바일웹': [{ x: 5, y: 12000, r: 25 }, { x: 8, y: 15500, r: 30 }, { x: 12, y: 21000, r: 35 }],
  '웹사이트': [{ x: 3, y: 7000, r: 15 }, { x: 7, y: 8500, r: 10 }, { x: 10, y: 7600, r: 8 }],
  '직영점': [{ x: 1, y: 4000, r: 10 }, { x: 5, y: 2900, r: 5 }, { x: 9, y: 1800, r: 3 }],
  '대리점': [{ x: 2, y: 1800, r: 8 }, { x: 6, y: 1000, r: 5 }, { x: 11, y: 4500, r: 18 }],
};
const CHART_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const RADAR_LABELS = ['총 고객수', '신규 고객', '전환율', '고객 만족도', '고객 유지율'];
const DOUGHNUT_LABELS = ['신규 고객', '기존 고객'];
const ALL_CHART_TYPES = ['Line', 'Bar', 'Pie', 'Doughnut', 'Radar', 'Polar Area', 'Bubble', 'Scatter'];

// Pie/Doughnut/PolarArea에서 사용할 색상 세트
const ARC_COLORS = [
  'rgba(54, 162, 235, 0.9)', // Blue
  'rgba(255, 99, 132, 0.9)',  // Red
  'rgba(75, 192, 192, 0.9)', // Teal
  'rgba(255, 205, 86, 0.9)',  // Yellow
];

// =================================================================
// 2. React Component (Logic and Render)
// =================================================================
const Type2 = () => {
  const [selectedChannel, setSelectedChannel] = useState('전체');
  const [chartType, setChartType] = useState('Line');

  const highlightStyle = { border: '2px solid #007bff', backgroundColor: '#e6f7ff', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.2)' };
  const defaultStyle = { border: '1px solid #e0e0e0', backgroundColor: '#ffffff', boxShadow: 'none', transition: 'all 0.3s ease' };

  const handleChannelClick = (channelName) => {
    setSelectedChannel(channelName);
  };

  const chartData = useMemo(() => {
    const channelInfo = allChannelData.find(d => d.channel === selectedChannel);
    const channelColor = channelInfo ? channelInfo.color : 'rgb(54, 162, 235)';
    const colorBg = channelColor.replace('rgb', 'rgba').replace(')', ', 0.3)');
    const colorBorder = channelColor.replace('rgb', 'rgba').replace(')', ', 1)');

    // 🌟 '전체' 채널 통합/비교 로직 🌟
    if (selectedChannel === '전체') {

      // Line, Bar: 채널별 추이 비교
      if (chartType === 'Line' || chartType === 'Bar') {
        const datasets = Object.keys(monthlyCustomerInflowData).map((channel, index) => {
          const info = channelData.find(d => d.channel === channel);
          const color = info ? info.color : 'rgb(0, 0, 0)';
          const colorBorder = color.replace('rgb', 'rgba').replace(')', ', 1)');

          return {
            label: channel,
            data: monthlyCustomerInflowData[channel],
            borderColor: colorBorder,
            backgroundColor: chartType === 'Bar' ? colorBorder.replace('1)', '0.5)') : 'transparent',
            pointStyle: 'circle',
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            tension: 0.2,
            type: chartType.toLowerCase(),
          };
        });

        return { labels: CHART_LABELS, datasets: datasets };
      }

      // Pie, Doughnut, Polar Area: 통합 고객 유형 분포
      if (chartType === 'Pie' || chartType === 'Doughnut' || chartType === 'Polar Area') {
        const ratioData = customerTypeDistribution['전체'] || [50, 50];
        return {
          labels: DOUGHNUT_LABELS,
          datasets: [{
            label: `전체 고객 유형 분포 (%)`,
            data: ratioData,
            backgroundColor: ARC_COLORS.slice(0, 2), // 신규/기존 2개 색상 사용
            borderColor: 'white', // 🌟 Pie/Doughnut 디자인 개선 1: 흰색 테두리
            borderWidth: 2,
            hoverBorderColor: 'rgba(0, 0, 0, 0.2)', // 호버 시 그림자 느낌
            hoverOffset: 4, // 호버 시 조각 튀어나옴
          }],
        };
      }

      if (chartType === 'Radar') {
        const radarData = channelPerformanceData['전체'] || [];
        return {
          labels: RADAR_LABELS,
          datasets: [{
            label: `전체 평균 성과 지표 (0-100)`,
            data: radarData,
            backgroundColor: colorBg,
            borderColor: colorBorder,
            pointBackgroundColor: colorBorder,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colorBorder,
            borderWidth: 2,
          }],
        };
      }

      // Bubble, Scatter (선택 불가)
      if (chartType === 'Bubble' || chartType === 'Scatter') {
        return {
          labels: [],
          datasets: [{
            label: `선택 불가능 (${chartType})`,
            data: [],
            backgroundColor: 'rgba(128, 128, 128, 0.5)'
          }],
        };
      }
    }

    // 🌟 개별 채널 로직 🌟
    switch (chartType) {
      case 'Pie':
      case 'Doughnut':
      case 'Polar Area':
        const ratioData = customerTypeDistribution[selectedChannel] || [50, 50];
        return {
          labels: DOUGHNUT_LABELS,
          datasets: [{
            label: `${selectedChannel} 고객 유형 분포 (%)`,
            data: ratioData,
            backgroundColor: ARC_COLORS.slice(0, ratioData.length), // 비율에 맞춰 색상 사용
            borderColor: 'white', // 🌟 Pie/Doughnut 디자인 개선 1: 흰색 테두리
            borderWidth: 2,
            hoverBorderColor: 'rgba(0, 0, 0, 0.2)', // 호버 시 그림자 느낌
            hoverOffset: 4, // 호버 시 조각 튀어나옴
          }],
        };

      case 'Radar':
        const radarData = channelPerformanceData[selectedChannel] || [];
        return {
          labels: RADAR_LABELS,
          datasets: [{
            label: `${selectedChannel} 성과 지표 (0-100)`,
            data: radarData,
            backgroundColor: colorBg,
            borderColor: colorBorder,
            pointBackgroundColor: colorBorder,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colorBorder,
            borderWidth: 2,
          }],
        };

      case 'Bubble':
      case 'Scatter':
        const coreData = correlationData[selectedChannel] || [];
        const dataSet = {
          label: `${selectedChannel} 데이터`,
          data: chartType === 'Bubble' ? coreData : coreData.map(d => ({ x: d.x, y: d.y })),
          backgroundColor: colorBorder,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 0,
        };
        return { labels: CHART_LABELS, datasets: [dataSet] };

      case 'Line':
      case 'Bar':
      default:
        const monthlyData = monthlyCustomerInflowData[selectedChannel] || [];
        return {
          labels: CHART_LABELS,
          datasets: [{
            label: `${selectedChannel} 월별 고객 유입`,
            data: monthlyData,
            borderColor: colorBorder,
            backgroundColor: chartType === 'Bar' ? colorBg : 'transparent',
            pointStyle: 'circle',
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            tension: 0.2,
            type: chartType.toLowerCase(),
          }],
        };
    }
  }, [selectedChannel, chartType]);

  const chartOptions = useMemo(() => {
    const isScaleChart = ['Line', 'Bar', 'Bubble', 'Scatter'].includes(chartType) || (selectedChannel === '전체' && (chartType === 'Line' || chartType === 'Bar'));

    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: isScaleChart || chartType === 'Pie' || chartType === 'Doughnut' || chartType === 'Polar Area' || chartType === 'Radar', position: 'top' },
        title: { display: true, text: `${selectedChannel} 채널 - ${chartType} 시각화` },
        // 🌟 Pie/Doughnut 툴팁 개선: 모드 인덱스 대신 단일 항목에만 초점
        tooltip: { mode: 'point', intersect: true },
      },
      scales: isScaleChart ? {
        y: { beginAtZero: true, title: { display: true, text: '고객 수/지표' } },
        x: { title: { display: true, text: ['Bubble', 'Scatter'].includes(chartType) ? '월별 지출 지수' : '월' } }
      } : {
        r: {
          beginAtZero: true, angleLines: { display: true }, suggestedMin: 0, suggestedMax: 100, pointLabels: { font: { size: 14 } }
        }
      },
    };
  }, [selectedChannel, chartType]);

  const renderChart = () => {
    const commonStyle = { height: 'calc(100% - 40px)', minHeight: '300px' };

    switch (chartType) {
      case 'Line': return <Line data={chartData} options={chartOptions} style={commonStyle} />;
      case 'Bar': return <Bar data={chartData} options={chartOptions} style={commonStyle} />;
      case 'Pie': return <Pie data={chartData} options={chartOptions} style={commonStyle} />;
      case 'Doughnut': return <Doughnut data={chartData} options={chartOptions} style={commonStyle} />;
      case 'Radar': return <Radar data={chartData} options={chartOptions} style={commonStyle} />;
      case 'Polar Area': return <PolarArea data={chartData} options={chartOptions} style={commonStyle} />;
      case 'Bubble':
      case 'Scatter':
        if (selectedChannel === '전체') {
          return <div style={{ ...commonStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888' }}>
            <p>Bubble/Scatter 차트는 채널별 비교 추이 시각화에 적합하지 않아, 개별 채널 선택 시에만 활성화됩니다.</p>
          </div>;
        }
        return chartType === 'Bubble'
          ? <Bubble data={chartData} options={chartOptions} style={commonStyle} />
          : <Scatter data={chartData} options={chartOptions} style={commonStyle} />;
      default: return <Line data={chartData} options={chartOptions} style={commonStyle} />;
    }
  };


  // --- 최종 렌더링 ---
  return (
    <div className='dashboard-2'>
      <div className='top'>
        <h1>고객 통합 대시보드</h1>
        <span>채널명 고객 유입 및 통합현황</span>
      </div>

      {/* Summary Section */}
      <div className='summary'>
        <div className='summary-item'><i className='ri-user-5-line primary' /> <div className='cont'><label>전체 고객수</label><div className='value'>{dashboardSummary.totalCustomers}</div><div className='change'>{dashboardSummary.totalCustomersChange}</div></div></div>
        <div className='summary-item'><i className='ri-pulse-fill pink' /> <div className='cont'><label>통합률</label><div className='value'>{dashboardSummary.integrationRate}</div><div className='change plus'>{dashboardSummary.integrationRateChange}</div></div></div>
        <div className='summary-item'><i className='ri-scan-2-fill info' /> <div className='cont'><label>중복제거</label><div className='value'>{dashboardSummary.deduplicationCount}</div><div className='change plus'>{dashboardSummary.deduplicationChange}</div></div></div>
        <div className='summary-item'><i className='ri-database-fill teal' /> <div className='cont'><label>데이터 품질</label><div className='value'>{dashboardSummary.dataQuality}</div><div className='change'>{dashboardSummary.dataQualityChange}</div></div></div>
      </div>

      {/* Channel Status Section */}
      <div className='dash-panel'>
        <div className='panel-title'>채널별 고객 상황</div>
        <div className='list'>
          {allChannelData.map((data, index) => (
            <div
              className='box'
              key={index}
              onClick={() => handleChannelClick(data.channel)}
              style={{
                cursor: 'pointer',
                ...defaultStyle,
                ...(data.channel === selectedChannel ? highlightStyle : {}),
                ...(data.channel === '전체' ? { minWidth: '100px', fontWeight: 'bold' } : {}),
              }}
            >
              <div className='title'>
                <i className={data.iconClass} />
                <h3>{data.channel}</h3>
                <span className={data.growthClass}>{data.growthRate}</span>
              </div>
              <ul>
                <li><label>총 고객수</label><span>{data.totalCustomers}</span></li>
                <li><label>신규고객</label><span>{data.newCustomers}</span></li>
                <li><label>전환율</label><span>{data.conversionRate}</span></li>
                <li><label>매출</label><span>{data.sales}</span></li>
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Chart and Data Quality Section */}
      <div className='dash-panel' style={{ display: 'flex', alignItems: 'stretch', gap: '0 20px' }}>
        <div className='ds-box' style={{ flex: 1, height: '450px' }}>
          <div className='panel-title'>
            채널별 시각화 ({selectedChannel})
            {/* 차트 유형 선택 버튼 */}
            <div style={{ float: 'right', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {ALL_CHART_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s ease-in-out',
                    whiteSpace: 'nowrap',
                    backgroundColor: chartType === type ? '#007bff' : '#fff',
                    color: chartType === type ? '#fff' : '#333',
                    border: chartType === type ? '1px solid #007bff' : '1px solid #ddd',
                    fontWeight: chartType === type ? 'bold' : 'normal',
                    boxShadow: chartType === type ? '0 2px 4px rgba(0, 123, 255, 0.2)' : 'none',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className='chart' style={{ height: 'calc(100% - 40px)', minHeight: '300px' }}>
            {renderChart()}
          </div>
        </div>

        <div className='ds-box' style={{ flex: 1, display:'flex', flexDirection: 'column' }}>
          {/* 우측 상단: 데이터 품질 지표 */}
          <div className='panel-title'>데이터 품질 지표</div>
          <ul className='bar-list' style={{ maxHeight: 'none', overflowY: 'visible', marginBottom: '0' }}>
            {dataQualityMetrics.map((metric, index) => (
              <li key={index}>
                <div className='bar-title'>{metric.title} <span className={`badge ${metric.color}`}>{metric.status}</span></div>
                <div className='bar'>
                  <div className='line'>
                    <span className={metric.color} style={{ width: `${metric.value}%` }}></span>
                  </div>
                  <label>
                    {metric.value}%
                    {metric.title === '중복 제거율' && <span style={{ display:'block', marginTop:'2px', fontSize: '10px', color: '#007bff' }}>(통합률 기반)</span>}
                    {['이메일 정확도', '전화번호 정확도', '주소 정확도'].includes(metric.title) && <span style={{ display:'block', marginTop:'2px', fontSize: '10px', color: '#1099a9' }}>(평균 품질 반영)</span>}
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sales Comparison Table Section */}
      <div className='dash-panel'>
        <div className='panel-title'>채널별 매출비교</div>
        <table className='table-list'>
          <thead>
            <tr>
              <th scope='col'>채널</th>
              <th scope='col'>총고객수</th>
              <th scope='col'>신규고객</th>
              <th scope='col'>성장률</th>
              <th scope='col'>전환율</th>
              <th scope='col'>매출</th>
              <th scope='col'>비율</th>
            </tr>
          </thead>
          <tbody>
            {channelData.map((data, index) => (
              <tr key={index}>
                <td><div className='td-title'><i className={data.iconClass} /><span>{data.channel}</span></div></td>
                <td className='right'>{data.totalCustomers} 명</td>
                <td className='right'>{data.newCustomers} 명</td>
                <td className='center'><span className={data.growthClass}>{data.growthRate}</span></td>
                <td className='center'><span className='point'>{data.conversionRate}</span></td>
                <td className='right'>{data.sales}</td>
                <td>
                  <div className='bar'>
                    <div className='line'>
                      <span className={data.salesRatio >= 90 ? 'success' : data.salesRatio >= 80 ? 'danger' : data.salesRatio >= 50 ? 'primary' : 'warning'} style={{ width: `${data.salesRatio}%` }}></span>
                    </div>
                    <label>{data.salesRatio}%</label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Type2;