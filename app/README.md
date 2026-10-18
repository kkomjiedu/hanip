# app · 한입씩 프로토타입

폰에서 눌러 볼 수 있는 확인용 웹 프로토타입. 실제 서비스 코드가 아니다.

- 보기 (로그인 없이): https://kkomjiedu.github.io/hanip/
- 보기 (Claude 비공개 링크): https://claude.ai/artifact/PGvm8N2CDemxqGKdVdJa43
- 화면: 홈(오늘 뭐 먹지, 알림, 오늘의 이유식), 이유식 처음이라면?(시작해도 될까·단계별 안내·처음 시작 Q&A), 어떤 방식으로 만들까요?, 첫 30일 식단표, 레시피 목록·상세(토핑식·혼합식 탭), 식재료 도감·상세, 우리집 냉장고, 재료로 찾기, 온 가족 레시피, 알레르기 식품(위험도 확인·도입 기록), 이럴 땐 이렇게, 우리 아이, 온보딩
- 빠진 것: 카카오 로그인, 서버 저장, 푸시 알림, 내 레시피 올리기. 아이 정보는 그 브라우저에만 저장된다.

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/template.html` | 스타일과 화면 뼈대 |
| `src/app.js` | 앱 코드 (`// @ts-check`) |
| `src/types.d.ts` | 데이터 타입 |
| `assets/` | 캐릭터 그림 |
| `data/` | `npm run data`가 만든 앱용 데이터 (직접 고치지 않음) |
| `index.html` | `npm run build:app`이 만든 Claude Artifact용 페이지 (직접 고치지 않음) |

## 빌드와 확인

```
npm install       # 처음 한 번 (TypeScript)
npm run build     # 데이터 빌드 → 타입 검사 → app/index.html, dist/ 생성
```

`dist/`가 GitHub Pages에 올라가는 완전한 페이지다. 로컬에서 볼 때는 `dist` 폴더를 간단한 서버로 연다. 파일을 바로 열면 데이터를 불러오지 못한다.
