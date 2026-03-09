
# Project Antigravity: 사회연대기금 설문조사 시스템 개발 명세서

## 1. 프로젝트 개요 (Overview)

본 프로젝트는 **'광명시 사회연대기금 설치 및 운용 방안'** 수립을 위한 설문조사를 디지털화하는 오픈소스 프로젝트입니다.
복잡한 금융 데이터(비율 계산, 다차원 표)를 일반 시민과 사회적경제 기업인이 쉽게 응답할 수 있도록 **인터랙티브 웹 폼**으로 구현하며, 별도의 서버 비용 없이 운용 가능한 **Serverless Architecture**를 지향합니다.

### 1.1. 핵심 목표

1. **데이터 무결성 확보:** 자금 조달 비율 합계 100% 자동 검증 시스템 도입.
2. **사용자 편의성(UX) 극대화:** 복잡한 표(Table) 형태의 질문을 모바일/PC 환경에 최적화된 UI로 변환.
3. **비용 효율성:** GitHub Pages(프론트엔드) + Google Sheets(DB) 구조로 운영 비용 '0원' 달성.

---

## 2. 유저 스토리 (User Stories)

### 2.1. 설문 참여자 (Respondent)

* 나는 기업의 자금 조달 비율을 입력할 때, 일일이 계산기를 두드리지 않고 **실시간으로 남은 비율을 확인**하고 싶다. (예: "현재 20% 입력, 80% 남음")
* 나는 대출 경험이 없는 항목은 건너뛰고, 경험이 있는 경우에만 세부 내용(금액, 금리 등)을 입력하고 싶다.
* 나는 '기타' 항목 선택 시에만 구체적인 내용을 적을 수 있는 입력창이 나타나길 원한다.
* 나는 개인정보 수집 동의 내용을 명확히 확인하고 안전하게 제출하고 싶다.

### 2.2. 관리자 (Admin)

* 나는 설문 결과가 별도의 데이터 가공 없이 **Google Sheets에 실시간으로 적재**되기를 원한다.
* 나는 비율 합계가 100%가 아니거나 필수 항목이 누락된 설문지는 아예 접수되지 않도록 원천 차단하고 싶다.

---

## 3. 시스템 아키텍처 (System Architecture)

본 프로젝트는 **JAMstack** 구조를 기반으로 합니다.

* **Frontend (User Interface):**
* **Host:** GitHub Pages
* **Stack:** HTML5, CSS3 (Bootstrap 5 또는 Tailwind CSS 권장), Vanilla JavaScript (ES6+)
* **Role:** 설문 UI 렌더링, 실시간 유효성 검사(Validation), 비동기 데이터 전송.


* **Backend (API Gateway):**
* **Service:** Google Apps Script (GAS)
* **Role:** `doPost()` 함수를 통한 JSON 데이터 수신, 데이터 정제, 시트 입력 처리.


* **Database:**
* **Storage:** Google Sheets
* **Role:** 설문 데이터 영구 저장 및 엑셀 다운로드 지원.



---

## 4. UI/UX 및 기능 명세 (Feature Specifications)

### 4.1. 핵심 기능: 자금조달 비율 100% 검증 (Interactive Logic)

**[대상 문항: 2쪽 1번]**

* **UI 구성:** 각 항목(자체수입, 보조금 등) 옆에 숫자 입력 필드(`<input type="number">`) 배치.
* **인터랙션 로직:**
1. 사용자가 입력 필드에 숫자를 입력할 때마다 (`input` 이벤트 리스너), 모든 필드의 합계($\sum$)를 계산.
2. **Status Bar 표시:** 입력창 하단 또는 상단에 고정된 상태 바를 통해 피드백 제공.
* **상태 1 (미달):** "현재 합계 20%, <span style='color:red'>남은 비율 80%</span>를 더 채워주세요."
* **상태 2 (초과):** "현재 합계 110%, <span style='color:red'>10%를 줄여주세요.</span>"
* **상태 3 (완료):** "<span style='color:green'>합계 100%가 확인되었습니다.</span>" (제출 버튼 활성화 조건)




* **제약 사항:** 합계가 정확히 100이 아니면 '다음' 단계로 이동하거나 '제출' 불가.

### 4.2. 동적 테이블: 금융기관 대출 경험

**[대상 문항: 2쪽 3번]**

* **UI 구성:**
* PC: PDF와 유사한 테이블 형태 유지.
* Mobile: 카드형 리스트로 변환 (Card View). '시중은행' 카드 클릭 시 하위 입력폼(유/무, 금액, 시기) 전개.


* **조건부 활성화:** '대출 경험 있음' 라디오 버튼 선택 시에만 [금액, 시기, 이율] `input` 태그의 `disabled` 속성 해제.

### 4.3. 복합 응답 처리 (기타 항목)

**[대상 문항: 3쪽 9번, 4쪽 6번 등]**

* 체크박스/라디오 버튼 중 '기타'를 선택하는 순간, 숨겨져 있던 텍스트 입력창(`display: none`)이 부드럽게 나타나는(`fadeIn`) 애니메이션 적용.
* 데이터 전송 시, '기타'가 체크되었으나 내용이 없으면 경고(Alert).

---

## 5. 데이터베이스 스키마 (Google Sheets Header)

Google Apps Script가 매핑할 시트의 1행 헤더 구조 예시입니다.

| Timestamp | Company_Name | Fund_Self_% | Fund_Gov_% | ... | Loan_Bank_Exp | Loan_Bank_Amt | ... | Suggestion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2024-03-XX | (주)앤티그래비티 | 40 | 60 | ... | 있음 | 5000 | ... | 기금 파이팅 |

---

## 6. 개발 로드맵 (Development Roadmap)

### Phase 1: Backend Setup (Google Ecosystem)

1. 구글 시트 생성 및 헤더 정의 (설문 문항 전체 매핑).
2. Apps Script (`code.gs`) 작성:
* `doPost(e)` 함수 구현.
* CORS(Cross-Origin Resource Sharing) 문제 해결을 위한 헤더 설정.
* 배포 및 Web App URL 생성.



### Phase 2: Frontend Structure (HTML/CSS)

1. Git Repository 생성 (`Antigravity-Survey`).
2. `index.html` 마크업: Semantic HTML 사용 (`<section>`, `<fieldset>`, `<legend>`).
3. 스타일링: 모바일 가독성을 최우선으로 한 반응형 디자인 적용.

### Phase 3: JavaScript Logic Implementation

1. **Percentage Calculator 구현:** (핵심 과제 4.1 구현).
2. **Form Validation:** 필수값 체크, 숫자 형식 체크.
3. **Fetch API 연동:** `FormData` 객체를 생성하여 GAS URL로 비동기 `POST` 전송.

### Phase 4: Testing & Deployment

1. 단위 테스트: 비율 합계 로직이 99%, 101%일 때 방어하는지 확인.
2. 통합 테스트: 실제 폼 제출 후 구글 시트에 데이터가 정확히 꽂히는지 확인.
3. GitHub Pages 배포 및 도메인 연결.

---

## 7. 기여 가이드 (Contribution)

* 이 프로젝트는 오픈소스로 공개되며, PR(Pull Request)을 통해 기능을 개선할 수 있습니다.
* `feature/percentage-logic` 브랜치에서 자금 조달 비율 계산 로직을 중점적으로 개선합니다.

---

### [부록] Apps Script 핵심 코드 (Snippet)

```javascript
// code.gs
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('Responses');
    
    // 데이터 파싱 및 저장 로직
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;
    var newRow = headers.map(function(header) {
      return header === 'timestamp' ? new Date() : e.parameter[header];
    });
    
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

```