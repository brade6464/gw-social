# 광명시 사회연대기금 설문조사 시스템

광명시 사회연대기금 설치 및 운용 방안 수립을 위한 **인터랙티브 웹 설문조사** 시스템입니다.
복잡한 금융 데이터(비율 계산, 다차원 표)를 일반 시민과 사회적경제 기업인이 쉽게 응답할 수 있도록 설계되었습니다.

## 시스템 구조

```
Frontend (GitHub Pages)  →  Backend (Google Apps Script)  →  DB (Google Sheets)
  index.html / app.js          apps_script/code.gs              설문응답 시트
```

- **프론트엔드**: HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- **백엔드**: Google Apps Script (`doPost` 웹 앱)
- **데이터베이스**: Google Sheets (실시간 데이터 적재)
- **호스팅**: GitHub Pages — 서버 비용 0원

## 주요 기능

- **자금조달 비율 100% 실시간 검증** — 입력 즉시 합계 피드백, 100%가 아니면 제출 불가
- **6단계 멀티스텝 폼** — 진행률 표시, 단계별 유효성 검사
- **금융기관 대출 경험 동적 테이블** — 경험 유/무에 따라 세부 입력 필드 활성화
- **조건부 필드 표시** — '기타' 선택 시 텍스트 입력창 자동 노출
- **반응형 디자인** — 모바일/PC 환경 최적화

## 프로젝트 구조

```
├── index.html          # 설문 UI (6단계 폼)
├── style.css           # 스타일시트
├── app.js              # 프론트엔드 로직 (유효성 검사, 데이터 수집, API 전송)
├── apps_script/
│   ├── code.gs         # Google Apps Script (데이터 수신 및 시트 저장)
│   ├── appsscript.json # Apps Script 프로젝트 설정
│   └── .clasp.json     # clasp 배포 설정 (gitignore 대상)
├── SPEC.md             # 개발 명세서
└── INNOVATION_PLAN.md  # 데이터 표준화 제안서
```

## 사전 준비

### Node.js 설치

clasp CLI를 사용하려면 Node.js가 필요합니다. 설치되어 있지 않다면 아래에서 다운로드하세요.

