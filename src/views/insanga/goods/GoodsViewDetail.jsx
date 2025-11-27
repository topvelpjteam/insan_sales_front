import React, { useState, forwardRef, useImperativeHandle } from "react";
import { useApiCallService } from "@/system/ApiCallService";
import MultiSelect from "@/components/form/MultiSelect"; // 기존 컴포넌트 경로 유지
import AccordionSection from "@/components/etc/AccordionSection";

import { formatNumber, removeNumberFormat } from '@/system/utils/Formatter';
import CustomNumberInput from "@/components/form/CustomNumberInput";
import TextInput from "@/components/form/TextInput";
import { validateFormData } from "@/system/utils/common"; // ✅ 추가

import { useCustomContents } from "@/system/hook/ManagerProvider";

// ✅ 유효성 규칙 정의 (필드별 메타데이터)
const validationRules = {
  goodsId: { label: "상품고유키", type: "string", required: true, maxLength: 20 },
  goodsNm: { label: "상품명", type: "string", required: true, maxLength: 100 },
  goodsNmEn: { label: "영문 상품명", type: "string", required: true, maxLength: 100 },
  barCode: { label: "바코드", type: "string", required: true, maxLength: 30 },
  hsCode: { label: "HS코드", type: "string", required: true, maxLength: 20 },
  goodsCapa: { label: "용량", type: "number", required: true, maxLength: 20, },
  expiryPeriod: { label: "유통기한", type: "number", required: true, maxLength: 20 },
  taxRate: { label: "세율", type: "number", required: true, maxLength: 20 },
  openD: { label: "등록일자", type: "date", required: true, maxLength: 20 },
};

