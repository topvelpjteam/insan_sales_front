import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Properties from "@/system/Properties";
//import SearchFilter from "@/components/etc/SearchFilter";
import { gridNoColumn } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import LeftPanel from "@/components/layout/LeftPanel";
import { useLayoutWidths } from "@/system/hook/CommonHook";
//import { numberFormatter, rateFormatter } from '@/system/utils/Formatter';
import { useLoading } from "@/system/hook/LoadingContext"; // ✅ 추가
import LoadingSpinner from "@/components/etc/LoadingSpinner";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import Paging from "@/components/common/Paging";
ModuleRegistry.registerModules([AllCommunityModule]);

// 상세 보기용 모달 사용.
import FrameModal from "@/components/popup/FrameModal";

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// 상세보기 / 입력 동적 컴포넌트
import DynamicViewDetail from "@/components/form/DynamicViewDetail";

// 유효성 체크를 위한 함수
import { saveAsExcel, validateFormData, parseExcelFile } from "@/system/utils/common";

// 상태관리 정보
import { useSelector, useDispatch } from 'react-redux';


import formDetailInfoRaw from "./UserRegistForm.json";

import ExcelUploadResult from "@/components/popup/ExcelUploadResult";


// 조회 조건 필드 설정.
const DEFAULT_FILTERS = {
  goodsGbn: "",
  brandId: "",
  btypeGbn: "",
  mtypeGbn: "",
  stypeGbn: "",
  goodsNm: "",
  excludeClosed: false,
  dayMonth: "",
  minPrice: "",
  maxPrice: "",
  startDate: "",
  endDate: "",
};

// 조회 조건 폼 설정
const SEARCH_FORM = [
  { label: "Role", key: "goodsGbn", type: "multiple", codeKey: "goodsGbnData" },
  { label: "상태", key: "brandId", type: "select", codeKey: "brandData" },
  { label: "업체", key: "btypeGbn", type: "select", codeKey: "btypeData" },
  { label: "매장", key: "mtypeGbn", type: "select", codeKey: "mtypeData" },
  { label: "사용자명", key: "stypeGbn", type: "select", codeKey: "stypeData" },
  { label: "로그인ID", key: "goodsNm", type: "input", isEnterEvent: true },
  //{ label: "종료상품제외", key: "excludeClosed", type: "check" },
];

// 공통 코드 설정.
const CODE_GROUPS = [
  { key: "goodsGbnData", codeGroupCode: "S03" },
  { key: "brandData", codeGroupCode: "S02" },
  { key: "btypeData", codeGroupCode: "S05" },
  { key: "mtypeData", codeGroupCode: "S07" },
  { key: "stypeData", codeGroupCode: "S08" },
  { key: "nationData", codeGroupCode: "S72" },
  { key: "makerData", codeGroupCode: "S01" },
  { key: "collectionData", codeGroupCode: "S10" },
  { key: "channData", codeGroupCode: "S17" },
  { key: "manaData", codeGroupCode: "S09" },
  { key: "boxData", codeGroupCode: "S35" },
  { key: "moneyData", codeGroupCode: "S71" },
  { key: "setData", codeGroupCode: "" },
  { key: "abcClassData", codeGroupCode: "" },
  { key: "storageData", codeGroupCode: "" },
  { key: "vatData", codeGroupCode: "" },
  { key: "useYnData", codeGroupCode: "" },
];

