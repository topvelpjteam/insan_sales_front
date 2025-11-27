import Axios from 'axios';
//import { handleError } from 'vue';
//import systemInfo from '@/system/config/Config';
//import { yapUser } from '@/stores/pinia/user';
//import { storeToRefs } from 'pinia';
import _ from 'lodash';
import Properties from "@/system/Properties";
//import { useLogout } from "@/system/hook/LogoutContext";
//import { getGlobalLogout } from "@/system/LogoutManager";

const getDefaultHeader = () => {
  let token = sessionStorage.getItem('token');
  //console.log("=== token:", token);
  //const storeUser = yapUser(); // pinia
  //const {_yapUser} = storeToRefs(storeUser); // 이 구문이 있어야 store가 반응형으로 동작함.
  //const token = ""; // (_.isEmpty(_yapUser.value?.token)) ? "" : _yapUser.value?.token;
  //console.log('HTTP...token:', _yapUser.value);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json;charset=UTF-8',
    'Accept': 'application/json;charset=UTF-8'
  };
};
const getAxiosConfig = (url, data, params, method, responseType, responseEncoding) => {
  return {
    headers: getDefaultHeader(),
    baseURL: '', // import.meta.env.VITE_PROXY_URL,
    url: `/api/${url}`,
    data,
    params: new URLSearchParams(params),
    method,
    responseType,
    responseEncoding
  };
};
class HttpClient {
  constructor(options = {}) {
    this.showToast = options.showToast;
    this.showMessageModal = options.showMessageModal;
    this.showConfirmModal = options.showConfirmModal;
    this.showPopupModal = options.showPopupModal;
    this.logout = options.logout;

    //console.log('=======================================', this.logout);
    this.setAxios(new Axios.create({}));
    this.setAxiosInterceptor(this.axios);
  }
  setAxios(obj) {
    this.axios = obj;
  }
  setAxiosInterceptor(axios) {
    axios.interceptors.request.use(
      config => {
        //console.log('== axios.interceptors.request');
        return config;
      },
      //error => Promise.reject(error),
      error => Promise.reject(error instanceof Error ? error : new Error(String(error))),
    );

    axios.interceptors.response.use(
      response => {
        //console.log('axios.response.response'), response;
        //console.log('== axios.interceptors.response');
        return response;
      },
      error => {
        //console.log('== axios.interceptors.handleError');
        this.handleError(error);
        //return Promise.reject(error);
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  }

  handleError(error) {
    //console.log('===== [HTTP.ERROR] =====:');
    if (error?.response) {
      const status = error.response.status;
      let msg = '서버 오류가 발생했습니다.';
      if (error.reponse.status) {
        if (error.reponse.status === 400) {
          msg = '요청이 올바르지 않습니다. (400)';
        } else if (error.reponse.status === 401) {
          msg = '인증이 필요합니다. (401)';
        } else if (error.reponse.status === 403) {
          msg = '접근 권한이 없습니다. (403)';
        } else if (error.reponse.status === 404) {
          msg = '요청한 페이지를 찾을 수 없습니다. (404)';
        } else if (error.reponse.status === 405) {
          msg = '서버 내부 오류가 발생했습니다. (405)';
        } else if (error.reponse.status === 415) {
          msg = '서버 내부 오류가 발생했습니다. (415)';
        } else if (error.reponse.status === 500) {
          msg = '서버 내부 오류가 발생했습니다. (500)';
        } else if (error.reponse.status === 503) {
          msg = '서버 내부 오류가 발생했습니다. (503)';
        } else {
          msg = `오류가 발생했습니다. (code: ${status})`;
        }
        // ✅ showMessageModal 주입받은 경우 실행
        if (this.showMessageModal) {
          this.showMessageModal({
            title: "요청 실패",
            content: msg
          });
        } else {
          alert(msg);
        }
      }
    } else {
      if (this.showMessageModal) {
        this.showMessageModal({
          title: "네트워크 오류",
          content: "서버와 연결할 수 없습니다."
        });
      } else {
        alert('서버와 연결할 수 없습니다.');
      }
    }
  }

  call(url, data = {}, params = {}, method = 'post', responseType = 'json', responseEncoding = 'utf8') {
    try {
      //console.log('===========22222: ', this.currentData);
      let config = getAxiosConfig(url, data, params, method, responseType, responseEncoding);
      const objectMenuData = sessionStorage.getItem(Properties.CONSTANTS.CURRENT_MENU);
      if (objectMenuData) {
        const currentData = JSON.parse(objectMenuData);
        if (_.isEmpty(config.data.source)) {
          config.data.source = currentData?.path;
          config.data.sourceTitle = currentData?.name || '업무관리시스템';
          config.data.pagePathTitle = currentData?.name || '업무관리시스템';
          config.data.permission = {
            useYn: currentData?.useYn || 'N',
            readYn: currentData?.readYn || 'N',
            selectYn: currentData?.selectYn || 'N',
            saveYn: currentData?.saveYn || 'N',
            deleteYn: currentData?.deleteYn || 'N',
            downloadYn: currentData?.downloadYn || 'N'
          };
        }
      }
      return new Promise((resolve, reject) => {
        this.axios(config)
          .then(res => {
            //console.log('=====', res);
            resolve(res);

            const action = data?.action;
            // 엑셀 일때는 형태가 달라서... 어떻게 해야 할지 고민을 좀 해야 할듯..
            let resData = res?.data;
            if (action !== 'downloadList' && resData.statusCodeValue !== 200) {
              this.showMessageModal({
                title: "에러 알림",
                content: `[${resData.statusCode}] ${resData?.body}`,
                onCallback: async () => {
                  window.location.href = "/login";
                  if (resData.statusCodeValue === 401) { // "UNAUTHORIZED"
                    window.location.href = "/login";
                    // if (this.logout) {
                    //   await this.logout(); // 🔥 App의 handleLogout 실행
                    // }
                  }
                }
              });
              reject(res);
            } else {
              //window.location.href = "/login";
              resolve(res);
            }
          })
          .catch(err => {
            reject(err);
          });
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  request(url, data = {}, params = {}, method = 'post', responseType = 'json', responseEncoding = 'utf8') {
    //console.log('responseType', responseType);
    return this.call(url, data, params, method, responseType, responseEncoding);
  }

  async requestSync(url, data = {}, params = {}, method = 'post', responseType = 'json', responseEncoding = 'utf8') {
    const config = getAxiosConfig(url, data, params, method, responseType, responseEncoding);
    return await this.axios(config);
  }
}

export default HttpClient;
