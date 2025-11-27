import _ from 'lodash';

/**
 * ✅ formData 자동 유효성 검사 함수 (리팩터링 버전)
 *
 * @param {object} formData - 검사할 데이터
 * @param {array} form - 화면 폼 구조 (group → columns)
 * @returns {object} errors - { 필드명: 오류메시지 }
 */
export const validateFormData = (formData, form) => {
  const errors = [];

  form.forEach(group => {
    group.columns.forEach(col => {
      const { name, label, type, required, maxLength, number, code } = col;

      // ✅ 0. 값 추출
      let value;
      if (type === "datePeriod") {
        value = {
          from: formData[`${name}_from`],
          to: formData[`${name}_to`]
        };
      } else {
        value = formData[name];
      }

      //console.log("✅ 검사 중:", name, value, type);

      // ✅ 1. 필수값 체크
      if (required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          errors.push(`${label}은(는) 필수 입력입니다.`);
          return;
        }

        if (type === "datePeriod" && (!value.from || !value.to)) {
          errors.push(`${label} 기간을 정확히 입력해야 합니다.`);
          return;
        }
      }

      // ✅ 2. 최대 길이 검사
      if (!_.isEmpty(value) && maxLength !== -1 && value.length > maxLength) {
        errors.push(`${label}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`);
        return;
      }
      // if (
      //   value !== undefined &&
      //   value !== null &&
      //   value !== "" &&
      //   typeof value === "string" &&
      //   maxLength > 0 &&
      //   value.length > maxLength
      // ) {
      //   errors[name] = `${label}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`;
      //   return;
      // }

      // ✅ 3. 타입별 유효성 검사
      if (value !== undefined && value !== null && value !== "") {
        switch (type) {
          case "number": {
            const num = Number(value);
            if (isNaN(num)) {
              errors.push(`${label}은(는) 숫자만 입력 가능합니다.`);
              break;
            }
            if (number) {
              if (number.min !== undefined && num < number.min) {
                errors.push(`${label}은(는) 최소 ${number.min} 이상이어야 합니다.`);
              }
              if (number.max !== undefined && num > number.max) {
                errors.push(`${label}은(는) 최대 ${number.max} 이하이어야 합니다.`);
              }
            }
            break;
          }

          case "select":
            break;
          case "radio": {
            // if (code && code.length > 0 && !code.some(c => c.value === value || c === value)) {
            //   errors[name] = `${label}이(가) 올바르지 않은 값입니다.`;
            // }
            break;
          }

          case "multi_select": {
            // if (!Array.isArray(value)) {
            //   errors[name] = `${label}은(는) 배열 형태로 선택되어야 합니다.`;
            // } else if (code && code.length > 0) {
            //   const invalidValues = value.filter(v => !code.some(c => c.value === v || c === v));
            //   if (invalidValues.length > 0) {
            //     errors[name] = `${label}에 올바르지 않은 선택값이 있습니다.`;
            //   }
            // }
            break;
          }

          case "date": {
            if (isNaN(Date.parse(value))) {
              errors.push(`${label}은(는) 올바른 날짜 형식이어야 합니다.`);
            }
            break;
          }

          case "datePeriod": {
            if (isNaN(Date.parse(value.from)) || isNaN(Date.parse(value.to))) {
              errors.push(`${label} 기간이 올바른 날짜 형식이어야 합니다.`);
            } else if (new Date(value.from) > new Date(value.to)) {
              errors.push(`${label} 시작일은 종료일보다 이전이어야 합니다.`);
            }
            break;
          }

          default:
            break;
        }
      }
    });
  });

  return errors;
};


/**
 * ✅ formData 자동 유효성 검사 함수 (TypeB)
 *
 * @param {object} formData - 검사할 데이터
 * @param {array} form - 화면 폼 구조 (group → columns)
 * @param {object} refMap - { [필드명]: React ref } 형태로 전달
 * @returns {array} errors - 에러 메시지 배열
 */
/**
 * ✅ formData 유효성 검사 (DynamicViewDetail용, ref 기반 포커스 포함)
 *
 * @param {object} formData - 현재 폼 데이터
 * @param {array} formConfig - 폼 구조 (section -> columns)
 * @param {object} refMap - 각 input ref 객체 { [name]: { current: inputElement } }
 * @returns {array} errors - 에러 메시지 배열
 */
