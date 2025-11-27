import React, { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMenuData, findPath } from "@/system/hook/CommonHook";

// ✅ 메뉴명 첫 글자 대문자 처리
const MenuTitle = memo(({ title }) => {
  if (!title) return <h2>알 수 없는 메뉴</h2>;
  return <h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2>;
});

// ✅ Breadcrumbs 분리
const Breadcrumbs = memo(({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="menu-navigator" aria-label="breadcrumb">
      {items.map((crumb, idx) => (
        <React.Fragment key={crumb.path || crumb.id || idx}>
          <Link to={crumb.path || "#"} className="breadcrumb-item">
            {crumb.name}
          </Link>
          {idx < items.length - 1 && (
            <span className="breadcrumb-separator"> &rsaquo; </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
});

const ContentHeader = () => {
  const menus = useMenuData();
  const breadcrumbs = useMemo(() => findPath(menus) || [], [menus]);
  const currentMenuData = breadcrumbs[breadcrumbs.length - 1];

  const isDev = import.meta.env.MODE === "development";

  // 현재 페이지 경로
  //const currentPath = window.location.pathname; // e.g., "/dashboard/home"
  //const pathParts = currentPath.split("/").filter(Boolean);
  //const fileName = pathParts.pop() || "";
  //const path = "/" + pathParts.join("/");

  // 메뉴명 최적화 계산
  const displayTitle = useMemo(() => {
    if (!currentMenuData?.name) return "Not Found";
    return isDev
      ? `[DEV] ${currentMenuData.name}`
      : currentMenuData.name;
  }, [isDev, currentMenuData?.name]);

  return (
    <div className="content-header">
      {/* 좌측: 메뉴명 */}
      <div className="menu-title">
        <MenuTitle title={displayTitle} />
      </div>

      {/* 우측: Breadcrumb 네비게이터 */}
      <Breadcrumbs items={breadcrumbs} />
    </div>
  );
};

export default memo(ContentHeader);