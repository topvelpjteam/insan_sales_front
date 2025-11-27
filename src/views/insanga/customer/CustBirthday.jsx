/*********************************************************************
 * - 메뉴 : 매장관리 -> 고객관리 -> 고객 생일 조회
 * - 파일명 : CustBirthday.jsx
 * - 프로시저: USP_SX040_Q
 *
 * [리팩토링 요약 - React 성능 최적화]
 *
 * 1. codeGroups: useState → useMemo
 *    - 변경되지 않는 설정 배열을 useMemo로 메모이제이션
 *    - 불필요한 setState 함수 생성 방지
 *
 * 2. SEARCH_FORM: 일반 변수 → useMemo
 *    - 16개 필드를 포함한 대형 배열
 *    - dayjs() 함수 중복 실행 방지
 *    - 하위 컴포넌트 props 참조 동일성 유지
 *
 * 3. columnGroups: useState → useMemo
 *    - 18개 컬럼 정의를 포함한 대형 배열
 *    - AG Grid 재렌더링 최적화
 *    - gridNoColumn() 함수 중복 호출 방지
 *
 * 4. initialFilters: useMemo로 초기값 계산
 *    - 복잡한 reduce 연산 최적화
 *    - SEARCH_FORM 변경 시에만 재계산
 *
 * 5. initialCodes: useMemo로 초기값 계산
 *    - codeGroups 변경 시에만 재계산
 *
 * [성능 개선 효과]
 * - 컴포넌트 리렌더링 시 불필요한 객체/배열 재생성 방지
 * - 메모리 사용량 감소
 * - 하위 컴포넌트 불필요한 리렌더링 방지 (참조 동일성 유지)
 * - AG Grid 성능 향상
 * ********************************************************************/

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// 시스템 기본정보 주입
import Properties from "@/system/Properties";

// 그리드 no컬럼, 화면 layout설정 주입
import { gridNoColumn, useLayoutWidths, getTabLabel } from "@/system/hook/CommonHook";

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
import { formatDateToYYYYMMDD, numberFormatter } from "@/system/utils/common";

// agentId 셀렉터
import { getAgentId, getAgentData } from "@/system/store/redux/agent";

/**
 * CustBirthday 컴포넌트 - 고객 생일 조회 (SX040)
 */
