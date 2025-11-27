/*********************************************************************
 * - 참고 파일
 *   1. PartnerRegist.jsx
 *   2. PartnerRegistForm.json
 * ********************************************************************
 * - 라우터
 *   1. npm run dev시 자동 생성 됩니다.
 *   2. 라우터 파일
 *      2.1 RoutersMap.js
 *   3. 메뉴등록 메뉴 url의 경로 일치 시켜야 합니다.
 *      3.1 예) 
 *           - 메뉴 url: /insanga/partner/partnerRegist ( 관리자 모드에서 메뉴 등록 )
 *           - react파일 매칭: views/insanga/partner/PartnerRegist
 *            
 * - 조회조건 : SEARCH_FORM 설정 된 정보를 바탕으로 LeftPanel이 자동 생성합니다.
 * - 그리드 : aggrid를 사용 
 *    1. 헤더 : COLUMN_GROUPS정의 함. (데이터 조회 시 field와 매칭 됩니다.)
 *    2. 데이터 : 
 * - 상세정보조회
 *    1. 그리드 더블 클릭 시 상세 모달창 호출 됨
 *    2. 1에서 모달 창은 자동 생성됩니다.
 *    3. 자동 생성시 관련 파일
 *       3.1. PartnerRegistForm.json
 *            3.1.1 버튼 정의
 *            3.1.2 입력 항목 정의 (타입/필수/사용공통코드/등등)
 *       3.2. DynamicViewDetail
 *            3.1에 정의 된 정보를 바탕으로 상세보기 창을 자동 생성합니다.
 *    4. 삭제: 현재 목록 조회에서 삭제 된 행이 조회 되고 있음.
 * - 일괄등록 - 아래 참고 하시면 됩니다.
 *   1. 템플릿 다운로드: handleDownloadTemp
 *   2. 파일선택: handleFileSelect
 *   3. 업로드: handleFileChange
 *   4. 취소: onClose * 
 * 
 * - 서버 요청 시 (request함수 사용시 ) try catch finally 문을 사용 하세요
    // 로딩 바 출력
    showLoading();
    try {
      await request(
        "domain/insanga/store/partner",
        { action: "savePartner", payload: formData },
        {},
        "post"
      );

      showMessageModal({
        title: "알림",
        content: "저장 되었습니다.",
        onCallback: async () => {
          fetchData();
          await callback(true);
          handleClose();
          //hideLoading();
        }
      });

    } catch (error) {
      // 페이지 별 처리 사항

    } finally {
      // 로딩 바 숨기기
      hideLoading();
    }
  
    - 로그인 정보
        "userId": "user-1746059430590-01-tomis-esJq0",
        "loginId": "systemAdmin",
        "loginName": "시스템 관리자",
        "emplNo": "202401004",
        "emplNm": "김준호",
        "unitCd": "01",
        "unitNm": "사)글로벌비즈니스컨설팅",
        "deptCd": "1900000",
        "deptNm": "정책사업팀",
        "positionCd": "112",
        "positionNm": "부장",
        "gradeCd": "113",
        "gradeNm": "일반3급",
        "mobileTel": "042-719-5149",
        "userTel": "+mVz5sIXqOYj5ml3fXXDUZqW2SDrmlPrltg+P/d1VII=",
        "officeTel": "-",
        "emailId": "24@kforc.or.kr",
        "userEmail": "bcasMJr/x7aDdinYSFzVBYQ1blH232Z7HM9QftGWGc0O7iZ8006aZMGiaVjVeT26",
        "emailKey": null,
        "loginDatetime": "2025-11-03 09:39:49",
        "loginAccessIp": "172.30.1.88",
        "lastLoginDatetime": "2025-11-03 09:38:03",
        "lastLoginAccessIp": "172.30.1.88",
        "changePasswordDatetime": null,
        "passwordExpireDatetime": null,
        "profileImage": 0
 * 
 **********************************************************************/
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
import { useSelector, useDispatch } from 'react-redux';

// utils
import _ from 'lodash';

// 날짜 유틸
import dayjs from "dayjs";

// 유효성 체크를 위한 함수
import { saveAsExcel, validateFormData, parseExcelFile, formatDateToYYYYMMDD } from "@/system/utils/common";