export const validateFormDataTypeB = (formData, form, inputRefs, showMessageModal) => {
  for (const group of form) {
    for (const col of group.columns) {
      const { name, label, type, required, maxLength, number } = col;

      let value;
      if (type === "datePeriod") {
        value = { from: formData[`${name}_from`], to: formData[`${name}_to`] };
      } else {
        value = formData[name];
      }

      // 1️⃣ 필수값 체크
      if (required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          if (inputRefs[name]?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label}은(는) 필수 입력입니다.`,
              onCallback: () => inputRefs[name].focus()
            });
          }
          return false;
        }

        if (type === "datePeriod" && (!value.from || !value.to)) {
          const targetRef = inputRefs[`${name}_from`] || inputRefs[`${name}_to`];
          if (targetRef?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label} 기간을 정확히 입력해야 합니다.`,
              onCallback: () => targetRef.focus()
            });
          }
          return false;
        }
      }

      // 2️⃣ 최대 길이 체크
      if (value && maxLength > 0 && value.length > maxLength) {
        if (inputRefs[name]?.focus) {
          showMessageModal({
            title: "알림",
            content: `${label}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`,
            onCallback: () => inputRefs[name].focus()
          });
        }
        return false;
      }

      // 3️⃣ 숫자 타입 체크
      if (type === "number" && value !== undefined && value !== null && value !== "") {
        const num = Number(value);
        if (isNaN(num)) {
          if (inputRefs[name]?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label}은(는) 숫자만 입력 가능합니다.`,
              onCallback: () => inputRefs[name].focus()
            });
          }
          return false;
        }
        if (number?.min !== undefined && num < number.min) {
          if (inputRefs[name]?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label}은(는) 최소 ${number.min} 이상이어야 합니다.`,
              onCallback: () => inputRefs[name].focus()
            });
          }
          return false;
        }
        if (number?.max !== undefined && num > number.max) {
          if (inputRefs[name]?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label}은(는) 최대 ${number.max} 이하이어야 합니다.`,
              onCallback: () => inputRefs[name].focus()
            });
          }
          return false;
        }
      }

      // 4️⃣ 날짜 체크
      if (type === "date" && value && isNaN(Date.parse(value))) {
        if (inputRefs[name]?.focus) {
          showMessageModal({
            title: "알림",
            content: `${label}은(는) 올바른 날짜 형식이어야 합니다.`,
            onCallback: () => inputRefs[name].focus()
          });
        }
        return false;
      }

      // 5️⃣ 기간 날짜 체크
      if (type === "datePeriod" && value.from && value.to) {
        if (isNaN(Date.parse(value.from)) || isNaN(Date.parse(value.to))) {
          const targetRef = inputRefs[`${name}_from`] || inputRefs[`${name}_to`];
          if (targetRef?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label} 기간이 올바른 날짜 형식이어야 합니다.`,
              onCallback: () => targetRef.focus()
            });
          }
          return false;
        }
        if (new Date(value.from) > new Date(value.to)) {
          const targetRef = inputRefs[`${name}_from`] || inputRefs[`${name}_to`];
          if (targetRef?.focus) {
            showMessageModal({
              title: "알림",
              content: `${label} 시작일은 종료일보다 이전이어야 합니다.`,
              onCallback: () => targetRef.focus()
            });
          }
          return false;
        }
      }
    }
  }

  return true; // 모든 체크 통과
};



/**
 * 공통 엑셀 다운로드 함수
 * 
 * @param {Function} requestFn - Axios 또는 request 함수 (예: request)
 * @param {String} url - 요청 URL
 * @param {Object} payload - 요청 바디 데이터
 * @param {Object} options - 추가 옵션
 *    @param {String} [options.method="post"] - HTTP 메서드
 *    @param {String} [options.defaultFileName="download.xlsx"] - 기본 파일명
 *    @param {String} [options.fileType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] - 파일 MIME 타입
 * 
 * @example
 * await downloadExcelFile(request, "domain/system/codeGroup", payload, {
 *   defaultFileName: "codeGroup.xlsx"
 * });
 */
export async function downloadExcelFile(requestFn, url, payload, options = {}) {
  const {
    method = "post",
    defaultFileName = "download.xlsx",
    fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } = options;

  try {
    const res = await requestFn(url, payload, {}, method, "blob");

    if (!res?.data) {
      alert("엑셀 파일을 생성하지 못했습니다.");
      return;
    }

    // ✅ Content-Disposition에서 파일명 추출
    const disposition = res.headers?.["content-disposition"];
    let filename = defaultFileName;

    if (disposition && disposition.includes("filename")) {
      const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;"']+)/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim().replaceAll('"', ""));
      }
    }

    // ✅ Blob 생성
    const blob = new Blob([res.data], { type: fileType });

    // ✅ 다운로드 링크 생성 및 클릭
    const urlObject = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlObject;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlObject);
  } catch (error) {
    console.error("엑셀 다운로드 오류:", error);
    alert("엑셀 파일 다운로드 중 오류가 발생했습니다.");
  }
}