const CustBirthday = ({ tabKey }) => {
  // ========================================
  // 1. Redux 상태 조회
  // ========================================
  const user = useSelector((state) => state.user.user);
  const agentId = useSelector(getAgentId) || "";
  const agentData = useSelector(getAgentData);

  // ========================================
  // 2. 훅 초기화
  // ========================================
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showToast, showMessageModal } = useCustomContents();

  // ========================================
  // 3. State 선언
  // ========================================
  const [rowData, setRowData] = useState([]);

  // -----------------------------
  // CODE_GROUPS를 useMemo로 선언
  // -----------------------------
  // [리팩토링 이유]
  // - useState를 사용하면 컴포넌트가 리렌더링될 때마다 setCodeGroups 함수가 새로 생성됨
  // - 이 배열은 변경되지 않는 상수이므로 useMemo로 최적화
  // - 의존성 배열이 비어있어 컴포넌트 생명주기 동안 한 번만 생성됨
  // - 메모리 사용량 감소 및 불필요한 리렌더링 방지
  const codeGroups = useMemo(() => [
    { key: "agentData", codeGroupCode: "" },         // Redux
    { key: "brandData", codeGroupCode: "S02" },      // API 조회 - 브랜드
    { key: "custGbnData", codeGroupCode: "S37" },    // API 조회 - 고객구분
    { key: "chkData", codeGroupCode: "" },           // 하드코딩 (전체/Y/N)
  ], []);

  // -----------------------------
  // 조회 조건 생성 폼
  // -----------------------------
  // [리팩토링 이유]
  // - SEARCH_FORM은 16개의 복잡한 객체 배열로 구성
  // - 컴포넌트가 리렌더링될 때마다 이 배열이 재생성되면 성능 저하 발생
  // - dayjs() 함수가 매번 실행되어 불필요한 날짜 계산 수행
  // - useMemo로 감싸서 최초 1회만 생성하고 이후 재사용
  // - 하위 컴포넌트에 props로 전달될 때 참조 동일성 유지로 불필요한 리렌더링 방지
  const SEARCH_FORM = useMemo(() => [
    {
      label: "매장코드",
      key: "agentList",
      type: "multiple",
      codeKey: "agentData",
      defaultValue: ""
    },
    {
      label: "브랜드코드(F)",
      key: "sBrand",
      type: "select",
      codeKey: "brandData",
      defaultValue: "0"
    },
    {
      label: "브랜드코드(T)",
      key: "eBrand",
      type: "select",
      codeKey: "brandData",
      defaultValue: "ZZZZZ"
    },
    {
      label: "고객구분",
      key: "custGbnList",
      type: "multiple",
      codeKey: "custGbnData",
      defaultValue: ""
    },
    {
      label: "생일(음력F)",
      key: "sBirthM",
      type: "input",
      placeholder: "MMDD",
      defaultValue: ""
    },
    {
      label: "생일(음력T)",
      key: "eBirthM",
      type: "input",
      placeholder: "MMDD",
      defaultValue: ""
    },
    {
      label: "생일(양력F)",
      key: "sBirthP",
      type: "input",
      placeholder: "MMDD",
      defaultValue: dayjs().format("MMDD")
    },
    {
      label: "생일(양력T)",
      key: "eBirthP",
      type: "input",
      placeholder: "MMDD",
      defaultValue: dayjs().add(1, 'month').format("MMDD")
    },
    {
      label: "연령",
      key: "sAge",
      type: "numberRange",
      minKey: "sAge",
      maxKey: "eAge",
      defaultValue: { min: 0, max: 150 },
    },
    {
      label: "DM수신",
      key: "dmChk",
      type: "select",
      codeKey: "chkData",
      defaultValue: ""
    },
    {
      label: "SMS수신",
      key: "smsChk",
      type: "select",
      codeKey: "chkData",
      defaultValue: ""
    },
    {
      label: "E-MAIL수신",
      key: "emailChk",
      type: "select",
      codeKey: "chkData",
      defaultValue: ""
    },
    {
      label: "판매일자",
      key: "sSaleD",
      type: "dateRange",
      startKey: "sSaleD",
      endKey: "eSaleD",
      defaultValue: {
        start: "2018-01-01",
        end: dayjs().format("YYYY-MM-DD"),
      },
    },
    {
      label: "판매금액",
      key: "sSaleAmt",
      type: "numberRange",
      minKey: "sSaleAmt",
      maxKey: "eSaleAmt",
      defaultValue: { min: 0, max: 99999999 },
    },
    {
      label: "기준년월",
      key: "mailYymm",
      type: "yyyymm",
      defaultValue: dayjs().format("YYYY-MM"),
    },
    {
      label: "마일리지",
      key: "sMail",
      type: "numberRange",
      minKey: "sMail",
      maxKey: "eMail",
      defaultValue: { min: 0, max: 99999999 },
    },
  ], []);

  // -----------------------------
  // 그리드 컬럼 정의
  // -----------------------------
  // [리팩토링 이유]
  // - columnGroups는 18개의 컬럼 정의를 포함하는 대형 배열
  // - useState로 관리하면 setColumnGroups 함수가 매번 생성되어 메모리 낭비
  // - 컬럼 정의는 동적으로 변경되지 않으므로 useMemo로 최적화
  // - AgGridReact에 props로 전달될 때 참조가 유지되어 그리드 재렌더링 방지
  // - gridNoColumn() 함수도 한 번만 실행
  const columnGroups = useMemo(() => [
    gridNoColumn(),
    {
      headerName: '매장코드',
      field: 'agentId',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      pinned: 'left',
      flex: 1,
    },
    {
      headerName: '매장명',
      field: 'agentNm',
      width: 150,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      pinned: 'left',
      flex: 2,
    },
    {
      headerName: '고객구분',
      field: 'custGbn',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '고객코드',
      field: 'custId',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '고객명',
      field: 'custNm',
      width: 120,
      minWidth: 80,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 2,
    },
    {
      headerName: '음양',
      field: 'birthGbn',
      width: 60,
      minWidth: 60,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '생년월일',
      field: 'custBirthD',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
      valueFormatter: (params) => {
        const birthValue = params.data.custBirthD;
        return formatDateToYYYYMMDD(birthValue);
      }
    },
    {
      headerName: '나이',
      field: 'cAge',
      width: 60,
      minWidth: 60,
      cellClass: 'text-right',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '우편번호',
      field: 'zipId',
      width: 100,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '주소',
      field: 'address',
      width: 250,
      minWidth: 150,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 3,
    },
    {
      headerName: 'DM수신',
      field: 'dmChk',
      width: 80,
      minWidth: 60,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: '휴대폰',
      field: 'custHp',
      width: 120,
      minWidth: 100,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
    },
    {
      headerName: '전화번호',
      field: 'custTel',
      width: 120,
      minWidth: 100,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 2,
    },
    {
      headerName: 'SMS수신',
      field: 'smsChk',
      width: 80,
      minWidth: 60,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: 'E-Mail',
      field: 'custEmail',
      width: 200,
      minWidth: 150,
      cellClass: 'text-left',
      sortable: false,
      filter: false,
      flex: 2,
    },
    {
      headerName: 'E-Mail수신',
      field: 'emailChk',
      width: 90,
      minWidth: 80,
      cellClass: 'text-center',
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "판매금액",
      field: "saleAmt",
      valueFormatter: numberFormatter,
      cellClass: "text-right",
      width: 120,
      minWidth: 100,
      sortable: false,
      filter: false,
      flex: 1,
    },
    {
      headerName: "마일리지",
      field: "mailP",
      valueFormatter: numberFormatter,
      cellClass: "text-right",
      width: 100,
      minWidth: 80,
      sortable: false,
      filter: false,
      flex: 1,
    },
  ], []);

  // -----------------------------
  // 조회 조건 필터 초기값 계산
  // -----------------------------
  // [리팩토링 이유]
  // - SEARCH_FORM 배열을 순회하며 복잡한 reduce 연산 수행
  // - useState 초기화 시 매번 reduce가 실행되는 것을 방지
  // - useMemo로 감싸서 SEARCH_FORM이 변경될 때만 재계산
  // - 16개 필드의 초기값을 자동으로 생성하는 로직이므로 최적화 효과가 큼
  const initialFilters = useMemo(() => SEARCH_FORM.reduce((acc, cur) => {
      switch (cur.type) {
        case "dateRange":
        case "dayRange":
          acc[cur.startKey] = cur.defaultValue?.start || "";
          acc[cur.endKey] = cur.defaultValue?.end || "";
          break;
        case "numberRange":
          acc[cur.minKey] =
            cur.defaultValue?.min !== undefined && !isNaN(cur.defaultValue.min)
              ? Number(cur.defaultValue.min)
              : "";
          acc[cur.maxKey] =
            cur.defaultValue?.max !== undefined && !isNaN(cur.defaultValue.max)
              ? Number(cur.defaultValue.max)
              : "";
          break;
        default:
          acc[cur.key] = cur.defaultValue ?? "";
      }
      return acc;
    }, {}), [SEARCH_FORM]);

  // filters State 선언
  const [filters, setFilters] = useState(initialFilters);

  // -----------------------------
  // 공통코드 데이터 초기값 계산
  // -----------------------------
  // [리팩토링 이유]
  // - codeGroups 배열을 reduce로 변환하는 연산
  // - useState 초기화 시 매번 실행되는 것을 방지
  // - useMemo로 감싸서 codeGroups가 변경될 때만 재계산
  // - 의존성 배열에 codeGroups를 포함하여 동적 변경 대응
  const initialCodes = useMemo(() =>
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {}),
    [codeGroups]
  );

  // 공통코드 State 선언
  const [codes, setCodes] = useState(initialCodes);

  // ========================================
  // 4. Layout 훅
  // ========================================
  const {
    sidebarOpen,
    leftWidth,
    centerWidth,
    toggleSidebar,
  } = useLayoutWidths(true, 30, false, 0);

  // ========================================
  // 5. 조회 조건 변경 핸들러
  // ========================================
  const handleFilterChange = useCallback((key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value })), []);

  // ========================================
  // 6. 데이터 조회 함수
  // ========================================
  const fetchData = useCallback(
    async (action = "selectSX040List") => {
      try {
        showLoading();

        // 날짜 포맷팅 함수 (YYYY-MM-DD -> YYYYMMDD)
        const formatDate = (dateStr) => {
          if (!dateStr) return "";
          return dateStr.replace(/-/g, "");
        };

        const payload = {
          action,
          payload: {
            // 배열 → 쉼표 구분 문자열 변환
            agentList: Array.isArray(filters.agentList)
              ? filters.agentList.join(',')
              : (filters.agentList || ''),

            // 브랜드 (기본값)
            sBrand: filters.sBrand || '',
            eBrand: filters.eBrand || '',

            // 고객구분 배열 → 쉼표 구분
            custGbnList: Array.isArray(filters.custGbnList)
              ? filters.custGbnList.join(',')
              : (filters.custGbnList || ''),

            // 생일 (MMDD 형식, -- 제거)
            sBirthP: (filters.sBirthP || '').replace(/-/g, ''),
            eBirthP: (filters.eBirthP || '').replace(/-/g, ''),
            sBirthM: (filters.sBirthM || '').replace(/-/g, ''),
            eBirthM: (filters.eBirthM || '').replace(/-/g, ''),

            // 나이
            sAge: (filters.sAge !== undefined && filters.sAge !== null && filters.sAge !== '') ? String(filters.sAge) : '0',
            eAge: (filters.eAge !== undefined && filters.eAge !== null && filters.eAge !== '') ? String(filters.eAge) : '150',

            // 수신동의
            dmChk: filters.dmChk || '',
            smsChk: filters.smsChk || '',
            emailChk: filters.emailChk || '',

            // 판매일자 (YYYY-MM-DD → YYYYMMDD)
            sSaleD: formatDate(filters.sSaleD),
            eSaleD: formatDate(filters.eSaleD),

            // 판매금액
            sSaleAmt: (filters.sSaleAmt !== undefined && filters.sSaleAmt !== null && filters.sSaleAmt !== '') ? String(filters.sSaleAmt) : '0',
            eSaleAmt: (filters.eSaleAmt !== undefined && filters.eSaleAmt !== null && filters.eSaleAmt !== '') ? String(filters.eSaleAmt) : '99999999',

            // 마일리지 기준년월 (YYYY-MM → YYYYMM)
            mailYymm: (filters.mailYymm || '').replace(/-/g, ''),

            // 마일리지
            sMail: (filters.sMail !== undefined && filters.sMail !== null && filters.sMail !== '') ? String(filters.sMail) : '0',
            eMail: (filters.eMail !== undefined && filters.eMail !== null && filters.eMail !== '') ? String(filters.eMail) : '99999999',

            // userId 자동 주입
            userId: user?.emplId || 'ADMIN'
          },
        };

        console.log('[CustBirthday] 조회 요청 payload:', payload);

        const res = await request("domain/insanga/store/customer", payload, {}, "post", 'json');

        console.log('[CustBirthday] 조회 응답:', res);

        const body = res?.data?.body;
        setRowData(body || []);

        if (body && body.length > 0) {
          showToast(`${body.length}건이 조회되었습니다.`, "success");
        } else {
          showToast("조회된 데이터가 없습니다.", "info");
        }

      } catch (err) {
        console.error("데이터 조회 실패:", err);
        showMessageModal({
          title: "오류",
          content: "데이터 조회 중 오류가 발생했습니다.",
        });
      } finally {
        hideLoading();
      }
    },
    [filters, request, user, showLoading, hideLoading, showToast, showMessageModal]
  );

  // ========================================
  // 7. 검색 버튼 핸들러
  // ========================================
  const handleSearch = useCallback(async () => {
    setRowData([]);
    await fetchData();
  }, [fetchData]);

  // ========================================
  // 8. 그리드 더블 클릭
  // ========================================
  const handleRowDoubleClick = useCallback(({ data }) => {
    console.log('double clicked row:', data);
  }, []);

  // ========================================
  // 9. 공통 코드 로드 (useEffect)
  // ========================================
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          codeGroups.map(async ({ key, codeGroupCode }) => {
            if (!codeGroupCode) return [key, []];

            let res = await request(
              "domain/insanga/store/system",
              { action: "selectCode", payload: { codeGroupCode } },
              {},
              "post"
            );
            return [key, (Array.isArray(res?.data?.body) ? res.data.body : [])];
          })
        );

        // agentData는 Redux store에서 가져오기
        if (codeGroups.some(col => col.key === "agentData")) {
          const newAgentData = agentData.map(item => ({
            code: item.agentId,
            codeNm: item.agentNm,
          }));
          results.push(["agentData", newAgentData]);
        }

        // 하드코딩 데이터 (수신/거부)
        // 주의: "전체" 옵션은 SearchFilter 컴포넌트에서 자동으로 추가되므로 여기서는 제외
        if (codeGroups.some(col => col.key === "chkData")) {
          const chkData = [
            { code: "Y", codeNm: "수신" },
            { code: "N", codeNm: "거부" },
          ];
          results.push(["chkData", chkData]);
        }

        const finalCodes = Object.fromEntries(results);
        setCodes(finalCodes);

      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request, agentData]);

  // ========================================
  // 10. Redux 데이터 변경 감지 (useEffect)
  // ========================================
  useEffect(() => {
    if (!Array.isArray(agentData)) return;

    setCodes(prev => ({
      ...prev,
      agentData: agentData.map(item => ({
        code: item.agentId,
        codeNm: item.agentNm,
      })),
    }));
  }, [agentData]);

  // ========================================
  // 11. JSX 렌더링
  // ========================================
  return (
    <div className="content-registe-container">
      <div className="content-main-area">
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
          title={getTabLabel(tabKey)}
        />

        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">고객 생일 조회</div>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustBirthday);