// 조회 조건 생성 폼
// 1. key값으로 입력 된 값들이 설정 됩니다.
// 2. type: multiple, select, input, textarea등
const SEARCH_FORM = [
  {
    label: "출하요구일",
    key: "sordD",
    startKey: "sordDFrom",
    endKey: "sordDTo",
    type: "dateRange",
    codeKey: "",
    defaultValue: {
      start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
      end: dayjs().add(1, "month").format("YYYY-MM-DD"),
    },
  },
  { label: "주문구분 FROM", key: "sioId", type: "select", codeKey: "sioIdData", defaultValue: "210" },
  { label: "주문구분 TO", key: "eioId", type: "select", codeKey: "eioIdData", defaultValue: "720" },
  { label: "출하여부", key: "picking", type: "radio", codeKey: "shipData", defaultValue: "Y" },
];

// 공통 코드 설정 - 각 프로그램에서 사용 할 콤보 박스 설정 
// codeGroupCode가 존재 하면 공통코드에서 가져 옵니다.
// codeGroupCode가 ""인 경우 코드 조회 부분에서 하드코딩 하시면 됩니다.
const CODE_GROUPS = [
  { key: "sioIdData", codeGroupCode: "S19" },
  { key: "eioIdData", codeGroupCode: "S19" },
  { key: "shipData", codeGroupCode: "" },
];

// 그리드 컬럼 설정 - 그리드에서 사용하는 컬럼을 정의하세요.
const COLUMN_GROUPS = [
  {
    headerName: '주문일자',
    field: 'orderD',
    width: 120,
    minWidth: 80,
    sortable: false,
    filter: false,
    valueFormatter: (params) => {
      // 여러 필드명 시도
      const openDateValue = params.data.openD || params.data.openDate;
      const formatted = formatDateToYYYYMMDD(openDateValue);
      // console.log('🔍 그리드 거래시작일자 포맷팅:', {
      //   원본값: openDateValue,
      //   원본타입: typeof openDateValue,
      //   변환값: formatted,
      //   전체데이터: params.data
      // });
      return formatted;
    }
  },
  {
    headerName: '출하요구일',
    field: 'requireD',
    width: 120,
    minWidth: 150,
    flex: 1,
    sortable: false,
    filter: false,
    valueFormatter: (params) => {
      // 여러 필드명 시도
      const openDateValue = params.data.openD || params.data.openDate;
      const formatted = formatDateToYYYYMMDD(openDateValue);
      // console.log('🔍 그리드 거래시작일자 포맷팅:', {
      //   원본값: openDateValue,
      //   원본타입: typeof openDateValue,
      //   변환값: formatted,
      //   전체데이터: params.data
      // });
      return formatted;
    }
  },
  {
    headerName: '출고일자',
    field: 'saleD',
    width: 120,
    minWidth: 80,
    sortable: false,
    filter: false,
    valueFormatter: (params) => {
      // 여러 필드명 시도
      const openDateValue = params.data.openD || params.data.openDate;
      const formatted = formatDateToYYYYMMDD(openDateValue);
      // console.log('🔍 그리드 거래시작일자 포맷팅:', {
      //   원본값: openDateValue,
      //   원본타입: typeof openDateValue,
      //   변환값: formatted,
      //   전체데이터: params.data
      // });
      return formatted;
    }
  },
  {
    headerName: '주문번호',
    field: 'agentNo',
    width: 100,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '주문구분',
    field: 'ioNm',
    width: 120,
    minWidth: 100,
    sortable: false,
    filter: false
  },
  {
    headerName: '상품코드',
    field: 'goodsId',
    width: 100,
    minWidth: 90,
    sortable: false,
    filter: false
  },
  {
    headerName: '상품명',
    field: 'goodsNm',
    width: 150,
    minWidth: 90,
    sortable: false,
    filter: false
  },
  {
    headerName: '출하여부',
    field: 'pickingTag',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '원주문수량',
    field: 'orgOrderQty',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '주문수량',
    field: 'orderQty',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '주문단가',
    field: 'orderDan',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '공급가',
    field: 'orderAmt',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '부가세',
    field: 'orderVat',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '합계',
    field: 'totAmt',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '출고수량',
    field: 'saleQty',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '미출수량',
    field: 'miQty',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  },
  {
    headerName: '매장입고',
    field: 'banTag',
    width: 90,
    minWidth: 80,
    sortable: false,
    filter: false
  }
];