export const saveAsExcel = (
  data,
  headers,
  fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
) => {
  if (!data) {
    console.error("다운로드할 데이터가 없습니다.");
    return;
  }

  const disposition =
    headers?.["content-disposition"] ||
    headers?.["Content-Disposition"] ||
    "";

  let filename = "download.xlsx";

  if (disposition.includes("filename")) {
    const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;"']+)/i);
    if (match && match[1]) {
      try {
        filename = decodeURIComponent(match[1].trim().replaceAll('"', ""));
      } catch {
        filename = match[1].trim().replaceAll('"', "");
      }
    }
  }

  // 확장자 보정
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    filename += ".xlsx";
  }
  //console.log("### file name", filename);
  const blob = data instanceof Blob ? data : new Blob([data], { type: fileType });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);

  // Safari 대응
  setTimeout(() => {
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, 0);
};

/**
 * 엑셀 파일을 읽어 JSON 배열로 반환 (헤더/데이터 분리 없이 전체 시트 내용)
 *
 * @param {File} file - 업로드된 엑셀 파일
 * @returns {Promise<any[][]>} - 시트의 전체 데이터를 2차원 배열로 반환
 */
// export const parseExcelFile = async (file) => {
//   if (!file) throw new Error('파일이 없습니다.');

//   const XLSX = await import('xlsx');
//   const arrayBuffer = await file.arrayBuffer();
//   const workbook = XLSX.read(arrayBuffer, { type: 'array' });

//   // 첫 번째 시트 가져오기
//   const firstSheetName = workbook.SheetNames[0];
//   const worksheet = workbook.Sheets[firstSheetName];

//   // 시트를 2차원 배열로 변환
//   const jsonData = XLSX.utils.sheet_to_json(worksheet, {
//     header: 1, // 배열 형태
//     defval: '' // 빈 셀은 빈 문자열
//   });

//   return jsonData;
// };

/**
 * 엑셀 파일을 읽어 JSON 배열로 반환 (헤더/데이터 분리 없이 전체 시트 내용)
 * 날짜는 자동으로 YYYY-MM-DD 문자열로 변환, 나머지 값은 그대로
 *
 * @param {File} file - 업로드된 엑셀 파일
 * @returns {Promise<any[][]>} - 시트의 전체 데이터를 2차원 배열로 반환
 */
