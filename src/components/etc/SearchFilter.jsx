import React, { useEffect, useMemo, useCallback } from "react";
import { Tooltip } from "antd";
import { LockOutlined } from '@ant-design/icons';
import MultiSelect from "@/components/form/MultiSelect";
import { useCustomContents } from "@/system/hook/ManagerProvider";

// --- 헬퍼 함수 ---
const formatDate = (date) => date.toISOString().split("T")[0];
const formatYearMonth = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const formatMonthDay = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const parseForCompare = (val) => {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val);
  if (/^\d{4}-\d{2}$/.test(val)) return new Date(`${val}-01`);
  if (/^\d{2}-\d{2}$/.test(val)) {
    const y = new Date().getFullYear();
    return new Date(`${y}-${val}`);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// 배열을 size만큼 잘라서 2차원 배열로 반환
const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const SearchFilter = ({
  searchForm = [],
  codes = {},
  filters = {},
  onFilterChange = () => { },
  buttons = [],
  handleInit,
  rowByDisplayCnt = 1, // 한 줄에 표시할 필드 개수 (기본값 1)
  isUseInitBtn = true,
}) => {
  const { showMessageModal } = useCustomContents();

  const uniqueId = useMemo(
    () => `SF_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    []
  );

  const defaultFilterValues = useMemo(() => {
    const today = new Date();
    const defaults = {};

    searchForm.forEach((field) => {
      if (field.disabled) return;

      if (field.defaultValue !== undefined) {
        let val = field.defaultValue;
        if (field.type === "dateRange") {
          defaults[field.startKey] =
            val.start instanceof Date ? formatDate(val.start) : val.start || "";
          defaults[field.endKey] =
            val.end instanceof Date ? formatDate(val.end) : val.end || "";
        } else if (field.type === "yyyymmRange") {
          defaults[field.startKey] =
            val.start instanceof Date
              ? formatYearMonth(val.start)
              : val.start || "";
          defaults[field.endKey] =
            val.end instanceof Date ? formatYearMonth(val.end) : val.end || "";
        } else if (field.type === "dayRange") {
          defaults[field.startKey] =
            val.start instanceof Date
              ? formatMonthDay(val.start)
              : val.start || "";
          defaults[field.endKey] =
            val.end instanceof Date ? formatMonthDay(val.end) : val.end || "";
        } else if (field.type === "date") {
          defaults[field.key] = val instanceof Date ? formatDate(val) : val;
        } else if (field.type === "yyyymm") {
          defaults[field.key] =
            val instanceof Date ? formatYearMonth(val) : val;
        } else if (field.type === "day") {
          defaults[field.key] = val instanceof Date ? formatMonthDay(val) : val;
        } else if (field.type === "multiple" || field.type === "check") {
          defaults[field.key] = Array.isArray(val) ? val : [];
        } else if (field.type === "number") {
          defaults[field.key] =
            val !== undefined && val !== null ? Number(val) : "";
        } else if (field.type === "numberRange") {
          defaults[field.minKey] =
            val.min !== undefined && val.min !== null ? Number(val.min) : "";
          defaults[field.maxKey] =
            val.max !== undefined && val.max !== null ? Number(val.max) : "";
        } else {
          defaults[field.key] = val;
        }
        return;
      }

      let from = new Date(today);
      let to = new Date(today);

      if (field.offset && Array.isArray(field.offset)) {
        const [fromOffset = 0, toOffset = 0] = field.offset;
        from.setMonth(from.getMonth() - fromOffset);
        to.setMonth(to.getMonth() + toOffset);
      }

      if (field.type.endsWith("Range") && field.type !== "numberRange") {
        const formatter =
          field.type === "dateRange"
            ? formatDate
            : field.type === "yyyymmRange"
              ? formatYearMonth
              : formatMonthDay;
        defaults[field.startKey] = formatter(from);
        defaults[field.endKey] = formatter(to);
      } else if (["date", "yyyymm", "day"].includes(field.type)) {
        const formatter =
          field.type === "date"
            ? formatDate
            : field.type === "yyyymm"
              ? formatYearMonth
              : formatMonthDay;
        defaults[field.key] = formatter(from);
      } else if (field.type === "multiple" || field.type === "check") {
        defaults[field.key] = [];
      } else if (field.type === "numberRange") {
        defaults[field.minKey] = "";
        defaults[field.maxKey] = "";
      } else {
        defaults[field.key] = "";
      }
    });

    return defaults;
  }, [searchForm]);

  useEffect(() => {
    const updates = {};
    let hasUpdates = false;

    Object.entries(defaultFilterValues).forEach(([k, v]) => {
      if (
        filters[k] === undefined ||
        filters[k] === null ||
        filters[k] === ""
      ) {
        updates[k] = v;
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      if (handleInit) {
        handleInit(updates);
      } else {
        Object.entries(updates).forEach(([k, v]) => {
          onFilterChange(k, v);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (key, value, callback) => {
      onFilterChange(key, value);
      callback?.(value);
    },
    [onFilterChange]
  );

  const handleDateChange = useCallback(
    (label, key, value, startKey, endKey, callback) => {
      const updated = { ...filters, [key]: value };
      const s = parseForCompare(updated[startKey]);
      const e = parseForCompare(updated[endKey]);

      if (s && e && e < s) {
        showMessageModal({
          title: "알림",
          content: `${label}의 종료일은 시작일보다 빠를 수 없습니다.`,
        });
        return;
      }
      handleChange(key, value, callback);
    },
    [filters, showMessageModal, handleChange]
  );

  const handleReset = useCallback(() => {
    if (handleInit) {
      handleInit(defaultFilterValues);
    } else {
      Object.entries(defaultFilterValues).forEach(([k, v]) => {
        onFilterChange(k, v);
      });
    }
  }, [defaultFilterValues, handleInit, onFilterChange]);

  const mergedButtons = useMemo(() => {

    // 초기화 버튼 사용 안 하면 원래 버튼 그대로 반환
    if (!isUseInitBtn) return buttons;

    const hasReset = buttons.some((b) => b.key === "reset");

    const resetBtn = {
      key: "reset",
      label: "초기화",
      className: "content-init-button",
      onClick: handleReset,
    };

    if (hasReset) return buttons;

    const searchIdx = buttons.findIndex((b) => b.key === "search");
    if (searchIdx !== -1) {
      const arr = [...buttons];
      arr.splice(searchIdx, 0, resetBtn);
      return arr;
    }

    return [...buttons, resetBtn];
  }, [buttons, handleReset]);

  const runSearch = useCallback(() => {
    const s =
      mergedButtons.find((btn) =>
        String(btn.key).toLowerCase().includes("search")
      ) ||
      mergedButtons.find((btn) => String(btn.key).toLowerCase() === "search");
    s?.onClick?.();
  }, [mergedButtons]);

  // rowByDisplayCnt에 따라 행(row) 단위로 분할
  const formRows = useMemo(
    () => chunkArray(searchForm, rowByDisplayCnt),
    [searchForm, rowByDisplayCnt]
  );

  // 1보다 클 때만 멀티 컬럼 레이아웃 적용
  const isMultiColumn = rowByDisplayCnt > 1;

  return (
    <>
      {formRows.map((rowFields, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="content-query-row"
          style={{
            display: "flex",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: "5px",
            // rowByDisplayCnt > 1 일 때, 컬럼(필드 아이템) 간의 통일된 간격 설정
            columnGap: isMultiColumn ? "20px" : undefined,
          }}
        >
          {rowFields.map((field) => {
            // disabled 처리: 문자열이면 해당 filter 값 체크 (예: disabled: "birthYn" → filters.birthYn !== "Y")
            const dis = typeof field.disabled === "string"
              ? Boolean(filters[field.disabled] !== "Y")
              : Boolean(field.disabled ?? false);
            const itemKey =
              field.key ||
              field.startKey ||
              field.minKey ||
              `${uniqueId}-${field.label}`;

            const commonInputProps = {
              disabled: dis,
              className: "content-query-input",
              onKeyDown: (e) =>
                field.isEnterEvent && e.key === "Enter" && runSearch(),
            };

            return (
              <div
                key={itemKey}
                style={{
                  width: `${100 / rowByDisplayCnt}%`, // n등분 width
                  display: "flex",
                  alignItems: "center",
                  // Label-Component 내부 간격 (5px)
                  gap: isMultiColumn ? "5px" : undefined,
                  paddingRight: "0", // columnGap이 컬럼 간 간격을 담당하므로, paddingRight 제거
                  boxSizing: "border-box",
                }}
              >
                <label
                  className="content-query-label"
                  style={isMultiColumn ? {
                    marginRight: "0px", // Label-Component 간격 좁힘을 위해 margin-right 제거/재정의
                    whiteSpace: "nowrap", // 라벨 줄바꿈 방지
                    minWidth: "80px",     // [수정] 라벨 최소 너비 고정 (가장 긴 라벨에 맞춰 조절)
                    textAlign: "left",   // [수정] 라벨 텍스트 오른쪽 정렬
                    flexShrink: 0,        // [수정] 라벨이 줄어들지 않도록
                  } : {}} // 1일 때는 기존 CSS margin-right 유지
                >
                  {field.label}
                </label>

                {field.type === "input-search" && (
                  <div style={{ display: "flex", flex: 1 }}> {/* flex: 1 추가 */}
                    <input
                      {...commonInputProps}
                      type="text"
                      value={filters[field.key] ?? ""}
                      onChange={(e) =>
                        !dis && handleChange(field.key, e.target.value)
                      }
                      style={{ width: "calc(100% - 30px)" }}
                    />
                    <button
                      disabled={dis}
                      onClick={() => field.callback?.(filters[field.key])}
                      className="input-search-btn"
                      style={{ width: "30px" }}
                    >
                      검색
                    </button>
                  </div>
                )}

                {field.type === "select" && (
                  <select
                    {...commonInputProps}
                    value={filters[field.key] ?? ""}
                    onChange={(e) =>
                      !dis &&
                      handleChange(field.key, e.target.value, field.callback)
                    }
                    style={{ flex: 1 }}
                  >
                    <option value="">전체</option>
                    {(codes[field.codeKey] || []).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.codeNm}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "selectRange" && (
                  <div className="content-range-group">
                    <select
                      disabled={dis}
                      value={filters[field.startKey] ?? ""}
                      onChange={(e) => {
                        if (dis) return;
                        const newValue = e.target.value;

                        // syncOnAll이 true이고 전체("")를 선택한 경우, 다른쪽도 전체로 설정
                        if (field.syncOnAll && newValue === "") {
                          handleChange(field.startKey, newValue, field.callback);
                          handleChange(field.endKey, newValue, field.callback);
                        } else {
                          handleChange(field.startKey, newValue, field.callback);
                        }
                      }}
                      className="content-query-input"
                    >
                      <option value="">전체</option>
                      {(codes[field.codeKey] || []).map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.codeNm}
                        </option>
                      ))}
                    </select>
                    <span>~</span>
                    <select
                      disabled={dis}
                      value={filters[field.endKey] ?? ""}
                      onChange={(e) => {
                        if (dis) return;
                        const newValue = e.target.value;

                        // syncOnAll이 true이고 전체("")를 선택한 경우, 다른쪽도 전체로 설정
                        if (field.syncOnAll && newValue === "") {
                          handleChange(field.startKey, newValue, field.callback);
                          handleChange(field.endKey, newValue, field.callback);
                        } else {
                          handleChange(field.endKey, newValue, field.callback);
                        }
                      }}
                      className="content-query-input"
                    >
                      <option value="">전체</option>
                      {(codes[field.codeKey] || []).map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.codeNm}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {field.type === "multiple" && (
                  <div style={{ flex: 1 }}>
                    <MultiSelect
                      disabled={dis}
                      options={(codes[field.codeKey] || []).map((o) => ({
                        value: o.code,
                        label: o.codeNm,
                      }))}
                      selectedValues={filters[field.key] ?? []}
                      onChange={(vals) => {
                        if (!dis) {
                          const norm = Array.isArray(vals) ? vals : [vals];
                          handleChange(field.key, norm, field.callback);
                        }
                      }}
                    />
                  </div>
                )}

                {(field.type === "input" || field.type === "number") && (
                  <input
                    {...commonInputProps}
                    type={field.type === "number" ? "number" : "text"}
                    value={filters[field.key] ?? ""}
                    name={field.key}
                    onChange={(e) => {
                      if (dis) return;
                      const val =
                        field.type === "number"
                          ? e.target.value !== ""
                            ? Number(e.target.value)
                            : ""
                          : e.target.value;
                      handleChange(field.key, val, field.callback);
                    }}
                    style={{ flex: 1 }}
                  />
                )}

                {field.type === "numberRange" && (
                  <div
                    className="content-range-group"
                    style={{ width: "100%", display: "flex", gap: "5px", flex: 1 }}
                  >
                    <input
                      {...commonInputProps}
                      type="number"
                      value={filters[field.minKey] ?? ""}
                      onChange={(e) =>
                        !dis && handleChange(field.minKey, e.target.value)
                      }
                      placeholder="최소"
                      style={{ flex: 1 }}
                    />
                    <span> ~ </span>
                    <input
                      {...commonInputProps}
                      type="number"
                      value={filters[field.maxKey] ?? ""}
                      onChange={(e) =>
                        !dis && handleChange(field.maxKey, e.target.value)
                      }
                      placeholder="최대"
                      style={{ flex: 1 }}
                    />
                  </div>
                )}

                {["dateRange", "yyyymmRange", "dayRange"].includes(
                  field.type
                ) && (
                    <Tooltip
                      title={dis && typeof field.disabled === "string" ? `'${field.disabled}' 옵션을 '사용'으로 변경하면 편집할 수 있습니다` : ""}
                      placement="top"
                    >
                      <div
                        className="content-range-group"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flex: 1,
                          position: "relative",
                          opacity: dis ? 0.6 : 1,
                          transition: "opacity 0.3s"
                        }}
                      >
                        {dis && (
                          <LockOutlined
                            style={{
                              position: "absolute",
                              right: "5px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#999",
                              fontSize: "12px",
                              zIndex: 1,
                              pointerEvents: "none"
                            }}
                          />
                        )}
                      <input
                        disabled={dis}
                        type={
                          field.type === "yyyymmRange"
                            ? "month"
                            : field.type === "dateRange"
                              ? "date"
                              : "text"
                        }
                        placeholder={
                          field.type === "dayRange" ? "MM-DD" : undefined
                        }
                        value={filters[field.startKey] ?? ""}
                        onChange={(e) =>
                          !dis &&
                          handleDateChange(
                            field.label,
                            field.startKey,
                            e.target.value,
                            field.startKey,
                            field.endKey,
                            field.callback
                          )
                        }
                        className="content-query-input"
                        style={{ flex: 1 }}
                      />
                      <span style={{ padding: "0 5px" }}> ~ </span>
                      <input
                        disabled={dis}
                        type={
                          field.type === "yyyymmRange"
                            ? "month"
                            : field.type === "dateRange"
                              ? "date"
                              : "text"
                        }
                        placeholder={
                          field.type === "dayRange" ? "MM-DD" : undefined
                        }
                        value={filters[field.endKey] ?? ""}
                        onChange={(e) =>
                          !dis &&
                          handleDateChange(
                            field.label,
                            field.endKey,
                            e.target.value,
                            field.startKey,
                            field.endKey,
                            field.callback
                          )
                        }
                        className="content-query-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </Tooltip>
                )}

                {["date", "yyyymm", "day"].includes(field.type) && (
                  <input
                    disabled={dis}
                    type={
                      field.type === "yyyymm"
                        ? "month"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
                    placeholder={field.type === "day" ? "MM-DD" : undefined}
                    value={filters[field.key] ?? ""}
                    onChange={(e) =>
                      !dis &&
                      handleChange(field.key, e.target.value, field.callback)
                    }
                    className="content-query-input"
                    style={{ flex: 1 }}
                  />
                )}

                {field.type === "check" && (
                  <div
                    className="content-radio-group"
                    style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "5px" }}
                  >
                    {(codes[field.codeKey] || []).map((opt) => {
                      const currentValues = Array.isArray(filters[field.key])
                        ? filters[field.key]
                        : [];
                      const isChecked = currentValues.includes(opt.code);

                      return (
                        <label
                          key={opt.code}
                          className="content-radio-label"
                          style={{ marginRight: "10px", cursor: "pointer" }}
                        >
                          <input
                            disabled={dis}
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (dis) return;
                              let newValues = [...currentValues];
                              if (e.target.checked) {
                                newValues.push(opt.code);
                              } else {
                                newValues = newValues.filter(
                                  (v) => v !== opt.code
                                );
                              }
                              handleChange(
                                field.key,
                                newValues,
                                field.callback
                              );
                            }}
                            className="content-query-check"
                            style={{ marginRight: "4px" }}
                          />
                          {opt.codeNm}
                        </label>
                      );
                    })}
                  </div>
                )}

                {field.type === "radio" && (
                  <Tooltip
                    title={dis && typeof field.disabled === "string" ? `'${field.disabled}' 옵션을 '사용'으로 변경하면 편집할 수 있습니다` : ""}
                    placement="top"
                  >
                    <div
                      className="content-radio-group"
                      style={{
                        flex: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        position: "relative",
                        opacity: dis ? 0.6 : 1,
                        transition: "opacity 0.3s"
                      }}
                    >
                      {dis && (
                        <LockOutlined
                          style={{
                            position: "absolute",
                            right: "5px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#999",
                            fontSize: "12px",
                            zIndex: 1
                          }}
                        />
                      )}
                      {(codes[field.codeKey] || []).map((opt) => (
                        <label key={opt.code} className="content-radio-label">
                          <input
                            disabled={dis}
                          type="radio"
                          name={`${uniqueId}-${field.key}`}
                          value={opt.code}
                          checked={filters[field.key] === opt.code}
                          onChange={() =>
                            !dis &&
                            handleChange(field.key, opt.code, field.callback)
                          }
                          style={{ marginRight: "4px" }}
                        />
                        {opt.codeNm}
                      </label>
                    ))}
                  </div>
                </Tooltip>
              )}

                {field.type === "checkGroup" && (
                  <div
                    className="content-check-group"
                    style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "10px" }}
                  >
                    {(field.options || []).map((opt) => (
                      <label key={opt.key} className="content-check-label">
                        <input
                          disabled={dis}
                          type="checkbox"
                          checked={filters[opt.key] === "Y"}
                          onChange={(e) =>
                            !dis &&
                            handleChange(opt.key, e.target.checked ? "Y" : "", field.callback)
                          }
                          style={{ marginRight: "4px" }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {mergedButtons.length > 0 && (
        <div className="content-search-wrapper">
          {mergedButtons.map((btn) => (
            <button
              key={btn.key}
              className={btn.className || "content-search-button"}
              onClick={btn.onClick}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default React.memo(SearchFilter);