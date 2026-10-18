# data

| 파일 | 종류 | 고쳐도 되나 |
| --- | --- | --- |
| `recipes/hanip_recipe_catalog_230.json` | 원본 복사본 (레시피 메뉴 목록 230개) | 아니오 |
| `ingredients/hanip_ingredient_guide_30.csv` | 원본 복사본 (식재료 가이드 30종) | 아니오 |
| `ingredients/hanip_ingredient_guide_30.json` | CSV를 그대로 옮긴 JSON | 스크립트로만 다시 생성 |
| `ingredients/hanip_risk_ingredients.json` | 위험 재료 설명 22종 (출처 포함) | 예, 출처와 함께 |
| `recipes/hanip_recipe_corrections.json` | 원본 위에 덧씌우는 수정 규칙 | 예, 근거와 함께 |
| `recipes/hanip_recipes_reviewed.json` | **앱이 읽는 검수본** (원본 + 수정 규칙 + 자동 주의) | 스크립트로만 다시 생성 |
| `validation_report.json` | 개수·중복·검사 결과 | 스크립트로만 다시 생성 |
| `recipes/hanip_recipe_method_drafts.json` | 레시피별 토핑식·혼합식 조리법 초안 (검수 전 비공개) | 예, 수치 없이 |
| `recipes/hanip_recipe_methods.json` | 230개 레시피의 조리법 구조 (recipeId, stage, toppingMethod, mixedMethod, cookingTime 등) | 스크립트로만 다시 생성 |
| `guides/hanip_sources.json` | 출처 목록 (기관, 연도, URL, 확인일, 원문 확인 여부, 주요 내용) | 예, 원문 확인 후 |
| `guides/hanip_weaning_guide.json` | 이유식 시작 가이드, 단계별 안내, Q&A, 방식 비교, 첫 30일 규칙 | 예, 출처와 함께 |
| `allergens/hanip_allergen_policy.json` | 알레르기 식품 도입 정책, 위험도 질문, 상태 5단계, 반복 제공 | 예, 출처와 함께 |
| `ingredients/hanip_storage_guide.json` | 우리집 냉장고 보관법과 냉장 기간 (출처 표에 있는 품목만) | 예, 출처와 함께 |
| `schemas/*.schema.json` | 위 파일들의 JSON 스키마 (빌드 때 검사) | 예 |

다시 만들기: `node scripts/build-data.mjs`

## 구조

### 레시피 (`recipes/…json`)

```json
{
  "status": "기획용 메뉴 목록. 완성 레시피 아님 …",
  "total": 230,
  "recipes": [
    {
      "id": "HN-001",
      "category": "첫한입_초기",
      "title": "쌀 미음",
      "main_ingredients": ["쌀"],
      "allergens": [],
      "review_status": "기획안_영양안전조리검증필요",
      "min_months": 6,
      "note": "…"
    }
  ]
}
```

### 검수본 (`recipes/hanip_recipes_reviewed.json`)

원본 레시피 필드에 아래가 더해진다. `min_months`, `main_ingredients`, `allergens`는 고친 값이다.

```json
{
  "id": "HN-176",
  "title": "바나나 오트밀팬케이크",
  "min_months": 12,
  "main_ingredients": ["오트밀", "바나나"],
  "allergens": ["밀"],
  "possible_allergens": [{ "allergen": "계란", "reason": "반죽에 … 흔히 씀. 실제 레시피에서 확정" }],
  "cautions": [{ "risk_id": "shape", "text": "아이가 씹기 쉬운 크기와 …", "sources": ["https://www.cdc.gov/…"] }],
  "review_flags": ["부재료 알레르기 확정 필요"],
  "corrections": [{ "field": "main_ingredients", "before": ["밀", "오트밀", "바나나"], "after": ["오트밀", "바나나"], "reason": "…" }]
}
```

- `possible_allergens`: 제목에는 없지만 흔히 들어가는 부재료의 알레르기. 앱 필터에서는 확정 알레르기처럼 제외한다.
- `cautions`: 위험 재료 파일과 모양 규칙에서 자동으로 붙는 보호자 안내. 레시피 상세에 그대로 보여 준다.
- `review_flags`: 편집자용 할 일. 사용자에게는 보여 주지 않는다.
- `corrections`: 원본에서 무엇을 왜 바꿨는지 기록.