export const parseExcelFile = async (file) => {
  if (!file) throw new Error('파일이 없습니다.');

  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // 첫 번째 시트 가져오기
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 시트를 2차원 배열로 변환 (날짜 처리 포함)
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,       // 배열 형태
    defval: '',      // 빈 셀은 빈 문자열
    cellDates: true, // 날짜 셀을 Date 객체로 변환
  });

  // Date 객체만 문자열로 변환, 나머지는 그대로
  const formattedData = rawData.map(row =>
    row.map(cell => {
      if (cell instanceof Date) {
        const yyyy = cell.getFullYear();
        const mm = String(cell.getMonth() + 1).padStart(2, '0');
        const dd = String(cell.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return cell;
    })
  );
  console.log('formattedData:::', formattedData);
  return formattedData;
};


// 날짜 포맷터 함수 (AG Grid valueFormatter용)
// YYYYMMDD -> YYYY-MM-DD 또는 YYYY/MM/DD 형식으로 변환
export const dateFormatter = (params) => {
  if (params.value == null || params.value === '' || params.value === undefined) return '';

  const val = String(params.value).trim();

  // 이미 포맷된 경우 그대로 반환
  if (val.includes('-') || val.includes('/')) return val;

  // YYYYMMDD 형식인 경우 변환
  if (val.length === 8 && /^\d{8}$/.test(val)) {
    return `${val.substring(0, 4)}-${val.substring(4, 6)}-${val.substring(6, 8)}`;
  }

  // YYYYMM 형식인 경우 변환
  if (val.length === 6 && /^\d{6}$/.test(val)) {
    return `${val.substring(0, 4)}-${val.substring(4, 6)}`;
  }

  return val;
};

export const numberFormatter = (params) => {
  //console.log(params);
  // 값이 없거나 빈 값인 경우 0 반환
  if (params.value == null || params.value === '' || params.value === undefined) return '';

  // 문자열인 경우 공백 제거
  const cleanValue = typeof params.value === 'string' ? params.value.trim() : params.value;

  // 공백 제거 후에도 빈 값인 경우 0 반환
  if (cleanValue === '') return '';

  // 숫자로 변환 시도
  const numValue = Number(cleanValue);

  // NaN이거나 Infinity인 경우 0 반환
  if (isNaN(numValue) || !isFinite(numValue)) return '';

  // 0인 경우 마이너스 기호 없이 0 반환
  if (numValue === 0) return '';

  // 마이너스 기호를 앞에 강제로 표시
  if (numValue < 0) {
    return `-${Math.abs(numValue).toLocaleString('ko-KR')}`;
  } else {
    return numValue.toLocaleString('ko-KR');
  }
};

// 할인율 포맷터 함수
export const rateFormatter = (params) => {
  // 값이 없거나 빈 값인 경우 0.00% 반환
  if (params.value == null || params.value === '' || params.value === undefined) return '0.00%';

  // 문자열인 경우 공백 제거
  const cleanValue = typeof params.value === 'string' ? params.value.trim() : params.value;

  // 공백 제거 후에도 빈 값인 경우 0.00% 반환
  if (cleanValue === '') return '0.00%';

  // 숫자로 변환 시도
  const numValue = Number(cleanValue);

  // NaN이거나 Infinity인 경우 0.00% 반환
  if (isNaN(numValue) || !isFinite(numValue)) return '0.00%';

  return numValue.toFixed(2) + '%';
};

/**
 * ✅ 숫자에 천 단위 콤마(,)를 찍는 함수
 *
 * @param {number|string} value - 변환할 숫자 (문자열도 허용)
 * @param {number} [decimal=0] - 소수점 자릿수 (기본값 0)
 * @returns {string} - 콤마가 포함된 문자열
 *
 * @example
 * addComma(1234567);        // "1,234,567"
 * addComma("98765.4321", 2); // "98,765.43"
 * addComma(null);           // "0"
 */
export const addComma = (value, decimal = 0) => {
  if (value == null || value === "" || isNaN(value)) return "0";

  const num = Number(value);
  if (!isFinite(num)) return "0";

  return num.toLocaleString("ko-KR", {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  });
};

// 일자 데이터를 yyyy-mm-dd 형식으로 변환하는 함수 (스토어드프로시저가 이미 yyyy-mm-dd 형태로 반환)
export const formatDateToYYYYMMDD = (dateValue) => {
  // console.log('🔍 formatDateToYYYYMMDD 호출:', {
  //   입력값: dateValue,
  //   입력타입: typeof dateValue,
  //   null체크: dateValue === null,
  //   undefined체크: dateValue === undefined,
  //   빈문자열체크: dateValue === '',
  //   공백문자열체크: typeof dateValue === 'string' && dateValue.trim() === ''
  // });

  // null, undefined, 빈 문자열, 공백만 있는 문자열 처리
  if (!dateValue || (typeof dateValue === 'string' && dateValue.trim() === '')) {
    //console.log('🔍 빈 값으로 인한 빈 문자열 반환');
    return '';
  }

  try {
    // 스토어드프로시저가 이미 yyyy-mm-dd 형태로 반환하므로 직접 사용
    if (typeof dateValue === 'string') {
      const trimmedValue = dateValue.trim();
      //console.log('🔍 문자열 처리:', { 원본: dateValue, trim후: trimmedValue });

      // yyyy-mm-dd 형식인지 확인
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
        //console.log('🔍 yyyy-mm-dd 형식으로 인식, 그대로 반환:', trimmedValue);
        return trimmedValue;
      }

      // yyyymmdd 형식인 경우 (8자리 숫자) - 기존 호환성 유지
      if (trimmedValue.length === 8 && /^\d{8}$/.test(trimmedValue)) {
        const year = trimmedValue.substring(0, 4);
        const month = trimmedValue.substring(4, 6);
        const day = trimmedValue.substring(6, 8);
        const result = `${year}-${month}-${day}`;
        //console.log('🔍 yyyymmdd 형식으로 인식, 변환:', { 원본: trimmedValue, 결과: result });
        return result;
      }

      // 기타 형식은 Date 객체로 변환 시도
      const date = new Date(trimmedValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const result = `${year}-${month}-${day}`;
        //console.log('🔍 Date 객체로 변환:', { 원본: trimmedValue, 결과: result });
        return result;
      }

      //console.log('🔍 변환 실패, 빈 문자열 반환');
    }

    return '';
  } catch (error) {
    //console.error('날짜 변환 중 오류 발생:', error, '원본 값:', dateValue);
    return '';
  }
};
