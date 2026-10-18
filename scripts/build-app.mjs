// 앱 소스(app/src)를 하나의 페이지로 묶는다.
// - app/index.html : Claude Artifact용 (doctype·head·body 없이 시작하는 형식)
// - dist/          : GitHub Pages용 (완전한 HTML 문서 + assets + data)
// 실행: node scripts/build-app.mjs  (npm run build 가 데이터 빌드와 타입 검사 뒤에 실행)

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'app');
const DIST = join(ROOT, 'dist');
const fail = (msg) => { console.error(`빌드 실패: ${msg}`); process.exit(1); };

const template = readFileSync(join(APP, 'src', 'template.html'), 'utf8');
const js = readFileSync(join(APP, 'src', 'app.js'), 'utf8')
  .replace(/^\/\/ @ts-check\s*\n/m, '')
  .replace(/^\/\/\/ <reference[^\n]*\n/m, '');

if (!template.includes('/*APP_JS*/')) fail('template.html에 /*APP_JS*/ 자리가 없음');
if (/<\/script/i.test(js)) fail('app.js 안에 </script 문자열이 있어 페이지가 깨짐');

// 문법 검사: 묶기 전에 스크립트가 파싱되는지 확인
const tmp = join(ROOT, 'node_modules', '.hanip-check.js');
mkdirSync(dirname(tmp), { recursive: true });
writeFileSync(tmp, js, 'utf8');
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
catch (e) { fail('app.js 문법 오류\n' + String(e.stderr ?? e)); }
finally { rmSync(tmp, { force: true }); }

// 앱이 읽는 데이터 파일이 모두 있는지 (boot()의 names 목록 기준)
const dataNames = (js.match(/const names = \[([^\]]+)\]/)?.[1] ?? '').match(/'([a-z_]+)'/g)?.map((s) => s.slice(1, -1)) ?? [];
if (!dataNames.length) fail('app.js에서 데이터 파일 목록(const names)을 찾지 못함');
for (const n of dataNames) if (!existsSync(join(APP, 'data', `${n}.json`))) fail(`app/data/${n}.json 없음 (npm run data 먼저)`);

const page = template.replace('/*APP_JS*/', () => js);
writeFileSync(join(APP, 'index.html'), page, 'utf8');

// GitHub Pages용 완전한 문서
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const full = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="한입씩: 첫 숟가락부터 온 가족 식탁까지. 이유식·유아식·가족 레시피 프로토타입">
${page}
</html>
`;
writeFileSync(join(DIST, 'index.html'), full, 'utf8');
cpSync(join(APP, 'assets'), join(DIST, 'assets'), { recursive: true });
cpSync(join(APP, 'data'), join(DIST, 'data'), { recursive: true });
writeFileSync(join(DIST, '.nojekyll'), '', 'utf8');

console.log(`app/index.html ${(page.length / 1024).toFixed(1)}KB, dist/ ${readdirSync(join(DIST, 'data')).length}개 데이터 파일, ${readdirSync(join(DIST, 'assets')).length}개 그림`);
