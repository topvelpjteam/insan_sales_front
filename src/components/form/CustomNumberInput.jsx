import React, { useState, useEffect, forwardRef } from "react";
import { formatNumber, removeNumberFormat } from '@/system/utils/Formatter';

const CustomNumberInput = forwardRef(({
  name = "goodsCapa",
  step = 0.1,
  min = 0,
  max,
  initialValue = 0,
  onChange, // 부모의 handleChange
  style = {},
  disabled = false, // 추가된 disabled 속성
}, ref) => {
  const [value, setValue] = useState(initialValue);

  /** 부모 initialValue가 바뀌면 내부 상태 동기화 */
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  /** 내부 값 변경 + 부모에게 이벤트 전달 */
  const updateValue = (newValue) => {
    setValue(newValue);

    if (onChange) {
      onChange({
        target: {
          name,
          value: newValue,
        },
      });
    }
  };

  const handleChange = (e) => {
    const raw = removeNumberFormat(e.target.value);
    if (!/^-?\d*\.?\d*$/.test(raw)) return; // 숫자 + 소수점만 허용
    updateValue(raw);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(
      (parseFloat(value || 0) + step).toFixed(2),
      max ?? Infinity
    );
    updateValue(newValue);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(
      (parseFloat(value || 0) - step).toFixed(2),
      min ?? -Infinity
    );
    updateValue(newValue);
  };

  return (
    <div className="content-custom-number-input">
      <button
        type="button"
        className="content-btn-minus"
        onClick={handleDecrement}
        disabled={disabled} // 버튼도 disabled 처리
      >
        −
      </button>
      <input
        type="text"
        name={name}
        value={formatNumber(value)}
        onChange={handleChange}
        className="content-number-text-input"
        style={style}
        disabled={disabled} // input disabled 처리
        ref={ref}
      />
      <button
        type="button"
        className="content-btn-plus"
        onClick={handleIncrement}
        disabled={disabled} // 버튼도 disabled 처리
      >
        +
      </button>
    </div>
  );
});

export default CustomNumberInput;
