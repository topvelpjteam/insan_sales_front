import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "antd";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import routeConfig from "@/system/RoutersMap";
import Properties from "@/system/Properties";
import { useCustomContents, useChanged } from "@/system/hook/ManagerProvider";
import { useMenuData, findPath } from "@/system/hook/CommonHook";

const MAX_TABS = Properties.CONSTANTS.MAX_TAP;

// 웰컴페이지 경로 (드래그 비활성화 대상)
const WELCOME_PATH = Properties.welcomePage.toLowerCase();

/**
 * 드래그 가능한 탭 아이템 컴포넌트
 * @dnd-kit/sortable을 사용하여 탭 드래그 순서 변경 지원
 * 웰컴페이지는 드래그 비활성화 (항상 첫 번째 위치 고정)
 */
export const DraggableTabNode = ({ className, tabKey, children, ...props }) => {
  const isWelcomePage = tabKey === WELCOME_PATH;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tabKey,
    disabled: isWelcomePage, // 웰컴페이지는 드래그 비활성화
  });

  const style = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: isWelcomePage ? "default" : "move",
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  return React.cloneElement(children, {
    ref: setNodeRef,
    style,
    ...attributes,
    ...(isWelcomePage ? {} : listeners), // 웰컴페이지는 드래그 리스너 제거
  });
};

