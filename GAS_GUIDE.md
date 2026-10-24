# 📊 구글 앱스 스크립트(GAS) 연동 가이드

초등학교 6학년 디지털 시민성 퀴즈 웹페이지와 구글 스프레드시트를 연동하는 방법입니다.  
학생들의 **개인정보는 일체 수집하지 않으며**, 오직 **[제출 시각, 총점, 맞힌 개수, 소요 시간, 각 문항별 정오답(O/X)]** 만 안전하게 자동 기록됩니다.

---

## 1단계: 구글 스프레드시트 생성 및 첫 번째 줄(헤더) 설정

1. [Google 스프레드시트](https://sheets.google.com)에서 **새 스프레드시트**를 생성합니다.
2. 1행(헤더)에 아래와 같이 열 제목을 입력합니다:

| A열 | B열 | C열 | D열 | E열 | F열 | G열 | H열 | I열 | J열 | K열 | L열 | M열 | N열 | O열 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **제출시각** | **총점** | **맞힌문항수** | **소요시간(초)** | **1번** | **2번** | **3번** | **4번** | **5번** | **6번** | **7번** | **8번** | **9번** | **10번** | **익명구분** |

---

## 2단계: Google Apps Script 코드 작성

1. 스프레드시트 상단 메뉴에서 **[확장 프로그램]** > **[Apps Script]**를 클릭합니다.
2. 기존에 적혀있는 내용을 모두 지우고, 아래의 코드를 복사하여 붙여넣습니다:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // 1번~10번 문항 정오답 결과 추출
    var items = data.itemResults || {};
    var q1  = items.Q1  || "-";
    var q2  = items.Q2  || "-";
    var q3  = items.Q3  || "-";
    var q4  = items.Q4  || "-";
    var q5  = items.Q5  || "-";
    var q6  = items.Q6  || "-";
    var q7  = items.Q7  || "-";
    var q8  = items.Q8  || "-";
    var q9  = items.Q9  || "-";
    var q10 = items.Q10 || "-";

    // 스프레드시트의 맨 아래 행에 새 데이터 추가 (완전 익명)
    sheet.appendRow([
      data.submittedAt,                   // A열: 제출시각 (예: 2026-10-24 13:40:00)
      data.percentage + "점",             // B열: 총점 (백분율)
      data.totalScore + " / " + data.totalQuestions, // C열: 맞힌 문항 수
      data.durationSeconds,               // D열: 소요시간(초)
      q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, // E~N열: 1~10번 정오답 (O 또는 X)
      "익명학생"                           // O열: 익명 확인
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 상단의 **💾 저장 (디스크 아이콘)**을 클릭합니다.

---

## 3단계: 웹 앱(Web App) 배포

1. 오른쪽 위의 파란색 **[배포]** 버튼 > **[새 배포]**를 클릭합니다.
2. 왼쪽 톱니바퀴 아이콘 옆의 **[유형 선택]** > **[웹 앱(Web App)]**을 선택합니다.
3. 설정을 다음과 같이 지정합니다:
   - **설명**: `디지털 시민성 퀴즈 채점기 v1`
   - **다음 사용자로서 실행**: **`나(내 계정)`** (선택)
   - **액세스 권한이 있는 사용자**: **`모든 사용자 (Anyone)`** 👈 **반드시 이 항목을 선택해야 학생 로그인이 필요 없습니다!**
4. **[배포]** 버튼을 클릭합니다.
5. 계정 접근 권한 승인 창이 뜨면:
   - 본인 구글 계정 선택
   - 'Google에서 확인하지 않은 앱' 경고 시 **[고급]** 클릭 > **[(프로젝트 이름)으로 이동(안전하지 않음)]** 클릭 > **[허용]** 클릭
6. 배포 완료 후 화면에 나타나는 **웹 앱 URL** (예: `https://script.google.com/macros/s/AKfycbx.../exec`)을 복사합니다.

---

## 4단계: 퀴즈 웹페이지에 URL 연결하기

1. **`submit.js`** 파일 (또는 단일 파일 `single_quiz.html`)의 12번째 줄 부근을 엽니다:
   ```javascript
   const GAS_WEB_APP_URL = "YOUR_GAS_WEB_APP_URL_HERE";
   ```
2. `"YOUR_GAS_WEB_APP_URL_HERE"` 자리에 복사한 **웹 앱 URL**을 붙여넣고 저장합니다.
   ```javascript
   const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx123456.../exec";
   ```

이제 학생들이 10문항을 모두 풀고 결과 화면을 확인하면, 구글 스프레드시트에 실시간으로 채점 데이터가 쏙쏙 누적됩니다! 🎉
