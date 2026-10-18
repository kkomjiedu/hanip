# 한입씩 (HANIP) 작업 규칙

이 저장소에서 일하는 사람과 AI가 지킬 규칙이다. 기획 기준은 [한입씩 서비스 기획서](https://claude.ai/code/artifact/69ac4a26-c482-4199-9347-2bca819aa1f6), 화면 기준은 [Design 캔버스](https://claude.ai/artifact/S6XmAUKiunvuonzCD53Fph)다. 둘과 이 파일이 다르면 작업을 멈추고 사용자에게 묻는다.

## 1. 브랜드

| 항목 | 값 |
| --- | --- |
| 이름 | 한입씩 (HANIP) |
| 슬로건 | 첫 숟가락부터 온 가족 식탁까지 |
| 보조 문구 | 오늘도 맛있게 한입씩. |
| 운영 | 위시버니 |
| 말투 | 짧고 다정한 존댓말("~해요"). 불안을 키우는 표현, 명령조, 과장 금지 |
| 색 | Milk #FBF8F2(배경) · Butter #F6EBD0 · Sage #9DBE92 · Deep Sage #5F7A5C(버튼·선택) · Apricot #E9A58C · Rose #EFCFCB · Mist #CFDFE4 · Ink #4A443F(본문) · Soft Text #6B6358 · Oat Line #ECE5D8 |
| 글꼴 | Gowun Batang(제목) · Pretendard(본문·UI) · Gowun Dodum(로고·짧은 제목) · Gaegu Light(손글씨 포인트) |
| 캐릭터 | 식재료 10종: 쌀알, 당근, 브로콜리, 애호박, 고구마, 단호박, 배, 버섯, 달걀, 사과 |
| 하지 않는 것 | 빈티지·레트로, 칙칙한 베이지·카키, 큰 눈·팔다리 캐릭터, 3D·질감·굵은 글씨, 이모지, 그라데이션 |

한 화면의 포인트 색은 두 가지를 넘기지 않는다. 글씨는 순흑 대신 Ink를 쓴다. 터치 영역은 44px 이상으로 한다.

## 2. 카테고리와 대상

| 카테고리 | 앱 대상 탭 | 개월(기획 기준) | 레시피 카탈로그 `category` |
| --- | --- | --- | --- |
| 첫한입 | 초기 | 4~6 | `첫한입_초기` (min_months 6) |
| 첫한입 | 중기 | 7~8 | `첫한입_중기` (7) |
| 첫한입 | 후기 | 9~11 | `첫한입_후기` (9) |
| 첫한입 | 완료기 | 12~17 | `첫한입_완료기` (12) |
| 쑥쑥한입 | 유아식 · 작은아이 · 큰아이 | 18~23 · 24~35 · 36+ | `쑥쑥한입` (12, 세부 탭 구분 없음) |
| 같이한입 | 어른아이 | 어른, 아이는 60개월 이상 | `같이한입` (원본 null → 검수본 60) |

- 카탈로그의 `쑥쑥한입`은 세 탭으로 나뉘어 있지 않고 min_months가 12다. 세부 탭을 정하기 전까지 임의로 나누지 않는다.
- `min_months`가 비어 있는 레시피는 만들지 않는다. 빈 값을 0개월로 처리하면 어른 음식이 영아에게 노출된다.
- 하단 탭: 홈 · 식단표 · 재료 · 레시피 · 우리 아이.

## 3. 식품 안전 (가장 우선)

1. **레시피와 재료 콘텐츠는 사용자가 넣는다.** AI는 레시피, 재료 정보, 예시 레시피를 지어내지 않는다. 비어 있으면 빈칸으로 두고 보고한다.
2. **검수 전 레시피는 사용자에게 완성본으로 보이지 않는다.** `review_status`가 `기획안_…`이거나 정확한 계량·조리 단계가 없는 레시피는 "검수 전"으로 유지한다. 계량이나 조리법을 추측해서 채우지 않는다.
3. **알레르기 테스트 일정과 섭취량은 출처가 있는 것만 쓴다.** 일차별 양, 며칠 프로그램 같은 수치를 만들지 않는다. 근거는 [docs/hanip_allergy_policy_draft.md](docs/hanip_allergy_policy_draft.md)를 따른다.
4. 알레르기 표시 값(`allergens`)을 지우거나 줄이지 않는다. 아이의 알레르기 재료가 든 레시피는 그 아이 기준 목록에서 뺀다.
5. 위험 재료는 [data/ingredients/hanip_risk_ingredients.json](data/ingredients/hanip_risk_ingredients.json)이 기준이다. 사람이 읽는 표는 [docs/hanip_risk_ingredients.md](docs/hanip_risk_ingredients.md)(자동 생성).
   - 꿀: 12개월 미만 금지(영아 보툴리누스증). 4세 이하는 꿀·시럽·설탕으로 단맛을 더하지 않는다(NHS).
   - 소금·간장·된장: 12개월 미만 레시피에 넣지 않는다. 생우유는 12개월 전 주된 음료로 쓰지 않는다.
   - 통견과·통땅콩은 만 5세 미만 금지. 사탕·젤리·마시멜로는 5세 미만 레시피에 넣지 않는다. 상어·황새치·청새치는 16세 미만 금지.
6. 질식 위험: 둥근 과일, 단단한 생채소, 통콩, 통씨, 큰 고기·치즈 덩어리, 생선 가시는 검수본의 `cautions`로 자동 표시된다. 레시피를 바꿔도 이 주의를 지우지 않는다.
7. 의료 정보에는 출처 링크를 붙이고, 위험 신호(호흡 곤란, 입술·얼굴 부기, 반복 구토 등)는 119·병원 안내로 연결한다. 진단처럼 들리는 문장을 쓰지 않는다.
8. 앱의 모든 알레르기·상황별 내용은 출시 전 소아과 전문의 감수가 필요하다.

## 4. 데이터 규칙

- 원본 파일은 읽기 전용이다. 삭제·덮어쓰기·직접 수정 금지.
  - `hanip_recipe_catalog_230.json`, `hanip_ingredient_guide_30.csv` (최상위)
  - `data/recipes/hanip_recipe_catalog_230.json`, `data/ingredients/hanip_ingredient_guide_30.csv` (원본과 같은 바이트 복사본)
- 원본 레시피는 고치지 않고, 고칠 내용은 [data/recipes/hanip_recipe_corrections.json](data/recipes/hanip_recipe_corrections.json)에 규칙으로 적는다. 앱은 **검수본 `data/recipes/hanip_recipes_reviewed.json`만** 읽는다.
- 파생 파일은 `node scripts/build-data.mjs`로만 다시 만든다. 이 스크립트는 다른 내용의 원본 복사본이 있으면 덮어쓰지 않고 멈추고, 검수본에 오류가 하나라도 있으면 실패한다(종료 코드 1).
  - `data/ingredients/hanip_ingredient_guide_30.json`, `data/recipes/hanip_recipes_reviewed.json`, `data/validation_report.json`, `docs/hanip_risk_ingredients.md`
- 빌드 검사 항목 (실패하면 데이터를 고치고, 검사를 끄지 않는다):
  - 제목에 없는 재료 (예: 양배추 → 배·배추, 무침 → 무, 김치 → 김, 오트밀 → 밀처럼 다른 단어의 일부를 뽑은 경우)
  - 제목에 있는데 빠진 재료 (예: 뭇국의 무, 북엇국의 북어)
  - 재료와 맞지 않는 알레르기 표시, 크림·된장·간장 요리의 알레르기 누락, 전·조림·리소토 등의 부재료 알레르기 가능성 누락
  - 비어 있는 재료, 비어 있는 `min_months`, ID 중복
  - 월령 금지 재료 (예: 12개월 미만 레시피의 꿀·간장)
- 데이터에서 이상한 점을 찾으면 원본을 고치지 말고 수정 규칙에 근거와 함께 추가하거나 보고한다. 점검 기록은 [docs/data_validation_report.md](docs/data_validation_report.md).
- `possible_allergens`(부재료 알레르기 가능성)는 앱 필터에서 확정 알레르기와 똑같이 제외한다. 실제 레시피로 확정되면 `allergens`로 옮기거나 지운다.
- 텍스트 파일은 UTF-8. 엑셀로 여는 CSV만 BOM을 붙인다.
- `content/`의 `ingredients.csv`, `allergy_programs.csv`, `allergy_days.csv`, `milestones.csv`, `situations.csv`, `schedule_early.csv`는 AI가 만든 초안이며 출처 검증 전이다. 특히 `allergy_days.csv`의 일차별 양은 근거가 없으므로 앱에 쓰지 않는다.

## 5. 기존 기능과 디자인 보존

이미 사용자와 정한 것은 묻지 않고 바꾸지 않는다.

- 가입은 카카오 소셜 로그인만. 계정은 혼자 쓰고 가족 공유는 없다. 저장소는 Supabase.
- 온보딩: 카카오로 시작 → 약관 동의 → 아이 정보(여러 명) → 우리 집 아이들 → 식구 수 → 준비 완료.
- 증상 기록 기능은 없다. "먹어봤어요" 체크(재료 도감)만 남긴다.
- 내 레시피는 나만 보기 / 공개를 고를 수 있다(기본값 나만 보기). 만드는 법은 단계마다 사진 여러 장 + 설명. 준비물은 만드는 법에서 자동으로 찾고 사용자는 더하고 고치기만 한다. 수량은 숫자 칸 + 단위 드롭다운.
- 홈 상단에는 시기별 알림 배너를 한 번에 하나만 띄운다.
- 캔버스의 보드(O1~O6, A·A', B, C, D, R1~R5, I1, F1, A1, A2, S1, S2)를 지우거나 덮어쓰지 않는다. 고칠 때는 해당 보드만 바꾸고 무엇을 바꿨는지 알린다.
- 새 화면은 코드보다 시안을 먼저, 한 장씩 확인받고 진행한다.

## 6. 작업 방식

- Git은 GitHub Desktop에 들어 있는 것을 쓴다: `%LOCALAPPDATA%\GitHubDesktop\app-<버전>\resources\app\git\cmd\git.exe`. 커밋 계정 wishbunnydev.
- `notion-windows-installer.exe` 같은 설치 파일은 커밋하지 않는다.
- 외부에 올리는 일(저장소 공개, 배포, 공개 링크)은 사용자에게 먼저 묻는다.
