// =============================================
// 사회연대기금 설문조사 — Google Apps Script
// code.gs
// =============================================
//
// 배포 방법:
//  1. Google Sheets 에서 확장프로그램 → Apps Script 열기
//  2. 이 코드 전체를 붙여넣기
//  3. 배포 → 새 배포 → 유형: 웹 앱 → 액세스: 모든 사용자
//  4. 발급된 URL을 app.js의 SCRIPT_URL 상수에 입력
//
// 시트 이름: '설문응답' (없으면 자동 생성)
// =============================================

var SHEET_NAME = '설문응답';

/**
 * GET 요청 — 배포 확인용 (선택)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'active', message: '사회연대기금 설문 API 작동 중' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST 요청 — 설문 데이터 수신 및 시트 저장
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // ── 데이터 파싱 ──────────────────────────────
    var rawData = e.postData ? e.postData.contents : null;
    if (!rawData) throw new Error('No POST data received');
    var data = JSON.parse(rawData);

    // ── 시트 확보 ────────────────────────────────
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupHeaders(sheet);
    }

    // ── 헤더 확인 (첫 행이 비어있으면 세팅) ────────
    if (sheet.getLastRow() === 0) setupHeaders(sheet);

    // ── 새 행 삽입 ───────────────────────────────
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;

    var newRow = headers.map(function(header) {
      if (header === 'timestamp') return new Date();
      return (data[header] !== undefined && data[header] !== null) ? data[header] : '';
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return buildResponse({ result: 'success', row: nextRow });

  } catch (err) {
    return buildResponse({ result: 'error', error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 헤더 행 초기화
 */
function setupHeaders(sheet) {
  var headers = [
    'timestamp',
    // ── 응답자 정보 (Page 1) ──
    'name',               // Q1 성명
    'gender',             // Q2 성별
    'age_group',          // Q3 연령대
    'phone',              // Q4 연락처
    'email',              // Q5 이메일
    'company_name',       // Q6 기업명
    'company_year',       // Q7 법인설립연도
    'org_type',           // Q8 인·지정 유형
    'business_sector',    // Q9 주 사업분야
    'biz_description',    // Q10 사업활동 설명
    // ── 일반현황 (Page 2) ──
    'fund_self_pct',           // Q1 자체수입(매출)%
    'fund_invest_pct',         // Q1 출자 또는 증자%
    'fund_gov_subsidy_pct',    // Q1 중앙/지방정부 보조금%
    'fund_policy_pct',         // Q1 정책자금%
    'fund_loan_1st_pct',       // Q1 제1금융권 대출%
    'fund_loan_2nd_pct',       // Q1 제2금융권 대출%
    'fund_private_invest_pct', // Q1 민간 투자%
    'fund_donation_pct',       // Q1 민간 후원·기부%
    'fund_other_pct',          // Q1 기타%
    'fund_other_text',         // Q1 기타 내용
    'fund_3yr_difficulty',     // Q2 최근 3년 자금조달 어려움 경험
    // ── 금융기관 대출 경험 (Q3 — 각 기관별) ──
    'loan_bank_exp',      'loan_bank_yr',      'loan_bank_amt',      'loan_bank_rate',
    'loan_savings_exp',   'loan_savings_yr',   'loan_savings_amt',   'loan_savings_rate',
    'loan_guarantee_exp', 'loan_guarantee_yr', 'loan_guarantee_amt', 'loan_guarantee_rate',
    'loan_gyeonggi_exp',  'loan_gyeonggi_yr',  'loan_gyeonggi_amt',  'loan_gyeonggi_rate',
    'loan_micro_exp',     'loan_micro_yr',     'loan_micro_amt',     'loan_micro_rate',
    'loan_policy_exp',    'loan_policy_yr',    'loan_policy_amt',    'loan_policy_rate',
    'loan_mutual_exp',    'loan_mutual_yr',    'loan_mutual_amt',    'loan_mutual_rate',
    'loan_social_exp',    'loan_social_yr',    'loan_social_amt',    'loan_social_rate',
    'loan_other_exp',     'loan_other_yr',     'loan_other_amt',     'loan_other_rate',
    'loan_other_name',
    // ── 대출 용도, 규모 (Q4, Q5) ──
    'loan_purpose',            // Q4 대출 용도 (복수)
    'total_loan_amount',       // Q5 전체 대출 규모
    // ── 대출 조건 및 어려움 (Page 3 Q6~Q10) ──
    'loan_repayment',              // Q6 대출금 상환 조건
    'fund_difficulty_main',        // Q7 자금조달 어려움 (복수)
    'loan_satisfaction',           // Q8 대출 조건 만족도
    'loan_dissatisfaction_reason', // Q8-1 불만족 이유
    'future_fund_plan',            // Q9 향후 자금조달 계획 (복수)
    'fund_needed_timing',          // Q10 자금 필요 시기
    // ── 광명시 사회연대기금 (Page 4) ──
    'finance_accessibility',       // Q1 금융제도 접근성
    'solidarity_need',             // Q2 사회연대기금 필요성
    'solidarity_need_reason',      // Q3 필요 이유 (복수)
    'solidarity_complement',       // Q4 보완 역할 동의
    'solidarity_complement_reason',// Q4-1 보완 가능 점 (복수)
    'solidarity_impact',           // Q5 설치 시 도움 정도
    'solidarity_operation',        // Q6 바람직한 운영 방식 (복수)
    // ── 사회연대기금 활용 (Page 5) ──
    'fund_important_factor',   // Q7 이용 시 중요 요소 (복수)
    'fund_use_willingness',    // Q8 이용 의향
    'fund_use_purpose',        // Q9 이용 목적 (복수)
    'fund_expected_amount',    // Q10 예상 자금 규모
    'fund_participation',      // Q10(2) 자조기금 참여 의향
    'fund_contrib_amount',     // Q11 출연 금액 (구간)
    'free_opinion',            // Q12 자유의견
    // ── 동의 ──
    'consent_collect',         // 개인정보 수집·이용 동의
    'consent_3rd_party'        // 개인정보 제3자 제공 동의
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 헤더 스타일
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1b4f8a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);

  // 열 너비 자동 조정 (처음 10개 정도)
  for (var i = 1; i <= Math.min(headers.length, 10); i++) {
    sheet.setColumnWidth(i, 120);
  }
}

/**
 * JSON 응답 헬퍼 (CORS 헤더 포함)
 */
function buildResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
