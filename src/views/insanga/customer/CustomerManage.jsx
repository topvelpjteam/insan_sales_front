import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Properties from "@/system/Properties";
import { gridNoColumn } from "@/system/hook/CommonHook";
import { useApiCallService } from "@/system/ApiCallService";
import LeftPanel from "@/components/layout/LeftPanel";
import { useLayoutWidths } from "@/system/hook/CommonHook";
import { useLoading } from "@/system/hook/LoadingContext";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

// 상세 보기용 모달 사용
import FrameModal from "@/components/popup/FrameModal";

// 메세지 창 관리
import { useCustomContents } from "@/system/hook/ManagerProvider";

// 상세보기 / 입력 동적 컴포넌트
import DynamicViewDetail from "@/components/form/DynamicViewDetail";

// 상태관리 정보
import { useSelector } from 'react-redux';

// 폼 정의 JSON
import formDetailInfoRaw from "./CustomerForm.json";

// 검색 팝업 컴포넌트
import ProductSearch from "./ProductSearch";
import BrandSearch from "./ProductSearch"; // BrandSearch로 변경 필요 시 수정
import SkinWorrySearch from "./SkinWorrySearch";


import { getAgentId, getAgentData } from "@/system/store/redux/agent";
import _ from "lodash";
import dayjs from "dayjs";

// --- 상수 및 유틸리티 함수 분리 ---

const DEFAULT_FILTERS = {
  searchScope: "",
  searchType: "",
  searchText: "",
};

// 하드코딩된 공통 코드 정의
const STATIC_CODES = {
  searchScopeData: [
    { code: "1", codeNm: "자점만" },
    { code: "2", codeNm: "전체매장" },
  ],
  searchTypeData: [
    { code: "1", codeNm: "고객명" },
    { code: "2", codeNm: "휴대폰" },
    { code: "3", codeNm: "개인자료" },
    { code: "4", codeNm: "코드" },
  ],
  sexGbnData: [
    { code: "F", codeNm: "여성" },
    { code: "M", codeNm: "남성" },
  ],
  ageGbnData: [
    { code: "10", codeNm: "10대" },
    { code: "20", codeNm: "20대" },
    { code: "30", codeNm: "30대" },
    { code: "40", codeNm: "40대" },
    { code: "50", codeNm: "50대" },
    { code: "60", codeNm: "60대이상" },
  ],
  dmReceiveData: [
    { code: "Y", codeNm: "수신" },
    { code: "N", codeNm: "거부" },
  ],
  birthdayTypeData: [
    { code: "S", codeNm: "양력" },
    { code: "L", codeNm: "음력" },
  ],
};

// API로 조회할 코드 그룹 정의 (STATIC_CODES에 포함된 키는 제거)
const API_CODE_GROUPS = [
  { key: "custGbnData", codeGroupCode: "S37" }, // 고객구분
  // { key: "custGbnData", codeGroupCode: "S20" },
  // { key: "jobGbnData", codeGroupCode: "S21" },
  // { key: "skinTypeData", codeGroupCode: "S22" },
  // { key: "buyReasonData", codeGroupCode: "S23" },
  // { key: "staffData", codeGroupCode: "staff" }, // 직원 데이터는 특별 처리 (agentId 사용)
];


// Formatter 함수
const formatPhoneNumber = (params) => {
  if (!params.value) return '';
  const phone = params.value.replace(/\D/g, '');
  if (phone.length === 11) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  return params.value;
};

const formatDate = (params) => {
  if (!params.value) return '';
  const date = params.value.replace(/\D/g, '');
  if (date.length === 8) return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
  return params.value;
};

