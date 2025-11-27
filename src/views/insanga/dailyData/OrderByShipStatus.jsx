/*********************************************************************
 * - 메뉴 : 매장관리 -> 일간자료 -> 주문별 입고 현황
 * - 파일명 : OrderByShipStatus.jsx
 * ********************************************************************/

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// 시스템 기본정보 주입
import Properties from "@/system/Properties";

// 그리드 no컬럼, 화면 layout설정 주입
import { gridNoColumn, useLayoutWidths } from "@/system/hook/CommonHook";

// api호출 주입
import { useApiCallService } from "@/system/ApiCallService";

// LeftPanel
import LeftPanel from "@/components/layout/LeftPanel";

// 로딩 바
import { useLoading } from "@/system/hook/LoadingContext";

// ag grid import
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// 상태 관리 정보 (사용자 정보 등등.)
import { useSelector } from 'react-redux';

// utils
import _ from 'lodash';

// 날짜 유틸
import dayjs from "dayjs";

// 유효성 체크를 위한 함수
import { formatDateToYYYYMMDD } from "@/system/utils/common";

// 상품검색 팝업
import GoodsSearch from "@/components/popup/GoodsSearch";
import GoodsSearchEvent from "@/components/popup/GoodsSearchEvent";

// 모달 프레임.
import FrameModal from "@/components/popup/FrameModal";

// agentId 셀렉터
import { getAgentId } from "@/system/store/redux/agent";

// 유효성 체크를 위한 함수
import { numberFormatter, rateFormatter, addComma } from "@/system/utils/common";
/**
 * SalesStatus 컴포넌트
 */
