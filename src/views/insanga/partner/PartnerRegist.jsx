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

// 모달 창
import FrameModal from "@/components/popup/FrameModal";

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// 상세보기 / 입력 동적 컴포넌트
import DynamicViewDetail from "@/components/form/DynamicViewDetail";

// 유효성 체크를 위한 함수
import { saveAsExcel, validateFormData, parseExcelFile, formatDateToYYYYMMDD } from "@/system/utils/common";

// 상태 관리 정보 (사용자 정보 등등.)
import { useSelector, useDispatch } from 'react-redux';

// 입력 정보 정의 파일 - 각 프로그램의 입력 항목을 정의하세요
// 정의 된 항목으로 상세 상 자동으로 만들어 집니다.
import formDetailInfoRaw from "./PartnerRegistForm.json";

// 엑셀 업로드 유효성 체크 결과 보기.
import ExcelUploadResult from "@/components/popup/ExcelUploadResult";

// 조회 조건 생성 폼
// 1. key값으로 입력 된 값들이 설정 됩니다.
// 2. type: multiple, select, input, textarea등
const SEARCH_FORM = [
  { label: "거래처구분", key: "agentGbn", type: "multiple", codeKey: "agentData" },
  { label: "채널구분", key: "channGbn", type: "multiple", codeKey: "channData" },
  { label: "거래처명", key: "agentNm", type: "input", isEnterEvent: true },
  { label: "종료상품제외", key: "excludeTerminated", type: "check" },
];

// 공통 코드 설정 - 각 프로그램에서 사용 할 콤보 박스 설정 
// codeGroupCode가 존재 하면 공통코드에서 가져 옵니다.
// codeGroupCode가 ""인 경우 코드 조회 부분에서 하드코딩 하시면 됩니다.
const CODE_GROUPS = [
  { key: "agentData", codeGroupCode: "S15" },
  { key: "channData", codeGroupCode: "S17" },
  { key: "bankData", codeGroupCode: "S73" },
  { key: "brandData", codeGroupCode: "S02" },
  { key: "vatData", codeGroupCode: "" },
  { key: "useYnData", codeGroupCode: "" },
];

// 그리드 컬럼 설정 - 그리드에서 사용하는 컬럼을 정의하세요.
const COLUMN_GROUPS = [
  {
    headerName: '거래처구분명',
    field: 'agentGbnNm',
    width: 90,
    minWidth: 80,
    sortable: true,
    filter: true
  },
  {
    headerName: '거래처명',
    field: 'agentNm',
    width: 200,
    minWidth: 150,
    flex: 1,
    sortable: true,
    filter: true
  },
  {
    headerName: '채널명',
    field: 'channGbnNm',
    width: 90,
    minWidth: 80,
    sortable: true,
    filter: true
  },
  {
    headerName: '대표자명',
    field: 'agentCeo',
    width: 100,
    minWidth: 80,
    sortable: true,
    filter: true
  },
  {
    headerName: '사업자번호',
    field: 'agentBno',
    width: 120,
    minWidth: 100,
    sortable: true,
    filter: true
  },
  {
    headerName: '거래시작일자',
    field: 'openD',
    width: 100,
    minWidth: 90,
    sortable: true,
    filter: true,
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
    headerName: '거래종료일자',
    field: 'closeD',
    width: 100,
    minWidth: 90,
    sortable: true,
    filter: true,
    valueFormatter: (params) => {
      // 여러 필드명 시도
      const closeDateValue = params.data.closeD || params.data.closeDate;
      const formatted = formatDateToYYYYMMDD(closeDateValue);
      // console.log('🔍 그리드 거래종료일자 포맷팅:', {
      //   원본값: closeDateValue,
      //   원본타입: typeof closeDateValue,
      //   변환값: formatted,
      //   전체데이터: params.data
      // });
      return formatted;
    }
  },
  {
    headerName: '거래처코드',
    field: 'agentId',
    width: 90,
    minWidth: 80,
    sortable: true,
    filter: true
  }
];

