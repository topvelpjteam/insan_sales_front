import i18n from "i18next";
import { initReactI18next } from "react-i18next";

//i18n.use(initReactI18next).init({
//  resources: {
//    ko: {
//      translation: {
//        welcome: "내 앱에 오신 것을 환영합니다",
//        login: "로그인",
//        logout: "로그아웃",
//        korean: "한국어",
//        english: "영어",
//      },
//    },
//    en: {
//      translation: {
//        welcome: "Welcome to my app",
//        login: "Login",
//        logout: "Logout",
//        korean: "Korean",
//        english: "English",
//      },
//    },
//  },
//  lng: "ko",        // ko, en, 기본 언어
//  fallbackLng: "en",  // 지원하지 않는 언어일 경우
//  interpolation: {
//    escapeValue: false, // React는 XSS 방지 내장되어 있어서 false 권장
//  },
//});
//
//export default i18n;

// 초기화만 하고 리소스는 빈 객체
i18n
  .use(initReactI18next)
  .init({
    lng: 'ko', // 초기 언어
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    resources: {}, // 초기에는 빈 객체
  });

/**
 * API로 언어 데이터를 가져와 i18n에 추가하고 언어 변경
 * @param {string} lng - 언어 코드 ('ko', 'en', ...)
 */
export const loadLanguageFromApi = async (lng) => {
  try {
    // fetch 또는 axios로 API 호출
    //    const res = await fetch(`/api/i18n/${lng}`); // 예: /api/i18n/ko
    //    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    //    const data = await res.json();

    const data = {
      en: {
        "welcome": "Welcome1",
        "logout": "Logout",
        "english": "English",
        "korean": "Korean"
      },
      ko: {
        "welcome": "환영합니다2",
        "logout": "로그아웃",
        "english": "영어",
        "korean": "한국어"
      }
    };

    // i18n에 리소스 추가 (덮어쓰기)
    i18n.addResourceBundle(lng, 'translation', data[lng], true, true);
    // 언어 변경
    await i18n.changeLanguage(lng);
  } catch (error) {
    console.error(`언어 로드 실패: ${lng}`, error);
  }
};

export default i18n;