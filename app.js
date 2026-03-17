// =============================================
// 사회연대기금 설문조사 — app.js
// =============================================

// ── 설정 ─────────────────────────────────────
// GAS 배포 후 여기에 URL을 입력하세요
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoo4zosnr4wX75pcW4m8Cyvi0O3y-acAJrLeYZP76mCiUlP-BRsNe9Uf4b6R3ZG-b8/exec';

// ── 상태 ─────────────────────────────────────
let currentStep = 1;
const TOTAL_STEPS = 6;

const STEP_LABELS = [
  '', // 1-indexed
  '1단계: 응답자 정보',
  '2단계: 일반현황',
  '3단계: 대출 조건 및 어려움',
  '4단계: 광명시 사회연대기금',
  '5단계: 기금 활용',
  '6단계: 동의 및 제출',
];

// ── 금융기관 대출 목록 ────────────────────────
const LOAN_INSTITUTIONS = [
  { key: 'bank', label: '① 시중은행 사회적경제기업 대출<br><span style="font-size:12px;color:#666">(기업, 산업, 국민 등)</span>' },
  { key: 'savings', label: '② 상호저축은행 사회적경제기업 대출<br><span style="font-size:12px;color:#666">(신협, 새마을 등)</span>' },
  { key: 'guarantee', label: '③ 경기신용보증재단<br><span style="font-size:12px;color:#666">(경기도사회적경제기업 특례보증)</span>' },
  { key: 'gyeonggi', label: '④ 경기도 사회적경제기금 대출' },
  { key: 'micro', label: '⑤ 서민금융진흥원<br><span style="font-size:12px;color:#666">(미소금융 사회연대금융 대출)</span>' },
  { key: 'policy', label: '⑥ 정부 정책자금<br><span style="font-size:12px;color:#666">(중소기업진흥공단, 신용보증기금 등)</span>' },
  { key: 'mutual', label: '⑦ 사회적경제연대공제기금<br><span style="font-size:12px;color:#666">(한국사회적기업중앙협의회)</span>' },
  { key: 'social', label: '⑧ 사회연대금융 중개기관 대출<br><span style="font-size:12px;color:#666">(신나는조합, 사회연대은행 등)</span>' },
  { key: 'other', label: '⑨ 기타' },
];

// ═══════════════════════════════════════
// 초기화
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildStepDots();
  buildLoanTable();
  initPercentageCalculator();
  initOtherInputs();
  initConditionalFields();
  updateProgress();
  checkForDraft();
});

// ── 단계 동그라미 ─────────────────────────────
function buildStepDots() {
  const container = document.getElementById('stepDots');
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot' + (i === 1 ? ' active' : '');
    dot.id = `dot${i}`;
    container.appendChild(dot);
  }
}

// ── 대출 테이블 동적 생성 ─────────────────────
function buildLoanTable() {
  const tbody = document.getElementById('loanTableBody');
  LOAN_INSTITUTIONS.forEach(inst => {
    const isOther = inst.key === 'other';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="">${inst.label}${isOther ? '<br><input type="text" class="form-control" id="loan_other_name" placeholder="기관명" style="margin-top:4px;font-size:12px">' : ''}</td>
      <td data-label="대출 경험">
        <div class="exp-radio-group">
          <label><input type="radio" name="loan_${inst.key}_exp" value="있다" onchange="toggleLoanDetail('${inst.key}', true)"> 있다</label>
          <label><input type="radio" name="loan_${inst.key}_exp" value="없다" onchange="toggleLoanDetail('${inst.key}', false)" checked> 없다</label>
        </div>
      </td>
      <td data-label="대출시기(년)"><input type="number" class="form-control loan-detail-input" id="loan_${inst.key}_yr"  placeholder="-" disabled min="1990" max="2030"></td>
      <td data-label="대출액(원)"><input type="number" class="form-control loan-detail-input" id="loan_${inst.key}_amt" placeholder="-" disabled></td>
      <td data-label="대출이율(%)"><input type="number" class="form-control loan-detail-input" id="loan_${inst.key}_rate" placeholder="-" disabled min="0" max="99" step="0.1"></td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleLoanDetail(key, enable) {
  ['yr', 'amt', 'rate'].forEach(field => {
    const el = document.getElementById(`loan_${key}_${field}`);
    if (el) {
      el.disabled = !enable;
      if (!enable) el.value = '';
    }
  });
}

// ═══════════════════════════════════════
// 비율 계산기 (핵심 기능)
// ═══════════════════════════════════════
const PCT_FIELDS = [
  'fund_self_pct', 'fund_invest_pct', 'fund_gov_subsidy_pct',
  'fund_policy_pct', 'fund_loan_1st_pct', 'fund_loan_2nd_pct',
  'fund_private_invest_pct', 'fund_donation_pct', 'fund_other_pct'
];

function initPercentageCalculator() {
  PCT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePctStatus);
  });
  updatePctStatus();
}

