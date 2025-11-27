import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import { useApiCallService } from "@/system/ApiCallService";
import AccordionSection from "@/components/etc/AccordionSection";
import MultiSelect from "@/components/form/MultiSelect";
import CustomNumberInput from "@/components/form/CustomNumberInput";
import TextInput from "@/components/form/TextInput";
import { useCustomContents } from "@/system/hook/ManagerProvider";
import { validateFormDataTypeB } from "@/system/utils/common";

const renderInputField = (col, value, handleChange, formData, setFormData, inputRefs) => {
  const commonProps = {
    name: col.name,
    disabled: col.disabled,
    readOnly: col.readOnly,
    required: col.required,
    maxLength: col.maxLength > 0 ? col.maxLength : undefined,
    className: col.type === "textarea" ? "content-query-textarea" : "content-query-input",
    style: col.type === "textarea" ? { height: "100%" } : undefined,
    ref: (el) => inputRefs.current[col.name] = el,
  };

  switch (col.type) {
    case "text":
      return <TextInput {...commonProps} value={value ?? ""} onChange={handleChange} />;
    case "number":
      return (
        <CustomNumberInput
          name={col.name}
          step={col.number?.step ?? 1}
          min={col.number?.min ?? 0}
          max={col.number?.max ?? 9999}
          initialValue={value}
          onChange={handleChange}
          disabled={col.disabled}
          ref={(el) => inputRefs.current[col.name] = el}
        />
      );
    case "textarea":
      return <textarea {...commonProps} value={value ?? ""} onChange={handleChange} />;
    case "select":
      return (
        <select {...commonProps} value={value ?? ""} onChange={handleChange}>
          <option value="">선택</option>
          {(col.code || []).map((opt) => (
            <option key={opt.code} value={opt.code}>{opt.codeNm}</option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="content-radio-group">
          {(col.code || []).map((opt) => (
            <label key={opt.code} className="content-radio-label">
              <input
                type="radio"
                name={col.name}
                value={opt.code}
                checked={value === opt.code}
                onChange={handleChange}
                disabled={col.disabled}
                ref={(el) => inputRefs.current[col.name] = el}
              />
              {opt.codeNm}
            </label>
          ))}
        </div>
      );
    case "multi_select":
      return (
        <MultiSelect
          options={(col.code || []).map((opt) => ({ value: opt.code, label: opt.codeNm }))}

          // ✅ formData에 문자열이 들어있다면 화면 표시용으로 split 처리
          selectedValues={
            Array.isArray(formData[col.name])
              ? formData[col.name]
              : (formData[col.name] ? formData[col.name].split(",") : [])
          }

          disabledAll={col.disabled}
          placeholder="선택"

          // ✅ MultiSelect에서 배열로 온 값을 DB용 문자열로 변환하여 저장
          onChange={(vals) =>
            setFormData((prev) => ({
              ...prev,
              [col.name]: Array.isArray(vals) ? vals.join(",") : vals,
            }))
          }

          ref={(el) => (inputRefs.current[col.name] = el)}
        />
      );
    case "date":
      return <input type="date" {...commonProps} value={value ?? ""} onChange={handleChange} />;
    case "datePeriod": {
      const fromName = `${col.name}_from`;
      const toName = `${col.name}_to`;

      const handleDateChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };
        if (name === fromName && newFormData[toName] && value > newFormData[toName]) {
          newFormData[toName] = value;
        }
        if (name === toName && newFormData[fromName] && value < newFormData[fromName]) {
          newFormData[fromName] = value;
        }
        setFormData(newFormData);
      };

      return (
        <div className="content-date-period" style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "nowrap" }}>
          <input
            type="date"
            {...commonProps}
            name={fromName}
            value={formData[fromName] || ""}
            onChange={handleDateChange}
            style={{ flex: 1 }}
            ref={(el) => inputRefs.current[fromName] = el}
          />
          <span>~</span>
          <input
            type="date"
            {...commonProps}
            name={toName}
            value={formData[toName] || ""}
            onChange={handleDateChange}
            style={{ flex: 1 }}
            ref={(el) => inputRefs.current[toName] = el}
          />
        </div>
      );
    }
    default:
      return <TextInput {...commonProps} value={value ?? ""} onChange={handleChange} />;
  }
};

