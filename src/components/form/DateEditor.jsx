import React, { forwardRef, useState, useImperativeHandle, useRef, useEffect } from 'react';

// const DateEditor = forwardRef((props, ref) => {
//   const inputRef = useRef();
//   const [value, setValue] = useState('');

//   // 초기값 설정 (props.value는 string 혹은 null)
//   useEffect(() => {
//     if (props.value) setValue(props.value);
//   }, [props.value]);

//   useImperativeHandle(ref, () => ({
//     // Ag-Grid가 값을 가져갈 때 호출
//     getValue() {
//       return value; // yyyy-mm-dd 문자열
//     },
//     // 에디터가 열리면 포커스
//     afterGuiAttached() {
//       setTimeout(() => inputRef.current.focus(), 0);
//     }
//   }));

//   return (
//     <input
//       ref={inputRef}
//       type="date"
//       value={value}
//       onChange={(e) => setValue(e.target.value)}
//       style={{ width: '100%', boxSizing: 'border-box' }}
//     />
//   );
// });
const DateEditor = forwardRef((props, ref) => {
  const [value, setValue] = useState(props.value || '');
  const inputRef = useRef();

  useImperativeHandle(ref, () => ({
    getValue: () => value, // yyyy-mm-dd 문자열 반환
    afterGuiAttached: () => inputRef.current?.focus(),
  }));

  return (
    <input
      type="date"
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box' }}
    />
  );
});
export default DateEditor;