// 그리드 컬럼 설정 (변동 없음)
const COLUMN_GROUPS = [
  {
    headerName: "",
    checkboxSelection: true,
    headerCheckboxSelection: true,
    width: 50,
    pinned: "left",
    cellStyle: Properties.grid.centerCellStyle,
  },
  {
    headerName: '고객코드', field: 'custId', width: 120, sortable: true, filter: true, cellClass: 'text-center',
    tooltipValueGetter: (params) => `${params.value}`,
  },
  {
    headerName: '고객명', field: 'custNm', width: 120, cellClass: 'text-left',
    tooltipValueGetter: (params) => `${params.value}`,
  },
  {
    headerName: '휴대폰', field: 'custHp', width: 130, cellClass: 'text-center',
    tooltipValueGetter: (params) => `${params.value}`,
    valueFormatter: formatPhoneNumber
  },
  {
    headerName: '소속매장', field: 'agentNm', width: 150, cellClass: 'text-left',
    tooltipValueGetter: (params) => `${params.value}`,
  },
  {
    headerName: '생년월일', field: 'custBirthD', width: 110, cellClass: 'text-center',
    valueFormatter: formatDate
  },
  {
    headerName: '개인자료', field: 'custData', width: 200, cellClass: 'text-left',
    tooltipValueGetter: (params) => `${params.value}`,
  },
  {
    headerName: '등록일자', field: 'custOpenD', width: 110, cellClass: 'text-center',
    valueFormatter: formatDate
  },
];

const SEARCH_FORM = [
  { label: "검색범위", key: "searchStoreType", type: "radio", codeKey: "searchScopeData", defaultValue: "2" },
  { label: "검색조건", key: "searchType", type: "select", codeKey: "searchTypeData", defaultValue: "1" },
  { label: "검색어", key: "searchKeyword", type: "input", isEnterEvent: true },
];

