# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


이 버전 조합은 React 18.x + React Router 6.x + Redux Toolkit 2.x + Vite 7 조합으로
가장 호환성이 높은 안정 구성이며,


Tab 흐름도

탭 클릭 → SideMenu 부모 메뉴 highlight 흐름
[사용자가 탭 클릭]
           │
           ▼
[handleTabChanged 호출]
           │
           ▼
[UseTabManager.handleTabChange] → activeKey 갱신
           │
           ▼
[MainFrame] currentTabeKey 갱신
           │
           ▼
[currentParentMenuId useMemo 계산]
  (currentTabeKey 기준으로 부모 메뉴 ID 찾음)
           │
           ▼
<SideMenu activeParentMenuId={currentParentMenuId} />
           │
           ▼
[SideMenu useEffect]
  activeParentMenuId 변경 감지 → selectedTopMenu 갱신
           │
           ▼
[SideMenu] 부모 메뉴 highlight 활성화 + 우측 메뉴 열기
           │
           ▼
[화면 렌더링]
  - 선택된 탭 highlight
  - 부모 메뉴 highlight
  - 우측 메뉴 표시


---- 관리자 기능 중 옮겨야 할 기능
---- 1. 사용자 등록 관리 - 사용자가 직접 회원가입은 없음.
---- 2. 메뉴 관리
---- 3. 코드 관리


------------------------------------------------------------
1. npm install
2. npm run dev
3. 브라우저에 접속 : http://localhost:5174/
4. 추가 설치
   - npm install react-chartjs-2 chart.js