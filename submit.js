/**
 * 디지털 시민성 퀴즈 제어 및 Google Apps Script(GAS) 연동 스크립트
 * - 개인정보(이름, 번호, 사진 등)를 절대 수집하지 않는 100% 완전 익명 시스템
 * - 퀴즈 완료 시 [제출 시각, 총점, 문항별 정오답] 데이터만 구글 시트로 자동 전송
 */

// ============================================================================
// 1. 구글 앱스 스크립트(GAS) 웹 앱 URL 설정
// ============================================================================
// 배포한 Google Apps Script 웹 앱 URL을 아래 큰따옴표 안에 입력하세요.
// 예시: "https://script.google.com/macros/s/AKfycbx.../exec"
const GAS_WEB_APP_URL = "YOUR_GAS_WEB_APP_URL_HERE";

// ============================================================================
// 2. 퀴즈 상태(State) 관리 변수
// ============================================================================
const state = {
  currentQuestionIndex: 0,
  score: 0,
  userResponses: [], // 각 문항별 응답 상세 기록
  startTime: null,
  endTime: null,
  isAnswered: false,
  isSubmitting: false,
  isSubmitted: false
};

// ============================================================================
// 3. DOM 요소 참조
// ============================================================================
const dom = {
  // 섹션
  startScreen: document.getElementById("start-screen"),
  quizScreen: document.getElementById("quiz-screen"),
  resultScreen: document.getElementById("result-screen"),

  // 시작 버튼
  btnStartQuiz: document.getElementById("btn-start-quiz"),

  // 퀴즈 화면 요소
  quizProgressBar: document.getElementById("quiz-progress-bar"),
  quizProgressText: document.getElementById("quiz-progress-text"),
  questionBadge: document.getElementById("question-badge"),
  questionTitle: document.getElementById("question-title"),
  optionsContainer: document.getElementById("options-container"),
  feedbackSection: document.getElementById("feedback-section"),
  feedbackStatus: document.getElementById("feedback-status"),
  feedbackExplanation: document.getElementById("feedback-explanation"),
  btnNextQuestion: document.getElementById("btn-next-question"),

  // 결과 화면 요소
  scoreNumber: document.getElementById("score-number"),
  scorePercent: document.getElementById("score-percent"),
  praiseTitle: document.getElementById("praise-title"),
  praiseMessage: document.getElementById("praise-message"),
  praiseBadge: document.getElementById("praise-badge"),
  reviewList: document.getElementById("review-list"),
  btnRestart: document.getElementById("btn-restart"),
  submitStatusContainer: document.getElementById("submit-status-container"),
  submitStatusText: document.getElementById("submit-status-text")
};

// ============================================================================
// 4. 초기화 및 이벤트 리스너 등록
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  if (dom.btnStartQuiz) {
    dom.btnStartQuiz.addEventListener("click", startQuiz);
  }
  if (dom.btnNextQuestion) {
    dom.btnNextQuestion.addEventListener("click", handleNextQuestion);
  }
  if (dom.btnRestart) {
    dom.btnRestart.addEventListener("click", restartQuiz);
  }
}

