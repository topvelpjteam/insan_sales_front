import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Properties from "@/system/Properties";
import { gridNoColumn } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import LeftPanel from "@/components/layout/LeftPanel";
import { useLayoutWidths } from "@/system/hook/CommonHook";
import { useLoading } from "@/system/hook/LoadingContext"; // ✅ 추가
//import LoadingSpinner from "@/components/etc/LoadingSpinner";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
//import Paging from "@/components/common/Paging";
ModuleRegistry.registerModules([AllCommunityModule]);

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";


// 유효성 체크를 위한 함수
import { saveAsExcel, validateFormData, parseExcelFile, numberFormatter, rateFormatter, addComma } from "@/system/utils/common";

// 상태관리 정보
import { useSelector, useDispatch } from 'react-redux';

// 탭 이동시 변경 사항을 체크 하는 hook
import { useChanged } from "@/system/hook/ManagerProvider";

// utils
import _ from 'lodash';

// 날짜 유틸
import dayjs from "dayjs";

import { flushSync } from 'react-dom';

// [발주기본정보] - 입력 동적 컴포넌트
import DynamicViewDetail from "@/components/form/DynamicViewDetail";
import { RFC_2822 } from "moment/moment";

import formDetailInfoRaw from "./OrderRegisteForm.json";

import GoodsSearch from "@/components/popup/GoodsSearch";

// 상세 보기용 모달 사용.
import FrameModal from "@/components/popup/FrameModal";

