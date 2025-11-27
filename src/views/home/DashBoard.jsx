import { useEffect, useState, useCallback } from "react";
import { useChanged } from "@/system/hook/ManagerProvider";

const DashBoard = ({ tabKey, handleChangeCallback }) => {
  const { setChanged, clearChanged } = useChanged();
  const [name, setName] = useState("");

  // onSave 함수: 탭 이동/닫기 시 호출
  const onSave = useCallback(() => {
    console.log(`[${tabKey}] onSave 실행됨! 값: ${name}`);

    // 변경사항 초기화
    //setChanged(tabKey, false); // name의 변화 없이 강제로 변경사항 없을 처리.
    setName("");
  }, [tabKey, name]);

  // 이름 변경 시 변경 상태 처리 - 변경 체크 안 할경우는 이 부분 주석.
  useEffect(() => {
    setChanged(tabKey, name !== "");
    return () => clearChanged(tabKey);
  }, [name, setChanged, clearChanged, tabKey]);

  // onSave를 외부 ref에 할당 - 변경 체크 메세지 확인 버튼 클릭 시 아무것도 안 할거면 아래 주석.
  useEffect(() => {
    if (handleChangeCallback) {
      handleChangeCallback.current = onSave;
    }
  }, [onSave, handleChangeCallback]);

  return (
    <div>
      <label>
        Dash board:
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginLeft: 8 }}
        />
      </label>
    </div>
  );
};

export default DashBoard;