import React from "react";

const ConfirmModal = ({ title, content, onClose, onConfirm }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        {title && <h3>{title}</h3>}
        <p>{content}</p>
        <div className="modal-buttons">
          <button onClick={onClose}>취소</button>
          <button onClick={onConfirm}>확인</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;