function getPercentageTotal() {
  return PCT_FIELDS.reduce((sum, id) => {
    const val = parseFloat(document.getElementById(id)?.value || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
}

function updatePctStatus() {
  const total = Math.round(getPercentageTotal() * 10) / 10;
  const bar = document.getElementById('pctStatus');
  const text = document.getElementById('pctStatusText');
  const totalEl = document.getElementById('pctTotal');
  if (totalEl) totalEl.textContent = total;

  bar.classList.remove('error', 'success', 'neutral');

  if (total === 100) {
    bar.classList.add('success');
    bar.querySelector('.status-icon').textContent = '✅';
    text.innerHTML = `<span style="color:var(--success);font-weight:700">합계 100%가 확인되었습니다. 다음 단계로 이동할 수 있습니다.</span>`;
  } else if (total > 100) {
    bar.classList.add('error');
    bar.querySelector('.status-icon').textContent = '⚠️';
    text.innerHTML = `현재 합계 <strong>${total}%</strong> — <span style="color:var(--danger)">${Math.round((total - 100) * 10) / 10}%를 줄여주세요.</span>`;
  } else if (total > 0) {
    bar.classList.add('error');
    bar.querySelector('.status-icon').textContent = '⚠️';
    text.innerHTML = `현재 합계 <strong>${total}%</strong> — <span style="color:var(--danger)">남은 비율 ${Math.round((100 - total) * 10) / 10}%를 더 채워주세요.</span>`;
  } else {
    bar.classList.add('neutral');
    bar.querySelector('.status-icon').textContent = 'ℹ️';
    text.innerHTML = `각 항목에 비율(%)을 입력하세요. 합계: <strong id="pctTotal">${total}</strong>%`;
  }
}

// ═══════════════════════════════════════
// 기타 입력 show/hide
// ═══════════════════════════════════════
function initOtherInputs() {
  const pairs = [
    ['orgTypeOther', 'orgTypeOtherWrap'],
    ['sectorOther', 'sectorOtherWrap'],
    ['loanPurposeOther', 'loanPurposeOtherWrap'],
    ['totalLoanAmtOther', 'totalLoanAmtOtherWrap'],
    ['loanRepaymentOther', 'loanRepaymentOtherWrap'],
    ['fundDiffOther', 'fundDiffOtherWrap'],
    ['loanDissatisfactionOther', 'loanDissatisfactionOtherWrap'],
    ['futureFundPlanOther', 'futureFundPlanOtherWrap'],
    ['fundNeededTimingOther', 'fundNeededTimingOtherWrap'],
    ['solidarityNeedReasonOther', 'solidarityNeedReasonOtherWrap'],
    ['solidarityOperationOther', 'solidarityOperationOtherWrap'],
    ['fundImportantFactorOther', 'fundImportantFactorOtherWrap'],
    ['fundPurposeOther', 'fundPurposeOtherWrap'],
    ['fundExpectedAmtOther', 'fundExpectedAmtOtherWrap'],
  ];
  pairs.forEach(([triggerId, wrapId]) => {
    const trigger = document.getElementById(triggerId);
    const wrap = document.getElementById(wrapId);
    if (!trigger || !wrap) return;
    trigger.addEventListener('change', () => {
      wrap.classList.toggle('visible', trigger.checked || trigger.value === '기타');
    });
  });
}

// ═══════════════════════════════════════
// 조건부 필드
// ═══════════════════════════════════════
function initConditionalFields() {
  // 대출 조건 불만족 시 8-1 표시
  document.querySelectorAll('input[name="loan_satisfaction"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const show = ['불만족', '매우 불만족'].includes(radio.value) && radio.checked;
      const group = document.getElementById('loanDissatisfactionGroup');
      if (group) group.style.display = show ? 'block' : 'none';
    });
  });

  // 사회연대기금 보완 역할 긍정 시 4-1 표시
  document.querySelectorAll('input[name="solidarity_complement"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const show = ['매우 그렇다', '그렇다', '보통이다'].includes(radio.value) && radio.checked;
      const group = document.getElementById('solidarityComplementReasonGroup');
      if (group) group.style.display = show ? 'block' : 'none';
    });
  });

  // 자금조달 어려움 선택 제한 (최대 2개)
  initCheckboxLimit('fund_difficulty_main', 2);

  // 사회연대기금 필요 이유 선택 제한 (최대 2개)
  initCheckboxLimit('solidarity_need_reason', 2);

  // 대출 용도 선택 제한 (최대 2개)
  initCheckboxLimit('loan_purpose', 2);

  // 주 사업분야 선택 제한 (최대 2개)
  initCheckboxLimit('business_sector', 2);



  // 사회연대기금 보완 이유 선택 제한 (최대 2개)
  initCheckboxLimit('solidarity_complement_reason', 2);

  // 사회연대기금 운영 방식 선택 제한 (최대 2개)
  initCheckboxLimit('solidarity_operation', 2);

  // 향후 자금 조달 계획 선택 제한 (최대 2개)
  initCheckboxLimit('future_fund_plan', 2);

  // 연락처 입력 제한 (숫자만)
  document.getElementById('phone').addEventListener('input', function(e) {
    this.value = this.value.replace(/\D/g, '');
  });
}