- **Windows / macOS**: [Node.js 공식 사이트](https://nodejs.org)에서 LTS 버전 다운로드 후 설치
- **설치 확인**:

  ```bash
  node -v    # v18 이상 권장
  npm -v
  ```

### clasp CLI 설치

clasp는 Google Apps Script를 로컬에서 개발·배포할 수 있는 공식 CLI 도구입니다.

```bash
npm install -g @google/clasp
```

설치가 완료되면 다음 명령으로 정상 설치 여부를 확인합니다:

```bash
clasp --version
```

버전 번호(예: `2.4.2`)가 출력되면 정상적으로 설치된 것입니다. `clasp: command not found` 오류가 발생하면 터미널을 재시작하거나 npm 글로벌 경로가 `PATH`에 포함되어 있는지 확인하세요.

설치 후 Google 계정으로 로그인합니다:

```bash
clasp login
```

> 브라우저가 열리면 Google 계정을 선택하고 권한을 허용하세요.

만약 Apps Script API가 비활성화되어 있다면 아래 페이지에서 활성화해야 합니다:

> <https://script.google.com/home/usersettings> → **Google Apps Script API** → **켜기**

## 구현 방법

### 1단계: Google Sheets + Apps Script 프로젝트 생성 (clasp)

clasp를 사용하면 스프레드시트와 Apps Script 프로젝트를 **한 번에** 생성할 수 있습니다.

```bash
cd apps_script
clasp create --type sheets --title "설문응답 제목 입력"
```

이 명령은 다음을 자동으로 수행합니다:

- Google Sheets 스프레드시트 생성 ("설문응답 제목 입력" 부분을 원하는 제목으로 바꿔주세요.)
- 해당 시트에 바인딩된 Apps Script 프로젝트 생성
- `.clasp.json` 파일에 프로젝트 ID 저장

생성된 스프레드시트는 Google Drive에서 확인할 수 있습니다.

### 2단계: Apps Script 코드 업로드

`apps_script/` 폴더의 코드를 Google에 업로드합니다.

```bash
clasp push
```

### 3단계: 웹 앱 배포 (최초 1회 — 브라우저에서 수동 설정)

`clasp deploy`는 버전 배포만 생성하며 **웹 앱으로 자동 설정되지 않습니다.**
최초 배포는 Apps Script 콘솔에서 직접 설정해야 합니다.

Apps Script 에디터를 브라우저에서 엽니다. `apps_script/.clasp.json` 파일의 `scriptId` 값을 확인한 후 아래 URL로 접속합니다:

```text
https://script.google.com/home/projects/<SCRIPT_ID>/edit
```

> `<SCRIPT_ID>`는 `.clasp.json`의 `"scriptId"` 값으로 대체하세요.

브라우저에서 다음 순서로 진행합니다:

1. **배포 → 새 배포** 클릭
2. 유형 선택: **웹 앱**
3. 설명: `설문조사 API v1`
4. 실행 사용자: **나** (Me)
5. 액세스 권한: **모든 사용자** (Anyone)
6. **배포** 클릭

배포가 완료되면 **웹 앱 URL**이 표시됩니다. 이 URL을 복사해 두세요.
형식: `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

### 4단계: 프론트엔드 설정

`app.js` 파일의 `SCRIPT_URL` 상수에 위에서 확인한 웹 앱 URL을 입력합니다:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

> `SCRIPT_URL`을 설정하지 않으면 **로컬 테스트 모드**로 동작합니다 (콘솔에 데이터 출력).

### 5단계: 프론트엔드 배포

#### GitHub Pages 배포

1. GitHub 저장소에 코드를 push합니다.
2. **Settings → Pages → Source**에서 배포 브랜치를 선택합니다.
3. 발급된 URL로 설문에 접속할 수 있습니다.

#### 로컬 테스트

별도의 빌드 과정 없이 `index.html`을 브라우저에서 직접 열어 테스트할 수 있습니다.
VS Code 사용 시 **Live Server** 확장을 사용하면 편리합니다.

### 6단계: 검증

- 자금조달 비율 합계가 99%, 101%일 때 제출이 차단되는지 확인
- 실제 폼 제출 후 Google Sheets에 데이터가 정확히 기록되는지 확인
- 모바일/PC 환경에서 반응형 레이아웃이 정상 동작하는지 확인

## Apps Script 코드 업데이트

코드 수정 후 재배포가 필요할 때:

```bash
cd apps_script

# 변경 사항 업로드
clasp push
```

업로드 후 [Apps Script 콘솔](https://script.google.com)에서:

1. **배포 → 배포 관리** 클릭
2. 기존 웹 앱 배포의 **편집(✏️)** 아이콘 클릭
3. 버전을 **새 버전**으로 변경
4. **배포** 클릭

> 기존 웹 앱 URL은 그대로 유지됩니다.

스프레드시트나 Apps Script 에디터를 브라우저에서 직접 열고 싶다면 `apps_script/.clasp.json`의 ID를 사용합니다:

```text
# Apps Script 에디터
https://script.google.com/home/projects/<scriptId>/edit

# 연결된 Google Sheets
https://docs.google.com/spreadsheets/d/<parentId>/edit
```

## 설문 구성 (6단계)

| 단계 | 내용 | 주요 항목 |
| ------ | ------ | ----------- |
| 1단계 | 기본 정보 | 성명, 성별, 연령대, 직위, 근무지, 기업유형, 매출, 사업분야 |
| 2단계 | 자금 조달 | 조달 비율(100% 검증), 대출 경험, 필요 자금 규모 |
| 3단계 | 조달 어려움 | 주요 어려움, 필요한 도움, 사업 성과 평가 |
| 4단계 | 사회연대기금 | 인지도, 필요성, 신뢰도, 영향, 선호 지원 형태 |
| 5단계 | 기금 활용 | 활용 장벽, 사용 목적, 참여 의향, 자유 의견 |
| 6단계 | 동의 및 제출 | 개인정보 수집·이용 동의, 최종 제출 |
