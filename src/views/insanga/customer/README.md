# 고객 관리 시스템

## 📁 폴더 구조

```
src/views/insanga/customer/
├── CustomerManage.jsx       # 메인 컴포넌트 (목록 + 검색)
├── CustomerForm.json        # 상세 폼 정의
├── ProductSearch.jsx        # 주사용제품 검색 팝업
├── BrandSearch.jsx          # 기존사용브랜드 검색 팝업
├── SkinWorrySearch.jsx      # 피부고민 검색 팝업
└── README.md                # 이 파일
```

## 🎯 주요 기능

### 1. 고객 목록 조회
- **검색 조건**
  - 검색 범위: 자점만 / 전체매장
  - 검색 조건: 고객명 / 휴대폰 / 개인자료 / 코드
  - 검색어 입력

- **조회 결과 항목**
  - 고객코드
  - 고객명
  - 휴대폰 (자동 포맷팅: 010-1234-5678)
  - 소속매장
  - 생년월일 (자동 포맷팅: YYYY-MM-DD)
  - 개인자료
  - 등록일자

### 2. 고객 상세 정보
더블클릭 시 팝업으로 상세 정보 조회

#### 기본 정보
- 고객코드 (자동 생성, 읽기 전용)
- **고객명** (필수)
- **국적** (필수, 콤보박스)
- **고객구분** (필수, 콤보박스)
- 성별 (콤보박스: 여성/남성)
- **담당사원** (필수, 콤보박스)

#### 주소 정보
- 우편번호
- 주소 (읽기 전용)
- 상세주소
- DM수신여부 (라디오: 수신/거부)

#### 생년월일 및 연령
- 생년월일 (날짜 선택)
- 생년월일구분 (라디오: 양력/음력)
- 연령대 (콤보박스: 10대~60대이상)
- 직업 (콤보박스)

#### 연락처 정보
- 휴대폰 (포맷: 010-1234-5678)
- 문자수신 (라디오: 수신/거부)
- 전화번호 (포맷: 02-1234-5678)
- 전화수신 (라디오: 수신/거부)
- 이메일
- 메일수신 (라디오: 수신/거부)

#### 제품 및 브랜드 정보
- 주사용제품 (검색 팝업)
- 기존사용브랜드 (검색 팝업)
- 피부고민 (검색 팝업)

#### 피부 및 구매 정보
- 피부상태 (콤보박스)
- 구매동기 (콤보박스)
- 메이크업정도
- 취향

#### 기타 정보
- 개인자료 (텍스트 영역)
- 등록일자 (읽기 전용)
- 최종방문일 (읽기 전용)
- 최종수정일 (읽기 전용)

### 3. 신규 등록
- 신규 버튼 클릭 시 빈 상세 화면 표시
- 필수 항목: 고객명, 국적, 고객구분, 담당사원
- 저장 시 고객코드 자동 생성

### 4. 수정
- 기존 고객 더블클릭 시 상세 정보 로드
- 수정 후 저장

### 5. 삭제
- 상세 화면에서 삭제 버튼 클릭
- 확인 메시지 후 삭제 처리

## 🔌 API 엔드포인트

Base URL: `http://192.168.25.52:9090/api/v1/domain/insanga/store/customer`

### 목록 조회
```json
{
  "action": "selectCustomerList",
  "payload": {
    "searchScope": "self",  // self: 자점만, all: 전체매장
    "searchType": "custNm",  // custNm, custHp, custData, custId
    "searchText": "검색어",
    "agentId": "매장코드"
  }
}
```

### 상세 조회
```json
{
  "action": "selectCustomerDetail",
  "payload": {
    "custId": "고객코드",
    "agentId": "매장코드"
  }
}
```

### 저장
```json
{
  "action": "saveCustomer",
  "payload": {
    "custId": "고객코드 (신규시 null)",
    "custNm": "고객명",
    "nationId": "국적코드",
    "custGbn": "고객구분코드",
    "mngStaff": "담당사원코드",
    // ... 기타 필드
    "agentId": "매장코드",
    "userId": "사용자ID"
  }
}
```