// ── 체크박스 선택 제한 함수 ─────────────────────
function initCheckboxLimit(name, max) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
      if (checked.length > max) {
        cb.checked = false;
        showAlert(`최대 ${max}개까지 선택할 수 있습니다.`, 'alertBox');
      }
    });
  });
}

// ═══════════════════════════════════════
// 멀티스텝 네비게이션
// ═══════════════════════════════════════
function updateProgress() {
  const pct = (currentStep / TOTAL_STEPS) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('stepLabel').textContent = STEP_LABELS[currentStep] || '완료';
  document.getElementById('stepCount').textContent = `${currentStep} / ${TOTAL_STEPS}`;

  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (!dot) continue;
    dot.className = 'step-dot' + (i < currentStep ? ' done' : i === currentStep ? ' active' : '');
  }

  document.querySelectorAll('.survey-step').forEach((el, idx) => {
    el.classList.toggle('active', idx + 1 === currentStep);
  });
  const step7 = document.getElementById('step7');
  if (step7) step7.classList.toggle('active', currentStep > TOTAL_STEPS);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goNext() {
  if (!validateStep(currentStep)) return;
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    updateProgress();
    saveDraft(); // keep latest position
  }
}

function goPrev() {
  if (currentStep > 1) {
    currentStep--;
    updateProgress();
    saveDraft();
  }
}

