const Properties = {
  CONSTANTS: {
    CURRENT_MENU: 'currentMenu',
    MAX_TAP: 10,
    //LAYOUT_LEFT_WIDTH: 20,
    //LAYOUT_CONTENT_WIDTH: 60,
    //LAYOUT_RIGHT_WIDTH: 0,
  },
  themeType: 'mainTypeNormal.scss',
  //welcomePage: '/home/dashboard',
  //welcomePage: '/insanga/dashboard',
  welcomePage: '/insanga/main',
  //welcomePage: '/insanga/dashboard/type1',
  modal: {
    maxWidth: "100vm",
    maxHeight: "100vm",
  },
  grid: {
    default: {
      pageSize: 1000,
      pageSizeList: [1, 10, 100, 1000, 5000, 10000, 20000],
      header: { // 헤더
        height: 40, // 헤더 높이
      },
      data: { // 행
        height: 36,  // 행 높이
      },
      colDef: { // 컬럼 sort, fileter, resize, min 너비 설정
        sortable: false,
        filter: false,
        resizable: true,
        minWidth: 50,
      },
      domLayout: "normal", // normal, autoHeight
      suppressPaginationPanel: false, // 그리드 하단에 페이징 영역 표현여부 - 보임:false, 안보임: true
      pagination: true, // 페이징 기능 사용여부 
      tooltipShowDelay: 0, // 툴팁 - 0: 즉시 보임
      enableBrowserTooltips: true, // 툴팁 사용 여부
      rowSelection: "multiple", // multiple, single
      suppressRowClickSelection: true, // 클릭 시 행 선택 방지(체크박스만으로 선택)
    },
    centerCellStyle: { textAlign: "center", color: "#333" },
    leftCellStyle: { textAlign: "left", color: "#333" },
    rightCellStyle: { textAlign: "right", color: "#333" },
  },
  requestUrl: {
    login: {
      url: 'access',
      action: 'login',
      source: '/access',
      sourceTitle: '업무관리시스템 로그인',
      page: '/login'
    },
    logout: {
      url: 'access',
      action: 'logout',
      source: '/access',
      sourceTitle: '업무관리시스템 로그인',
    },
    menu: { // 관리자 메뉴
      url: 'domain/system/userMenuPermission',
      action: 'selectUserAccessMenu',
      source: '/access',
      sourceTitle: '업무관리시스템 로그인',
    },
    menuUser: {
      url: 'domain/system/menuItem',
      action: 'selectPageList',
      source: '/system/menu/menuItem',
      sourceTitle: '메뉴관리',
    },
    makeCalendar: {
      url: 'domain/common/calendar',
      action: 'makeCalendar',
      source: '/',
      sourceTitle: '업무관리시스템 로그인',
    },
    codeSystem: {
      url: 'domain/system/codeSystem',
      action: 'selectCodeNameList',
      source: '',
      sourceTitle: '',
    }
  },
};

export default Properties;
