import { Modal } from "antd";

const PopupModal = ({
  title,
  component: Component,   // ✅ 컴포넌트 받기
  props = {},             // ✅ 컴포넌트에 전달할 props
  width = 800,
  height = 600,
  onClose
}) => {
  return (
    <Modal
      open={true}
      title={
        <div
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#2c3e50",       // ✅ 모던한 다크 블루/그레이 톤
            letterSpacing: "0.5px",
          }}
        >
          {title || "상세 보기"}
        </div >
      }
      onCancel={onClose}
      footer={null}
      centered
      width={width}
      className="custom-popup-modal"
    >
      {Component ? <Component {...props} /> : null}
    </Modal >
  );
};

export default PopupModal;