### 식재료 (`ingredients/…json`)

```json
{
  "source": "hanip_ingredient_guide_30.csv",
  "columns": ["재료", "특징", "추천 조합", "주의 및 한계"],
  "total": 30,
  "items": [{ "재료": "쌀", "특징": "탄수화물 공급", "추천 조합": "소고기·채소", "주의 및 한계": "…" }]
}
```

셀 값은 CSV 그대로다. "소고기·채소" 같은 묶음 값도 나누지 않았다.

## 앱 기능과 연동

현재 저장소의 `app/`에는 코드가 없다. 레시피 검색과 재료 추천은 캔버스 시안(C 재료로 찾기, F1 가족 레시피, I1 재료 상세)과 기획서로만 정해져 있다. 아래는 그 기능에 이 데이터를 붙일 때의 대응표다.

| 앱 기능 | 쓰는 필드 | 지금 데이터로 되는 것 | 부족한 것 |
| --- | --- | --- | --- |
| 대상 탭 필터 | `category`, `min_months` | 첫한입 4단계, 쑥쑥한입, 같이한입(60개월+) 구분 | 쑥쑥한입 세부 탭(유아식·작은아이·큰아이) |
| 아이 월령 필터 | `min_months` | 6·7·9·12·60 기준 비교 (검수본에는 빈 값 없음) | |
| 알레르기 제외 | `allergens` + `possible_allergens` | 확정 + 가능성 알레르기 | 실제 레시피로 가능성 확정 필요. 이름 맞춤 필요 |
| 재료로 찾기 (냉장고) | `main_ingredients` | 잘못 뽑힌 재료를 고치고 `채소` 16개의 종류를 정한 목록 | |
| 레시피 주의 표시 | `cautions` | 144개 레시피에 자동 주의 | |
| 재료 상세 → 대상별 레시피 | 레시피 `main_ingredients` ↔ 가이드 `재료` | 가이드 30종 중 28종이 레시피와 연결됨 | 가이드에 없는 레시피 재료 20개 |
| 재료 상세 정보 | 가이드 `특징`, `추천 조합`, `주의 및 한계` | 세 항목 표시 | 시작 단계, 제철, 손질·보관, 출처 칸 없음 |
| 레시피 상세 | — | 이름, 재료, 알레르기만 | 계량, 조리 단계, 사진, 조리 시간 (모두 없음 → 검수 전 표시) |
| 공개 여부 | `review_status` | 230개 모두 검수 전 | 검수 완료 값 정의 필요 |

### 이름 맞춤표 (앱에서 비교할 때만 쓰고 원본은 바꾸지 않음)

| 데이터 값 | 맞출 이름 | 비고 |
| --- | --- | --- |
| 알레르기 `계란` | 재료 `달걀`, `메추리알` | |
| 가이드 `우유/요거트` | 재료 `요거트` (+ 우유) | |
| 가이드 `김/미역` | 재료 `김`, `미역` | |
| 알레르기 `생선` | 재료 `연어`, `대구`, `고등어`, `흰살생선`, `북어` | |
| 알레르기 `대두` | 재료 `두부`, `콩나물` | 된장·간장 요리는 제목 규칙으로 표시 |
| 알레르기 `밀` | 재료 `파스타` / `오트밀` 레시피는 밀 혼입 가능성으로 표시 유지 | |
| 가이드 `김/미역` | 재료 `미역줄기`도 미역 정보로 연결 | |
| 알레르기 `우유` | 재료 `요거트`, `치즈` | |
| 알레르기 `갑각류` | 재료 `새우` | |

기획서의 Supabase 테이블(`recipes`, `recipe_items`, `recipe_steps`, `ingredients`)로 옮길 때는 `id`를 그대로 레시피 키로 쓰고, `main_ingredients`는 `recipe_items`에 수량 없이 넣는다. 계량과 단계는 사용자가 레시피를 채운 뒤 넣는다.
