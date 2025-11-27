import React, { useState, useRef, useEffect, forwardRef } from "react";

const MultiSelect = forwardRef(({
  options,
  selectedValues = [],
  onChange,
  placeholder = "선택",
  disabledAll = false, // 🌟 전체 비활성화 prop 추가
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef();

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 옵션 토글 (disabled 또는 전체 비활성화 시 무시)
  const toggleOption = (value) => {
    if (disabledAll) return; // 🌟 전체 비활성화일 경우 클릭 무시
    const targetOption = options.find((opt) => opt.value === value);
    if (targetOption?.disabled) return;

    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  // 전체 선택 / 전체 해제 (disabled 항목 제외)
  const toggleSelectAll = () => {
    if (disabledAll) return; // 🌟 전체 비활성화 시 무시
    const enabledOptions = options.filter((opt) => !opt.disabled);
    if (selectedValues.length === enabledOptions.length) {
      onChange([]);
    } else {
      onChange(enabledOptions.map((opt) => opt.value));
    }
  };

  // 검색 필터링
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : options
        .filter((opt) => selectedValues.includes(opt.value))
        .map((opt) => opt.label)
        .join(", ");

  return (
    <div
      className={`multi-select-container ${disabledAll ? "multi-select-disabled" : ""}`} // 🌟 스타일용 클래스 추가
      ref={containerRef}
    >
      <div
        className={`multi-select-display ${selectedValues.length > 0 ? "selected" : ""} ${disabledAll ? "disabled" : ""}`} // 🌟 비활성화 스타일 적용
        onClick={() => !disabledAll && setIsOpen(!isOpen)} // 🌟 클릭 방지
      >
        {displayText}
        <span className={`multi-select-arrow ${isOpen ? "open" : ""}`} />
      </div>

      {/* 🌟 전체 비활성화 시 dropdown 숨김 */}
      {isOpen && !disabledAll && (
        <div className="multi-select-dropdown">
          <div className="multi-select-search-wrapper">
            <input
              type="text"
              className="multi-select-search"
              placeholder="검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              disabled={disabledAll} // 전체 비활성화 시 검색 막기
            />
            <button
              className="multi-select-select-all"
              onClick={toggleSelectAll}
              disabled={disabledAll}
            >
              {selectedValues.length === options.filter((opt) => !opt.disabled).length
                ? "해제"
                : "전체"}
            </button>
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <label
                key={opt.value}
                className={`multi-select-option 
                  ${selectedValues.includes(opt.value) ? "option-selected" : ""} 
                  ${opt.disabled ? "option-disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                  disabled={opt.disabled || disabledAll} // 🌟 전체 비활성화 적용
                  ref={ref}
                />
                {opt.label}
              </label>
            ))
          ) : (
            <div className="multi-select-no-options">검색 결과 없음</div>
          )}
        </div>
      )}
    </div>
  );
});

export default MultiSelect;
