# 한입씩 (HANIP)

첫 숟가락부터 온 가족 식탁까지. 이유식 일정과, 재료 하나로 온 가족이 먹을 레시피를 찾아 주는 모바일 웹앱.

- 기획서: https://claude.ai/code/artifact/69ac4a26-c482-4199-9347-2bca819aa1f6
- 화면 시안 (Design 캔버스): https://claude.ai/artifact/S6XmAUKiunvuonzCD53Fph
- 운영: 위시버니
- 기술: 모바일 웹앱(PWA) + 카카오 로그인 + Supabase

## 폴더

```
content/            앱에 들어갈 콘텐츠 (엑셀·구글 시트로 열어서 편집)
  recipes.csv           레시피 기본 정보 (한 줄 = 레시피 하나)
  recipe_items.csv      준비물 (한 줄 = 재료 하나)
  recipe_steps.csv      만드는 법 (한 줄 = 단계 하나, 사진 여러 장)
  recipe_variants.csv   대상별 변형 (한 줄 = 대상 하나)
  ingredients.csv       재료 사전
  situations.csv        이럴 땐 이렇게 (설사, 변비 ...)
  allergy_programs.csv  알러지 테스트 식품별 요약
  allergy_days.csv      알러지 테스트 일차별 양
  milestones.csv        시기별 알림 (홈 상단 배너)
  schedule_early.csv    초기 이유식 4주 일정
  photos/               레시피 사진
app/                앱 코드 (개발 시작하면 여기에)
```

CSV 파일은 엑셀에서 바로 열 수 있게 UTF-8(BOM)으로 저장되어 있습니다. 저장할 때도 "CSV UTF-8" 형식으로 저장해 주세요.

## 레시피 넣는 법

1. `recipes.csv`에 한 줄 추가. `레시피ID`는 R0001, R0002 ... 순서로 겹치지 않게.
2. `recipe_items.csv`에 준비물을 재료마다 한 줄씩. `재료`는 `ingredients.csv`에 있는 이름 그대로 (없으면 재료 사전에 먼저 추가).
3. `recipe_steps.csv`에 단계마다 한 줄씩. 사진은 `;`로 구분해 여러 장.
4. 여러 대상이 먹는 레시피(예: 아기 미음 + 어른 반찬)는 `recipe_variants.csv`에 대상별로 바뀌는 점을 적기.
5. 사진은 `content/photos/레시피ID/` 폴더에 넣고, 파일 이름을 `recipe_steps.csv`·`recipes.csv`에 적기. 예: `photos/R0001/1-1.jpg`

### 정해진 값

| 칸 | 쓸 수 있는 값 |
| --- | --- |
| 대상 | 초기, 중기, 후기, 완료기, 유아식, 작은아이, 큰아이, 어른아이 (여러 개면 `;`로 구분) |
| 단위 | g, ml, 개, 큰술, 작은술, 컵, 약간 |
| 재료 분류 | 곡류, 채소, 과일, 고기, 생선, 달걀, 콩류, 유제품, 기타 |
| 상황 태그 | 설사, 변비, 감기, 열, 이앓이, 철분 |
| 예/아니오 칸 | 예, 아니오 |

### 대상 기준

| 카테고리 | 대상 | 개월 |
| --- | --- | --- |
| 첫한입 | 초기 · 중기 · 후기 · 완료기 | 4~6 · 7~8 · 9~11 · 12~17 |
| 쑥쑥한입 | 유아식 · 작은아이 · 큰아이 | 18~23 · 24~35 · 36 이후 |
| 같이한입 | 어른아이 | 어른 |

## 주의

`ingredients.csv`, `situations.csv`, `allergy_*.csv`, `milestones.csv`의 내용은 일반적인 국내 이유식 가이드를 정리한 초안입니다. 출시 전 소아과 전문의 감수가 필요합니다. 감수가 끝난 행은 `감수` 칸에 `완료`라고 적어 주세요.