// 그리드 컬럼 설정.
const COLUMN_GROUPS = [
  {
    headerName: "",
    checkboxSelection: true, // (params) => !params.node.group, // 그룹 행에는 비활성화
    headerCheckboxSelection: true, // 헤더에 전체 선택 체크박스 표시
    width: 50,
    pinned: "left", // (선택) 왼쪽 고정
    cellStyle: Properties.grid.centerCellStyle,
  },
  {
    headerName: '사용자ID', field: 'goodsGbnNm', width: 100, sortable: true, filter: true, cellClass: 'text-left', spanRows: true,
    tooltipValueGetter: (params) => `${params.value}`,
  }, // , flex: 1 
  { headerName: 'Role', field: 'brandNm', width: 200, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '로그인ID', field: 'goodsNm', width: 200, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '사용자명', field: 'goodsIdBrand', width: 150, cellClass: 'text-center', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '이메일', field: 'btypeGbnNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '전화번호', field: 'mtypeGbnNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '부서', field: 'stypeGbnNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '직급', field: 'stypeGbnNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '상태', field: 'stypeGbnNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '계정잠금', field: 'stypeGbnNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: true, },
  { headerName: '마지막 로그인', field: 'openD', width: 120, cellClass: 'text-center', hide: false, sortable: false }, // 히든 처리하지만 데이터 보유
  { headerName: '생성일', field: 'openD', width: 120, cellClass: 'text-center', hide: false, sortable: false }, // 히든 처리하지만 데이터 보유
  //{ headerName: '종료일자', field: 'closeD', width: 120, cellClass: 'text-center', tooltipValueGetter: (params) => `${params.value}`, }, // 히든 처리하지만 데이터 보유
  // {
  //   headerName: "작업",
  //   field: "action",
  //   cellRenderer: (params) => {
  //     return (
  //       <button
  //         onClick={() => alert(`${params.data.productName} 선택됨`)}
  //         style={{
  //           padding: "4px 10px",
  //           borderRadius: "6px",
  //           border: "1px solid #ccc",
  //           cursor: "pointer",
  //           backgroundColor: "#f8f9fa",
  //         }}
  //       >
  //         선택
  //       </button>
  //     );
  //   },
  // },
];