// 컴포넌트 시작 부분 입니다. - 파일 명칭(컴포넌트) 시작은 반드시 대문자로 시작하세요. react에서 인식을 못합니다.
const PartnerRegist = ({ tabKey }) => {

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

  // 상세 보기 모달창 show/hide
  const [modal, setModal] = useState({ visible: false, id: null, row: {} });

  // 일괄등록 모달창 show/hide
  const [batchModal, setBatchModal] = useState({ visible: false, id: null, row: {} });

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

  // 업로드 될 엑셀 정보의 유효성 체크 결과를 보여주는 모달창 show/hide
  const [excelResult, setExcelResult] = useState({ visible: false, id: null, row: {} });

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
  } = useLayoutWidths(true, 20, false, 0);

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
    async (action = "selectPartnerList") => {
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
        const res = await request("domain/insanga/store/partner", payload, {}, "post", 'json');
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
    const fileName = "거래처일괄등록_템플릿.xlsx";
    await request(
      "domain/insanga/store/partner",
      { action: "downloadTemplate1", payload: { fileName, userId: user.emplNm, agentId: user?.agentId || '5' } }, // '5', null(관리자로 보임)로그인 시 agentId추가 해야함.
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
  // 일괄등록 - 저장 2
  // -----------------------------
  const onBatchSave = useCallback(async (batchData) => {
    showLoading();

    const res = await request(
      "domain/insanga/store/partner",
      { action: "partnerBatchRegist", payload: { batchData: JSON.stringify(batchData), userId: user?.emplId } },
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
  });

  // ----------------------------------------------------
  // 상세정보 모달 창에서 정의 된 [도움말] 버튼 클릭 시 호출 될 함수
  //    - PartnerRegistForm.json에 정의 되어 있음.
  // -----------------------------------------------------
  const handleDetailHelp = useCallback(() => {
    console.log("✅ 도움말 실행:");
  });

  // ----------------------------------------------------
  // 상세정보 모달 창에서 정의 된 [삭제] 버튼 클릭 시 호출 될 함수
  //    - PartnerRegistForm.json에 정의 되어 있음.
  // -----------------------------------------------------
  const handleDetailDelete = useCallback((formData, callback) => {
    // console.log("삭제 ㄱㄱ, 삭제 후 모달 창 닫기 처리 해야 됨.", formData);
    // console.log('user', user);
    if (!formData || !formData.agentId) {
      showMessageModal({
        title: "알림",
        content: "삭제 할 정보가 없습니다.",
        onCallback: () => {
        }
      });
      return;
    }
    showConfirmModal({
      title: "확인",
      content: "삭제 하시겠습니까?",
      confirmText: "닫기",
      cancelText: "취소",
      onConfirm: () => {
        // 저장 로직 수행 결과를 아래 콜백 함수에 true/false로 던져 준다.
        onDelete(formData, callback);
      },
      onCancel: () => callback(false),
    });
  });
  // -----------------------------
  // 일괄등록 - 저장 2
  // -----------------------------
  const onDelete = useCallback(async (formData, callback) => {
    showLoading();
    formData.userId = user?.emplNo;

    // 서버 요청 시 반드시 try catch 구분으로 사용 하세요.
    try {
      await request(
        "domain/insanga/store/partner",
        { action: "deletePartner", payload: formData },
        {},
        "post"
      );
      showMessageModal({
        title: "알림",
        content: "삭제 되었습니다.",
        onCallback: async () => {
          // 그리드 정보 갱신
          fetchData();

          // 모달 창 정보  콜백 함수 호출
          await callback(true);
          handleClose();

        }
      });
    } catch (error) {
      // ⚠ 여기서는 내부 메시지를 방해하지 않고 로딩바만 닫는다!

    } finally {
      hideLoading();
    }
  });
  // ----------------------------------------------------
  // 상세정보 모달 창에서 정의 된 [저장] 버튼 클릭 시 호출 될 함수
  //    - PartnerRegistForm.json에 정의 되어 있음.
  // -----------------------------------------------------
  const handleDetailSave = useCallback((formData, callback) => {
    // 유효성 체크는 DynamicViewXXX컴포넌트에서 수행 후 호출 된 것임.
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
    formData.userId = user?.emplNo;

    // 서버 요청 시 반드시 try catch 구분으로 사용 하세요.
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
      // ⚠ 여기서는 내부 메시지를 방해하지 않고 로딩바만 닫는다!
      //hideLoading();

    } finally {
      hideLoading();
    }
  });

  // -----------------------------
  // 그리드 더블 클릭
  // -----------------------------  
  const handleRowDoubleClick = useCallback(({ data }) => {
    setModal({ visible: true, id: data.goodsId, row: data });
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

            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        // ✅ vatData 직접 생성
        const vatData = [
          { code: "과세", codeNm: "과세" },
          { code: "면세", codeNm: "면세" },
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

  // ---------------------------------------------------------
  // 중요) 자식의 모달 창 닫을때 변경 여부를 체크 하여 창을 닫는 기능.
  // ---------------------------------------------------------
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

  // PartnerRegistForm.json 1
  // --------------------------------------------------------------------------
  // PartnerRegistForm.json에 button에 정의 된 함수들이 위에서 정의 된 후 작성 되야 함
  // JSON 파일에서 사용하는 버튼 함수 매핑 
  // ---------------------------------------------------------------------------
  const actionMap = useMemo(
    () => ({
      handleDetailHelp,
      handleDetailDelete,
      handleDetailSave
    }),
    [handleDetailHelp, handleDetailDelete, handleDetailSave]
  );

  // PartnerRegistForm.json 2
  // --------------------------------------------------------------------------
  // PartnerRegistForm.json에 button에 정의 된 함수들이 위에서 정의 된 후 작성 되야 함
  //   - 위 파일에 정의 된 button, columns등 에서 button, code매핑등을 위함 함수
  // JSON 기반 설정 데이터 확장 (코드 및 onClick 치환) */
  // ---------------------------------------------------------------------------  
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

  // ------------------------------
  // 일괄등록 모달 창
  // ------------------------------
  const BatchRegistForm = useCallback(({ onClose }) => {
    return (
      <div className="announce-detail">
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
        {/* 좌측 조회조건 영역 - 자동 생성 */}
        <LeftPanel
          codes={codes}
          filters={filters}
          handleFilterChange={handleFilterChange}
          searchForm={SEARCH_FORM}
          buttons={[
            { key: "upload", label: "일괄등록", className: "content-saveAll-button", onClick: handleDetailBatch },
            { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
          ]}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth} // 부모에서 계산된 leftWidth 전달
        />

        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">거래처목록</div>
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

          {/* 🪟 상세보기 모달 - 자동 생성 */}
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
                showNewButton={true} // 신규버튼 사용여부
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

          {/* 🪟 일괄등록 - 엑셀 유효성 체크 결과 모달 */}
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
export default React.memo(PartnerRegist);
