// RouteGenerator.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import routeConfig from "@/system/RoutersMap"; // [{ path, name, component }] 형식
import MainFrame from "@/components/layout/MainFrame";
import Login from "@/views/Login";

// 라우터가 없을 때 표시할 에러 컴포넌트
const NoRoute = ({ message }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.5rem",
        color: "red",
        flexDirection: "column",
      }}
    >
      <h1>⚠️ Error</h1>
      <p>{message || "No routes available. Please check the configuration."}</p>
    </div>
  );
};

function RouteGenerator({ isLoggedIn, handleLogout }) {
  return (
    <Routes>
      {/* 로그인 라우트 */}
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
      />

      {/* 로그인 후: MainFrame 레이아웃 */}
      <Route
        path="/*"
        element={
          isLoggedIn ? (
            <MainFrame onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {isLoggedIn && routeConfig && routeConfig.length > 0 ? (
          routeConfig.map(({ path, component: Component, name }) => (
            <Route
              key={name}
              path={path.replace(/^\//, "")} // 절대경로 → 상대경로
              element={<Component />}
            />
          ))
        ) : (
          // routeConfig가 없으면 에러 메시지
          <Route path="*" element={<NoRoute message="라우터 정보가 존재하지 않습니다." />} />
        )}
      </Route>
    </Routes>
  );
}

export default RouteGenerator;
// function RouteGenerator({ isLoggedIn, handleLogout }) {
//     return (
//         <Routes>
//             {/* 로그인 라우트 */}
//             <Route
//                 path="/login"
//                 element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
//             />

//             {/* 로그인 후: MainFrame 레이아웃 */}
//             <Route
//                 path="/*"
//                 element={
//                     isLoggedIn ? (
//                         <MainFrame onLogout={handleLogout} />
//                     ) : (
//                         <Navigate to="/login" replace />
//                     )
//                 }
//             >
//                 {isLoggedIn &&
//                     routeConfig.map(({ path, component: Component, name }) => (
//                         <Route key={name} path={path.replace(/^\//, "")} element={<Component />} />
//                     ))}
//             </Route>
//         </Routes>
//     );
// }

// export default RouteGenerator;