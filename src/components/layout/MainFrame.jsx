import React, { Suspense, useState, useCallback, useMemo, memo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Tabs } from "antd";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

import Header from "./Header";
import Content from "./Content";
import Footer from "./Footer";
import SideMenu from "./SideMenu";
import routeConfig from "@/system/RoutersMap";
import { UseTabManager, DraggableTabNode } from "@/system/hook/UseTabManager";
import Properties from "@/system/Properties";
import { findPath } from "@/system/hook/CommonHook";
import { LoadingProvider, useLoading } from "@/system/hook/LoadingContext";

const NoRoute = ({ message }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "1.5rem", color: "red", flexDirection: "column" }}>
    <h1>⚠️ Error</h1>
    <p>{message}</p>
  </div>
);

const LoadingOverlayInsideContent = () => {
  const { loading } = useLoading();
  if (!loading) return null;
  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      <div className="loading-text">처리 중입니다...</div>
    </div>
  );
};

const Breadcrumbs = memo(({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <nav>
      {items.map((crumb, idx) => (
        <React.Fragment key={crumb.path || crumb.id || idx}>
          <a href={crumb.path || "#"} className="breadcrumb-item">{crumb.name}</a>
          {idx < items.length - 1 && <span className="breadcrumb-separator"> &rsaquo; </span>}
        </React.Fragment>
      ))}
    </nav>
  );
});

const MainFrame = () => {
  const menuData = useSelector((state) => state.menus.systemMenu);
  const navigate = useNavigate();
  const { tabs, activeKey, tabKeys, openTab, closeTab, getTabItems, handleTabChange, moveTab } = UseTabManager();
  const [currentTabeKey, setCurrentTabeKey] = useState(Properties.welcomePage.toLowerCase());

  // 드래그 센서 설정 (최소 드래그 거리 5px)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback(({ active, over }) => {
    if (over && active.id !== over.id) {
      moveTab(active.id, over.id);
    }
  }, [moveTab]);

  // ------------------------------
  // 현재 탭의 부모 메뉴 id 계산 (좌측 메뉴 highlight)
  const currentParentMenuId = useMemo(() => {
    if (!menuData || menuData.length === 0) return null;
    const sideMenu = menuData.find(menu => menu.slug === "sideMenu");
    if (!sideMenu) return null;

    const findParentId = (items, key) => {
      for (const item of items) {
        if (item.path?.toLowerCase() === key.toLowerCase()) return item.id;
        if (item.children) {
          const childResult = findParentId(item.children, key);
          if (childResult) return item.id;
        }
      }
      return null;
    };

    return findParentId(sideMenu.children || [], currentTabeKey);
  }, [menuData, currentTabeKey]);

  const breadcrumbs = useMemo(() => findPath(menuData, currentTabeKey) || [], [menuData, currentTabeKey]);

  const openTabed = useCallback(async (key) => {
    const returnKey = await openTab(key);
    if (returnKey !== null) setCurrentTabeKey(returnKey);
  }, [openTab]);

  const closeTabed = useCallback(async (key) => {
    const returnKey = await closeTab(key);
    if (returnKey !== null) setCurrentTabeKey(returnKey);
  }, [closeTab]);

  const handleTabChanged = useCallback(async (key) => {
    const returnKey = await handleTabChange(key);
    if (returnKey !== null) setCurrentTabeKey(returnKey);
  }, [handleTabChange]);

  // ------------------------------
  // useLogout 훅 사용

  if (!menuData || menuData.length === 0) {
    return (
      <div className="main-layout">
        <Header />
        <Content className="body">
          <div className="loading">메뉴 불러오는 중...</div>
        </Content>
        <Footer />
      </div>
    );
  }

  const LeftPanel = ({ children }) => {
    return <div className="left-panel">{children}</div>;
  };
  const ContentPanel = ({ children }) => {
    return <div className="content-panel">{children}</div>;
  };
  const RightPanel = ({ children }) => {
    return <div className="right-panel">{children}</div>;
  };

  return (
    <LoadingProvider isFull={true}>
      <div className="main-layout">
        <div className="body">
          <SideMenu
            menuData={menuData}
            openTab={openTabed}
            activeKey={currentTabeKey}
            activeParentMenuId={currentParentMenuId}
          />

          <Content style={{ position: "relative" }}>
            <Header openTab={openTabed} />
            <Suspense fallback={<LoadingOverlayInsideContent />}>
              <div className="content-body">
                {import.meta.env.VITE_IS_MDI === "Y" ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
                  >
                    <SortableContext
                      items={tabKeys}
                      strategy={horizontalListSortingStrategy}
                    >
                      <Tabs
                        type="editable-card"
                        hideAdd
                        activeKey={activeKey}
                        onChange={handleTabChanged}
                        onEdit={(targetKey, action) => {
                          if (action === "remove") closeTabed(targetKey);
                        }}
                        items={getTabItems()}
                        renderTabBar={(tabBarProps, DefaultTabBar) => (
                          <DefaultTabBar {...tabBarProps}>
                            {(node) => (
                              <DraggableTabNode
                                {...node.props}
                                key={node.key}
                                tabKey={node.key}
                              >
                                {node}
                              </DraggableTabNode>
                            )}
                          </DefaultTabBar>
                        )}
                        tabBarExtraContent={{ right: <Breadcrumbs items={breadcrumbs} /> }}
                      />
                    </SortableContext>
                  </DndContext>
                ) : (
                  <Routes>
                    {routeConfig.map(({ path, component: Component }) => (
                      <Route key={path} path={path} element={<Component />} />
                    ))}
                    <Route path="*" element={<NoRoute message="라우터 정보가 존재하지 않습니다." />} />
                  </Routes>
                )}
              </div>
            </Suspense>
          </Content>
        </div>
      </div>
    </LoadingProvider>
  );
};

export default MainFrame;