export const UseTabManager = () => {
  const { isChanged } = useChanged();
  const { showMessageModal, showConfirmModal } = useCustomContents();
  const navigate = useNavigate();
  const menuData = useMenuData();

  const savedTabs = JSON.parse(sessionStorage.getItem("tabs") || "[]");
  const savedActiveKey = sessionStorage.getItem("activeKey") || "";

  const [tabs, setTabs] = useState(savedTabs);
  const [activeKey, setActiveKey] = useState(savedActiveKey);
  // 웰컴페이지는 기본 고정
  const welcomePath = Properties.welcomePage.toLowerCase();
  const [pinnedTabs, setPinnedTabs] = useState([welcomePath]);

  const prevActiveKeyRef = useRef(activeKey);
  const tabRefs = useRef({});
  const tabComponents = useRef({});

  useEffect(() => {
    prevActiveKeyRef.current = activeKey;
  }, [activeKey]);

  // 초기 탭 세팅
  useEffect(() => {
    if (tabs.length === 0 && Properties.welcomePage) {
      const welcomePath = Properties.welcomePage.toLowerCase();
      const route = routeConfig.find((r) => r.path === welcomePath);
      if (route) {
        const initialTab = { key: welcomePath, label: route.name || welcomePath };
        setTabs([initialTab]);
        setActiveKey(welcomePath);
        navigate(welcomePath, { replace: true });
      }
    }
  }, [tabs, navigate]);

  // 세션 스토리지 동기화
  useEffect(() => {
    sessionStorage.setItem(
      "tabs",
      JSON.stringify(tabs.map(({ key, label }) => ({ key, label })))
    );
    sessionStorage.setItem("activeKey", activeKey);
  }, [tabs, activeKey]);

  // 새 탭 생성
  const createTab = useCallback(
    (path) => {
      const breadcrumbs = findPath(menuData, path);
      const currentMenu = breadcrumbs[breadcrumbs.length - 1];
      return { key: path, label: currentMenu?.name || path };
    },
    [menuData]
  );

  // 탭 전환
  const handleTabChange = useCallback(
    async (targetKey) => {
      const pathLower = targetKey.toLowerCase();
      const existing = tabs.find((t) => t.key === pathLower);
      const route = routeConfig.find((r) => r.path === pathLower);

      if (!route) {
        showMessageModal({
          title: "알림",
          content: `[${targetKey}] 해당 페이지를 찾을 수 없습니다.`,
        });
        return null;
      }

      const prevKey = prevActiveKeyRef.current;
      const prevRef = tabRefs.current[prevKey];

      const proceed = async () => {
        if (!existing) setTabs((prev) => [...prev, createTab(pathLower)]);
        setActiveKey(pathLower);
        navigate(pathLower, { replace: false });
        return pathLower;
      };

      if (prevKey && isChanged(prevKey)) {
        const contentMessage = prevRef?.current
          ? "현재 탭에 저장되지 않은 변경사항이 있습니다. 저장 후 이동하시겠습니까?"
          : "이동하시겠습니까?";
        return new Promise((resolve) => {
          showConfirmModal({
            title: "확인 필요",
            content: contentMessage,
            onConfirm: async () => {
              if (prevRef?.current) await prevRef.current();
              const result = await proceed();
              resolve(result);
            },
          });
        });
      } else {
        return await proceed();
      }
    },
    [tabs, navigate, isChanged, showMessageModal, showConfirmModal, createTab]
  );

  // 탭 열기 (최대 제한 포함)
  const openTab = useCallback(
    async (path) => {
      const lower = path.toLowerCase();
      if (tabs.length >= MAX_TABS && !tabs.find((t) => t.key === lower)) {
        showMessageModal({
          title: "알림",
          content: `탭은 최대 ${MAX_TABS}개까지만 열 수 있습니다.`,
        });
        return null;
      }
      return await handleTabChange(path);
    },
    [tabs, handleTabChange, showMessageModal]
  );

  // 탭 닫기 (고정된 탭은 닫기 불가)
  const closeTab = useCallback(
    (key) => {
      const lowerKey = key.toLowerCase();
      if (pinnedTabs.includes(lowerKey)) return activeKey;

      const filtered = tabs.filter((t) => t.key !== lowerKey);
      let newActive = activeKey;

      if (filtered.length > 0) {
        newActive = filtered[filtered.length - 1].key;
        setActiveKey(newActive);
        navigate(newActive);
      }

      setTabs(filtered);
      delete tabRefs.current[lowerKey];
      delete tabComponents.current[lowerKey];

      return newActive;
    },
    [tabs, activeKey, navigate, pinnedTabs]
  );

  // 탭 고정/해제 (웰컴페이지는 항상 고정)
  const togglePin = useCallback((key) => {
    if (key === welcomePath) return; // 웰컴페이지는 고정 해제 불가
    setPinnedTabs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, [welcomePath]);

  // 탭이 닫을 수 있는지 확인 (closable 여부 = 고정되지 않은 탭)
  const isClosable = useCallback((tabKey) => {
    return !pinnedTabs.includes(tabKey);
  }, [pinnedTabs]);

  // 다른 탭 모두 닫기 (닫기 버튼이 있는 탭만 대상)
  const closeOtherTabs = useCallback((key) => {
    const lowerKey = key.toLowerCase();

    const filtered = tabs.filter(t =>
      t.key === lowerKey || !isClosable(t.key)
    );

    // 닫힌 탭들의 ref 정리
    tabs.forEach(t => {
      if (t.key !== lowerKey && isClosable(t.key)) {
        delete tabRefs.current[t.key];
        delete tabComponents.current[t.key];
      }
    });

    setTabs(filtered);
    setActiveKey(lowerKey);
    navigate(lowerKey);
  }, [tabs, isClosable, navigate]);

  // 오른쪽 탭 모두 닫기 (닫기 버튼이 있는 탭만 대상)
  const closeRightTabs = useCallback((key) => {
    const lowerKey = key.toLowerCase();
    const currentIndex = tabs.findIndex(t => t.key === lowerKey);

    if (currentIndex === -1) return;

    const filtered = tabs.filter((t, index) =>
      index <= currentIndex || !isClosable(t.key)
    );

    // 닫힌 탭들의 ref 정리
    tabs.forEach((t, index) => {
      if (index > currentIndex && isClosable(t.key)) {
        delete tabRefs.current[t.key];
        delete tabComponents.current[t.key];
      }
    });

    setTabs(filtered);
  }, [tabs, isClosable]);

  // 모든 탭 닫기 (닫기 버튼이 있는 탭만 대상)
  const closeAllTabs = useCallback(() => {
    const welcomePath = Properties.welcomePage.toLowerCase();

    const filtered = tabs.filter(t => !isClosable(t.key));

    // 닫힌 탭들의 ref 정리
    tabs.forEach(t => {
      if (isClosable(t.key)) {
        delete tabRefs.current[t.key];
        delete tabComponents.current[t.key];
      }
    });

    setTabs(filtered);
    setActiveKey(welcomePath);
    navigate(welcomePath);
  }, [tabs, isClosable, navigate]);

  // 탭 순서 변경 (드래그 앤 드롭)
  // 웰컴페이지는 항상 첫 번째 위치 고정
  const moveTab = useCallback((activeId, overId) => {
    if (activeId === overId) return;
    // 웰컴페이지는 이동 불가
    if (activeId === welcomePath) return;

    setTabs((prevTabs) => {
      const activeIndex = prevTabs.findIndex((t) => t.key === activeId);
      const overIndex = prevTabs.findIndex((t) => t.key === overId);

      if (activeIndex === -1 || overIndex === -1) return prevTabs;

      // 웰컴페이지 앞으로 이동 방지 (항상 인덱스 0 유지)
      if (overIndex === 0 && prevTabs[0]?.key === welcomePath) {
        return prevTabs;
      }

      const newTabs = [...prevTabs];
      const [movedTab] = newTabs.splice(activeIndex, 1);
      newTabs.splice(overIndex, 0, movedTab);

      return newTabs;
    });
  }, [welcomePath]);

  // 탭 키 목록 (DndContext용 sortable items)
  const tabKeys = tabs.map((t) => t.key);

  // 컨텍스트 메뉴 아이템 생성
  const getContextMenuItems = useCallback((tabKey) => {
    const pinned = pinnedTabs.includes(tabKey);
    const isWelcome = tabKey === welcomePath;
    const canClose = isClosable(tabKey);
    const currentIndex = tabs.findIndex(t => t.key === tabKey);

    // 닫기 버튼이 있는 탭(closable)만 대상으로 계산
    const hasClosableRightTabs = tabs.slice(currentIndex + 1).some(t => isClosable(t.key));
    const hasClosableOtherTabs = tabs.some(t => t.key !== tabKey && isClosable(t.key));

    return [
      {
        key: 'pin',
        label: pinned ? '고정 해제' : '탭 고정',
        disabled: isWelcome, // 웰컴페이지는 고정 해제 불가
        onClick: () => togglePin(tabKey),
      },
      {
        key: 'close',
        label: '탭 닫기',
        disabled: !canClose,
        onClick: () => closeTab(tabKey),
      },
      { type: 'divider' },
      {
        key: 'closeOthers',
        label: '다른 탭 모두 닫기',
        disabled: !hasClosableOtherTabs,
        onClick: () => closeOtherTabs(tabKey),
      },
      {
        key: 'closeRight',
        label: '오른쪽 탭 닫기',
        disabled: !hasClosableRightTabs,
        onClick: () => closeRightTabs(tabKey),
      },
      {
        key: 'closeAll',
        label: '모든 탭 닫기',
        disabled: !hasClosableOtherTabs && !canClose,
        onClick: () => closeAllTabs(),
      },
    ];
  }, [tabs, pinnedTabs, isClosable, togglePin, closeTab, closeOtherTabs, closeRightTabs, closeAllTabs]);

  // 렌더링용 탭 목록
  const getTabItems = useCallback(
    () =>
      tabs.map((tab) => {
        const route = routeConfig.find((r) => r.path === tab.key);
        if (!tabRefs.current[tab.key]) tabRefs.current[tab.key] = { current: null };
        const Comp = route?.component;
        const pinned = pinnedTabs.includes(tab.key);

        return {
          key: tab.key,
          label: (
            <Dropdown
              menu={{ items: getContextMenuItems(tab.key) }}
              trigger={['contextMenu']}
            >
              <div
                className="tab-label-wrapper"
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span>{tab.label}</span>
                <span
                  className={`tab-pin-icon ${pinned ? 'pinned' : ''}`}
                  title={pinned ? "고정 해제" : "탭 고정"}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(tab.key);
                  }}
                />
              </div>
            </Dropdown>
          ),
          closable: !pinned,
          children: Comp ? (
            <Suspense fallback={<div>Loading...</div>}>
              <Comp tabKey={tab.key} handleChangeCallback={tabRefs.current[tab.key]} />
            </Suspense>
          ) : (
            <div>Not Found</div>
          ),
        };
      }),
    [tabs, pinnedTabs, togglePin, getContextMenuItems]
  );

  return {
    tabs,
    activeKey,
    tabKeys,
    openTab,
    closeTab,
    getTabItems,
    handleTabChange,
    moveTab,
  };
};