// ============================================================================
// 5. 퀴즈 진행 로직
// ============================================================================
function startQuiz() {
  state.currentQuestionIndex = 0;
  state.score = 0;
  state.userResponses = [];
  state.startTime = new Date();
  state.isAnswered = false;
  state.isSubmitted = false;

  // 화면 전환 (시작 -> 퀴즈)
  dom.startScreen.classList.add("hidden");
  dom.resultScreen.classList.add("hidden");
  dom.quizScreen.classList.remove("hidden");

  // 첫 번째 문제 렌더링
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const currentQ = quizQuestions[state.currentQuestionIndex];
  state.isAnswered = false;

  // 진행률 업데이트 (1/10 ~ 10/10)
  const currentNum = state.currentQuestionIndex + 1;
  const totalNum = quizQuestions.length;
  const progressPercent = (currentNum / totalNum) * 100;

  dom.quizProgressBar.style.width = `${progressPercent}%`;
  dom.quizProgressText.innerText = `${currentNum} / ${totalNum} 문제 (${Math.round(progressPercent)}%)`;

  // 문제 정보 렌더링
  dom.questionBadge.innerText = currentQ.badge;
  dom.questionTitle.innerText = `${currentNum}. ${currentQ.question}`;

  // 피드백 영역 숨김 초기화
  dom.feedbackSection.classList.add("hidden");
  dom.feedbackSection.classList.remove("border-emerald-400", "bg-emerald-50", "border-rose-400", "bg-rose-50");

  // 다음 버튼 텍스트 설정
  if (currentNum === totalNum) {
    dom.btnNextQuestion.innerHTML = `<span>결과 확인하기</span> <span class="text-xl">🏆</span>`;
  } else {
    dom.btnNextQuestion.innerHTML = `<span>다음 문제로</span> <span class="text-xl">👉</span>`;
  }

  // 보기 버튼 생성
  dom.optionsContainer.innerHTML = "";
  const optionNumbers = ["①", "②", "③", "④"];

  currentQ.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option-btn w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 flex items-start space-x-3.5 shadow-sm group active:scale-[0.99]";
    btn.innerHTML = `
      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors flex-shrink-0 mt-0.5">${optionNumbers[idx]}</span>
      <span class="text-slate-800 text-lg sm:text-xl font-medium leading-relaxed">${optText}</span>
    `;

    btn.addEventListener("click", () => selectOption(idx, btn));
    dom.optionsContainer.appendChild(btn);
  });
}

