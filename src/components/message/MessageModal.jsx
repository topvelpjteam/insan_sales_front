import React from "react";

const MessageModal = ({ title, content, onClose, onCallback }) => {
  const handleClick = () => {
    onCallback?.(); // 콜백 실행
    onClose?.();    // 모달 닫기
  };
  return (
    <div className="modal-backdrop">
      <div className="modal">
        {title && <h3>{title}</h3>}
        <p>{content}</p>
        <div className="modal-buttons">
          <button onClick={handleClick}>확인</button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;