### 삭제
```json
{
  "action": "deleteCustomer",
  "payload": {
    "custId": "고객코드",
    "agentId": "매장코드"
  }
}
```

### 검색 팝업용 API

#### 주사용제품 조회
```json
{
  "action": "selectProductList",
  "payload": {
    "searchText": "검색어"
  }
}
```

#### 기존브랜드 조회
```json
{
  "action": "selectBrandList",
  "payload": {
    "searchText": "검색어"
  }
}
```

#### 피부고민 조회
```json
{
  "action": "selectSkinWorryList",
  "payload": {
    "searchText": "검색어"
  }
}
```

## 📝 유효성 검증

### 필수 입력 항목
- 고객명 (0~100자)
- 국적
- 고객구분
- 담당사원

### 형식 검증
- 휴대폰: 전화번호 형식 (10~11자리)
- 이메일: 이메일 형식 검증
- 우편번호: 6자리 숫자
- 생년월일: 날짜 형식

### 자릿수 제한
- 고객코드: 14자
- 고객명: 100자
- 휴대폰: 13자 (하이픈 포함)
- 전화번호: 13자 (하이픈 포함)
- 이메일: 100자
- 주소: 100자
- 상세주소: 100자
- 메이크업정도: 100자
- 취향: 100자
- 개인자료: 300자

## 🎨 UI/UX 특징

### VB 소스 기반 레이아웃
- VB6.0의 `Frm_SD105_I` 폼 구조를 Next.js로 마이그레이션
- 좌측 검색 패널 + 중앙 그리드 레이아웃
- 상세 정보는 모달 팝업으로 표시

### 그리드 기능
- 정렬 (Sortable)
- 필터링 (Filter)
- 크기 조절 (Resizable)
- 페이지네이션
- 더블클릭 상세 조회
- 체크박스 선택

### 모달 기능
- 변경사항 확인 (닫기 전)
- 팝업 외부 클릭 방지
- 드래그 가능

## 🔄 데이터 흐름

```
[사용자 입력] 
    ↓
[검색 조건 설정]
    ↓
[API 호출] → selectCustomerList
    ↓
[그리드 표시]
    ↓
[더블클릭] → selectCustomerDetail
    ↓
[상세 모달 표시]
    ↓
[수정/신규 입력]
    ↓
[저장 클릭] → saveCustomer
    ↓
[목록 재조회]
```

## 🛠️ 사용 기술

- **React 18+**
- **AG-Grid Community** (그리드)
- **Redux** (상태 관리)
- **Axios** (HTTP 통신)
- **Day.js** (날짜 처리)
- **CSS Modules** (스타일링)

## 📚 참고사항

### VB 소스 매핑
- `Frm_SD105_I.frm` → `CustomerManage.jsx`
- `Data_Display_Rtn()` → `fetchData()`
- `Data_Seek_Rtn()` → `handleRowDoubleClick()`
- `Data_Save_Rtn()` → `handleDetailSave()`
- `Data_Del_Rtn()` → `handleDetailDelete()`

### 코드 그룹 매핑
- S72: 국적 (nationData)
- S20: 고객구분 (custGbnData)
- S21: 직업 (jobGbnData)
- S22: 피부상태 (skinTypeData)
- S23: 구매동기 (buyReasonData)

### 하드코딩 코드
- 성별: 여성(F) / 남성(M)
- 연령대: 10대~60대이상
- 수신여부: 수신(Y) / 거부(N)
- 생년월일구분: 양력(S) / 음력(L)
- 검색범위: 자점(self) / 전체(all)

## ⚠️ 주의사항

1. **다른 파일 수정 금지**
   - `customer` 폴더 외부 파일은 수정하지 않음
   - 기존 컴포넌트는 import만 사용

2. **백엔드 API 가용**
   - 백엔드 개발 완료 상태
   - API 주소: `http://192.168.25.52:9090`

3. **유효성 검증**
   - 전화번호, 이메일, 우편번호 등 일반적인 형식 검증
   - 필수 항목 체크
   - 자릿수 제한 적용

4. **에러 처리**
   - API 호출 실패 시 에러 메시지 표시
   - 네트워크 오류 대응
   - 빈 데이터 처리