const DynamicViewDetail = forwardRef(({ id, row = {}, onClose, formDetailInfo, showNewButton = false }, ref) => {


  console.log("dy...", formDetailInfo);
  const { request } = useApiCallService();
  const { showToast, showMessageModal } = useCustomContents();

  const [originalData, setOriginalData] = useState(row);
  const [formData, setFormData] = useState(row);
  const [formConfig, setFormConfig] = useState(formDetailInfo.form);
  const [isNewMode, setIsNewMode] = useState(false);

  const inputRefs = useRef({});

  useEffect(() => { setOriginalData(row); setFormData(row); }, [row]);
  useEffect(() => { setFormConfig(formDetailInfo.form); }, [formDetailInfo]);

  const handleBeforeClose = () => JSON.stringify(formData) !== JSON.stringify(originalData);

  // ✅ 부모에서 접근 가능한 함수 추가
  useImperativeHandle(ref, () => ({
    handleBeforeClose, // 기존 내부용
    isChanged: () => handleBeforeClose(), // 부모 호출용
    getFormData: () => formData // 추가: 부모에서 변경된 formData 가져오기
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDefault = async (btn) => {
    const isChanged = handleBeforeClose();
    if (btn.isChangedCheck && !isChanged) {
      showMessageModal({ title: "알림", content: "변경된 내용이 없습니다." });
      return;
    }

    const valid = validateFormDataTypeB(formData, formConfig, inputRefs.current, showMessageModal);
    if (!valid) return;

    setIsNewMode(false);
    if (btn?.onClick) {
      btn.onClick(formData, (result) => {
        if (result === true) {
          setOriginalData(formData);

          showMessageModal({
            title: "알림",
            content: "저장 되었습니다.",
            onCallback: () => {
              const firstInputName = formConfig[0]?.columns[0]?.name;
              if (inputRefs.current[firstInputName]?.focus) {
                inputRefs.current[firstInputName].focus();
              }
            }
          });
        }
      });
    }
  };

  const handleNewToggle = () => {
    if (!isNewMode) {
      const clearedForm = formConfig.map(section => ({
        ...section,
        columns: section.columns.map(col => ({ ...col, disabled: false, readOnly: false })),
      }));

      const emptyData = {};
      formConfig.forEach(section => section.columns.forEach(col => {
        if (col.type === "multi_select") emptyData[col.name] = [];
        else if (col.type === "number") emptyData[col.name] = 0;
        else if (col.type === "datePeriod") {
          emptyData[`${col.name}_from`] = "";
          emptyData[`${col.name}_to`] = "";
        } else emptyData[col.name] = "";
      }));

      setFormConfig(clearedForm);
      setFormData(emptyData);
      setIsNewMode(true);
      showToast("신규 입력 모드로 전환되었습니다.");
    } else {
      setFormData(originalData);
      setFormConfig(formDetailInfo.form.map(section => ({
        ...section,
        columns: section.columns.map(col => ({
          ...col,
          disabled: col.disabled ?? false,
          readOnly: col.readOnly ?? false
        }))
      })));
      setIsNewMode(false);
      showToast("신규 입력이 취소되었습니다.");
    }
  };

  const buttonPosition = formDetailInfo.buttonPosition || "top";
  const buttons = [
    ...(showNewButton ? [{
      key: "new",
      label: isNewMode ? "신규취소" : "신규",
      className: isNewMode ? "content-new-cancel-button" : "content-new-button",
      onClick: handleNewToggle,
      isChangedCheck: false
    }] : []),
    ...(formDetailInfo.button || [])
  ];

  return (
    <>
      {buttonPosition === "top" && (
        <div className='content-top-button'>
          {buttons.map(btn => (
            <button key={btn.key} className={btn.className} onClick={() => btn.key === "new" ? btn.onClick() : handleDefault(btn)}>
              {btn.label}
            </button>
          ))}
        </div>
      )}

      <div className='content-sidebar-content'>
        {formConfig.map((section, secIdx) => (
          <AccordionSection key={secIdx} title={section.title} defaultOpen={secIdx === 0}>
            {section.columns
              .reduce((acc, col, idx) => {
                if (idx % formDetailInfo.rowByColCnt === 0) acc.push([]);
                acc[acc.length - 1].push(col);
                return acc;
              }, [])
              .map((cols, rowIdx) => (
                <div className="content-query-row" key={rowIdx} style={cols[0]?.style || {}}>
                  {cols.map(col => (
                    <React.Fragment key={col.name}>
                      <label className="content-query-label" style={col.style || {}}>
                        {col.label}
                        {col.required && <span className="required" style={{ color: "red" }}>*</span>}
                      </label>
                      {renderInputField(col, formData[col.name], handleChange, formData, setFormData, inputRefs)}
                    </React.Fragment>
                  ))}
                </div>
              ))}
          </AccordionSection>
        ))}
      </div>

      {buttonPosition === "bottom" && (
        <div className='content-top-button'>
          {buttons.map(btn => (
            <button key={btn.key} className={btn.className} onClick={() => btn.key === "new" ? btn.onClick() : handleDefault(btn)}>
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
});

export default DynamicViewDetail;