const UserMng = ({ tabKey }) => {

  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);
  const { request } = useApiCallService(); // ✅ api호출을 위한 서비스
  const { loading, showLoading, hideLoading } = useLoading(); // ✅ 글로벌 로딩 훅 사용
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();
  const [rowData, setRowData] = useState([]);
  const [modal, setModal] = useState({ visible: false, id: null, row: {} });
  const [batchModal, setBatchModal] = useState({ visible: false, id: null, row: {} });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [codes, setCodes] = useState(
    CODE_GROUPS.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // 파일 input에 대한 ref 생성
  const fileInputRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState(""); // 선택된 파일명 상태
  const [excelData, setExcelData] = useState(); // 선택된 파일명 상태
  const [excelResult, setExcelResult] = useState({ visible: false, id: null, row: {} });

  // -----------------------------
  // layout 훅 사용
  // -----------------------------
  const {
    sidebarOpen,
    rightPanelOpen,
    leftWidth,
    rightWidth,
    centerWidth,
    toggleSidebar,
    toggleRightPanel
  } = useLayoutWidths(true, 20, false, 0); // 초기값: 좌우 패널 열림, right 패널 사용시 (true, true, {너비지정})

  // -----------------------------
  // 조회 조건 변경 처리.
  // -----------------------------
  const handleFilterChange = useCallback((key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value })));

  // -----------------------------
  // 조회
  // -----------------------------
  const fetchData = useCallback(
    async (action = "selectUsers") => {
      try {
        showLoading();
        const payload = {
          action,
          payload: {
            searchGoodsGbn: Array.isArray(filters.goodsGbn)
              ? filters.goodsGbn.join(',')
              : (filters.goodsGbn || ''),
            searchBrandId: Array.isArray(filters.brandId)
              ? filters.brandId.join(',')
              : (filters.brandId || ''),
            searchBtypeGbn: Array.isArray(filters.btypeGbn)
              ? filters.btypeGbn.join(',')
              : (filters.btypeGbn || ''),
            searchMtypeGbn: Array.isArray(filters.mtypeGbn)
              ? filters.mtypeGbn.join(',')
              : (filters.mtypeGbn || ''),
            searchStypeGbn: Array.isArray(filters.stypeGbn)
              ? filters.stypeGbn.join(',')
              : (filters.stypeGbn || ''),
            searchGoodsNm: filters.goodsNm || '',
            searchExpireYn: (filters.excludeClosed) ? 'Y' : 'N',
            searchUserId: user?.agentId || '5', // '5', null(관리자) agentId가 없어서 일단 하드코딩.
            //pageSize: size,
            //pageNo: page,
          },
        };

        /** ✅ 엑셀 다운로드 요청일 경우 */
        // if (action === "downloadList") {
        //   payload.payload['listColumnInfo'] = JSON.stringify(columnInfos);
        //   return; // 다운로드 후 종료
        // }

        /** ✅ 일반 목록 조회 (기존 로직) */
        const res = await request("domain/insanga/store/setup", payload, {}, "post", 'json');
        const body = res?.data?.body;
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
  // 메일 페이지 - 엑셀 다운로드
  // -----------------------------
  const handleDownload = useCallback(() => {
    console.log("✅ 다운로드 실행:", filters);
  });
  // -----------------------------
  // 메일 페이지 - 조회 조건 초기화
  // -----------------------------
  const handleInitSearch = useCallback(() => {
    console.log("✅ 검색 조건 초기화");
    setFilters(DEFAULT_FILTERS);
  });
  // -----------------------------
  // 메일 페이지 - 조회
  // -----------------------------
  const handleSearch = useCallback(async () => {
    //console.log("✅ 검색 실행1:", filters);
    setRowData([]);
    fetchData();
  });
  // -----------------------------
  // 메일 페이지 - 엔터 이벤트
  // -----------------------------
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") fetchData();
    },
    [fetchData]
  );

  // -----------------------------
  // 상세정보 - 삭제
  // -----------------------------
  const handleDetailDelete = useCallback((formData, callback) => {
    console.log("삭제 ㄱㄱ, 삭제 후 모달 창 닫기 처리 해야 됨.");
    // const errors = validateFormData(formData, formDetailInfo.form);
    // if (errors.length > 0) {
    //   showMessageModal({
    //     title: "유효성 체크 결과",
    //     content: errors,
    //   });
    //   return callback(false);
    // }

    // showConfirmModal({
    //   title: "확인",
    //   content: "삭제하시겠습니까?",
    //   confirmText: "닫기",
    //   cancelText: "취소",
    //   onConfirm: () => {
    //     // 저장 로직 수행 결과를 아래 콜백 함수에 true/false로 던져 준다.
    //     //onSave(formData, callback);
    //   },
    //   onCancel: () => callback(false),
    // });
  });
  // -----------------------------
  // 상세정보 - 저장 1
  // -----------------------------
  const handleDetailSave = useCallback((formData, callback) => {
    const errors = validateFormData(formData, formDetailInfo.form);
    if (errors.length > 0) {
      showMessageModal({
        title: "유효성 체크 결과",
        content: errors,
      });
      return callback(false);
    }

    showConfirmModal({
      title: "확인",
      content: "저장하시겠습니까?",
      confirmText: "닫기",
      cancelText: "취소",
      onConfirm: () => {
        // 저장 로직 수행 결과를 아래 콜백 함수에 true/false로 던져 준다.
        onSave(formData, callback);
      },
      onCancel: () => callback(false),
    });
  });
  // -----------------------------
  // 상세정보 - 저장 2
  // -----------------------------
  const onSave = useCallback(async (formData, callback) => {
    showLoading();
    const res = await request(
      "domain/insanga/store/goods",
      { action: "goodsRegist", payload: formData },
      {},
      "post"
    ).catch(error => {
      // 로딩바 제거.
      hideLoading();
      console.log(error);
      return;
    });

    //showToast(`성공`, "success");

    showMessageModal({
      title: "알림",
      content: "저장 되었습니다.",
      onCallback: () => {
        // 그리드 정보 갱신
        fetchData();

        // 모달 창 정보 갱신 콜백 함수 호출
        callback(true);

        // 로딩바 제거.
        hideLoading();
      }
    });


  });

  // -----------------------------
  // 그리드 더블 클릭
  // -----------------------------  
  const handleRowDoubleClick = useCallback(({ data }) => {
    setModal({ visible: true, id: data.goodsId, row: data });
  }, []);

  // -----------------------------
  // 메인 페이지 초기 로딩 - 코드 조회, 컬럼 넘버링 컬럼 추가.
  // -----------------------------
  useEffect(() => {
    // 코드 조회.
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
            let res;
            if (key === 'brandData') {
              res = await request(
                "domain/insanga/store/system",
                { action: "selectBrandList", payload: { codeGroupCode, agentId: user?.agentId || '5' } }, // '5', null(관리자로 보임)로그인 시 agentId추가 해야함.
                {},
                "post"
              );
              //return [];
            } else {
              res = await request(
                "domain/insanga/store/system",
                { action: "selectCode", payload: { codeGroupCode } },
                {},
                "post"
              );
            }

            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        // ✅ setData(셋트/단품) 직접 생성
        const setData = [
          { code: "Y", codeNm: "셋트" },
          { code: "N", codeNm: "단품" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "setData")) {
          results.push(["setData", setData]);
        }

        // ✅ abcClassData 직접 생성
        const abcClassData = [
          { code: "A", codeNm: "A등급" },
          { code: "B", codeNm: "B등급" },
          { code: "C", codeNm: "C등급" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "abcClassData")) {
          results.push(["abcClassData", abcClassData]);
        }


        // ✅ storageData 직접 생성
        const storageData = [
          { code: "상온", codeNm: "상온" },
          { code: "냉장", codeNm: "냉장" },
          { code: "냉동", codeNm: "냉동" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "storageData")) {
          results.push(["storageData", storageData]);
        }

        // ✅ storageData 직접 생성
        const vatData = [
          { code: "Y", codeNm: "적용" },
          { code: "N", codeNm: "미적용" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "vatData")) {
          results.push(["vatData", vatData]);
        }

        // ✅ useYnData 직접 생성
        const useYnData = [
          { code: "Y", codeNm: "사용" },
          { code: "N", codeNm: "미사용" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "useYnData")) {
          results.push(["useYnData", useYnData]);
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

  // 중요) 자식의 모달 창 닫을때 변경 여부를 체크 하여 창을 닫는 기능.
  const handleClose = useCallback(() => {
    if (childRef.current?.handleBeforeClose()) {
      showConfirmModal({
        title: "변경사항 확인",
        content: "저장되지 않은 변경사항이 있습니다. 저장하지 않고 닫으시겠습니까?",
        confirmText: "닫기",
        cancelText: "취소",
        onConfirm: () => {
          setModal({ visible: false });
        },
      });
    } else {
      setModal({ visible: false });
    }
  });


  /** ✅ JSON 파일에서 사용하는 버튼 함수 매핑 
   *      함수들이 상단에 정의 된 후 아래 코드가 와야 함.
   * 
  */
  const actionMap = useMemo(
    () => ({
      handleDetailDelete,
      handleDetailSave
    }),
    []
  );

  /** ✅ JSON 기반 설정 데이터 확장 (코드 및 onClick 치환) */
  const formDetailInfo = useMemo(() => {
    const convertConfig = (config) => ({
      ...config,
      button: config.button.map((btn) => ({
        ...btn,
        onClick: actionMap[btn.onClick]
      })),
      form: config.form.map((section) => ({
        ...section,
        columns: section.columns.map((col) => ({
          ...col,
          code: typeof col.code === "string" ? codes[col.code] || [] : col.code
        }))
      }))
    });
    return convertConfig(formDetailInfoRaw);
  }, [codes, actionMap]);

  return (
    <div className="content-registe-container">
      {/* <div className="content-top-bar">
        <div className="content-page-title">상품 등록</div>
        <button onClick={toggleSidebar}>좌측 패널 토글</button>
        <button onClick={toggleRightPanel}>우측 패널 토글</button>
      </div> */}

      <div className="content-main-area">
        <LeftPanel
          codes={codes}
          filters={filters}
          handleFilterChange={handleFilterChange}
          searchForm={SEARCH_FORM}
          buttons={[
            { key: "download", label: "다운로드", className: "content-download-button", onClick: handleDownload },
            { key: "initSearch", label: "초기화", className: "content-init-button", onClick: handleInitSearch },
            { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
          ]}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth} // 부모에서 계산된 leftWidth 전달
        />

        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">상품 목록</div>
          <div className="ag-theme-alpine content-panel-grid">
            {/* {loading && <LoadingSpinner />} */}
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

          {/* 🪟 상세보기 모달 */}
          {modal.visible && (
            <FrameModal title="상품 상세 정보"
              width="1024px"
              height="768px"
              closeOnOverlayClick={false}
              onClose={handleClose}>
              <DynamicViewDetail
                ref={childRef}
                id={modal.id} // 상세 행 키
                row={modal.row} // 상세 행 데이터
                onClose={handleClose} // 닫기 함수
                formDetailInfo={formDetailInfo} // 상세(입력) 폼
                showNewButton={false} // 신규버튼 사용여부
              />
            </FrameModal>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// ✅ 4. 컴포넌트 전체를 React.memo로 래핑하여 최적화
// ----------------------------------------------------
export default React.memo(UserMng);
