import React, {
  createContext, useContext, useState, useCallback, useEffect
} from "react";
import Toast from "@/components/message/Toast";
import MessageModal from "@/components/message/MessageModal";
import ConfirmModal from "@/components/message/ConfirmModal";
import PopupModal from "@/components/popup/PopupModal";

const MessageContext = createContext();
const ChangedContext = createContext();

let messageHandler = null;
export const setMessageHandler = (handler) => { messageHandler = handler; };
export const getMessage = () => {
  if (!messageHandler) throw new Error("Message handler is not set.");
  return messageHandler;
};

export const ManagerProvider = ({ children }) => {
  // -------------------------
  // Toast 관리
  // -------------------------
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const startFadeOut = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
    const timeout = setTimeout(() => removeToast(id), 400);
    return () => clearTimeout(timeout);
  }, [removeToast]);

  const showToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration, isClosing: false }]);
    const timeout = setTimeout(() => startFadeOut(id), duration);
    return () => clearTimeout(timeout);
  }, [startFadeOut]);

  // -------------------------
  // Message Modal
  // -------------------------
  const [messageModal, setMessageModal] = useState(null);

  const showMessageModal = useCallback(
    ({ title, content, onCallback }) =>
      setMessageModal({ title, content, onCallback }),
    []
  );

  const hideMessageModal = useCallback(() => setMessageModal(null), []);

  // -------------------------
  // Confirm Modal
  // -------------------------
  const [confirmModal, setConfirmModal] = useState(null);
  const showConfirmModal = useCallback(
    ({ title, content, onConfirm, onCancel }) => setConfirmModal({ title, content, onConfirm, onCancel }),
    []
  );
  const hideConfirmModal = useCallback(() => setConfirmModal(null), []);

  // -------------------------
  // 키보드 이벤트 처리
  // -------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      // if (e.code !== "Space" && e.key !== " ") return;
      // e.preventDefault();

      if (toasts.length > 0) {
        toasts.forEach(t => removeToast(t.id));
        return;
      }

      if (confirmModal) {
        const active = document.activeElement;
        if (active && active.tagName === "BUTTON") {
          active.click();
        } else {
          confirmModal.onConfirm?.();
          hideConfirmModal();
        }
        return;
      }

      if (messageModal) {
        const active = document.activeElement;
        if (active && active.tagName === "BUTTON") {
          active.click();
        } else {
          messageModal.onCallback?.();
          hideMessageModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toasts, confirmModal, messageModal, removeToast, hideConfirmModal, hideMessageModal]);

  // -------------------------
  // Popup Modal
  // -------------------------
  const [popupModal, setPopupModal] = useState(null);

  const showPopupModal = useCallback(
    ({ title, component, props, width, height }) =>
      setPopupModal({ title, component, props, width, height }),
    []
  );
  const hidePopupModal = useCallback(() => setPopupModal(null), []);

  // -------------------------
  // ChangedContext 관리
  // -------------------------
  const [changedMap, setChangedMap] = useState({});

  const setChanged = useCallback((key, value) => {
    setChangedMap((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearChanged = useCallback((key) => {
    setChangedMap((prev) => {
      const newMap = { ...prev };
      delete newMap[key];
      return newMap;
    });
  }, []);

  const isChanged = useCallback((key) => !!changedMap[key], [changedMap]);

  // -------------------------
  // Message handler 등록
  // -------------------------
  useEffect(() => {
    setMessageHandler({
      showToast,
      showMessageModal, hideMessageModal,
      showConfirmModal, hideConfirmModal,
      showPopupModal, hidePopupModal
    });
  }, [showToast, showMessageModal, hideMessageModal, showConfirmModal, hideConfirmModal, showPopupModal, hidePopupModal]);

  return (
    <MessageContext.Provider value={{
      showToast,
      showMessageModal, hideMessageModal,
      showConfirmModal, hideConfirmModal,
      showPopupModal, hidePopupModal
    }}>
      <ChangedContext.Provider value={{ setChanged, clearChanged, isChanged }}>
        {children}

        {/* Toast */}
        <div className="toast-wrapper">
          {toasts.map(t => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              isClosing={t.isClosing}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </div>

        {/* Message Modal */}
        {messageModal && (
          <MessageModal
            title={messageModal.title}
            content={messageModal.content}
            onClose={hideMessageModal}
            onCallback={() => {
              messageModal.onCallback?.();
              hideMessageModal();
            }}
          />
        )}

        {/* Confirm Modal */}
        {confirmModal && (
          <ConfirmModal
            title={confirmModal.title}
            content={confirmModal.content}
            onClose={hideConfirmModal}
            onConfirm={() => {
              confirmModal.onConfirm?.();
              hideConfirmModal();
            }}
            onCancel={() => {
              confirmModal.onCancel?.();
              hideConfirmModal();
            }}
          />
        )}

        {/* Popup Modal */}
        {popupModal && (
          <PopupModal
            title={popupModal.title}
            component={popupModal.component}
            props={popupModal.props}
            width={popupModal.width}
            height={popupModal.height}
            onClose={hidePopupModal}
          />
        )}
      </ChangedContext.Provider>
    </MessageContext.Provider>
  );
};

// -------------------------
// Hooks Export
// -------------------------
export const useCustomContents = () => useContext(MessageContext);
export const useChanged = () => useContext(ChangedContext);