// ═══════════════════════════════════════
// 유효성 검사
// ═══════════════════════════════════════
function showAlert(msg, target) {
  const box = document.getElementById(target || 'alertBox');
  if (!box) return;
  box.innerHTML = `<div class="alert alert-danger">⚠️ ${msg}</div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => { if (box) box.innerHTML = ''; }, 5000);
}

function clearAlert() {
  const box = document.getElementById('alertBox');
  if (box) box.innerHTML = '';
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function getCheckboxValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value).join(', ');
}

function validateStep(step) {
  clearAlert();

  if (step === 1) {
    if (!document.getElementById('name')?.value.trim()) {
      showAlert('성명을 입력해 주세요.'); return false;
    }
    if (!getRadioValue('gender')) {
      showAlert('성별을 선택해 주세요.'); return false;
    }
    if (!document.getElementById('company_name')?.value.trim()) {
      showAlert('기업명을 입력해 주세요.'); return false;
    }
    if (!getRadioValue('org_type')) {
      showAlert('기업 유형을 선택해 주세요.'); return false;
    }
    if (getRadioValue('org_type') === '기타' && !document.getElementById('org_type_text')?.value.trim()) {
      showAlert('기타 기업 유형을 입력해 주세요.'); return false;
    }
  }

  if (step === 2) {
    const total = Math.round(getPercentageTotal() * 10) / 10;
    if (total !== 100) {
      showAlert(`자금조달 비율 합계가 ${total}%입니다. 정확히 100%가 되어야 합니다.`);
      return false;
    }
  }

  if (step === 6) {
    if (getRadioValue('consent_collect') !== '동의함') {
      showAlert('개인정보 수집·이용에 동의해 주세요.', 'submitAlert'); return false;
    }
  }

  return true;
}

// ── 임시저장 / 이어쓰기 ───────────────────────
const DRAFT_KEY = 'surveyDraft';

function saveDraft() {
  const draft = {
    currentStep,
    data: collectFormData()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  showAlert('임시저장되었습니다.', 'alertBox');
}

function loadDraft() {
  const str = localStorage.getItem(DRAFT_KEY);
  if (!str) return;
  try {
    const draft = JSON.parse(str);
    if (draft.data) fillFormData(draft.data);
    currentStep = draft.currentStep || 1;
    updateProgress();
    showAlert('저장된 설문을 불러왔습니다.', 'alertBox');
  } catch (e) {
    console.error('임시저장 데이터 파싱 오류', e);
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function checkForDraft() {
  if (localStorage.getItem(DRAFT_KEY)) {
    const banner = document.createElement('div');
    banner.className = 'draft-banner';
    banner.innerHTML = `
      <span>이전에 임시저장한 설문이 있습니다.</span>
      <button class="btn btn-secondary btn-sm" id="resumeBtn">이어쓰기</button>
      <button class="btn btn-secondary btn-sm" id="newBtn">새로작성</button>
    `;
    document.body.prepend(banner);
    document.getElementById('resumeBtn').addEventListener('click', () => {
      loadDraft();
      banner.remove();
    });
    document.getElementById('newBtn').addEventListener('click', () => {
      clearDraft();
      banner.remove();
    });
  }
}

function fillFormData(data) {
  // helpers
  const setRadio = (name, value) => {
    if (!value) return;
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
      if (r.value === value) {
        r.checked = true;
        r.dispatchEvent(new Event('change'));
      }
    });
  };
  const setCheckboxes = (name, valueStr) => {
    if (!valueStr) return;
    const vals = valueStr.split(',').map(s => s.trim()).filter(Boolean);
    vals.forEach(v => {
      const cb = document.querySelector(`input[name="${name}"][value="${v}"]`);
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      }
    });
  };

  // Step1
  document.getElementById('name').value = data.name || '';
  setRadio('gender', data.gender);
  setRadio('age_group', data.age_group);
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('company_name').value = data.company_name || '';
  document.getElementById('company_year').value = data.company_year || '';
  if (data.org_type) {
    if (['(예비)사회적기업','(예비)마을기업','사회적협동조합','협동조합'].includes(data.org_type)) {
      setRadio('org_type', data.org_type);
    } else {
      setRadio('org_type','기타');
      document.getElementById('org_type_text').value = data.org_type;
    }
  }
  setCheckboxes('business_sector', data.business_sector);
  document.getElementById('biz_description').value = data.biz_description || '';

  // Step2 percentages
  PCT_FIELDS.forEach(id => {
    if (data[id] !== undefined) document.getElementById(id).value = data[id];
  });
  document.getElementById('fund_other_text').value = data.fund_other_text || '';
  setRadio('fund_3yr_difficulty', data.fund_3yr_difficulty);

  // Step2 loans
  LOAN_INSTITUTIONS.forEach(inst => {
    setRadio(`loan_${inst.key}_exp`, data[`loan_${inst.key}_exp`]);
    if (data[`loan_${inst.key}_yr`]) document.getElementById(`loan_${inst.key}_yr`).value = data[`loan_${inst.key}_yr`];
    if (data[`loan_${inst.key}_amt`]) document.getElementById(`loan_${inst.key}_amt`).value = data[`loan_${inst.key}_amt`];
    if (data[`loan_${inst.key}_rate`]) document.getElementById(`loan_${inst.key}_rate`).value = data[`loan_${inst.key}_rate`];
  });
  document.getElementById('loan_other_name').value = data.loan_other_name || '';
  setCheckboxes('loan_purpose', data.loan_purpose);
  setRadio('total_loan_amount', data.total_loan_amount);

  // Step3
  setRadio('loan_repayment', data.loan_repayment);
  setCheckboxes('fund_difficulty_main', data.fund_difficulty_main);
  setRadio('loan_satisfaction', data.loan_satisfaction);
  setCheckboxes('loan_dissatisfaction_reason', data.loan_dissatisfaction_reason);
  setCheckboxes('future_fund_plan', data.future_fund_plan);
  setRadio('fund_needed_timing', data.fund_needed_timing);

  // Step4
  setRadio('finance_accessibility', data.finance_accessibility);
  setRadio('solidarity_need', data.solidarity_need);
  setCheckboxes('solidarity_need_reason', data.solidarity_need_reason);
  setRadio('solidarity_complement', data.solidarity_complement);
  setCheckboxes('solidarity_complement_reason', data.solidarity_complement_reason);
  setRadio('solidarity_impact', data.solidarity_impact);
  setCheckboxes('solidarity_operation', data.solidarity_operation);

  // Step5
  setRadio('fund_important_factor', data.fund_important_factor);
  setRadio('fund_use_willingness', data.fund_use_willingness);
  setRadio('fund_use_purpose', data.fund_use_purpose);
  setRadio('fund_expected_amount', data.fund_expected_amount);
  setRadio('fund_participation', data.fund_participation);
  setRadio('fund_contrib_amount', data.fund_contrib_amount);
  document.getElementById('free_opinion').value = data.free_opinion || '';

  // Step6
  setRadio('consent_collect', data.consent_collect);
  setRadio('consent_3rd_party', data.consent_3rd_party);

  // after filling make sure dynamic fields update
  updatePctStatus();
  initOtherInputs();
  initConditionalFields();
}

// ═══════════════════════════════════════
// 데이터 수집 및 제출
// ═══════════════════════════════════════
function collectFormData() {
  const data = {};

  // Step 1 — 응답자 정보
  data.name = document.getElementById('name')?.value.trim() || '';
  data.gender = getRadioValue('gender');
  data.age_group = getRadioValue('age_group');
  data.phone = document.getElementById('phone')?.value.trim() || '';
  data.email = document.getElementById('email')?.value.trim() || '';
  data.company_name = document.getElementById('company_name')?.value.trim() || '';
  data.company_year = document.getElementById('company_year')?.value || '';
  data.org_type = getRadioValue('org_type') === '기타'
    ? document.getElementById('org_type_text')?.value.trim()
    : getRadioValue('org_type');
  data.business_sector = getCheckboxValues('business_sector');
  data.biz_description = document.getElementById('biz_description')?.value.trim() || '';

  // Step 2 — 일반현황: 자금조달 비율
  PCT_FIELDS.forEach(id => { data[id] = document.getElementById(id)?.value || '0'; });
  data.fund_other_text = document.getElementById('fund_other_text')?.value.trim() || '';
  data.fund_3yr_difficulty = getRadioValue('fund_3yr_difficulty');

  // Step 2 — 대출 경험
  LOAN_INSTITUTIONS.forEach(inst => {
    data[`loan_${inst.key}_exp`] = getRadioValue(`loan_${inst.key}_exp`);
    data[`loan_${inst.key}_yr`] = document.getElementById(`loan_${inst.key}_yr`)?.value || '';
    data[`loan_${inst.key}_amt`] = document.getElementById(`loan_${inst.key}_amt`)?.value || '';
    data[`loan_${inst.key}_rate`] = document.getElementById(`loan_${inst.key}_rate`)?.value || '';
  });
  data.loan_other_name = document.getElementById('loan_other_name')?.value.trim() || '';

  // Step 2 — 대출 용도, 규모
  data.loan_purpose = getCheckboxValues('loan_purpose');
  data.total_loan_amount = getRadioValue('total_loan_amount');

  // Step 3 — 상환조건, 어려움, 만족도, 계획, 시기
  data.loan_repayment = getRadioValue('loan_repayment');
  data.fund_difficulty_main = getCheckboxValues('fund_difficulty_main');
  data.loan_satisfaction = getRadioValue('loan_satisfaction');
  data.loan_dissatisfaction_reason = getCheckboxValues('loan_dissatisfaction_reason');
  data.future_fund_plan = getCheckboxValues('future_fund_plan');
  data.fund_needed_timing = getRadioValue('fund_needed_timing');

  // Step 4 — 광명시 사회연대기금
  data.finance_accessibility = getRadioValue('finance_accessibility');
  data.solidarity_need = getRadioValue('solidarity_need');
  data.solidarity_need_reason = getCheckboxValues('solidarity_need_reason');
  data.solidarity_complement = getRadioValue('solidarity_complement');
  data.solidarity_complement_reason = getCheckboxValues('solidarity_complement_reason');
  data.solidarity_impact = getRadioValue('solidarity_impact');
  data.solidarity_operation = getCheckboxValues('solidarity_operation');

  // Step 5 — 기금 활용
  data.fund_important_factor = getRadioValue('fund_important_factor');
  data.fund_use_willingness = getRadioValue('fund_use_willingness');
  data.fund_use_purpose = getRadioValue('fund_use_purpose');
  data.fund_expected_amount = getRadioValue('fund_expected_amount');
  data.fund_participation = getRadioValue('fund_participation');
  data.fund_contrib_amount = getRadioValue('fund_contrib_amount');
  data.free_opinion = document.getElementById('free_opinion')?.value.trim() || '';

  // Step 6 — 동의
  data.consent_collect = getRadioValue('consent_collect');
  data.consent_3rd_party = getRadioValue('consent_3rd_party');

  return data;
}

async function submitForm() {
  if (!validateStep(6)) return;

  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('submitBtnText');
  btn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span> 제출 중...';

  const data = collectFormData();

  // GAS URL 미설정 시 로컬 테스트 모드
  if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
    console.log('🧪 [LOCAL TEST MODE] 제출 데이터:', data);
    await new Promise(r => setTimeout(r, 1000));
    clearDraft();
    currentStep = TOTAL_STEPS + 1;
    updateProgress();
    document.getElementById('progressFill').style.width = '100%';
    return;
  }

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
    });
    const json = await res.json();
    if (json.result === 'success') {
      clearDraft();
      currentStep = TOTAL_STEPS + 1;
      updateProgress();
      document.getElementById('progressFill').style.width = '100%';
    } else {
      throw new Error(json.error || '알 수 없는 오류');
    }
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btnText.textContent = '✅ 설문 제출하기';
    const alertEl = document.getElementById('submitAlert');
    if (alertEl) alertEl.innerHTML = `<div class="alert alert-danger">제출에 실패했습니다: ${err.message}. 잠시 후 다시 시도해 주세요.</div>`;
  }
}