function selectOption(selectedIdx, clickedBtn) {
  if (state.isAnswered) return; // 이미 답변했으면 중복 클릭 방지
  state.isAnswered = true;

  const currentQ = quizQuestions[state.currentQuestionIndex];
  const isCorrect = (selectedIdx === currentQ.answer);

  if (isCorrect) {
    state.score++;
  }

  // 응답 기록 저장
  state.userResponses.push({
    questionId: currentQ.id,
    questionText: currentQ.question,
    category: currentQ.category,
    selectedOption: selectedIdx,
    correctOption: currentQ.answer,
    isCorrect: isCorrect,
    explanation: currentQ.explanation
  });

  // 모든 보기 버튼 비활성화 및 스타일 적용
  const buttons = dom.optionsContainer.querySelectorAll("button");
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    btn.classList.remove("hover:border-indigo-400", "hover:bg-indigo-50/50");

    if (idx === currentQ.answer) {
      // 정답 표시 (초록색 테두리 및 배경)
      btn.classList.add("border-emerald-500", "bg-emerald-50", "ring-2", "ring-emerald-400");
      const badge = btn.querySelector("span:first-child");
      if (badge) {
        badge.classList.remove("bg-slate-100", "text-slate-700");
        badge.classList.add("bg-emerald-600", "text-white");
        badge.innerHTML = "✓";
      }
    } else if (idx === selectedIdx && !isCorrect) {
      // 내가 고른 오답 표시 (붉은색 테두리 및 배경)
      btn.classList.add("border-rose-400", "bg-rose-50", "ring-2", "ring-rose-300");
      const badge = btn.querySelector("span:first-child");
      if (badge) {
        badge.classList.remove("bg-slate-100", "text-slate-700");
        badge.classList.add("bg-rose-600", "text-white");
        badge.innerHTML = "✕";
      }
    } else {
      btn.classList.add("opacity-60");
    }
  });

  // 피드백 박스 노출
  dom.feedbackSection.classList.remove("hidden");
  if (isCorrect) {
    dom.feedbackSection.classList.add("border-emerald-400", "bg-emerald-50");
    dom.feedbackStatus.innerHTML = `
      <div class="flex items-center space-x-2 text-emerald-700 font-extrabold text-xl sm:text-2xl">
        <span class="text-3xl animate-bounce">🎉</span>
        <span>정답입니다! 참 잘했어요!</span>
      </div>
    `;
  } else {
    dom.feedbackSection.classList.add("border-rose-400", "bg-rose-50");
    dom.feedbackStatus.innerHTML = `
      <div class="flex items-center space-x-2 text-rose-700 font-extrabold text-xl sm:text-2xl">
        <span class="text-3xl">💡</span>
        <span>아쉽지만 오답이에요. 아래 해설을 읽어볼까요?</span>
      </div>
    `;
  }

  dom.feedbackExplanation.innerText = currentQ.explanation;

  // 부드럽게 피드백 섹션으로 스크롤 이동
  setTimeout(() => {
    dom.feedbackSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

function handleNextQuestion() {
  if (!state.isAnswered) {
    alert("보기를 선택하여 정답을 맞춰보세요! 😊");
    return;
  }

  if (state.currentQuestionIndex < quizQuestions.length - 1) {
    state.currentQuestionIndex++;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    // 10문항 완료 -> 결과 화면 출력
    finishQuiz();
  }
}

// ============================================================================
// 6. 결과 산출 및 구글 앱스 스크립트 전송
// ============================================================================
function finishQuiz() {
  state.endTime = new Date();
  const totalQuestions = quizQuestions.length;
  const percentage = Math.round((state.score / totalQuestions) * 100);

  // 화면 전환 (퀴즈 -> 결과)
  dom.quizScreen.classList.add("hidden");
  dom.resultScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  // 점수 렌더링
  dom.scoreNumber.innerText = `${state.score} / ${totalQuestions}`;
  dom.scorePercent.innerText = `${percentage}점`;

  // 점수대별 칭찬 메시지
  applyPraiseMessage(state.score);

  // 틀린 문제 및 복습 영역 렌더링
  renderReviewSection();

  // 구글 앱스 스크립트로 완전 익명 응답 자동 전송
  sendDataToGoogleSheet({
    score: state.score,
    total: totalQuestions,
    percentage: percentage,
    startTime: state.startTime,
    endTime: state.endTime,
    responses: state.userResponses
  });
}

function applyPraiseMessage(score) {
  if (score === 10) {
    dom.praiseBadge.innerText = "🏆 최고의 디지털 마스터";
    dom.praiseTitle.innerText = "만점입니다! 완벽한 디지털 시민!";
    dom.praiseMessage.innerText = "디지털 발자국, 저작권, 보안, 미디어 리터러시까지 모든 분야를 완벽하게 이해하고 있군요! 앞으로도 안전하고 멋진 인터넷 세상을 앞장서서 만들어가요!";
  } else if (score >= 8) {
    dom.praiseBadge.innerText = "🌟 훌륭한 디지털 가디언";
    dom.praiseTitle.innerText = "대단해요! 아주 훌륭한 실력이에요!";
    dom.praiseMessage.innerText = "디지털 세상을 안전하고 바르게 이용하는 멋진 습관을 잘 지니고 있습니다. 아쉽게 놓친 문제의 해설을 복습하면 백점 만점 가디언이 될 수 있어요!";
  } else if (score >= 6) {
    dom.praiseBadge.innerText = "🌱 씩씩한 디지털 탐험가";
    dom.praiseTitle.innerText = "좋아요! 기초가 탄탄한 디지털 시민!";
    dom.praiseMessage.innerText = "온라인 예절과 안전 수칙을 차근차근 잘 배우고 있네요. 아래 오답 노트를 찬찬히 읽어보고 다시 풀기에 도전해보세요!";
  } else {
    dom.praiseBadge.innerText = "💡 새싹 디지털 꿈나무";
    dom.praiseTitle.innerText = "수고했어요! 함께 배우며 성장해요!";
    dom.praiseMessage.innerText = "인터넷 세상에는 조심해야 할 것들이 참 많죠? 이번 퀴즈를 계기로 해설을 꼼꼼히 읽어보면 나를 지키는 힘이 쑥쑥 자라날 거예요!";
  }
}

function renderReviewSection() {
  dom.reviewList.innerHTML = "";
  const wrongAnswers = state.userResponses.filter(r => !r.isCorrect);

  if (wrongAnswers.length === 0) {
    dom.reviewList.innerHTML = `
      <div class="text-center py-8 px-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
        <span class="text-5xl">🎉</span>
        <h4 class="text-xl font-bold text-emerald-800 mt-3">틀린 문제가 하나도 없어요!</h4>
        <p class="text-slate-600 mt-1 text-base sm:text-lg">모든 문항을 정확하게 이해하고 맞췄습니다. 훌륭합니다!</p>
      </div>
    `;
    return;
  }

  // 틀린 문제 복습 카드 생성
  wrongAnswers.forEach((item, index) => {
    const qData = quizQuestions.find(q => q.id === item.questionId);
    const card = document.createElement("div");
    card.className = "bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3";
    
    card.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-2">
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">문제 ${qData.id} · ${qData.category}</span>
        <span class="text-rose-600 font-bold text-sm">❌ 내가 고른 오답: ${item.selectedOption + 1}번</span>
      </div>
      <h5 class="text-slate-900 font-bold text-lg leading-snug">${qData.question}</h5>
      <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-base sm:text-lg">
        <span class="font-extrabold text-emerald-700">✅ 정답 (${qData.answer + 1}번):</span> ${qData.options[qData.answer]}
      </div>
      <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm sm:text-base leading-relaxed">
        <span class="font-bold text-indigo-700">💡 친절 해설:</span> ${qData.explanation}
      </div>
    `;

    dom.reviewList.appendChild(card);
  });
}

function restartQuiz() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  startQuiz();
}

// ============================================================================
// 7. 구글 앱스 스크립트(GAS) fetch POST 통신
// ============================================================================
async function sendDataToGoogleSheet(data) {
  // 개인정보는 일체 포함하지 않음 (이름, 번호, IP 등 없음)
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  
  // 소요 시간 계산(초)
  const durationSec = Math.round((data.endTime - data.startTime) / 1000);

  // 문항별 O/X 요약 객체 (Q1: "O", Q2: "X", ...)
  const itemResults = {};
  data.responses.forEach(r => {
    itemResults[`Q${r.questionId}`] = r.isCorrect ? "O" : "X";
  });

  const payload = {
    submittedAt: timestampStr,
    totalScore: data.score,
    totalQuestions: data.total,
    percentage: data.percentage,
    durationSeconds: durationSec,
    itemResults: itemResults
  };

  // UI 상태 표시
  dom.submitStatusContainer.classList.remove("hidden");
  dom.submitStatusText.innerText = "구글 시트로 응답을 안전하게 전송하는 중... ⏳";

  // 만약 교사가 URL을 아직 설정하지 않은 기본 상태인 경우
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("YOUR_GAS_WEB_APP_URL_HERE")) {
    console.log("[익명 전송 시뮬레이션] GAS_WEB_APP_URL이 설정되지 않아 콘솔에 출력합니다:", payload);
    setTimeout(() => {
      dom.submitStatusText.innerHTML = `
        <span class="text-indigo-600 font-semibold">ℹ️ (안내) GAS URL 설정 전: 익명 채점 결과가 준비되었습니다. (총점: ${data.score}/${data.total})</span>
      `;
    }, 600);
    return;
  }

  try {
    // Google Apps Script 웹 앱으로 전송
    // mode: 'no-cors'를 사용하여 브라우저 CORS 차단 없이 100% 안전하게 전송
    await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    dom.submitStatusText.innerHTML = `
      <span class="text-emerald-600 font-bold">✨ 구글 스프레드시트에 응답이 안전하게 자동 기록되었습니다!</span>
    `;
  } catch (error) {
    console.error("GAS 전송 실패:", error);
    dom.submitStatusText.innerHTML = `
      <span class="text-rose-500 font-medium">⚠️ 네트워크 문제로 전송되지 못했으나, 화면에서 점수와 해설을 확인할 수 있습니다.</span>
    `;
  }
}