//const ViewDetail = ({ id, row = {}, onClose, codes = [], filters = {} }) => {
const ViewDetail = forwardRef(({ id, row = {}, onClose, codes = [], filters = {} }, ref) => {
  const { request } = useApiCallService();

  // row 데이터를 초기값으로 사용하는 상태
  const [formData, setFormData] = useState(row);

  const { showToast, showMessageModal, showConfirmModal, showPopupModal } = useCustomContents();


  // 입력 값 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /** ✅ 변경 여부 및 유효성 검사 후 닫기 확인 */
  useImperativeHandle(ref, () => ({
    handleBeforeClose
  }));
  const handleBeforeClose = () => {
    return (JSON.stringify(formData) !== JSON.stringify(row)); //isChanged; // 변경사항 있으면 true 반환, 없으면 false    
  };
  /** ✅ 저장 버튼 클릭 */
  const handleSave = () => {
    // 1️⃣ 변경 여부 체크
    const isChanged = JSON.stringify(formData) !== JSON.stringify(row);
    if (!isChanged) {
      showMessageModal({
        title: "알림",
        content: "변경된 내용이 없습니다.",
        onCallback: () => {
          console.log('변경여부.onCallback........');
        }
      });
      return;
    }

    // 2️⃣ 자동 유효성 검사
    const { valid, message } = validateFormData(formData, validationRules);
    if (!valid) {
      showMessageModal({
        title: "알림",
        content: message,
        onCallback: () => {
          console.log('유효성체크.onCallback........');
        }
      });
      return;
    }

    // ✅ 통과 시 저장 로직 실행
    console.log("저장할 데이터:", formData);
    alert("저장되었습니다.");
  };
  return (
    <div className="content-detail-wrapper">
      <div className="content-sidebar-content">
        {/* ✅ 기본정보 */}
        <AccordionSection title="기본정보">
          <div className="content-query-row">
            <label className="content-query-label">상품고유키</label>
            <input
              type="text"
              name="goodsId" // name 속성 추가
              value={formData.goodsId || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>

          <div className="content-query-row">
            <label className="content-query-label">브랜드</label>
            <MultiSelect
              options={(codes["brandData"] || []).map((opt) => ({
                value: opt.code,
                label: opt.codeNm,
              }))}
              selectedValues={formData.brandId || []}
              placeholder="전체 선택"
              disabledAll={true}
            />

            <label className="content-query-label">상품코드</label>
            <input
              type="text"
              name="goodsIdBrand" // name 속성 추가
              value={formData.goodsIdBrand || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>

          <div className="content-query-row">
            <label className="content-query-label">상품명</label>
            <input
              type="text"
              name="goodsNmEn" // name 속성 추가
              value={formData.goodsNm || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">영문 상품명</label>
            <input
              type="text"
              name="goodsNmEn" // name 속성 추가
              value={formData.goodsNmEn || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">일문 상품명</label>
            <input
              type="text"
              name="goodsNmJp" // name 속성 추가
              value={formData.goodsNmJp || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">중문 상품명</label>
            <input
              type="text"
              name="goodsNmCn" // name 속성 추가
              value={formData.goodsNmCn || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">바코드</label>
            <input
              type="text"
              name="barCode" // name 속성 추가
              value={formData.barCode || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
            <label className="content-query-label">호수</label>
            <input
              type="text"
              name="goodsNo" // name 속성 추가
              value={formData.goodsNo || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
            <label className="content-query-label">본사코드</label>
            <input
              type="text"
              name="foreignId" // name 속성 추가
              value={formData.foreignId || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
            <label className="content-query-label">본사상품명</label>
            <input
              type="text"
              name="foreignNm" // name 속성 추가
              value={formData.foreignNm || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>
        </AccordionSection>

        {/* ✅ 분류정보 */}
        <AccordionSection title="분류정보">
          <div className="content-query-row">
            <label className="content-query-label">상품 구분</label>
            <select
              value={formData.goodsGbn || ""}
              //onChange={(e) => onFilterChange(field.key, e.target.value)}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["goodsGbnData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>

            <label className="content-query-label">메이커 코드</label>
            <select
              value={formData.makerGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["makerData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">컬렉션 구분</label>
            <select
              value={formData.collectionGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["collectionData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
          </div>


          <div className="content-query-row">

            <label className="content-query-label">대분류</label>
            <select
              value={formData.btypeGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["btypeData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">중분류</label>
            <select
              value={formData.mtypeGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["mtypeData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">소분류</label>
            <select
              value={formData.stypeGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["stypeData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
          </div>


          <div className="content-query-row">

            <label className="content-query-label">원산지 국가</label>
            <select
              value={formData.nationGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">선택하세요</option>
              {(codes["nationData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">HS코드</label>
            <input
              type="text"
              name="hsCode" // name 속성 추가
              value={formData.hsCode || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
            <label className="content-query-label">사용자 구분</label>
            <input
              type="text"
              name="useGbn" // name 속성 추가
              value={formData.useGbn || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
          </div>
          <div className="content-query-row">

            <label className="content-query-label">셋트 구분</label>
            <div className="content-radio-group">
              {(codes["setData"] || []).map((opt) => (
                <label key={opt.code} className="content-radio-label">
                  <input
                    type="radio"
                    name="setGbn"
                    value={opt.code}
                    checked={formData.setGbn === opt.code}
                    onChange={handleChange} // onChange 핸들러 연결
                  />
                  {opt.codeNm}
                </label>
              ))}
            </div>
            <label className="content-query-label">채널 코드</label>
            <select
              value={formData.channGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["channData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">운용 구분</label>
            <select
              value={formData.manaGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["manaData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
          </div>


          <div className="content-query-row">

            <label className="content-query-label">기능성 구분</label>
            <input
              type="text"
              name="funcGbn" // name 속성 추가
              value={formData.funcGbn || ""} // formData 값에 연결
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            />
            <label className="content-query-label">포장 단위</label>
            <select
              value={formData.boxGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["boxData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">ABC 분석 등급</label>
            <select
              value={formData.abcClass || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["abcClassData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
          </div>
        </AccordionSection>

        {/* ✅ 물리적 특성 */}
        <AccordionSection title="물리적 특성" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">용량</label>
            <CustomNumberInput
              name="goodsCapa"
              step={0.1}
              min={0}
              max={9999}
              initialValue={formData.goodsCapa}
              onChange={handleChange}
            />

            <label className="content-query-label">유통기한 (일수)</label>
            <CustomNumberInput
              name="expiryPeriod"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.expiryPeriod}
              onChange={handleChange}
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">포장크기</label>
            <TextInput
              name="packingSize"
              value={formData.packingSize}
              onChange={handleChange}
              placeholder={"포장 크기 (가x세x높이)"}
              maxLength={50}
            />
            <label className="content-query-label">단위</label>
            <TextInput
              name="goodsUnit"
              value={formData.goodsUnit}
              onChange={handleChange}
              placeholder={"용량단위 (예: ml, g, 개)"}
              maxLength={5}
            />
            <label className="content-query-label">보관조건</label>
            <select
              value={formData.storageCondition || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["storageData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
          </div>
        </AccordionSection>

        {/* ✅ 가격정보 */}
        <AccordionSection title="가격정보" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">소비자가격</label>
            <CustomNumberInput
              name="supplyDan"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.supplyDan}
              onChange={handleChange}
            />

            <label className="content-query-label">구매단가</label>
            <CustomNumberInput
              name="buyDan"
              step={0.01}
              min={0}
              max={9999}
              initialValue={formData.buyDan}
              onChange={handleChange}
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">화폐구분</label>
            <select
              value={formData.moneyGbn || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["moneyData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">세율</label>
            <CustomNumberInput
              name="taxRate"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.taxRate}
              onChange={handleChange}
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">부가세 적용</label>
            <div className="content-radio-group">
              {(codes["vatData"] || []).map((opt) => (
                <label key={opt.code} className="content-radio-label">
                  <input
                    type="radio"
                    name="vatYn"
                    value={opt.code}
                    checked={formData.vatYn === opt.code}
                    onChange={handleChange} // onChange 핸들러 연결
                  />
                  {opt.codeNm}
                </label>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* ✅ 공급망 관리 */}
        <AccordionSection title="공급망 관리" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">공급업체코드</label>
            <TextInput
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              placeholder={"공급망 관리"}
              maxLength={50}
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">리드타임(일수)</label>
            <CustomNumberInput
              name="leadTime"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.leadTime}
              onChange={handleChange}
            />

            <label className="content-query-label">안전재고량</label>
            <CustomNumberInput
              name="safetyStock"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.safetyStock}
              onChange={handleChange}
            />
          </div>

          <div className="content-query-row">
            <label className="content-query-label">최대재고량</label>
            <CustomNumberInput
              name="maxStock"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.maxStock}
              onChange={handleChange}
            />

            <label className="content-query-label">재주문점</label>
            <CustomNumberInput
              name="reorderPoint"
              step={5}
              min={0}
              max={9999}
              initialValue={formData.reorderPoint}
              onChange={handleChange}
            />
          </div>

          <div className="content-query-row">
            <label className="content-query-label">발주단위량</label>
            <CustomNumberInput
              name="orderUnitQty"
              step={10}
              min={0}
              max={9999}
              initialValue={formData.orderUnitQty}
              onChange={handleChange}
            />

            <label className="content-query-label">발주최소단위</label>
            <CustomNumberInput
              name="minOrderQty"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.minOrderQty}
              onChange={handleChange}
            />
          </div>
        </AccordionSection>

        {/* ✅ 물류/창고 관리 */}
        <AccordionSection title="물류/창고 관리" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">창고위치</label>
            <TextInput
              name="warehouseLocation"
              value={formData.warehouseLocation}
              onChange={handleChange}
              placeholder={"창고위치"}
              maxLength={50}
              type="text"
            />
          </div>
          <div className="content-query-row">

            <label className="content-query-label">로트관리</label>
            <div className="content-radio-group">
              {(codes["useYnData"] || []).map((opt) => (
                <label key={opt.code} className="content-radio-label">
                  <input
                    type="radio"
                    name="lotManagementYn"
                    value={opt.code}
                    checked={formData.lotManagementYn === opt.code}
                    onChange={handleChange} // onChange 핸들러 연결
                  />
                  {opt.codeNm}
                </label>
              ))}
            </div>

            <label className="content-query-label">수불여부</label>
            <div className="content-radio-group">
              {(codes["useYnData"] || []).map((opt) => (
                <label key={opt.code} className="content-radio-label">
                  <input
                    type="radio"
                    name="stockYn"
                    value={opt.code}
                    checked={formData.stockYn === opt.code}
                    onChange={handleChange} // onChange 핸들러 연결
                  />
                  {opt.codeNm}
                </label>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* ✅ 품질 관리 */}
        <AccordionSection title="품질 관리" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">품질 등급</label>
            <select
              value={formData.qualityGrade || ""}
              onChange={handleChange} // onChange 핸들러 연결
              className="content-query-input"
            >
              <option value="">전체</option>
              {(codes["abcClassData"] || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.codeNm}
                </option>
              ))}
            </select>
            <label className="content-query-label">반품정책</label>
            <TextInput
              name="returnPolicy"
              value={formData.returnPolicy}
              onChange={handleChange}
              placeholder={"반품정책"}
              maxLength={50}
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">검사주기(일수)</label>
            <CustomNumberInput
              name="inspectionCycle"
              step={1}
              min={0}
              max={9999}
              initialValue={formData.inspectionCycle}
              onChange={handleChange}
            />
            <label className="content-query-label">보증 기간(일수)</label>
            <CustomNumberInput
              name="warerantyPeriod"
              step={30}
              min={0}
              max={9999}
              initialValue={formData.warerantyPeriod}
              onChange={handleChange}
            />
          </div>
        </AccordionSection>

        {/* ✅ 생명주기 관리 */}
        <AccordionSection title="생명주기 관리" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">런닝일자</label>
            <TextInput
              type="date"
              name="runD"
              value={formData.runD}
              onChange={handleChange}
              placeholder={"런닝일자"}
              maxLength={10}
            />
            <label className="content-query-label">단종일자</label>
            <TextInput
              type="date"
              name="endD"
              value={formData.endD}
              onChange={handleChange}
              placeholder={"단종일자"}
              maxLength={10}
            />
          </div>
          <div className="content-query-row">
            <label className="content-query-label">등록일자</label>
            <TextInput
              type="date"
              name="openD"
              value={formData.openD}
              onChange={handleChange}
              placeholder={"등록일자"}
              maxLength={10}
            />
            <label className="content-query-label">종료일자</label>
            <TextInput
              type="date"
              name="closeD"
              value={formData.closeD}
              onChange={handleChange}
              placeholder={"종료일자"}
              maxLength={10}
            />
          </div>
        </AccordionSection>

        {/* ✅ ERP/회계 정보 */}
        <AccordionSection title="ERP/회계 정보" defaultOpen={false}>
          <div className="content-query-row">
            <label className="content-query-label">계정과목 코드</label>
            <TextInput
              type="date"
              name="accountCode"
              value={formData.accountCode}
              onChange={handleChange}
              placeholder={"계정과목 코드"}
              maxLength={10}
            />
            <label className="content-query-label">원가센터</label>
            <TextInput
              type="date"
              name="costCenter"
              value={formData.costCenter}
              onChange={handleChange}
              placeholder={"종료일자"}
              maxLength={10}
            />

            <label className="content-query-label">손익센터</label>
            <TextInput
              type="date"
              name="profitCenter"
              value={formData.profitCenter}
              onChange={handleChange}
              placeholder={"손익센터"}
              maxLength={10}
            />
          </div>
        </AccordionSection>

        {/* ✅ 기타 정보 */}
        <AccordionSection title="기타 정보" defaultOpen={false}>
          <div className="content-query-row" style={{ height: "200px" }}>
            <label className="content-query-label">메모</label>
            <textarea
              name="remarks"              // ✅ 반드시 추가해야 함
              value={formData.remarks}
              onChange={handleChange}
              placeholder="메모를 입력하세요"
              maxLength={500}
              className="content-query-textarea"
            />
          </div>
        </AccordionSection>
      </div>


      <div className="content-popup-search-wrapper">
        <button key="fnHelp" className="content-help-button">
          도움말
        </button>
        <button key="fnSaveAll" className="content-saveAll-button">
          일괄등록
        </button>
        <button key="fnSave" className="content-save-button" onClick={handleSave}>
          저장
        </button>
      </div>
    </div>
  );
});

export default ViewDetail;
