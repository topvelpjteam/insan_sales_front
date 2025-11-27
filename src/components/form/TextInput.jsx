import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from "react";
/**
 * 재사용 가능한 텍스트 입력 컴포넌트
 *
 * @param {string} name - 입력 필드 이름 (handleChange에서 key로 사용)
 * @param {string} value - 현재 입력 값
 * @param {function} onChange - 부모로부터 전달받은 값 변경 핸들러
 * @param {string} placeholder - 입력창 힌트
 * @param {string} className - 추가 CSS 클래스
 * @param {boolean} disabled - 비활성화 여부
 * @param {number} maxLength - 입력 가능한 최대 글자 수
 * @param {string} type - 타입
 */
const TextInput = forwardRef(({
  name,
  value,
  onChange,
  placeholder = "",
  className = "content-query-input",
  disabled = false,
  maxLength, // ✅ 추가
  type = "text",
}, ref) => {
  return (
    <input
      type={type}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      maxLength={maxLength} // ✅ 추가
      ref={ref}
    />
  );
});

export default TextInput;
