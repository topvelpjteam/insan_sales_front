import React, { useEffect } from "react";

const Toast = ({ message, type = "success", isClosing, onClose }) => {
    // 클릭 시 즉시 제거
    const handleClick = () => onClose();

    return (
        <div className={`toast ${type} ${isClosing ? "fade-out" : ""}`} onClick={handleClick}>
            {message}
        </div>
    );
};

export default Toast;