// 컴포넌트 시작 부분 입니다. - 파일 명칭(컴포넌트) 시작은 반드시 대문자로 시작하세요. react에서 인식을 못합니다.
const CheckOrderShipHiistory = ({ tabKey }) => {

  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);

  // api호출을 위한 서비스
  const { request } = useApiCallService();

  // 서버 요청 시 로딩바 함수
  const { showLoading, hideLoading } = useLoading();

  // 메세지 창 함수
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();

  // 그리드 데이터 변수
  const [rowData, setRowData] = useState([]);

  // 조회 조건 필터 - 조회 조건 입력 또는 변경시 filter변수에 저장 됩니다. 
  // 서버 호출시 filters를 보내면 됩니다.
  const [filters, setFilters] = useState(SEARCH_FORM.reduce((acc, cur) => {
    acc[cur.key] = ""; // 기본값을 모두 빈 문자열로
    return acc;
  }, {}));

  // 공통코드 사용 변수
  // 1. CODE_GROUPS에 정의 된 코드의 값들을 저장 합니다.
  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // 파일객체 ref(파일 객체 접근을 위한 변수)
  const fileInputRef = useRef(null);

  // 선택된 파일명 상태
  const [selectedFileName, setSelectedFileName] = useState("");

  // 선택된 파일명 상태
  const [excelData, setExcelData] = useState();

  // layout 훅 사용 - 각 프로그램의 필수
  // 1. useLayoutWidths(true, 20, false, 0)
  //    1.1 true - 좌측 패널 사용여부
  //    1.2 20   - 좌측 패널 너비 20%
  //    1.3 false - 우측 패널 사용여부 (사용안함)
  //    1.4 0     - 우측 패널 너비 0                        
  const {
    sidebarOpen, // 메뉴 show/hide
    //rightPanelOpen, // 사용안함
    leftWidth, // 좌측(조회조건) 너비
    //rightWidth,
    centerWidth, // 중앙(각 프로그램) 너비
    toggleSidebar, // 조회조건 show/hide
    //toggleRightPanel
  } = useLayoutWidths(true, 30, false, 0);

  // 조회 조건 변경 시 filters에 반영하기 위한 함수.
  const handleFilterChange = useCallback((key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value })));

  // -----------------------------
  // 조회버튼 클릭시 실행 함수.
  // -----------------------------
  const handleSearch = useCallback(async () => {
    //console.log("✅ 검색 실행1:", filters);
    setRowData([]);
    fetchData();
  });
  // 조회버튼 클릭 후 실제 데이터 조회 함수.
  // 1. action은 반드시 있어야 합니다.
  // 2. 요청 할 파라메터는 반드시 아래 형태로 넘어가야 합니다.
  //    2.1 payload: {key:값, key1:값1, key2: JSON.stringify(json object)}
  const fetchData = useCallback(
    async (action = "selectCheckOrderShipHis") => {
      try {
        showLoading();
        const payload = {
          action,
          payload: {
            agentId: user?.agentId || 'Z0000', // T9000, Z0000, '5', null(관리자) agentId가 없어서 일단 하드코딩.
            sordD: filters.sordDFrom.replace(/-/g, '') || '',
            eordD: filters.sordDTo.replace(/-/g, '') || '',
            sioId: filters.sioId || '',
            eioId: filters.eioId || '',
            picking: filters.picking || '',
          },
        };

        /** ✅ 엑셀 다운로드 요청일 경우 */
        // if (action === "downloadList") {
        //   payload.payload['listColumnInfo'] = JSON.stringify(columnInfos);
        //   return; // 다운로드 후 종료
        // }

        /** ✅ 일반 목록 조회 (기존 로직) */
        const res = await request("domain/insanga/store/daily", payload, {}, "post", 'json');
        const body = res?.data?.body;
        console.log(body);
        setRowData(body || []);
      } catch (err) {
        console.error("데이터 조회 실패:", err);
      } finally {
        hideLoading(); // ✅ 오버레이 제거
      }
    },
    [filters, hideLoading, showLoading, request, user.agentId]
  );


  // -----------------------------
  // 그리드 더블 클릭
  // -----------------------------  
  const handleRowDoubleClick = useCallback(({ data }) => {
  }, []);

  // --------------------------------------------------------
  // 메인 페이지 초기 로딩 - 코드 조회 등 기타 필요 작업 수행. 
  //      로딩 시 한번만 수행하는 것들...
  // --------------------------------------------------------
  useEffect(() => {
    // 코드 조회.
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
            //orderGbnFromData
            if (key === "sioIdData" || key === "eioIdData") {
              values = [key, (Array.isArray(res?.data?.body) ? res.data.body : []).filter(item => /^[247]/.test(item.code))];
            }
            return values; // [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        // ✅ vatData 직접 생성
        const shipData = [
          { code: "Y", codeNm: "출하" },
          { code: "N", codeNm: "미출하" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "shipData")) {
          results.push(["shipData", shipData]);
        }

        // ✅ 최종 codes 상태 설정

        setCodes(Object.fromEntries(results));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request, user?.agentId]);

  // -----------------------------
  // 그리드내의 No.컬럼 추가 설정.
  // -----------------------------
  const columnDefs = useMemo(() => {
    // 'No.' 컬럼이 없는 경우에만 추가합니다.
    const hasNoColumn = COLUMN_GROUPS.some(col => col.headerName === 'No.');

    if (hasNoColumn) {
      return COLUMN_GROUPS;
    }

    // 새로운 배열을 생성하여 기존 컬럼 정의에 'No.' 컬럼을 추가합니다.
    const newColumnDefs = [...COLUMN_GROUPS];
    newColumnDefs.splice(1, 0, gridNoColumn());
    return newColumnDefs;
  }, []);
  const childRef = useRef(null);

  return (
    <div className="content-registe-container">
      {/* <div className="content-top-bar">
        <div className="content-page-title">상품 등록</div>
        <button onClick={toggleSidebar}>좌측 패널 토글</button>
        <button onClick={toggleRightPanel}>우측 패널 토글</button>
      </div> */}

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
            leftWidth={leftWidth} // 부모에서 계산된 leftWidth 전달
            rowByDisplayCnt={4}
            title={`주문 대비 출하 내역 조회`}
          />
          {/* <div className="content-panel-title content-panel-title-bg">주문 대비 출하 내역 조회</div> */}
          <div className="ag-theme-alpine content-panel-grid">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: Properties.grid.default.colDef.sortable,
                filter: Properties.grid.default.colDef.filter,
                resizable: Properties.grid.default.colDef.resizable,
                minWidth: Properties.grid.default.colDef.minWidth,
              }}
              rowHeight={Properties.grid.default.data.height}
              headerHeight={Properties.grid.default.header.height}
              domLayout={Properties.grid.default.domLayout} // normal, autoHeight
              onRowDoubleClicked={handleRowDoubleClick}
              onGridReady={(params) => {
                //console.log("onGridReady", params.paginationGetPageSize);
              }}
              //enableExcelExport={false}
              rowSelection={Properties.grid.default.rowSelection}   // ✅ 필수 multiple, single
              suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection} // ✅ 클릭 시 행 선택 방지(체크박스만으로 선택)
              enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips} // 기본 브라우저 tooltip 사용 (선택)
              tooltipShowDelay={Properties.grid.default.tooltipShowDelay} // title 즉시 표시
              // 1. 페이지네이션 기능 활성화
              pagination={Properties.grid.default.pagination}

              // 2. 페이지당 표시할 행 수 설정 (선택적, 기본값 10)
              paginationPageSize={Properties.grid.default.pageSize}

              // 3. 페이지 크기 목록 제공 (선택적)
              paginationPageSizeSelector={Properties.grid.default.pageSizeList}

              // 4. 그리드 하단에 페이지 컨트롤 표시 (선택적, 기본값 true)
              suppressPaginationPanel={false}

              // ★ Row Spanning을 위한 필수 옵션   
              enableCellSpan={true}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// ✅ 4. 컴포넌트 전체를 React.memo로 래핑하여 최적화
// ----------------------------------------------------
export default React.memo(CheckOrderShipHiistory);
