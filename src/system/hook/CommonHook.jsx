// src/hooks/useMenuData.jsx
import { useSelector, shallowEqual, useDispatch } from "react-redux";
import { logout } from "@/system/store/redux/user";
import { systemMenuInit } from "@/system/store/redux/menu";
import { persistor } from "@/system/store/redux/store";
import Properties from "@/system/Properties";
import { useApiCallService } from "@/system/ApiCallService";
import { useState, useEffect } from "react";

/** 메뉴 데이터 가져오기 */
export const useMenuData = () =>
  useSelector((state) => state.menus.systemMenu, shallowEqual);

/** 현재 경로와 일치하는 메뉴 데이터 가져오기 */
export const useCurrentMenuData = (targetPath = window.location.pathname) => {
  const menuData = useMenuData();
  const breadcrumbs = findPath(menuData, targetPath);
  return breadcrumbs[breadcrumbs.length - 1] || null;
};

/** 문자열 첫 글자 대문자로 치환 */
export const capitalizeFirstLetter = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

/** 컴포넌트에서 JSX로 감싸는 경우 */
export const useFirstStrUpper = ({ string }) => <h2>{capitalizeFirstLetter(string)}</h2>;

/**
 * 트리 구조에서 현재 경로까지의 브레드크럼 경로 찾기
 * @param {Array} menus - 메뉴 트리
 * @param {string} targetPath - 현재 경로
 * @param {Array} parents - 상위 메뉴 누적
 * @returns {Array} 브레드크럼 배열
 */
export const findPath = (menus = [], targetPath = window.location.pathname, parents = []) => {
  for (const menu of menus) {
    const newParents = [...parents, menu];

    if (menu.path && menu.path.toLowerCase() === targetPath.toLowerCase()) {
      return newParents;
    }

    if (menu.children) {
      const found = findPath(menu.children, targetPath, newParents);
      if (found.length) return found;
    }
  }
  return [];
};

/**
 * 탭 키로 메뉴 라벨(화면명) 가져오기
 * sessionStorage의 tabs에서 현재 tabKey에 해당하는 label을 반환
 * @param {string} tabKey - 탭 키 (URL 경로)
 * @returns {string} 메뉴 라벨 (화면명)
 */
export const getTabLabel = (tabKey) => {
  if (!tabKey) return "";
  try {
    const tabs = JSON.parse(sessionStorage.getItem("tabs") || "[]");
    const tab = tabs.find((t) => t.key === tabKey || t.key === tabKey.toLowerCase());
    return tab?.label || "";
  } catch (e) {
    return "";
  }
};

/**
 * 로그아웃 훅
 * @returns {object} onLogout 함수
 */
// export const useLogout = () => {
//   const dispatch = useDispatch();
//   const { request } = useApiCallService();

//   const onLogout = async () => {
//     try {
//       const data = {
//         action: Properties.requestUrl.logout.action,
//         source: Properties.requestUrl.logout.source,
//         sourceTitle: Properties.requestUrl.logout.sourceTitle,
//         payload: {},
//       };
//       await request(Properties.requestUrl.logout.url, data, {}, "post");
//     } finally {
//       sessionStorage.clear();
//       dispatch(logout());
//       dispatch(systemMenuInit());
//       persistor.flush().then(() => persistor.purge());
//     }
//   };

//   return { onLogout };
// };

export const useLayoutWidths = (initialSidebarOpen = true, initialLeftPanelWidth = 20, initialRightPanelOpen = false, initialRightPanelWidth = 0) => {
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState(initialRightPanelOpen);
  const [centerWidth, setCenterWidth] = useState(0);

  const leftWidth = sidebarOpen ? initialLeftPanelWidth : 0;
  const rightWidth = rightPanelOpen ? initialRightPanelWidth : 0;

  useEffect(() => {
    const handleResize = () => {
      const newCenterWidth = 100 - leftWidth - rightWidth - (20 / window.innerWidth) * 100;
      setCenterWidth(newCenterWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [leftWidth, rightWidth]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleRightPanel = () => setRightPanelOpen((prev) => !prev);

  return {
    sidebarOpen,
    rightPanelOpen,
    leftWidth,
    rightWidth,
    centerWidth,
    toggleSidebar,
    toggleRightPanel,
  };
};
// export const useLayoutWidths = (
//   initialSidebarOpen = true,
//   initialLeftPanelWidth = 20, // percent
//   initialRightPanelOpen = false,
//   initialRightPanelWidth = 0 // percent
// ) => {
//   const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
//   const [rightPanelOpen, setRightPanelOpen] = useState(initialRightPanelOpen);
//   const [centerWidth, setCenterWidth] = useState(0);

//   const leftWidth = sidebarOpen ? initialLeftPanelWidth : 0;
//   const rightWidth = rightPanelOpen ? initialRightPanelWidth : 0;

//   useEffect(() => {
//     const handleResize = () => {
//       // 퍼센트 전용 계산 — 안정적으로 우측 여백 발생을 막음
//       const newCenterWidth = Math.max(0, 100 - leftWidth - rightWidth);
//       setCenterWidth(newCenterWidth);
//     };

//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, [leftWidth, rightWidth]);

//   const toggleSidebar = () => setSidebarOpen((prev) => !prev);
//   const toggleRightPanel = () => setRightPanelOpen((prev) => !prev);

//   return {
//     sidebarOpen,
//     rightPanelOpen,
//     leftWidth,
//     rightWidth,
//     centerWidth,
//     toggleSidebar,
//     toggleRightPanel,
//   };
// };

export const gridNoColumn = (options = {}) => {
  const noColumn = {
    headerName: "No.",
    valueGetter: (params) => {
      return params.node.rowIndex + 1; // (pageNo - 1) * pageSize + params.node.rowIndex + 1;
    },
    width: options.width || 80,
    cellStyle: { ...Properties.grid.centerCellStyle, fontSize: 13 },
    sortable: false,
    filter: false,
    ...(options.pinned && { pinned: options.pinned }),
  };
  return noColumn;
};