const OrderByShipStatus = ({ tabKey }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 선택 된 agentId (셀렉터 반환값 안전하게 기본값 처리)
  const agentId = useSelector(getAgentId) || "";

  // 메세지 창 함수
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  // 그리드 데이터 변수
  const [rowData, setRowData] = useState([]);

  // 상품검색 팝업 선택 가능여부
  const [goodsIsDisabled, setGoodsIsDisabled] = useState(false);

  // 상품검색 팝업
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });
  const [goodGbn, setGoodGbn] = useState("F");

  // 조회 조건 생성 폼 (변경 없음)
  const SEARCH_FORM = [
    {
      label: "검색년월",
      key: "yymm",
      type: "yyyymm",
      codeKey: "",
      defaultValue: dayjs().format("YYYY-MM"),
      callback: (value) => {
        // value가 바뀔 때 헤더 갱신
        handleSetHeader(value);
      }
    },
    { label: "출고구분(F)", key: "sio", type: "select", codeKey: "shipInData", defaultValue: "210" },
    { label: "출고구분(T)", key: "eio", type: "select", codeKey: "shipInData", defaultValue: "720" },
    { label: "상품구분(F)", key: "sggbn", type: "select", codeKey: "saleGbnData", defaultValue: "1" },
    { label: "상품구분(T)", key: "eggbn", type: "select", codeKey: "saleGbnData", defaultValue: "Z" },
    { label: "중분류(F)", key: "smtype", type: "select", codeKey: "mtypeData", defaultValue: "" },
    { label: "중분류(T)", key: "emtype", type: "select", codeKey: "mtypeData", defaultValue: "" },
    {
      label: "상품코드(F)", key: "sgoods", type: "input-search", codeKey: "", disabled: false, callback: (value) => {
        setGoodGbn("F");
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    }, {
      label: "상품코드(T)", key: "egoods", type: "input-search", codeKey: "", disabled: false, callback: (value) => {
        setGoodGbn("T");
        setGoodsSearchModal({ visible: true, id: '', row: {} });
      }
    },
  ];

  // 공통 코드 설정
  const CODE_GROUPS = [
    { key: "mtypeData", codeGroupCode: "S07" },
    { key: "saleGbnData", codeGroupCode: "S03" },
    { key: "shipInData", codeGroupCode: "S19" },
  ];

  // 초기 컬럼 그룹을 state로 관리하도록 변경 (동적 변경 가능)
  const [columnGroups, setColumnGroups] = useState([
    gridNoColumn(),
    {
      headerName: '중분류명',
      field: 'saleSequ',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
    },
    {
      headerName: '상품코드',
      field: 'goodsId',
      width: 170,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
    },
    {
      headerName: '상품명',
      field: 'goodsNm',
      width: 250,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
    },
    {
      headerName: '호수',
      field: 'goodsNm', // 기존 코드 유지(원래 의도대로 필요시 변경)
      width: 250,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
    }
  ]);

  // 조회 조건 필터 초기화
  const [filters, setFilters] = useState(SEARCH_FORM.reduce((acc, cur) => {
    acc[cur.key] = ""; // 기본값을 모두 빈 문자열로
    // dateRange의 경우 start/end 키도 초기화
    if (cur.type === "dateRange") {
      acc[cur.startKey] = cur.defaultValue?.start || "";
      acc[cur.endKey] = cur.defaultValue?.end || "";
    }
    return acc;
  }, {}));

  // 공통코드 사용 변수
  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // layout 훅 사용
  const {
    sidebarOpen,
    leftWidth,
    centerWidth,
    toggleSidebar,
  } = useLayoutWidths(true, 30, false, 0);

  // 조회조건 변경 시 filters에 반영하기 위한 함수.
  const handleFilterChange = useCallback((key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value })), []);

  // -----------------------------
  // 선택된 년월(value)에 따라 컬럼 동적 생성
  // value: "YYYY-MM" 또는 "YYYYMM"
  // -----------------------------
  const handleSetHeader = useCallback((value) => {
    try {
      if (!value) return;


      setRowData([]);

      // 숫자만 남기기 (YYYYMM)
      const cleanValue = String(value).replace(/[^0-9]/g, '');
      if (cleanValue.length < 6) return; // 안전 검사

      const year = parseInt(cleanValue.substring(0, 4), 10);
      const month = parseInt(cleanValue.substring(4, 6), 10);

      if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return;

      // 해당 월의 마지막 일 계산
      const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();

      // 기존 고정 컬럼 유지 (같은 구조로 재생성)
      const baseColumns = [
        gridNoColumn(),
        {
          headerName: '중분류명',
          field: 'mtypeGbnNm',
          width: 100,
          minWidth: 80,
          cellClass: 'text-center',
          sortable: false,
          filter: false,
          spanRows: true
        },
        {
          headerName: '상품코드',
          field: 'goodsId',
          width: 170,
          minWidth: 80,
          cellClass: 'text-left',
          sortable: false,
          filter: false,
        },
        {
          headerName: '상품명',
          field: 'goodsNm',
          width: 250,
          minWidth: 80,
          cellClass: 'text-left',
          sortable: false,
          filter: false,
        },
        {
          headerName: '호수',
          field: 'goodsNo',
          width: 100,
          minWidth: 80,
          cellClass: 'text-left',
          sortable: false,
          filter: false,
        }
      ];
      const addColumns = [
        {
          headerName: '합계',
          field: 'rowQtyTotal',
          width: 100,
          minWidth: 80,
          valueFormatter: numberFormatter,
          cellClass: 'text-right',
          sortable: false,
          filter: false
        },
        {
          headerName: '판매가',
          field: '',
          width: 170,
          minWidth: 80,
          valueFormatter: numberFormatter,
          cellClass: 'text-right',
          sortable: false,
          filter: false,
        },

      ];

      // 일수만큼 동적 컬럼 생성 (index는 1부터 시작)
      const dynamicColumns = Array.from({ length: daysInMonth }, (_, i) => ({
        headerName: `${i + 1} 일`,
        field: `saleQty${i + 1}`,
        width: 100,
        minWidth: 80,
        valueFormatter: numberFormatter,
        cellClass: 'text-right',
        sortable: false,
        filter: false,
      }));

      // 컬럼 상태 업데이트
      setColumnGroups([...baseColumns, ...dynamicColumns, ...addColumns]);
    } catch (err) {
      console.error("handleSetHeader 오류:", err);
    }
  }, [setColumnGroups]);

  // -----------------------------
  // 조회버튼 클릭시 실행 함수.
  // -----------------------------
  const fetchData = useCallback(
    async (action = "selectSd255List") => {
      try {
        if (_.isEmpty(agentId)) {
          showMessageModal({
            title: "알림",
            content: "매장코드를 선택 하세요.",
            onCallback: () => { }
          });
          return;
        }
        showLoading();
        const payload = {
          action,
          payload: {
            // 운영시에는 반드시 agentId 사용.
            // 개발용 하드코딩('5')은 위험하므로 제거했습니다.
            yymm: (filters.yymm ? filters.yymm.replace(/-/g, '') : '') || '',
            sio: filters.sio || '0',
            eio: filters.eio || 'ZZZ',
            sggbn: filters.sggbn || '0',
            eggbn: filters.eggbn || 'Z',
            smtype: filters.smtype || '0',
            emtype: filters.emtype || 'Z',
            sgoods: filters.sgoods || '0',
            egoods: filters.egoods || 'Z',
            agentId: agentId, // user?.emplNo || ''
          },
        };

        const res = await request("domain/insanga/store/daily", payload, {}, "post", 'json');
        const body = res?.data?.body;
        setRowData(setSummary(setGroupData(body || [])));
        //setRowData(setGroupData(body || []));
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading();
      }
    },
    // 의존성: filters, request, agentId, user
    [filters, request, agentId, showLoading, hideLoading, showMessageModal]
  );
  const setGroupData = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    const result = rowData.map(item => ({ ...item }));
    let prevMtype = null;

    result.forEach(item => {
      item.isSameGroup = item.mtypeGbn === prevMtype;
      prevMtype = item.mtypeGbn;

      let rowQtyTotal = 0; // 각 행 합계 초기화
      let rowAmtTotal = 0; // 각 행 합계 초기화


      if (item.saleD) {
        const day = parseInt(item.saleD.substring(6, 8), 10);
        if (!isNaN(day)) {
          item[`saleQty${day}`] = Number(item.saleQty) || 0;
          item[`saleAmt${day}`] = Number(item.panAmt) || 0; // panAmt → saleAmt
          rowQtyTotal += item[`saleQty${day}`]; // rowTotal에 합산
          rowAmtTotal += item[`saleAmt${day}`]; // rowTotal에 합산
        }
      }

      // 기존 컬럼 외에 rowTotal 추가
      item.rowQtyTotal = rowQtyTotal;
      item.rowAmtTotal = rowAmtTotal;
    });

    return result;
  }, []);
  const setSummary = useCallback((rowData) => {
    if (!Array.isArray(rowData) || rowData.length === 0) return [];

    const result = [];
    let currentGroup = [];
    let prevMtype = null;

    const calcQtySummary = (group) => {
      const summary = {
        mtypeGbnNm: '( 중분류계 )',
        goodsId: "",
        goodsNm: "",
        saleSequ: "",
        isSummary: true,
        rowQtyTotal: 0, // rowQtyTotal 초기화
      };
      group.forEach(row => {
        Object.keys(row).forEach(key => {
          if (/^saleQty\d+$/.test(key)) {
            const val = Number(row[key] || 0);
            summary[key] = (summary[key] || 0) + val;
            summary.rowQtyTotal += val; // rowQtyTotal 누적
          }
        });
      });
      return summary;
    };

    const calcAmtAsQtySummary = (group) => {
      const summary = {
        mtypeGbnNm: '',
        goodsId: "",
        goodsNm: "",
        saleSequ: "",
        isSummary: true,
        rowQtyTotal: 0,
      };
      group.forEach(row => {
        Object.keys(row).forEach(key => {
          if (/^saleAmt\d+$/.test(key)) {
            const qtyKey = key.replace("saleAmt", "saleQty");
            const val = Number(row[key] || 0);
            summary[qtyKey] = (summary[qtyKey] || 0) + val;
            summary.rowQtyTotal += val;
          }
        });
      });
      return summary;
    };

    const allQtySummary = { mtypeGbnNm: "[ 합 계 ]", goodsId: "", goodsNm: "", saleSequ: "", isSummary: false, isTotal: true, rowQtyTotal: 0 };
    const allAmtSummary = { mtypeGbnNm: "", goodsId: "", goodsNm: "", saleSequ: "", isSummary: false, isTotal: true, rowQtyTotal: 0 };

    rowData.forEach(item => {
      if (prevMtype !== null && item.mtypeGbn !== prevMtype) {
        if (currentGroup.length > 0) {
          const qtySummary = calcQtySummary(currentGroup);
          const amtAsQtySummary = calcAmtAsQtySummary(currentGroup);

          result.push(...currentGroup, qtySummary, amtAsQtySummary);

          // 전체 합계 계산 (각 소계를 합산)
          Object.keys(qtySummary).forEach(key => {
            if (/^saleQty\d+$/.test(key)) {
              allQtySummary[key] = (allQtySummary[key] || 0) + qtySummary[key];
            }
          });
          allQtySummary.rowQtyTotal += qtySummary.rowQtyTotal;

          Object.keys(amtAsQtySummary).forEach(key => {
            if (/^saleQty\d+$/.test(key)) {
              allAmtSummary[key] = (allAmtSummary[key] || 0) + amtAsQtySummary[key];
            }
          });
          allAmtSummary.rowQtyTotal += amtAsQtySummary.rowQtyTotal;

          currentGroup = [];
        }
      }

      currentGroup.push(item);
      prevMtype = item.mtypeGbn;
    });

    if (currentGroup.length > 0) {
      const qtySummary = calcQtySummary(currentGroup);
      const amtAsQtySummary = calcAmtAsQtySummary(currentGroup);

      result.push(...currentGroup, qtySummary, amtAsQtySummary);

      Object.keys(qtySummary).forEach(key => {
        if (/^saleQty\d+$/.test(key)) {
          allQtySummary[key] = (allQtySummary[key] || 0) + qtySummary[key];
        }
      });
      allQtySummary.rowQtyTotal += qtySummary.rowQtyTotal;

      Object.keys(amtAsQtySummary).forEach(key => {
        if (/^saleQty\d+$/.test(key)) {
          allAmtSummary[key] = (allAmtSummary[key] || 0) + amtAsQtySummary[key];
        }
      });
      allAmtSummary.rowQtyTotal += amtAsQtySummary.rowQtyTotal;
    }

    // 마지막에 전체 합계 행 추가
    result.push(allQtySummary, allAmtSummary);

    return result;
  }, []);

  // const setSummary = useCallback((rowData) => {
  //   if (!Array.isArray(rowData) || rowData.length === 0) return [];

  //   const result = [];
  //   let currentGroup = [];
  //   let prevMtype = null;

  //   const calcQtySummary = (group) => {
  //     const summary = {
  //       mtypeGbnNm: '( 중분류계 )', //`${group[0].mtypeGbnNm} 소계(saleQty)`,
  //       goodsId: "",
  //       goodsNm: "",
  //       saleSequ: "",
  //       isSummary: true,
  //     };
  //     group.forEach(row => {
  //       Object.keys(row).forEach(key => {
  //         if (/^saleQty\d+$/.test(key)) {
  //           summary[key] = (summary[key] || 0) + Number(row[key] || 0);
  //         }
  //       });
  //     });
  //     return summary;
  //   };

  //   const calcAmtAsQtySummary = (group) => {
  //     const summary = {
  //       mtypeGbnNm: '', //`${group[0].mtypeGbnNm} 소계(saleAmt→saleQty)`,
  //       goodsId: "",
  //       goodsNm: "",
  //       saleSequ: "",
  //       isSummary: true,
  //     };
  //     group.forEach(row => {
  //       Object.keys(row).forEach(key => {
  //         if (/^saleAmt\d+$/.test(key)) {
  //           const qtyKey = key.replace("saleAmt", "saleQty");
  //           summary[qtyKey] = (summary[qtyKey] || 0) + Number(row[key] || 0);
  //         }
  //       });
  //     });
  //     return summary;
  //   };

  //   const allQtySummary = { mtypeGbnNm: "[ 합 계 ]", goodsId: "", goodsNm: "", saleSequ: "", isSummary: false, isTotal: true };
  //   const allAmtSummary = { mtypeGbnNm: "", goodsId: "", goodsNm: "", saleSequ: "", isSummary: false, isTotal: true };

  //   // 그룹별 소계 계산
  //   rowData.forEach(item => {
  //     if (prevMtype !== null && item.mtypeGbn !== prevMtype) {
  //       if (currentGroup.length > 0) {
  //         const qtySummary = calcQtySummary(currentGroup);
  //         const amtAsQtySummary = calcAmtAsQtySummary(currentGroup);

  //         result.push(...currentGroup, qtySummary, amtAsQtySummary);

  //         // 전체 합계 계산 (각 소계를 합산)
  //         Object.keys(qtySummary).forEach(key => {
  //           if (/^saleQty\d+$/.test(key)) {
  //             allQtySummary[key] = (allQtySummary[key] || 0) + qtySummary[key];
  //           }
  //         });
  //         Object.keys(amtAsQtySummary).forEach(key => {
  //           if (/^saleQty\d+$/.test(key)) {
  //             allAmtSummary[key] = (allAmtSummary[key] || 0) + amtAsQtySummary[key];
  //           }
  //         });

  //         currentGroup = [];
  //       }
  //     }

  //     currentGroup.push(item);
  //     prevMtype = item.mtypeGbn;
  //   });

  //   if (currentGroup.length > 0) {
  //     const qtySummary = calcQtySummary(currentGroup);
  //     const amtAsQtySummary = calcAmtAsQtySummary(currentGroup);

  //     result.push(...currentGroup, qtySummary, amtAsQtySummary);

  //     Object.keys(qtySummary).forEach(key => {
  //       if (/^saleQty\d+$/.test(key)) {
  //         allQtySummary[key] = (allQtySummary[key] || 0) + qtySummary[key];
  //       }
  //     });
  //     Object.keys(amtAsQtySummary).forEach(key => {
  //       if (/^saleQty\d+$/.test(key)) {
  //         allAmtSummary[key] = (allAmtSummary[key] || 0) + amtAsQtySummary[key];
  //       }
  //     });
  //   }

  //   // 마지막에 전체 합계 행 추가 (스타일 다르게)
  //   result.push(allQtySummary, allAmtSummary);

  //   return result;
  // }, []);

  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  // -----------------------------
  // 그리드 더블 클릭 (현재 빈 상태, 확장 가능)
  // -----------------------------  
  const handleRowDoubleClick = useCallback(({ data }) => {
    // 예: 상세 모달 호출 등 확장 가능
    // showPopupModal({ title: '상세', content: <Detail data={data} /> })
    //console.log('double clicked row:', data);
  }, []);

  // 상품 모달 창 닫기
  const handleGoodsSearchClose = useCallback(() => {
    setGoodsSearchModal({ visible: false, id: '', row: {} });
  }, []);

  // 상품 선택 시
  const handleGoodsSelected = useCallback((rows) => {
    if (goodGbn === "F") {
      const list = rows
        .map(item => item.goodsId)
        .filter(v => v)
        .join(",");
      setFilters(prev => ({
        ...prev,
        sgoods: list
      }));
    } else if (goodGbn === "T") {
      const list = rows
        .map(item => item.goodsId)
        .filter(v => v)
        .join(",");
      setFilters(prev => ({
        ...prev,
        egoods: list
      }));
    }
    handleGoodsSearchClose();
  }, [goodGbn, handleGoodsSearchClose]);

  // --------------------------------------------------------
  // 메인 페이지 초기 로딩 - 코드 조회 등 기타 필요 작업 수행.
  // --------------------------------------------------------
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
            let res = await request(
              "domain/insanga/store/system",
              { action: "selectCode", payload: { codeGroupCode } },
              {},
              "post"
            );
            let values = [];
            if (key === "sioIdData" || key === "eioIdData") {
              values = [key, (Array.isArray(res?.data?.body) ? res.data.body : []).filter(item => /^[247]/.test(item.code))];
            } else {
              values = [key, (Array.isArray(res?.data?.body) ? res.data.body : [])];
            }
            return values;
          })
        );
        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
    // 초기 검색년월을 사용하여 컬럼 세팅 (검색폼의 defaultValue 기반)
    // SEARCH_FORM[0].defaultValue가 있다면 적용
    if (SEARCH_FORM && SEARCH_FORM[0] && SEARCH_FORM[0].defaultValue) {
      handleSetHeader(SEARCH_FORM[0].defaultValue);
    }
  }, [request, handleSetHeader]); // handleSetHeader 의존 추가

  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      <div className="content-main-area">

        <div className="content-center-panel" style={{ width: `100%` }}>
          {/* 좌측 조회조건 영역 - 자동 생성 */}
          <LeftPanel
            codes={codes}
            filters={filters}
            handleFilterChange={handleFilterChange}
            searchForm={SEARCH_FORM}
            buttons={[
              { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
            ]}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            leftWidth={leftWidth}
            rowByDisplayCnt={3}
            title={`월간 주문별 입고 현황`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">월간 주문별 입고 현황</div> */}
          <div className="ag-theme-alpine content-panel-grid">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnGroups}
              defaultColDef={{
                sortable: Properties.grid.default.colDef.sortable,
                filter: Properties.grid.default.colDef.filter,
                resizable: Properties.grid.default.colDef.resizable,
                minWidth: Properties.grid.default.colDef.minWidth,
              }}
              rowHeight={Properties.grid.default.data.height}
              headerHeight={Properties.grid.default.header.height}
              domLayout={Properties.grid.default.domLayout}
              onRowDoubleClicked={handleRowDoubleClick}
              rowSelection={Properties.grid.default.rowSelection}
              suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection}
              enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
              tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
              pagination={Properties.grid.default.pagination}
              paginationPageSize={Properties.grid.default.pageSize}
              paginationPageSizeSelector={Properties.grid.default.pageSizeList}
              suppressPaginationPanel={false}
              enableCellSpan={true}
              getRowClass={params => {
                if (params.data?.isSummary) return 'summary-row';
                if (params.data?.isTotal) return 'pan-summary-row';
                return '';
              }}
            />
          </div>

          {/* 상품검색 모달 */}
          {goodsSearchModal.visible && (
            <FrameModal title="상품 검색"
              width="1024px"
              height="768px"
              closeOnOverlayClick={false}
              onClose={handleGoodsSearchClose}>
              <GoodsSearch onGoodsSelected={handleGoodsSelected} isAgentCheck={false} />
            </FrameModal>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(OrderByShipStatus);
