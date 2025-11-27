export const numberFormatter = (params) => {
  if (params.value == null || params.value === '' || params.value === undefined) return '0';
  const cleanValue = typeof params.value === 'string' ? params.value.trim() : params.value;
  if (cleanValue === '') return '0';
  const numValue = Number(cleanValue);
  if (isNaN(numValue) || !isFinite(numValue)) return '0';
  if (numValue === 0) return '0';
  if (numValue < 0) return `-${Math.abs(numValue).toLocaleString('ko-KR')}`;
  return numValue.toLocaleString('ko-KR');
};

export const rateFormatter = (params) => {
  if (params.value == null || params.value === '' || params.value === undefined) return '0.00%';
  const cleanValue = typeof params.value === 'string' ? params.value.trim() : params.value;
  if (cleanValue === '') return '0.00%';
  const numValue = Number(cleanValue);
  if (isNaN(numValue) || !isFinite(numValue)) return '0.00%';
  return numValue.toFixed(2) + '%';
};

/**
 * 숫자 포맷팅 함수 (천단위 콤마 추가)
 * @param {string | number} value - 포맷팅할 숫자 또는 문자열
 * @returns {string} 포맷된 숫자 문자열
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  return numValue.toLocaleString("ko-KR");
};

/**
 * 숫자 포맷팅 제거 함수 (콤마 제거)
 * @param {string} value - 콤마가 포함된 숫자 문자열
 * @returns {string} 콤마가 제거된 숫자 문자열
 */
export const removeNumberFormat = (value) => {
  if (!value) return "";
  return value.toString().replace(/,/g, "");
};