const OrderRegiste = ({ tabKey, handleChangeCallback }) => {
  // 로그인 사용자 정보
  const user = useSelector((state) => state.user.user);
  const { request } = useApiCallService(); // ✅ api호출을 위한 서비스
  const { loading, showLoading, hideLoading } = useLoading(); // ✅ 글로벌 로딩 훅 사용
  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();
  const [rowData, setRowData] = useState([]);
  const [rowDataDetail, setRowDataDetail] = useState([]);
  const [goodsSearchModal, setGoodsSearchModal] = useState({ visible: false, id: null, row: {} });
  const [filters, setFilters] = useState({
    orderDFrom: "",
    orderDTo: "",
    requireDFrom: "",
    requireDTo: "",
    searchText: "",
    unreceivedOnly: true,
  });

  // 조회 조건 폼 설정
  const codeGroups = useMemo(() => {
    return [
      // { key: "vendorData", codeGroupCode: "" },
      // { key: "orderStatusData", codeGroupCode: "" },
      { key: "claimGbn", codeGroupCode: "S25" },
      {
        key: "ioIdOptions",
        codeGroupCode: "",
      },
    ];
  }, []);

  // 코드 변수
  const [codes, setCodes] = useState(
    codeGroups.reduce((acc, { key }) => ({ ...acc, [key]: [] }), {})
  );

  // 발주 기본정보 데이터 - 이전발주정보 더블클릭 시 갱신됨.
  const [orderRowData, setOrderRowData] = useState({
    // agentId: "",
    // customerName: "",
    // ioId: "",
    // ioName: "",
    // orderAmount: "",
    // orderCount: "",
    // orderD: "",
    // orderSeq: "",
    // requireD: "",
    // recvAddr: "",
    // recvMemo: "",
    // recvPerson: "",
    // recvTel: "",
    // requireDate: "",
    // salesAmount: "",
    // slipNo: "",
    // sysTime: "",
    // totalQty: "",
    // unreceivedYn: "",
    // updTime: "",
    // updUser: "",
    // userId: ""
  });

  // 탭 변경 사항 체크용
  const { setChanged, clearChanged } = useChanged();


  // 이전 발주 그리드 설정
  const grid1Ref = useRef(null);
  const [grid1Api, setGrid1Api] = useState(null);
  const [grid1ColumnApi, setGrid1ColumnApi] = useState(null);

  // 발주 상세 내역의 summary 정보
  const [orderSummary, setOrderSummary] = useState({});
  const [changeOrderDetailRows, setChangeOrderDetailRows] = useState([]);

  // 랜더링 시 초기화가 됨... useState로 변경해야 함. 
  //let changeOrderDetailRows = [];

  // 발주 기본/상세 정보 저장관련 orderSaveInfo.isRowEditable
  const [orderSaveInfo, setOrderSaveInfo] = useState({ isRowEditable: true });

  // 발주 기본- 변경 여부 체크 
  //const isMastChangedRef = useRef(false);

  // 발주 상세 - 변겨 여부 체크
  //const isDtlChangedRef = useRef(false);

  // 발주 상세 내역 그리드 설정
  const [grid2Api, setGrid2Api] = useState(null);
  const [grid2ColumnApi, setGrid2ColumnApi] = useState(null);

  const rowDataDetailRef = useRef([]);
  useEffect(() => {
    if (Array.isArray(rowDataDetail)) {
      // 원본을 깊은 복사로 저장 (참조 깨기)
      rowDataDetailRef.current = JSON.parse(JSON.stringify(rowDataDetail));
    }
  }, [rowDataDetail]);

  // -----------------------------
  // 모든 페이지 공통 layout 훅 사용
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

  // 조회 조건 폼 설정
  const searchForm = useMemo(() => {
    const today = dayjs();
    return [
      {
        label: "발주일자",
        key: "orderD",
        startKey: "orderDFrom",
        endKey: "orderDTo",
        type: "dateRange",
        codeKey: "",
        //offset: [1, 1], // from: -1달, to: +1달
        defaultValue: {
          start: today.subtract(1, "month").format("YYYY-MM-DD"),
          end: today.add(1, "month").format("YYYY-MM-DD"),
        },
      },
      {
        label: "입고요구일자",
        key: "requireD",
        startKey: "requireDFrom",
        endKey: "requireDTo",
        type: "dateRange",
        codeKey: "",
        //offset: [1, 1],
        defaultValue: {
          start: today.subtract(1, "month").format("YYYY-MM-DD"),
          end: today.add(1, "month").format("YYYY-MM-DD"),
        },
      },
      {
        label: "키워드",
        key: "searchText",
        type: "input",
        isEnterEvent: true,
        defaultValue: "",
      },
      {
        label: "미입고 발주내역만",
        key: "unreceivedOnly",
        type: "check",
        defaultValue: true,
      },
    ];
  }, []);

  // [발주기본정보] - 유효성 체크 폼
  const orderFormValid = useMemo(() => {
    return [
      {
        "title": "발주기본정보",
        "columns": [
          {
            "name": "slipNo",
            "label": "발주번호",
            "type": "text",
            "maxLength": -1,
            "disabled": true,
            "required": true
          },
          {
            "name": "orderD",
            "label": "발주일자",
            "type": "text",
            "maxLength": -1,
            "disabled": true,
            "required": true,
            "code": "brandData"
          },
          {
            "name": "requireD",
            "label": "입고요구일",
            "type": "text",
            "maxLength": -1,
            "disabled": true,
            "required": true
          },
          {
            "name": "customerName",
            "label": "매장코드",
            "type": "text",
            "maxLength": -1,
            "disabled": true,
            "required": true
          },
          {
            "name": "ioId",
            "label": "발주구분",
            "type": "radio",
            "maxLength": -1,
            "disabled": false,
            "required": true,
            "code": codes["ioIdOptions"]
          },
          {
            "name": "recvMemo",
            "label": "비고",
            "type": "textarea",
            "maxLength": -1,
            "disabled": false,
            "required": false,
            "style": {
              "height": "40px"
            }
          },
          {
            "name": "recvAddr",
            "label": "주소",
            "type": "text",
            "maxLength": 200,
            "disabled": false,
            "required": false
          },
          {
            "name": "recvPerson",
            "label": "받는사람",
            "type": "text",
            "maxLength": 50,
            "disabled": false,
            "required": false
          },
          {
            "name": "recvTel",
            "label": "전화번호",
            "type": "text",
            "maxLength": 20,
            "disabled": false,
            "required": false
          }
        ]
      }
    ];
  }, [codes]);

  // -------------------------------
  // [이전 발주 정보] 조회 조건 변경 처리.
  // -------------------------------
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  });

  // -----------------------------
  // [이전 발주 정보] 조회
  // -----------------------------
  const selectPreviousOrders = useCallback(
    async (action = "selectPreviousOrders") => {
      try {
        showLoading();
        const payload = {
          action,
          payload: {
            orderDFrom: filters.orderDFrom || '',
            orderDTo: filters.orderDTo || '',
            requireDFrom: filters.requireDFrom || '',
            requireDTo: filters.requireDTo || '',
            searchText: filters.searchText || '',
            unreceivedOnly: (filters.unreceivedOnly) ? 'Y' : 'N',
            agentId: user?.agentId || '', // currentStoreId, '5', null(관리자) agentId가 없어서 일단 하드코딩.
          },
        };

        /** ✅ 엑셀 다운로드 요청일 경우 */
        // if (action === "downloadList") {
        //   payload.payload['listColumnInfo'] = JSON.stringify(columnInfos);
        //   return; // 다운로드 후 종료
        // }

        /** ✅ 일반 목록 조회 (기존 로직) */
        const res = await request("domain/insanga/store/order", payload, {}, "post", 'json');
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


  /**
   * 항목 초기화.
   */
  const handleInitPage = useCallback(() => {
    //isMastChangedRef.current = false;
    //isDtlChangedRef.current = false;
    //changeOrderDetailRows = [];
    setChangeOrderDetailRows([]);
    setOrderSaveInfo({ isRowEditable: true });
    setRowData([]);
    setRowDataDetail([]);
    setOrderSummary({}); // summary
    setOrderRowData({});
  });

  // AG GRID 비 동기를 동기 처럼 사용 하기 위한 함수.
  // const waitForEditingStop = useCallback((timeout = 100) =>
  //   new Promise((resolve) => {
  //     let resolved = false;
  //     const listener = (event) => {
  //       if (resolved) return;
  //       resolved = true;
  //       grid2Api.removeEventListener("cellEditingStopped", listener);
  //       resolve(event);
  //     };

  //     grid2Api.addEventListener("cellEditingStopped", listener);

  //     // ⏱️ 편집 이벤트가 없을 때 fallback
  //     setTimeout(() => {
  //       if (!resolved) {
  //         grid2Api.removeEventListener("cellEditingStopped", listener);
  //         resolve(); // 안전하게 종료
  //       }
  //     }, timeout);
  //   }), []);

  const waitForEditingStop = useCallback((timeout = 100) =>
    new Promise((resolve) => {
      if (!grid2Api) {
        // grid2Api가 아직 없으면 바로 resolve
        return resolve();
      }

      let resolved = false;
      const listener = (event) => {
        if (resolved) return;
        resolved = true;
        grid2Api.removeEventListener("cellEditingStopped", listener);
        resolve(event);
      };

      grid2Api.addEventListener("cellEditingStopped", listener);

      // ⏱️ 편집 이벤트가 없을 때 fallback
      setTimeout(() => {
        if (!resolved) {
          grid2Api.removeEventListener("cellEditingStopped", listener);
          resolve(); // 안전하게 종료
        }
      }, timeout);
    }), [grid2Api]);

  const handleIsChanged = () => {
    //console.log(childRef.current.isChanged(), changeOrderDetailRows, (childRef.current.isChanged() || changeOrderDetailRows.length > 0));
    return (childRef.current.isChanged() || changeOrderDetailRows.length > 0); // 변경 있음 → 모달 후 종료 // 
  };

  // -----------------------------
  // [이전발주정보] 조회
  // -----------------------------
  const handleSearch = async () => {
    await orderGridWait();

    // 2️⃣ 변경 여부 체크 - 발주 기본정보 변경여부 || 발주상세내역 변경 여부 
    if (handleIsChanged()) {
      showConfirmModal({
        title: "확인",
        content: "변경 사항이 존재 합니다. 확인 시 변경 항목은 초기화 됩니다.",
        confirmText: "닫기",
        cancelText: "취소",
        onConfirm: () => {
          console.log("확인");
          // 3️⃣ 초기화 후 이전 데이터 조회
          handleInitPage();      // 필터, 폼 등 초기화
          selectPreviousOrders(); // 조회
        },
        onCancel: () => {
          console.log("취소");
          //return;
          //callback(false)
        }, // 필요 시 사용
      });
      return; // 변경 있음 → 모달 후 종료
    } else {
      // 4️⃣ 변경사항 없으면 바로 초기화 후 조회
      handleInitPage();
      selectPreviousOrders();
    }

    // console.log('1111111111111111111');
  }; //, [grid2Api, handleIsChanged, showConfirmModal, handleInitPage, selectPreviousOrders, waitForEditingStop]);

  // -----------------------------
  // 메인 페이지 - 엔터 이벤트
  // -----------------------------
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") selectPreviousOrders();
    },
    [selectPreviousOrders]
  );

  // -----------------------------
  // 상세정보 - 삭제
  // -----------------------------
  const handleDetailDelete = useCallback((formData, callback) => {
    console.log("삭제 ㄱㄱ, 삭제 후 모달 창 닫기 처리 해야 됨.");
  });

  // -------------------------------
  // [기본발주정보] 저장.
  // -------------------------------
  const onOrderMastSave = useCallback(async (formData, callback) => {

    showLoading();
    try {
      // const orderInfo = formData.slipNo.split("-");
      let mode = "SAVE_MASTER"; // UPDATE_MASTER, SAVE_MASTER
      if (formData?.slipNo != null) {
        mode = "UPDATE_MASTER";
      }
      const payload = {
        "mode": mode,
        "orderD": formData.orderD, // TB_CS_ORD PK1
        "orderSequ": formData.orderSequ + '', // TB_CS_ORD PK2
        "orderNo": null,
        "agentId": user?.agentId || null,
        "userId": '16', // user?.emplNo || null,
        "orderDateFrom": null,
        "orderDateTo": null,
        "requireDateFrom": null,
        "requireDateTo": null,
        "searchText": null,
        "unreceivedOnly": null,
        "requireDate": formData.requireD,
        "recvAddr": formData.recvAddr,
        "recvTel": formData.recvTel,
        "recvPerson": formData.recvPerson,
        "recvMemo": formData.recvMemo,
        "ioId": null,
        "claimId": null,
        "vendorId": null,
        "brandId": null,
        "goodsId": null,
        "orderQty": null,
        "sobijaDan": null,
        "saleRate": null,
        "orderMemo": null,
        "agentGbn": null,
        "returnValue": null
      };
      const res = await request("domain/insanga/store/order", { action: "saveOrderMaster", payload }, {}, "post", 'json'
      ).then(res => {
        //이전 발주 정보 갱신
        const rowNode = grid1Ref.current.api.getRowNode(formData.slipNo); // id 기준 rowNode 찾기
        if (rowNode) {
          rowNode.setData({ ...rowNode.data, ...formData }); // 데이터 업데이트
          // rowNode.setDataValue("age", newData.age); // 특정 컬럼만 바꿀 수도 있음
          // rowNode.setDataValue("name", newData.name);
          // rowNode.updateData(newData); // AG-Grid v28 이상이면 updateData 사용 가능
        }

        // 모달 창 정보 갱신 콜백 함수 호출
        callback(true);
      }).catch(error => {
        // 로딩바 제거.
        hideLoading();
        console.log(error);
        return;
      });
    } finally {
      hideLoading();
    }
  });



  // -------------------------------
  // [발주상세내역] 저장.
  // -------------------------------
  const onOrderDtlSave = useCallback(async (formData) => {
    showLoading();
    try {

      const newItems = changeOrderDetailRows.filter(item => !item.seqNo || item.seqNo === '' || item.seqNo === 0);
      const updateItems = changeOrderDetailRows.filter(item => item.seqNo && item.seqNo !== '' && item.seqNo !== 0);

      const payload = {
        //"mode": mode,
        "orderD": formData.orderD, // TB_CS_ORD PK1
        "orderSequ": formData.orderSequ + '', // TB_CS_ORD PK2
        "userId": '16', // user?.emplNo || null,
        "ioId": formData.ioId, // orderType
        "newItems": JSON.stringify(newItems),
        "updateItems": JSON.stringify(updateItems),
      };
      const res = await request("domain/insanga/store/order", { action: "saveOrderDetail", payload }, {}, "post", 'json'
      ).then(res => {
        console.log(res);
        showMessageModal({
          title: "알림",
          content: "발주 상세 내역이 저장 되었습니다.",
          onCallback: () => {
            onSelectDetailOrders(formData);
          }
        });
        // 상세 정보

        // 모달 창 정보 갱신 콜백 함수 호출
        // callback(true);
      }).catch(error => {
        // 로딩바 제거.
        hideLoading();
        console.log(error);
        return;
      });
    } finally {
      hideLoading();
    }
  });
  const orderGridWait = async () => {
    if (!grid2Api) return;

    // 1️⃣ 현재 편집 중인 셀 강제 종료
    const editingCell = await grid2Api.getEditingCells?.() || [];
    if (editingCell.length > 0) {
      await grid2Api.stopEditing();
      await waitForEditingStop(); // 그리드 에디트 종료 처리까지 기다린다.
    }
  };

  /**
   * 발주 상세 내역 저장.
   */
  const handleOrderDtlSave = useCallback(async () => {

    // 발주상세 내역 그리드 에디팅 종료 대기.
    await orderGridWait();

    // 발주기본정보가 없으면 에러.
    if (orderRowData.length === 0) {
      showMessageModal({
        title: "알림",
        content: "발주 기본 정보를 먼저 저장 하세요.",
        onCallback: () => {
        }
      });
      return;
    }

    // 변경 여부 체크.
    if (changeOrderDetailRows.length === 0) {
      showMessageModal({
        title: "알림",
        content: "변경된 내용이 없습니다.",
        onCallback: () => {
        }
      });
      return;
    }

    // 3️⃣ 변경 있음 → 저장 확인
    showConfirmModal({
      title: "확인",
      content: "저장하시겠습니까?",
      confirmText: "닫기",
      cancelText: "취소",
      onConfirm: () => {
        // TODO: 저장 로직
        onOrderDtlSave(childRef.current.getFormData());
      },
    });
  }, [onOrderDtlSave, showConfirmModal, showMessageModal, changeOrderDetailRows, orderRowData.length]);

  // -------------------------------
  // [기본발주정보] 값 변경 처리
  // -------------------------------
  // const handleOrderMasterChange = useCallback((key, value) => {
  //   setOrderRowData((prev) => ({ ...prev, [key]: value })); // 발주기본정보 row데이터 매핑
  //   //setOrderSaveInfo((prev) => ({ ...prev, isChanged: true })); // 변경 사항 여부 true
  //   isDtlChangedRef.current = false;
  // });

  // -----------------------------
  // [발주상세내역] 조회.
  // ----------------------------- 
  const onSelectDetailOrders = useCallback(async (data) => {
    showLoading();

    // 변경 데이터 초기화
    //changeOrderDetailRows = [];
    setChangeOrderDetailRows([]);
    calculateOrderSummary({});
    setRowDataDetail([]);
    try {
      const orderInfo = data.slipNo.split("-");
      const orderSequ = "";
      const payload = {
        "mode": "GET_DETAILS",
        "orderD": data.orderD,
        "orderSequ": orderInfo[3],
        "orderNo": null,
        "agentId": null,
        "userId": user?.emplId,
        "orderDFrom": null,
        "orderDTo": null,
        "requireDFrom": null,
        "requireDTo": null,
        "searchText": null,
        "unreceivedOnly": null
      };
      const res = await request("domain/insanga/store/order", { action: "selectDetailOrders", payload }, {}, "post", 'json'
      ).then(res => {
        const body = res?.data?.body || [];

        if (Array.isArray(body) && body.length > 0) {
          // 디테일 데이터 매핑 및 설정 (refreshOrderDataBeforeModal과 동일한 로직)
          const detailItems = body.map((item, index) => ({
            status: "",
            orderD: item.orderD,
            orderSequ: item.orderSequ,
            orderNo: item.orderNo, // 백엔드에서 전달받은 실제 order_no 사용
            seqNo: item.orderNo, // 백엔드에서 전달받은 실제 order_no 사용
            uniqueId: `${item.goodsId || 'unknown'}-${item.orderNo || 'unknown'}-${index}`,
            brandName: item.brandName || item.brandId || '', // 브랜드명 추가 (브랜드명이 없으면 브랜드코드 사용)
            goodsNm: item.goodsNm,
            vendorName: item.vendorName || item.vendorId || '', // 납품처명 추가 (납품처명이 없으면 납품처코드 사용)
            goodsId: item.goodsId,
            orderQty: item.orderQty,
            sobijaDan: item.sobijaDan,
            sobijaAmt: item.sobijaAmt,
            sobijaVat: item.sobijaVat,
            sobijaTot: item.sobijaTot,
            saleRate: item.saleRate,
            orderDan: item.orderDan,
            orderAmt: item.orderAmt,
            orderVat: item.orderVat,
            orderTot: item.orderTot,
            claimId: item.claimId || '',
            orderMemo: item.orderMemo || '', // 발주메모 추가
            brandId: item.brandId || '', // 브랜드코드 추가
            vendorId: item.vendorId || '', // 납품처코드 추가
            // 출고일자, 입고예정일, 입고일자 필드 추가
            outDate: item.outD || item.out_d || item.outDate || '', // 출고일자
            expectedInDate: item.estD || item.est_d || item.expectedInDate || '', // 입고예정일
            inDate: item.inD || item.in_d || item.inDate || '', // 입고일자
            wasChanged: false // 새로 조회한 데이터는 변경되지 않은 상태
          }));
          calculateOrderSummary(detailItems);
          setRowDataDetail(detailItems);
        } else {

          calculateOrderSummary(body);
          setRowDataDetail(body.map((row) => ({ ...row, status: "" })));
        }
      }).catch(error => {
        // 로딩바 제거.
        hideLoading();
        console.log(error);
        return;
      });
    } finally {
      hideLoading();
    }
  });

  // -----------------------------
  // 이전 발주 그리드 더블 클릭 이벤트
  // -----------------------------  
  const handleRowDoubleClick = useCallback(({ data }) => {
    // 발주상세내역 변경 정보 초기화.
    setChangeOrderDetailRows([]);

    // 발주기본정보 행 설정
    setOrderRowData((prev) => ({ ...prev, ...data }));

    // 발주 상세 내역 조회.
    onSelectDetailOrders(data);

  }, [onSelectDetailOrders]);

  // 탭 변경시 변경사항 체크는 아래 주석 풀면 됩니다.
  // useEffect(() => {
  //   setChanged(tabKey, rowData.length !== 0); // 변경 사항을 체크 할 항목들 넣기.
  //   if (handleChangeCallback) {
  //     handleChangeCallback.current = handleDetailDelete; // 임시 함수임..
  //   }
  //   return () => clearChanged(tabKey);
  // }, [rowData, setChanged, clearChanged, tabKey, handleChangeCallback]);

  // -----------------------------
  // 페이지 초기 로딩 - 코드 조회, 컬럼 넘버링 컬럼 추가.
  // -----------------------------
  /** ✅ 페이지 첫 로딩 시 공통 코드 조회 */
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          codeGroups.map(async ({ key, codeGroupCode }) => {
            let res;
            if (key === "brandData") {
              res = await request(
                "domain/insanga/store/system",
                {
                  action: "selectBrandList",
                  payload: {
                    codeGroupCode,
                    agentId: user?.agentId || "5",
                  },
                },
                {},
                "post"
              );
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

        // ✅ ioIdOptions 하드코딩 항목 추가
        const ioIdOptions = [
          { code: "210", codeNm: "정상발주" },
          { code: "220", codeNm: "반품발주" },
        ];
        if (codeGroups.some(col => col.key === "ioIdOptions")) {
          results.push(["ioIdOptions", ioIdOptions]);
        }

        // ✅ 최종 codes 상태 반영
        const codeMap = Object.fromEntries(results);
        setCodes(codeMap);

        //console.log("✅ 최종 codes", codeMap);
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [codeGroups, request, user]);

  //////////////////////////////////////////////////////////// [그리드 컬럼 정의]
  // [이전 발주 정보] 그리드 컬럼 설정.
  const columnGroups = useMemo(() => {
    return [
      {
        headerName: '발주일자',
        field: 'orderD',
        width: 120,
        cellClass: 'text-center',
        tooltipValueGetter: (params) => `${params.value}`,
        spanRows: false,
        flex: 1,
        valueFormatter: (params) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          if (isNaN(date)) return params.value;
          return date.toISOString().split('T')[0]; // YYYY-MM-DD 포맷
        },
      },
      {
        headerName: '발주번호',
        field: 'slipNo',
        width: 150,
        cellClass: 'text-center',
        tooltipValueGetter: (params) => `${params.value}`,
        spanRows: false,
        flex: 1,
      },
      {
        headerName: '매장명',
        field: 'customerName',
        width: 250,
        cellClass: 'text-left',
        tooltipValueGetter: (params) => `${params.value}`,
        spanRows: false,
        flex: 1,
      },
      {
        headerName: "발주구분",
        field: "ioId",
        width: 150,
        cellClass: "text-center",
        editable: false, // 수정 불가
        flex: 1,
        // 조회 시 label만 표시
        valueFormatter: (params) => {
          const found = (codes.ioIdOptions || []).find((opt) => {
            return opt.code === params.value;
          });
          return found ? found.codeNm : params.value;
        },
        tooltipValueGetter: (params) => {
          const found = (codes.ioIdOptions || []).find((opt) => opt.code === params.value);
          return found ? found.codeNm : params.value;
        },
      },
      {
        headerName: '발주수량',
        field: 'totalQty',
        width: 120,
        cellClass: 'text-right',
        tooltipValueGetter: (params) =>
          params.value !== undefined && params.value !== null
            ? params.value.toLocaleString()
            : '',
        spanRows: false,
        flex: 1,
        valueFormatter: (params) =>
          params.value !== undefined && params.value !== null
            ? Number(params.value).toLocaleString()
            : '',
      },
      {
        headerName: '발주금액',
        field: 'orderAmount',
        width: 120,
        cellClass: 'text-right',
        hide: false,
        sortable: false,
        flex: 1,
        tooltipValueGetter: (params) =>
          params.value !== undefined && params.value !== null
            ? params.value.toLocaleString()
            : '',
        valueFormatter: (params) =>
          params.value !== undefined && params.value !== null
            ? Number(params.value).toLocaleString()
            : '',
      },
      {
        headerName: '소비지가총금액',
        field: 'salesAmount',
        width: 120,
        cellClass: 'text-right',
        hide: false,
        sortable: false,
        flex: 1,
        tooltipValueGetter: (params) =>
          params.value !== undefined && params.value !== null
            ? params.value.toLocaleString()
            : '',
        valueFormatter: (params) =>
          params.value !== undefined && params.value !== null
            ? Number(params.value).toLocaleString()
            : '',
      },// {
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
  }, [codes.ioIdOptions]);

  // -----------------------------
  // [이전발주정보] 그리드 No.컬럼 추가 설정.
  // -----------------------------
  const columnDefs = useMemo(() => {
    const hasNoColumn = columnGroups.some(col => col.headerName === 'No.');
    if (hasNoColumn) {
      return columnGroups;
    }
    const newColumnDefs = [...columnGroups];
    newColumnDefs.splice(0, 0, gridNoColumn());
    return newColumnDefs;
  }, [columnGroups]);

  // [발주 상세내역] 그리드 컬럼 설정.
  const columnDetailGroups = useMemo(() => {
    return [
      {
        headerName: "",
        checkboxSelection: true, // (params) => !params.node.group, // 그룹 행에는 비활성화
        headerCheckboxSelection: true, // 헤더에 전체 선택 체크박스 표시
        width: 50,
        pinned: "left", // (선택) 왼쪽 고정
        cellStyle: Properties.grid.centerCellStyle,
      },
      { headerName: "상태", field: "status", editable: false, width: 80 },
      { headerName: '전표순번', field: 'orderNo', width: 80, sortable: true, cellClass: 'text-center' },
      { headerName: '브랜드명', field: 'brandName', width: 120, sortable: true, cellClass: 'text-left' },
      { headerName: '상품명', field: 'goodsNm', width: 200, sortable: true, cellClass: 'text-left' },
      { headerName: '납품처명', field: 'vendorName', width: 150, sortable: true, cellClass: 'text-left' },
      {
        headerName: '발주수량',
        field: 'orderQty',
        width: 80,
        sortable: true,
        editable: orderSaveInfo.isRowEditable,
        cellEditor: 'agTextCellEditor',
        valueParser: (params) => {
          const value = params.newValue;
          if (typeof value === 'string' && value.endsWith('-')) {
            // "7-" 형태를 "-7"로 변환
            return parseFloat('-' + value.slice(0, -1));
          }
          return parseFloat(value) || 0;
        },
        cellRenderer: (params) => {
          if (params.value == null || params.value === '') return '0';
          const numValue = Number(params.value);
          if (isNaN(numValue)) return '0';

          // 마이너스 기호를 앞에 강제로 표시
          if (numValue < 0) {
            return `-${Math.abs(numValue).toLocaleString('ko-KR')}`;
          } else {
            return numValue.toLocaleString('ko-KR');
          }
        },
        cellClass: (params) => {
          // 음수인 경우 CSS 클래스 적용 (0은 제외)
          if (params.value < 0) {
            return 'negative-quantity';
          }
          return '';
        },
        onCellValueChanged: (params) => {
          // // 발주구분이 반품(220)이고 수량이 양수인 경우 마이너스로 변경
          // if (orderType === '220' && params.newValue > 0) {
          //   params.data.orderQty = -Math.abs(params.newValue);
          //   params.api.refreshCells({ rowNodes: [params.node], columns: ['orderQty'] });
          // }
          // // 발주구분이 정상(210)이고 수량이 음수인 경우 양수로 변경
          // else if (orderType === '210' && params.newValue < 0) {
          //   params.data.orderQty = Math.abs(params.newValue);
          //   params.api.refreshCells({ rowNodes: [params.node], columns: ['orderQty'] });
          // }
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '소비자가격단가',
        field: 'sobijaDan',
        width: 120,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '소비자가공급가',
        field: 'sobijaAmt',
        width: 120,
        sortable: true,
        hide: true,  // 히든 처리
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '소비자가부가세',
        field: 'sobijaVat',
        width: 120,
        sortable: true,
        hide: true,  // 히든 처리
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '소비자가총금액',
        field: 'sobijaTot',
        width: 120,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },

      {
        headerName: '할인율(%)',
        field: 'saleRate',
        width: 100,
        sortable: true,
        //editable: orderSaveInfo.isRowEditable,
        //cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          min: 0,
          max: 100,
          precision: 2
        },
        valueFormatter: rateFormatter,
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '발주단가',
        field: 'orderDan',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '발주공급가',
        field: 'orderAmt',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '발주부가세',
        field: 'orderVat',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: '발주총금액',
        field: 'orderTot',
        width: 100,
        sortable: true,
        valueFormatter: numberFormatter,
        cellClass: (params) => {
          if (params.value < 0) return 'negative-quantity';
          return '';
        },
        cellStyle: { textAlign: 'right' },
        headerClass: 'text-right'
      },
      {
        headerName: "클레임코드",
        field: "claimId",
        width: 160,
        sortable: true,
        editable: orderSaveInfo.isRowEditable,
        cellStyle: { textAlign: "left" },

        // ✅ 콤보박스 에디터 (맨 위에 공백 옵션 추가)
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["", ...(codes.claimGbn?.map(item => item.codeNm) ?? [])],
        },

        // ✅ 표시값(codeNm) → 실제 코드(code)
        valueSetter: (params) => {
          if (!params.newValue) {
            // ✅ 빈 값일 경우 코드 삭제 처리
            params.data.claimId = "";
            return true;
          }
          const found = codes.claimGbn?.find(item => item.codeNm === params.newValue);
          if (found) {
            params.data.claimId = found.code;
            return true;
          }
          return false;
        },

        // ✅ 셀 표시용: 코드명 변환
        valueFormatter: (params) => {
          if (!params.value) return "";
          const found = codes.claimGbn?.find(item => item.code === params.value);
          return found ? found.codeNm : params.value;
        },

        // ✅ Tooltip (코드명 + 코드)
        tooltipValueGetter: (params) => {
          if (!params.value) return "";
          const found = codes.claimGbn?.find(item => item.code === params.value);
          return found ? `${found.codeNm} (${found.code})` : params.value;
        },
      },
      {
        headerName: '발주메모', field: 'orderMemo', width: 150, sortable: true
        , editable: orderSaveInfo.isRowEditable
        , cellStyle: { textAlign: 'left' }
      },
      { headerName: '브랜드코드', field: 'brandId', width: 100, sortable: true, cellStyle: { textAlign: 'left' } },
      { headerName: '상품코드', field: 'goodsId', width: 100, sortable: true, cellStyle: { textAlign: 'left' } },
      { headerName: '납품처코드', field: 'vendorId', width: 100, sortable: true, cellStyle: { textAlign: 'left' } },
      {
        headerName: '출고일자',
        field: 'outD',
        width: 100,
        sortable: true,
        editable: true,
        cellEditor: 'agDateCellEditor',
        cellEditorParams: {
          format: 'yyyy-mm-dd'
        },
        valueFormatter: (params) => {
          if (!params.value) return '';
          return params.value;
        },
        cellStyle: { textAlign: 'center' },
        headerClass: 'text-center'
      },
      {
        headerName: '입고예정일',
        field: 'estD',
        width: 100,
        sortable: true,
        editable: true,
        cellEditor: 'agDateCellEditor',
        cellEditorParams: {
          format: 'yyyy-mm-dd'
        },
        valueFormatter: (params) => {
          if (!params.value) return '';
          return params.value;
        },
        cellStyle: { textAlign: 'center' },
        headerClass: 'text-center'
      },
      {
        headerName: '입고일자',
        field: 'inD',
        width: 100,
        sortable: true,
        editable: true,
        cellEditor: 'agDateCellEditor',
        cellEditorParams: {
          format: 'yyyy-mm-dd'
        },
        valueFormatter: (params) => {
          if (!params.value) return '';
          return params.value;
        },
        cellStyle: { textAlign: 'center' },
        headerClass: 'text-center'
      }
    ];
  }, [codes, orderSaveInfo.isRowEditable]);

  // -----------------------------
  // [발주상세내역] 그리드 No.컬럼 추가 설정.
  // -----------------------------
  const columnDetailDefs = useMemo(() => {
    const hasNoColumn = columnDetailGroups.some(col => col.headerName === 'No.');
    if (hasNoColumn) {
      return columnDetailGroups;
    }
    const newColumnDefs = [...columnDetailGroups];
    newColumnDefs.splice(1, 0, gridNoColumn());
    return newColumnDefs;
  }, [columnDetailGroups]);

  const calculateOrderSummary = useCallback((rowDataDetail = []) => {
    //console.log("============================calculateOrderSummary111");
    if (!Array.isArray(rowDataDetail) || rowDataDetail.length === 0) {
      setOrderSummary({
        totalQuantity: 0,
        totalSupplyAmount: 0,
        totalVatAmount: 0,
        totalAmount: 0,
        totalSalesAmount: 0
      });
      return;
    }

    const parseNum = (val) => {
      if (val == null || val === "") return 0;
      // 문자열에 콤마(,)가 포함되어 있으면 제거
      return Number(String(val).replace(/,/g, ""));
    };

    const summary = rowDataDetail.reduce(
      (acc, item) => ({
        totalQuantity: acc.totalQuantity + parseNum(item.orderQty),
        totalSupplyAmount: acc.totalSupplyAmount + parseNum(item.orderAmt),
        totalVatAmount: acc.totalVatAmount + parseNum(item.orderVat),
        totalAmount: acc.totalAmount + parseNum(item.orderTot),
        totalSalesAmount: acc.totalSalesAmount + parseNum(item.sobijaTot),
      }),
      {
        totalQuantity: 0,
        totalSupplyAmount: 0,
        totalVatAmount: 0,
        totalAmount: 0,
        totalSalesAmount: 0,
      }
    );

    //console.log("summary 결과:", summary);
    setOrderSummary(summary);
  }, []);

  // 발주 기본 정보 객체 ref
  const childRef = useRef(null);

  // 발주 그리드
  const orderGridRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actionMap = {
    handleOrderMastSave: useCallback(async (formData, callback) => {
      // 3️⃣ 변경 있음 → 저장 확인
      showConfirmModal({
        title: "확인",
        content: "저장하시겠습니까?",
        confirmText: "닫기",
        cancelText: "취소",
        onConfirm: () => {
          // TODO: 저장 로직
          onOrderMastSave(formData, callback);
        },
      });
    }, [onOrderMastSave, showConfirmModal])
  };

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

  // -----------------------------
  // 상품추가 - 열기
  // -----------------------------
  const handleGoodsSearchClose = useCallback(() => {
    setGoodsSearchModal({ visible: false, id: '', row: {} });
  });
  // -----------------------------
  // 상품추가 - 닫기
  // -----------------------------
  const handleGoodsSearchOpen = useCallback(() => {
    setGoodsSearchModal({ visible: true, id: '', row: {} });
  });
  // -----------------------------
  // 상품추가 - 닫기
  // -----------------------------
  const handleGoodsSelected = useCallback((rows) => {
    console.log('추가 될 상품: ', rows);
    // if (!orderGridRef.current) return;
    if (!orderGridRef.current) return;
    const gridApi = orderGridRef.current.api;

    // 중복 체크

    // 변경 된 행에 push
    // 디테일 데이터 매핑 및 설정 (refreshOrderDataBeforeModal과 동일한 로직)
    const detailItems = rows.map((item, index) => ({
      status: "create",
      orderD: "",
      orderSequ: "",
      orderNo: "", // 백엔드에서 전달받은 실제 order_no 사용
      seqNo: "", // 백엔드에서 전달받은 실제 order_no 사용
      uniqueId: `${'unknown'}-${'unknown'}-${index}`,
      brandName: item.brandNm || item.brandId || '', // 브랜드명 추가 (브랜드명이 없으면 브랜드코드 사용)
      goodsNm: item.goodsNm,
      vendorName: item.vendorName || item.vendorId || '', // 납품처명 추가 (납품처명이 없으면 납품처코드 사용)
      goodsId: item.goodsId,
      orderQty: item.orderQty,
      sobijaDan: item.sobijaDan,
      sobijaAmt: item.sobijaAmt,
      sobijaVat: item.sobijaVat,
      sobijaTot: item.sobijaTot,
      saleRate: item.saleRate,
      orderDan: item.orderDan,
      orderAmt: item.orderAmt,
      orderVat: item.orderVat,
      orderTot: item.orderTot,
      claimId: item.claimId || '',
      orderMemo: item.orderMemo || '', // 발주메모 추가
      brandId: item.brandId || '', // 브랜드코드 추가
      vendorId: item.vendorId || '', // 납품처코드 추가
      // 출고일자, 입고예정일, 입고일자 필드 추가
      outDate: item.outD || item.out_d || item.outDate || '', // 출고일자
      expectedInDate: item.estD || item.est_d || item.expectedInDate || '', // 입고예정일
      inDate: item.inD || item.in_d || item.inDate || '', // 입고일자
      wasChanged: false // 새로 조회한 데이터는 변경되지 않은 상태
    }));

    console.log(detailItems);

    // ✅ 여러 행 추가
    gridApi.applyTransaction({ add: rows });

    // ✅ 마지막 행으로 스크롤 이동
    setTimeout(() => {
      const lastRow = gridApi.getDisplayedRowCount() - 1;
      gridApi.ensureIndexVisible(lastRow, "bottom");
    }, 50);
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
          filters={filters}
          handleFilterChange={handleFilterChange}
          searchForm={searchForm}
          buttons={[
            { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
          ]}
          handleInit={() => { console.log('개별 초기화 함수가 필요하면 정의 하세요'); }}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          leftWidth={leftWidth} // 부모에서 계산된 leftWidth 전달
        />

        <div className="content-center-panel" style={{ width: `${centerWidth}%` }}>
          <div className="content-panel-title content-panel-title-bg">이전 발주 정보</div>
          <div className="ag-theme-alpine content-panel-grid" style={{ height: "30%" }}>
            {/* {loading && <LoadingSpinner />} */}
            <AgGridReact
              ref={grid1Ref}
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
              //onRowDoubleClicked={handleRowDoubleClick}
              // ★ rowId 설정
              getRowId={(params) => params.data.slipNo}
              onGridReady={(params) => {
                setGrid1Api(params.api);
                setGrid1ColumnApi(params.columnApi);
              }}
              onRowDoubleClicked={(params) => { // slipNo
                // 이미 선택된 행이면 아무 것도 하지 않음
                if (params.node.isSelected()) {
                  return;
                }
                if (handleIsChanged()) {
                  showConfirmModal({
                    title: "확인",
                    content: "변경 사항이 존재 합니다. 확인 시 변경 항목은 초기화 됩니다.",
                    confirmText: "닫기",
                    cancelText: "취소",
                    onConfirm: () => {
                      const api = params.api;
                      api.deselectAll(); // ✅ 기존 선택 해제
                      params.node.setSelected(true); // ✅ 더블 클릭된 행 선택
                      params.data.rowId = params.node.id;
                      // 필요한 추가 처리 (예: 상세 팝업 열기 등)
                      handleRowDoubleClick(params); // 기존 함수 호출
                    },
                    //onCancel: () => callback(false), // 필요 시 사용
                  });
                  return; // 변경 있음 → 모달 후 종료
                }

                const api = params.api;
                api.deselectAll(); // ✅ 기존 선택 해제
                params.node.setSelected(true); // ✅ 더블 클릭된 행 선택
                params.data.rowId = params.node.id;
                // 필요한 추가 처리 (예: 상세 팝업 열기 등)
                handleRowDoubleClick(params); // 기존 함수 호출
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


          <div className="ag-theme-alpine content-panel-grid1 content-panel-grid-bottom">

            <div className="content-left-area1">
              <DynamicViewDetail
                ref={childRef}
                id={"orderDetail"} // 상세 행 키
                row={orderRowData} // 상세 행 데이터
                onClose={() => { console.log('상세닫기.'); }} // 닫기 함수
                formDetailInfo={formDetailInfo} // 상세(입력) 폼
                showNewButton={false} // 신규버튼 사용여부
              />

            </div>
            <div className="content-right-area1">

              <div className="content-panel-title content-panel-title-bg" style={{ marginTop: "10px" }}>발주 상세내역</div>
              {/* 발주 기본정보, 상세 내역 버튼 영역 */}
              <div className="content-popup-search-wrapper content-sticky-header content-bottom-fixed" style={{ marginTop: "10px", background: "#f1f1f1" }}>
                <button
                  key={"btnSendOrder"}
                  onClick={() => {
                    // // 선택된 정상 행 데이터만 버튼 함수로 전달
                    // const selectedRows = gridRef.current.api.getSelectedRows().filter((r) => r.result === "");
                    // btn.onClick(selectedRows);
                  }}
                  disabled={false}
                  className="content-save-button"
                >
                  발주서전송
                </button>
                <button
                  key={"btnSearchGoods"}
                  onClick={handleGoodsSearchOpen}
                  disabled={false}
                  className="content-save-button"
                >
                  상품추가
                </button>
                <button
                  key={"btnSave"}
                  onClick={handleOrderDtlSave}
                  disabled={false}
                  className="content-save-button"
                >
                  저장
                </button>
              </div>
              <div className="content-query-row">
                전표합계({addComma(rowDataDetail.length)} 건) /
                수량({addComma(orderSummary.totalQuantity)} 건) /
                공급가({addComma(orderSummary.totalSupplyAmount)} 건) /
                부가세({addComma(orderSummary.totalVatAmount)} 원) /
                발주총금액({addComma(orderSummary.totalAmount)} 원) /
                소비자가 총금액({addComma(orderSummary.totalAmount)} 원)
              </div>
              {/* {loading && <LoadingSpinner />} */}
              <AgGridReact
                ref={orderGridRef}
                rowData={rowDataDetail}
                columnDefs={columnDetailDefs}
                defaultColDef={{
                  sortable: Properties.grid.default.colDef.sortable,
                  filter: Properties.grid.default.colDef.filter,
                  resizable: Properties.grid.default.colDef.resizable,
                  minWidth: Properties.grid.default.colDef.minWidth,
                }}
                rowHeight={Properties.grid.default.data.height}
                headerHeight={Properties.grid.default.header.height}
                domLayout={Properties.grid.default.domLayout} // normal, autoHeight
                //onRowDoubleClicked={handleRowDoubleClick}
                onGridReady={(params) => {
                  setGrid2Api(params.api);
                  setGrid2ColumnApi(params.columnApi);
                }}
                getRowId={(params) => {
                  const uniqueId = params.data.uniqueId || `${params.data.goodsId}-${params.data.seqNo || 'unknown'}`;
                  return uniqueId;
                }}
                onCellValueChanged={(params) => {
                  const { oldValue, newValue, data } = params;
                  if (oldValue === newValue) return;

                  // 상태 업데이트
                  const newStatus = data.status === "create" ? "create" : "update";
                  params.node.setDataValue("status", newStatus);

                  const updatedRow = { ...data, status: newStatus };

                  const originalRow = rowDataDetailRef.current.find(
                    (row) => String(row.uniqueId) === String(updatedRow.uniqueId)
                  );

                  const compareKeys = [
                    "orderQty",
                    "sobijaDan",
                    "sobijaAmt",
                    "sobijaVat",
                    "sobijaTot",
                    "orderDan",
                    "orderAmt",
                    "orderVat",
                    "orderTot",
                    "orderMemo",
                  ];

                  const isReverted = originalRow
                    ? compareKeys.every((key) => {
                      const orig = originalRow[key] ?? "";
                      const updated = updatedRow[key] ?? "";

                      if (!isNaN(orig) && !isNaN(updated)) {
                        return Number(orig) === Number(updated);
                      }
                      return String(orig) === String(updated);
                    })
                    : false;

                  setChangeOrderDetailRows((prev) => {
                    const existingIndex = prev.findIndex(
                      (row) => String(row.uniqueId) === String(updatedRow.uniqueId)
                    );

                    if (isReverted) {
                      // 원상 복구 → 제거
                      if (existingIndex !== -1) {
                        const newArr = [...prev];
                        newArr.splice(existingIndex, 1);
                        return newArr;
                      }
                      return prev; // 이미 없는 경우 그대로
                    } else {
                      if (existingIndex !== -1) {
                        // 기존 항목 갱신
                        const newArr = [...prev];
                        newArr[existingIndex] = updatedRow;
                        return newArr;
                      } else {
                        // 새 항목 추가
                        return [...prev, updatedRow];
                      }
                    }
                  });

                  console.log("📋 현재 변경 목록:", changeOrderDetailRows);
                }}

                // onCellEditingStopped={(params) => {
                //   // 변경 여부 확인
                //   if (params.oldValue !== params.newValue) {
                //     console.log('셀 값 변경:', params.colDef.field, 'Old:', params.oldValue, 'New:', params.newValue);

                //     // 변경된 row 추적
                //     
                //   }
                // }}
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

                getRowClass={(params) => {
                  switch (params.data.status) {
                    case "create":
                      return "content-row-create";
                    case "update":
                      return "content-row-update";
                    case "delete":
                      return "content-row-delete";
                    default:
                      return "";
                  }
                }}
              />
            </div>
          </div>
          {/* 🪟 일괄등록 모달 */}
          {goodsSearchModal.visible && (
            <FrameModal title="상품 검색"
              width="1024px"
              height="768px"
              closeOnOverlayClick={false}
              onClose={handleGoodsSearchClose}>
              <GoodsSearch onGoodsSelected={handleGoodsSelected} />
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
export default React.memo(OrderRegiste);
