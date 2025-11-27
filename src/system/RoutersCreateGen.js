import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const currentPath = __dirname;
const routeMapPath = path.join(currentPath, "RoutersMap.js");

const EXT_JSX = ".jsx";

const _functions = {
  posixPath: (p) => p.replace(/\\/g, "/"),

  // 지정된 디렉토리 안에서 모든 JSX 파일 찾기 (재귀)
  getJsxFiles: (dir) => {
    const result = [];
    const stack = [dir];

    while (stack.length) {
      const target = stack.pop();
      const stat = fs.statSync(target);

      if (stat.isFile() && path.extname(target) === EXT_JSX) {
        result.push(_functions.posixPath(path.normalize(target)));
      } else if (stat.isDirectory()) {
        fs.readdirSync(target).forEach((child) =>
          stack.push(path.join(target, child))
        );
      }
    }
    return result;
  },

  // 라우트 맵 파일 생성
  // 라우트 맵 파일 생성
  generateMap: () => {
    const viewsPath = path.join(currentPath, "../views");
    if (!fs.existsSync(viewsPath)) {
      console.error("❌ views 디렉토리를 찾을 수 없습니다:", viewsPath);
      return;
    }

    const jsxFiles = _functions.getJsxFiles(viewsPath);
    console.log("✅ JSX files found:", jsxFiles.length);

    let importContents = "";
    let routerContents = "";
    const namespaceMap = {}; // 네임스페이스 관리용

    jsxFiles.forEach((file) => {
      const basename = path.basename(file, EXT_JSX);
      const componentName =
        basename.charAt(0).toUpperCase() + basename.slice(1);

      // ✅ views 기준 상대경로
      const relativeFromViews = _functions.posixPath(
        path.relative(viewsPath, file)
      ); // crm/DashBoard.jsx
      const pathParts = relativeFromViews.split("/"); // ['crm','DashBoard.jsx']

      const namespace = pathParts.length > 1 ? pathParts[0] : "root";

      // ✅ import 경로 (상대)
      const relPath = _functions.posixPath(
        path.relative(path.dirname(routeMapPath), file)
      );

      // 네임스페이스 초기화
      if (!namespaceMap[namespace]) namespaceMap[namespace] = {};
      namespaceMap[namespace][componentName] = relPath;

      // 라우트 path
      const routePath =
        "/" +
        pathParts
          .map((part) => part.replace(EXT_JSX, "").toLowerCase())
          .join("/");

      routerContents += `  { path: '${routePath}', name: '${componentName}', component: ${namespace}.${componentName} },\n`;

      if (basename.toLowerCase() === "home") {
        routerContents += `  { path: '/', name: 'HomeRoot', component: ${namespace}.${componentName} },\n`;
      }
    });

    // namespace 객체 생성
    Object.keys(namespaceMap).forEach((ns) => {
      importContents += `const ${ns} = {\n`;
      Object.entries(namespaceMap[ns]).forEach(([comp, relPath]) => {
        importContents += `  ${comp}: React.lazy(() => import('${relPath}')),\n`;
      });
      importContents += `};\n\n`;
    });

    const fileContents = `import React from 'react';

${importContents}// 🚀 자동 생성된 라우트 설정
const routeConfig = [
${routerContents}];

export default routeConfig;
export { routeConfig };
`;

    fs.writeFileSync(routeMapPath, fileContents, "utf-8");
    console.log("✅ RoutersMap.js 파일이 생성되었습니다.");
  },
};

export default _functions;