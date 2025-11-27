import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

// 드래그 속도 조절 상수
const DRAG_SPEED_FACTOR = 1.5;

// Properties 임시 정의 (실제 프로젝트에서는 외부 모듈)
const Properties = {
  modal: {
    maxWidth: "100vw",
    maxHeight: "100vh",
  },
};

const FrameModal = ({
  title,
  onClose,
  children,
  width = "500px",
  height = "300px",
  closeOnOverlayClick = true, // overlay 클릭/ESC 닫기 제어
}) => {
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const dragging = useRef(false);
  const pointerIdRef = useRef(null);
  const pos = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isCentered, setIsCentered] = useState(true);

  // 드래그 및 최대화/복원 시 사용되는 원래 위치와 크기 저장
  const originalPosAndSize = useRef({
    width,
    height,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  });

  // =========================
  // ESC 키 닫기 (closeOnOverlayClick이 true일 때만)
  // =========================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && closeOnOverlayClick) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, closeOnOverlayClick]);

  // =========================
  // 모달 초기 위치 및 화면 해상도 기준 크기 조정
  // =========================
  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // px 단위인지 확인하고 변환
      const parsedWidth = parseInt(width, 10);
      const parsedHeight = parseInt(height, 10);

      const finalWidth = parsedWidth > viewportWidth ? `${viewportWidth - 20}px` : width;
      const finalHeight = parsedHeight > viewportHeight ? `${viewportHeight - 20}px` : height;

      modal.style.width = finalWidth;
      modal.style.height = finalHeight;
      modal.style.left = "50%";
      modal.style.top = "50%";
      modal.style.transform = "translate(-50%, -50%)";

      originalPosAndSize.current = {
        width: finalWidth,
        height: finalHeight,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
      setIsCentered(true);
    }
  }, [width, height]);

  // =========================
  // 드래그 이벤트
  // =========================
  useEffect(() => {
    const header = headerRef.current;
    const modal = modalRef.current;
    if (!header || !modal || isMaximized) return;

    const onPointerDown = (e) => {
      if (e.target.closest && e.target.closest(".frame-modal-controls")) return;

      dragging.current = true;
      pointerIdRef.current = e.pointerId;
      header.setPointerCapture && header.setPointerCapture(e.pointerId);

      const rect = modal.getBoundingClientRect();

      if (isCentered) {
        modal.style.transform = "none";
        modal.style.left = `${rect.left}px`;
        modal.style.top = `${rect.top}px`;
        setIsCentered(false);
      }

      pos.current = {
        x: e.clientX,
        y: e.clientY,
        left: parseFloat(modal.style.left) || rect.left,
        top: parseFloat(modal.style.top) || rect.top,
      };

      document.body.style.userSelect = "none";
      header.style.touchAction = "none";
    };

    const onPointerMove = (e) => {
      if (!dragging.current || e.pointerId !== pointerIdRef.current) return;

      const dx = e.clientX - pos.current.x;
      const dy = e.clientY - pos.current.y;

      const newLeft = pos.current.left + dx * DRAG_SPEED_FACTOR;
      const newTop = pos.current.top + dy * DRAG_SPEED_FACTOR;

      modal.style.left = `${newLeft}px`;
      modal.style.top = `${newTop}px`;

      originalPosAndSize.current.left = modal.style.left;
      originalPosAndSize.current.top = modal.style.top;
      originalPosAndSize.current.transform = "none";
    };

    const onPointerUp = (e) => {
      if (e.pointerId !== pointerIdRef.current) return;
      dragging.current = false;
      try {
        header.releasePointerCapture && header.releasePointerCapture(pointerIdRef.current);
      } catch { }
      pointerIdRef.current = null;
      document.body.style.userSelect = "auto";
      header.style.touchAction = "";
    };

    header.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    return () => {
      header.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isMaximized, isCentered]);

  // =========================
  // 최대화 / 복원
  // =========================
  const toggleMaximize = () => {
    const modal = modalRef.current;
    if (!modal) return;

    if (!isMaximized) {
      const style = window.getComputedStyle(modal);
      originalPosAndSize.current = {
        width: style.width,
        height: style.height,
        left: style.left,
        top: style.top,
        transform: isCentered ? "translate(-50%, -50%)" : "none",
      };

      modal.style.width = Properties.modal.maxWidth;
      modal.style.height = Properties.modal.maxHeight;
      modal.style.left = "50%";
      modal.style.top = "50%";
      modal.style.transform = "translate(-50%, -50%)";

      setIsCentered(true);
    } else {
      const original = originalPosAndSize.current;
      modal.style.width = original.width;
      modal.style.height = original.height;

      if (original.transform.includes("translate")) {
        modal.style.left = "50%";
        modal.style.top = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        setIsCentered(true);
      } else {
        modal.style.left = original.left;
        modal.style.top = original.top;
        modal.style.transform = "none";
        setIsCentered(false);
      }
    }

    setIsMaximized(!isMaximized);
  };

  // =========================
  // 렌더링
  // =========================
  return ReactDOM.createPortal(
    <div
      className="frame-modal-overlay"
      onClick={() => {
        if (closeOnOverlayClick) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`frame-modal-container ${isMaximized ? "maximized" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={headerRef} className="frame-modal-header">
          <span className="frame-modal-title">{title}</span>
          <div className="frame-modal-controls">
            <button
              className="frame-modal-maximize-restore"
              onClick={toggleMaximize}
              title={isMaximized ? "원위치" : "최대화"}
            >
              {isMaximized ? "⤢" : "☐"}
            </button>
            <button className="frame-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="frame-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default FrameModal;