const CustomerManage = ({ tabKey }) => {
  // --- Hooks & State ---
  const user = useSelector((state) => state.user.user);
  const { request } = useApiCallService();
  const { showLoading, hideLoading } = useLoading();
  const { showMessageModal, showConfirmModal } = useCustomContents();
  const { sidebarOpen, leftWidth, toggleSidebar } = useLayoutWidths(true, 20, false, 0);

  const agentId = useSelector(getAgentId) || "";
  const agentData = useSelector(getAgentData);
  const childRef = useRef(null);

  const [isExpanded, setExpanded] = useState(true);
  const [rowData, setRowData] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // 메인 상세/신규 모달 상태
  const [detailModal, setDetailModal] = useState({ visible: false, id: null, row: {} });

  // 검색 팝업 상태 통합 관리 (product, brand, skinWorry)
  const [searchModal, setSearchModal] = useState({ type: null, visible: false });

  // ⭐ 변경 사항 1: STATIC_CODES로 codes 상태를 즉시 초기화
  const [codes, setCodes] = useState(() => ({
    ...STATIC_CODES,
    // Form JSON에서 사용될 alias도 초기화
    smsReceiveData: STATIC_CODES.dmReceiveData,
    callReceiveData: STATIC_CODES.dmReceiveData,
    emailReceiveData: STATIC_CODES.dmReceiveData,
  }));

  // --- Handlers ---

  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 데이터 조회 (변동 없음)
  const fetchData = useCallback(async (action = "selectCustomerList") => {
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
          searchType: filters.searchType || '',
          searchKeyword: filters.searchKeyword || '',
          searchStoreType: filters.searchStoreType || '',
          storeId: agentId || '',
          userId: 'ADMIN'
        },
      };

      const res = await request("domain/insanga/store/customer", payload, {}, "post", 'json');
      setRowData(res?.data?.body || []);
    } catch (err) {
      console.error("데이터 조회 실패:", err);
    } finally {
      hideLoading();
    }
  }, [filters, agentId, request, showLoading, hideLoading, showMessageModal]);

  const handleSearch = useCallback(() => {
    setRowData([]);
    fetchData();
  }, [fetchData]);

  const handleNew = useCallback(() => {
    setDetailModal({ visible: true, id: 'NEW', row: {} });
  }, []);

  // 삭제 처리 (변동 없음)
  const handleDetailDelete = useCallback((formData, callback) => {
    showConfirmModal({
      title: "확인",
      content: "정말 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          showLoading();
          await request(
            "domain/insanga/store/customer",
            {
              action: "deleteCustomer",
              payload: { custId: formData.custId, agentId: user?.agentId || '' }
            },
            {}, "post"
          );
          showMessageModal({
            title: "알림", content: "삭제되었습니다.",
            onCallback: () => {
              fetchData();
              callback(true);
              setDetailModal({ visible: false, id: null, row: {} });
            }
          });
        } catch (error) {
          console.error("삭제 실패:", error);
        } finally {
          hideLoading();
        }
      },
      onCancel: () => callback(false),
    });
  }, [request, user.agentId, showLoading, hideLoading, showMessageModal, showConfirmModal, fetchData]);

  // 저장 처리 (변동 없음)
  const handleDetailSave = useCallback((formData, callback) => {
    showConfirmModal({
      title: "확인",
      content: "저장하시겠습니까?",
      confirmText: "저장",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          showLoading();
          const payload = {
            ...formData,
            agentId: user?.agentId || '',
            userId: user?.emplId || '',
          };
          await request(
            "domain/insanga/store/customer",
            { action: "saveCustomer", payload },
            {}, "post"
          );
          showMessageModal({
            title: "알림", content: "저장되었습니다.",
            onCallback: () => {
              fetchData();
              callback(true);
            }
          });
        } catch (error) {
          console.error("저장 실패:", error);
          callback(false);
        } finally {
          hideLoading();
        }
      },
      onCancel: () => callback(false),
    });
  }, [request, user, showLoading, hideLoading, showMessageModal, showConfirmModal, fetchData]);

  // 그리드 더블 클릭 (변동 없음)
  const handleRowDoubleClick = useCallback(async ({ data }) => {
    try {
      showLoading();
      const res = await request(
        "domain/insanga/store/customer",
        {
          action: "selectCustomerDetail",
          payload: { custId: data.custId, agentId: user?.agentId || '' }
        },
        {}, "post", 'json'
      );
      setDetailModal({ visible: true, id: data.custId, row: res?.data?.body || {} });
    } catch (error) {
      console.error("상세 조회 실패:", error);
    } finally {
      hideLoading();
    }
  }, [request, user.agentId, showLoading, hideLoading]);

  // 상세 닫기 (변동 없음)
  const handleClose = useCallback(() => {
    const close = () => setDetailModal(prev => ({ ...prev, visible: false }));

    if (childRef.current?.handleBeforeClose()) {
      showConfirmModal({
        title: "변경사항 확인",
        content: "저장되지 않은 변경사항이 있습니다. 저장하지 않고 닫으시겠습니까?",
        confirmText: "닫기",
        cancelText: "취소",
        onConfirm: close,
      });
    } else {
      close();
    }
  }, [showConfirmModal]);

  // --- Effects ---

  // ⭐ 변경 사항 2: 공통 코드 조회 로직 간소화
  useEffect(() => {
    // if (!user?.agentId) return; // 사용자 ID에 따라 필요 시 주석 해제

    const fetchCodes = async () => {
      try {
        const results = await Promise.all(
          API_CODE_GROUPS.map(async ({ key, codeGroupCode }) => {
            let res;
            // 'staff'는 codeGroupCode 대신 agentId를 사용
            if (codeGroupCode === 'staff') {
              res = await request("domain/insanga/store/system", {
                action: "selectCode",
                payload: { agentId: agentId }
              }, {}, "post");
            } else if (!_.isEmpty(codeGroupCode)) {
              // 일반 코드 그룹 조회
              res = await request("domain/insanga/store/system", {
                action: "selectCode",
                payload: { codeGroupCode }
              }, {}, "post");
            }
            return [key, Array.isArray(res?.data?.body) ? res.data.body : []];
          })
        );

        // API로 조회된 데이터만 기존 codes에 병합 (STATIC_CODES를 덮어쓰지 않음)
        setCodes(prev => ({
          ...prev,
          ...Object.fromEntries(results)
        }));
      } catch (err) {
        console.error("공통 코드 조회 실패:", err);
      }
    };
    fetchCodes();
  }, [request, agentId]);


  const columnDefs = useMemo(() => {
    const hasNoColumn = COLUMN_GROUPS.some(col => col.headerName === 'No.');
    return hasNoColumn ? COLUMN_GROUPS : [gridNoColumn(), ...COLUMN_GROUPS];
  }, []);

  // 동적 폼 버튼 액션 매핑 (변동 없음)
  const actionMap = useMemo(() => ({
    handleDetailDelete,
    handleDetailSave,
    handleProductSearch: () => setSearchModal({ type: 'product', visible: true }),
    handleBrandSearch: () => setSearchModal({ type: 'brand', visible: true }),
    handleSkinWorrySearch: () => setSearchModal({ type: 'skinWorry', visible: true }),
  }), [handleDetailDelete, handleDetailSave]);

  // 동적 폼 설정 데이터 (변동 없음)
  const formDetailInfo = useMemo(() => {
    //console.log(codes); // 이제 초기 렌더링 시 STATIC_CODES가 찍힘
    return {
      ...formDetailInfoRaw,
      button: formDetailInfoRaw.button.map((btn) => ({
        ...btn,
        onClick: actionMap[btn.onClick]
      })),
      form: formDetailInfoRaw.form.map((section) => ({
        ...section,
        columns: section.columns.map((col) => ({
          ...col,
          code: typeof col.code === "string" ? codes[col.code] || [] : col.code
        }))
      }))
    };
  }, [codes]);

  // 검색 팝업 선택 핸들러 (변동 없음)
  const handleSearchSelect = useCallback((data, type) => {
    if (!childRef.current) return;

    switch (type) {
      case 'product':
        childRef.current.setFormValue('custUse', data.productNm);
        childRef.current.setFormValue('custUseId', data.productId);
        break;
      case 'brand':
        childRef.current.setFormValue('corpNm', data.brandNm);
        childRef.current.setFormValue('corpId', data.brandId);
        break;
      case 'skinWorry':
        childRef.current.setFormValue('skinWorryNm', data.worryNm);
        childRef.current.setFormValue('skinWorryGbn', data.worryGbn);
        break;
      default: break;
    }
    setSearchModal({ type: null, visible: false });
  }, []);

  // --- Render ---

  return (
    <div className='template-T'>
      <LeftPanel
        codes={codes}
        filters={filters}
        handleFilterChange={handleFilterChange}
        searchForm={SEARCH_FORM}
        buttons={[
          //{ key: "new", label: "신규", className: "content-save-button", onClick: handleNew },
          { key: "search", label: "검색", className: "content-search-button", onClick: handleSearch },
        ]}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        leftWidth={leftWidth}
        title="고객검색"
        rowByDisplayCnt={5}
      />

      <div className='content-main-area'>
        {/* 그리드 패널 */}
        <div
          className={`content-left-panel ${isExpanded ? 'expanded' : ''}`}
          style={{ width: isExpanded ? '60%' : '0px' }}
        >
          <button type='button' className={`content-toggle ${isExpanded ? 'expanded' : ''}`} onClick={toggleExpanded}>
            <i className='ri-arrow-left-wide-line' />
          </button>
          <div className='content-top-button' style={{ height: "24px" }} />
          <div className='content-sidebar-content' style={{ height: "500px", width: "100%" }}>
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
              domLayout={Properties.grid.default.domLayout}
              onRowDoubleClicked={handleRowDoubleClick}
              rowSelection={Properties.grid.default.rowSelection}
              suppressRowClickSelection={Properties.grid.default.suppressRowClickSelection}
              enableBrowserTooltips={Properties.grid.default.enableBrowserTooltips}
              tooltipShowDelay={Properties.grid.default.tooltipShowDelay}
              pagination={Properties.grid.default.pagination}
              paginationPageSize={Properties.grid.default.pageSize}
              paginationPageSizeSelector={Properties.grid.default.pageSizeList}
            />
          </div>
        </div>

        {/* 상세 뷰 패널 */}
        <div className='content-center-panel'>
          <DynamicViewDetail
            ref={childRef}
            id={detailModal.id}
            row={detailModal.row}
            onClose={handleClose}
            formDetailInfo={formDetailInfo}
            showNewButton={false}
          />
        </div>
      </div>

      {/* --- 검색 모달 렌더링 --- */}
      {searchModal.visible && (
        <FrameModal
          title={
            searchModal.type === 'product' ? "주사용제품 검색" :
              searchModal.type === 'brand' ? "기존사용브랜드 검색" :
                "피부고민 검색"
          }
          width="800px"
          height="600px"
          closeOnOverlayClick={false}
          onClose={() => setSearchModal({ type: null, visible: false })}
        >
          {searchModal.type === 'product' && <ProductSearch onSelect={(d) => handleSearchSelect(d, 'product')} />}
          {searchModal.type === 'brand' && <BrandSearch onSelect={(d) => handleSearchSelect(d, 'brand')} />}
          {searchModal.type === 'skinWorry' && <SkinWorrySearch onSelect={(d) => handleSearchSelect(d, 'skinWorry')} />}
        </FrameModal>
      )}
    </div>
  );
};

export default React.memo(CustomerManage);