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


import formDetailInfoRaw from "./ListRegistForm.json";

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

// 조회 조건 폼 설정 multiple
const SEARCH_FORM = [
  { label: "발주일자", key: "orderDate", startKey: "orderDateFrom", endKey: "orderDateTo", type: "dateRange", codeKey: "goodsGbnData" },
  { label: "납품업체", key: "vendorId", type: "multiple", codeKey: "vendorData" },
  { label: "발주상태", key: "orderStatus", type: "multiple", codeKey: "orderStatusData" },
  { label: "이메일전송상태", key: "emailStatus", type: "multiple", codeKey: "emailStatusData" },
  { label: "키워드", key: "searchText", type: "input", isEnterEvent: true },
  { label: "미입고/미완료자료만", key: "unreceivedOnly", type: "check" },
];

// 공통 코드 설정.
const CODE_GROUPS = [
  // { key: "goodsGbnData", codeGroupCode: "S03" },
  // { key: "brandData", codeGroupCode: "S02" },
  // { key: "btypeData", codeGroupCode: "S05" },
  // { key: "mtypeData", codeGroupCode: "S07" },
  // { key: "stypeData", codeGroupCode: "S08" },
  // { key: "nationData", codeGroupCode: "S72" },
  // { key: "makerData", codeGroupCode: "S01" },
  // { key: "collectionData", codeGroupCode: "S10" },
  // { key: "channData", codeGroupCode: "S17" },
  // { key: "manaData", codeGroupCode: "S09" },
  // { key: "boxData", codeGroupCode: "S35" },
  // { key: "moneyData", codeGroupCode: "S71" },
  // { key: "setData", codeGroupCode: "" },
  // { key: "abcClassData", codeGroupCode: "" },
  { key: "vendorData", codeGroupCode: "" },
  { key: "orderStatusData", codeGroupCode: "" },
  { key: "emailStatusData", codeGroupCode: "" },
  { key: "candelReasonsData", codeGroupCode: "" },
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
  // {
  //   headerName: '상품구분명', field: 'goodsGbnNm', width: 100, sortable: true, filter: true, cellClass: 'text-left', spanRows: true,
  //   tooltipValueGetter: (params) => `${params.value}`,
  // }, // , flex: 1 
  { headerName: 'ID', field: 'id', width: 200, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: false, },
  { headerName: '발주상태', field: 'orderStatus', width: 150, cellClass: 'text-center', tooltipValueGetter: (params) => `${params.value}`, spanRows: false, },
  { headerName: '밴더명', field: 'vendorNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: false, },
  { headerName: '매장명', field: 'storeNm', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: false, },
  { headerName: '총금액', field: 'totalAmt', width: 120, cellClass: 'text-left', tooltipValueGetter: (params) => `${params.value}`, spanRows: false, },
  { headerName: '총갯수', field: 'totalQty', width: 120, cellClass: 'text-center', hide: false, sortable: false }, // 히든 처리하지만 데이터 보유
  { headerName: '발주일자', field: 'orderD', width: 120, cellClass: 'text-center', tooltipValueGetter: (params) => `${params.value}`, }, // 히든 처리하지만 데이터 보유
  { headerName: '등록일자', field: 'createDate', width: 120, cellClass: 'text-center', tooltipValueGetter: (params) => `${params.value}`, }, // 히든 처리하지만 데이터 보유
  { headerName: '전송횟수', field: 'emailSendCnt', width: 120, cellClass: 'text-right', hide: true, tooltipValueGetter: (params) => `${params.value}`, },
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

const ListMng = ({ tabKey }) => {

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
    async (action = "selectProduct") => {
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
        const res = await request("domain/insanga/store/goods", payload, {}, "post", 'json');
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
  // 일괄등록 - 도움말
  // -----------------------------
  const handleDetailHelp = useCallback(() => {
    console.log("✅ 도움말 실행:");
  });

  // -----------------------------
  // 일괄등록 - 모달 팝업 호출
  // -----------------------------
  const handleDetailBatch = useCallback(() => {
    setBatchModal({ visible: true, id: '', row: {} });
    console.log("✅ 일괄 등록 실행:");
  });
  // -----------------------------
  // 일괄등록 - 닫기
  // -----------------------------
  const handleBatchClose = useCallback(() => {
    setBatchModal({ visible: false, id: '', row: {} });
    handleBatchInit();
    // setSelectedFileName(""); // 선택 된 파일 초기화.
    // if (fileInputRef.current) {
    //   fileInputRef.current.value = ""; // input 초기화
    // }
    // setExcelData();
  });
  const handleBatchInit = useCallback(() => {
    setSelectedFileName(""); // 선택 된 파일 초기화.
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // input 초기화
    }
    setExcelData();
  });
  // -----------------------------
  // 일괄등록 - 엑셀 템플릿 다운로드
  // -----------------------------
  const handleDownloadTemp = useCallback(async () => {

    showLoading();
    const fileName = "상품일괄등록_템플릿.xlsx";
    //const fileName = "abcdefg.xlsx";
    await request(
      "domain/insanga/store/goods",
      { action: "downloadTemplate", payload: { fileName, userId: user.emplNm, agentId: user?.agentId || '5' } }, // '5', null(관리자로 보임)로그인 시 agentId추가 해야함.
      {},
      "post",
      'blob', // 엑셀 다운로드 시 필수
    ).then(res => {
      saveAsExcel(res?.data, res?.headers);
      hideLoading();
    });
  });
  // -----------------------------
  // 일괄등록 - 파일 선택
  // -----------------------------
  const handleFileSelect = useCallback(() => {
    // input 클릭을 트리거
    fileInputRef.current.click();
  });

  // -----------------------------
  // 일괄등록 - 파일 선택
  // -----------------------------
  const handleFileSelected = useCallback(async (e) => {
    const file = e.target.files[0];
    if (file) {
      //console.log("선택된 파일:", file.name);
      // 여기서 파일 처리 로직 추가 가능
      setSelectedFileName(file.name); // 파일명 상태 업데이트
      const data = await parseExcelFile(file);
      setExcelData(data);
    }
  });

  // -----------------------------
  // 일괄등록 - 파일 선택 후...
  // -----------------------------
  const handleFileChange = useCallback(async () => {
    if (excelData) {
      setExcelResult({ visible: true, id: '', row: {} });
    } else {
      showMessageModal({
        title: "유효성 체크 결과",
        content: "파일을 선택 하세요",
      });
    }
  });

  // -----------------------------
  // 일괄등록 - 파일 선택 후...
  // -----------------------------
  const handleBatchSave = useCallback(async (batchData) => {
    if (batchData.length === 0) {
      showMessageModal({
        title: "알림",
        content: "저장 할 데이터를 선택 하세요.",
      });
      return;
    }
    showConfirmModal({
      title: "확인",
      content: "저장하시겠습니까?",
      confirmText: "닫기",
      cancelText: "취소",
      onConfirm: () => {
        // 저장 로직 수행 결과를 아래 콜백 함수에 true/false로 던져 준다.
        onBatchSave(batchData);
      },
      //onCancel: () => callback(false),
    });
  });
  // -----------------------------
  // 상세정보 - 저장 2
  // -----------------------------
  const onBatchSave = useCallback(async (batchData) => {
    showLoading();

    const res = await request(
      "domain/insanga/store/goods",
      { action: "goodsBatchRegist", payload: { batchData: JSON.stringify(batchData), userId: user?.emplId } },
      {},
      "post"
    ).catch(error => {
      // 로딩바 제거.
      hideLoading();
      return;
    });

    showMessageModal({
      title: "알림",
      content: "일괄등록이 완료 되었습니다.",
      onCallback: () => {

        // 엑셀 모달 창 닫기
        setExcelResult({ visible: false, id: '', row: {} });

        // 업로드 정보 초기화
        handleBatchInit();

        // 그리드 정보 갱신
        fetchData();

        // 로딩바 제거.
        hideLoading();
      }
    });

    // 그리드 정보 갱신
    //fetchData();

    // 모달 창 정보 갱신 콜백 함수 호출
    //callback(true);

    // 로딩바 제거.
    //hideLoading();
  });
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
        const results = [];
        // const results = await Promise.all(
        //   CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
        //     let res;
        //     if (key === 'brandData') {
        //       res = await request(
        //         "domain/insanga/store/system",
        //         { action: "selectBrandList", payload: { codeGroupCode, agentId: user?.agentId || '5' } }, // '5', null(관리자로 보임)로그인 시 agentId추가 해야함.
        //         {},
        //         "post"
        //       );
        //       //return [];
        //     } else {
        //       res = await request(
        //         "domain/insanga/store/system",
        //         { action: "selectCode", payload: { codeGroupCode } },
        //         {},
        //         "post"
        //       );
        //     }

        //     return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
        //   })
        // );





        // ✅ setData(셋트/단품) 직접 생성
        const vendorData = [
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "vendorData")) {
          results.push(["vendorData", vendorData]);
        }

        // ✅ abcClassData 직접 생성
        const orderStatusData = [
          { code: "주문접수", codeNm: "주문접수" },
          { code: "진행중", codeNm: "진행중" },
          { code: "완료", codeNm: "완료" },
          { code: "취소됨", codeNm: "취소됨" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "orderStatusData")) {
          results.push(["orderStatusData", orderStatusData]);
        }


        // ✅ emailStatusData 직접 생성
        const emailStatusData = [
          { code: "Y", codeNm: "전송성공" },
          { code: "N", codeNm: "전송실패" },
          { code: "NOT_SENT", codeNm: "미전송" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "emailStatusData")) {
          results.push(["emailStatusData", emailStatusData]);
        }

        // ✅ candelReasonsData 직접 생성
        const candelReasonsData = [
          { code: "CUSTOMER_REQUEST", codeNm: "고객요청" },
          { code: "INVENTORY_SHORTAGE", codeNm: "재고부족" },
          { code: "PRICE_CHANGE", codeNm: "가격변경" },
          { code: "VENDOR_ISSUE", codeNm: "공급업체문제" },
          { code: "OTHER", codeNm: "기타" },
        ];

        // ✅ CODE_GROUPS 안에 setData가 포함되어 있다면 결과에 추가
        if (CODE_GROUPS.some(col => col.key === "candelReasonsData")) {
          results.push(["candelReasonsData", candelReasonsData]);
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
      handleDetailHelp,
      //handleDetailBatch,
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

  // 일괄등록 모달 창
  const BatchRegistForm = useCallback(({ onClose }) => {
    return (
      <div className="announce-detail">
        {/* <div className="content-popup-search-wrapper content-sticky-header content-top-fixed" style={{ textAlign: "left" }}>
          <h3>엑셀 파일로 상품을 일괄등록할 수 있습니다.</h3>
        </div> */}
        <div className="content-popup-search-wrapper content-sticky-header content-top-fixed">
          <button
            key={"btnCancel"}
            className={"content-cancel-button"}
            onClick={() => {
              onClose();
            }}
          >
            취소
          </button>
          <button
            key={"btnFileUpload"}
            className={"content-upload-button"}
            onClick={handleFileChange}
          >
            업로드
          </button>
        </div>

        <div className="content-sidebar-content content-scrollable-content">
          <div className="content-accordion-section">
            <div
              className="content-accordion-header"
            // onClick={async () => {
            //   console.log("XX닫기?");
            // }}
            >
              <span>
                템플릿을 다운로드하여 데이터를 입력하세요.
              </span>
              <span className="content-accordion-arrow"></span>
            </div>

            <div className="content-accordion-body">
              <button
                key={"btnDownload"}
                className={"content-download-button"}
                onClick={handleDownloadTemp}
              >
                템플릿 다운로드
              </button>
            </div>
          </div>

          <div className="content-accordion-section">
            <div
              className="content-accordion-header"
            >
              <span>
                날짜타입의 셀 서식은 텍스트로 작성하세요(.xlsx, .xls (최대 10MB))
              </span>
              <span className="content-accordion-arrow"></span>
            </div>

            <div className="content-accordion-body">
              <button
                key={"btnFileSelect"}
                className={"content-download-button"}
                onClick={handleFileSelect}
              >
                파일선택
              </button>
              {/* 숨겨진 파일 input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx, .xls"
                onChange={handleFileSelected}
              //disabled={!!selectedFileName} // 파일이 선택되어 있으면 비활성화
              />
              {selectedFileName}
            </div>
          </div>
        </div>
      </div >
    );
  });
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
            { key: "upload", label: "통계", className: "content-saveAll-button", onClick: handleDetailBatch },
            { key: "download", label: "다운로드(엑셀)", className: "content-download-button", onClick: handleDownload },
            { key: "initSearch", label: "초기화", className: "content-init-button", onClick: handleInitSearch },
            { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
          ]}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth} // 부모에서 계산된 leftWidth 전달
        />

        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">발주 리스트 관리 (테이블 없고, 데이터 하드 코딩되어 있음)</div>
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

          {/* 🪟 일괄등록 모달 */}
          {batchModal.visible && (
            <FrameModal title="상품코드 일괄등록"
              width="500px"
              height="370px"
              closeOnOverlayClick={false}
              onClose={handleBatchClose}>
              <BatchRegistForm onClose={handleBatchClose} />
            </FrameModal>
          )}

          {/* 🪟 일괄등록 모달 */}
          {excelResult.visible && (
            <FrameModal title="상품코드 일괄등록 엑셀 업로드"
              width="800px"
              height="600px"
              closeOnOverlayClick={false}
              onClose={() => { setExcelResult({ visible: false, id: '', row: {} }); }}>
              <ExcelUploadResult
                onClose={() => { setExcelResult({ visible: false, id: '', row: {} }); }}
                excelData={excelData}
                title={"유효성 체크 결과 보기"}
                buttons={[
                  { label: "업로드", onClick: (uploadData) => { handleBatchSave(uploadData); } },
                  //{ label: "닫기", onClick: () => { setExcelResult({ visible: false, id: '', row: {} }); }, disabled: false },
                ]}
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
export default React.memo(ListMng);
