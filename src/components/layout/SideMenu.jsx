import React, { useState, memo, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Package,
  PieChart,
  Users,
  Settings,
  Info,
} from "lucide-react";
import Properties from "@/system/Properties";
import _ from 'lodash';

// ------------------------------
// 메뉴 항목 컴포넌트
const MenuItem = memo(({ item, openTab, activeKey, level = 0 }) => {
  const hasChildren = useMemo(() => Array.isArray(item.children) && item.children.length > 0, [item.children]);
  const [open, setOpen] = useState(false);

  const normalizePath = useCallback((path) => (path || "").toLowerCase().replace(/\/$/, ""), []);

  const hasActiveChild = useCallback(
    (menu) => {
      if (!menu.children) return false;
      return menu.children.some(
        (child) =>
          normalizePath(child.path) === normalizePath(activeKey) ||
          (child.children && hasActiveChild(child))
      );
    },
    [activeKey, normalizePath]
  );

  useEffect(() => {
    setOpen(hasActiveChild(item));
  }, [activeKey, item, hasActiveChild]);

  const handleMenuClick = useCallback(() => {
    if (_.isEmpty(item.path)) {
      return;
    }
    sessionStorage.setItem(Properties.CONSTANTS.CURRENT_MENU, JSON.stringify(item));
    if (openTab && item.path) openTab(item.path);
  }, [item, openTab]);

  const isActive = useMemo(() => normalizePath(item.path) === normalizePath(activeKey) || hasActiveChild(item), [item.path, activeKey, hasActiveChild, normalizePath]);

  return (
    <div className={`menu-item ${open ? "open" : ""}`} style={{ marginLeft: `${level * 14}px` }}>
      <div
        className={`menu-title ${isActive ? "active" : ""}`}
        onClick={() => {
          if (hasChildren) setOpen((prev) => !prev);
          else handleMenuClick();
        }}
      >
        <span className={`menu-arrow ${hasChildren ? "open" : ''}`}></span>
        <span>{item.name}</span>
        {hasChildren && <i className="ico toggle" />}
      </div>

      {hasChildren && open && (
        <div className="submenu">
          {item.children.map((child) => (
            <MenuItem
              key={child.id}
              item={child}
              openTab={openTab}
              activeKey={activeKey}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ------------------------------
// 전체 메뉴
const SideMenu = memo(({ menuData = [], openTab, activeKey, activeParentMenuId }) => {
  const sideMenuData = useMemo(() => (Array.isArray(menuData) ? menuData.filter((menu) => menu.slug === "sideMenu") : []), [menuData]);

  if (!sideMenuData.length) return <div>메뉴가 없습니다.</div>;

  const topMenus = useMemo(() => sideMenuData.flatMap((menu) => menu.children || []), [sideMenuData]);
  const [selectedTopMenu, setSelectedTopMenu] = useState(activeParentMenuId || null);
  const [rightOpen, setRightOpen] = useState(false);

  // ✅ 탭 클릭 시 부모 메뉴 highlight 동기화
  useEffect(() => {
    if (activeParentMenuId !== null) {
      setSelectedTopMenu(activeParentMenuId);
      setRightOpen(true); // 탭 클릭 시 우측 메뉴 열기
    }
  }, [activeParentMenuId]);

  const level1Children = useMemo(() => topMenus.find((menu) => menu.id === selectedTopMenu)?.children || [], [topMenus, selectedTopMenu]);

  const handleTopMenuClick = useCallback((menuId) => {
    if (selectedTopMenu === menuId) setRightOpen((prev) => !prev);
    else {
      setSelectedTopMenu(menuId);
      setRightOpen(true);
    }
  }, [selectedTopMenu]);

  const renderIcon = useCallback((iconName) => {
    const props = { size: 18, color: "#302c2cff" };
    switch (iconName) {
      case "LayoutDashboard": return <LayoutDashboard {...props} />;
      case "Box": return <Box {...props} />;
      case "ShoppingCart": return <ShoppingCart {...props} />;
      case "Package": return <Package {...props} />;
      case "PieChart": return <PieChart {...props} />;
      case "Users": return <Users {...props} />;
      case "Settings": return <Settings {...props} />;
      default: return <Info {...props} />;
    }
  }, []);

  // ------------------------------
  // 반응형 Right Menu Width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rightMenuWidth = useMemo(() => {
    if (windowWidth <= 768) return windowWidth * 0.95; // 모바일 거의 꽉 차게
    if (windowWidth <= 1024) return 260;               // 태블릿
    return 260;                                       // 데스크탑
  }, [windowWidth]);

  return (
    <div className={rightOpen ? 'menu-container active' : 'menu-container'} >
      <div className="toggle-button" onClick={() => setRightOpen((prev) => !prev)}>
        <i className="ico hamburger" />
      </div>
      {/* 좌측 메뉴 */}
      <div className="left-menu">
        <ul className="icon-menu">
          {topMenus.map((menu) => (
            <li
              key={menu.id}
              className={`icon-item ${selectedTopMenu === menu.id ? "active" : ""}`}
              onClick={() => handleTopMenuClick(menu.id)}
              title={menu.name}
            >
              <div className="link-icon">
                <i className={`ico ${renderIcon(menu.icon)}`} />
              </div>
              <span className="link-name">{menu.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 우측 메뉴 */}
      <AnimatePresence>
        {rightOpen && (
          <motion.div
            className="right-menu"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightMenuWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            {selectedTopMenu && (
              <div className="top-menu-label">
                {topMenus.find((m) => m.id === selectedTopMenu)?.name || ""}
              </div>
            )}

            {level1Children.length > 0 ? (
              level1Children.map((child) => (
                <MenuItem
                  key={child.id}
                  item={child}
                  openTab={openTab}
                  activeKey={activeKey}
                />
              ))
            ) : (
              <div className="menu-item-empty">하위 메뉴가 없습니다.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SideMenu;
