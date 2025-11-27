import React from "react";

const LoadingSpinner = ({ text = "잠시만 기다려주세요..." }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <div className="loading-text">{text}</div>
    </div>
  );
};

export default LoadingSpinner;