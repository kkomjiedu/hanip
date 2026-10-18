// 원본 데이터를 data/ 아래로 복사하고, 식재료 CSV를 JSON으로 바꾸고,
// 레시피에 수정 규칙과 위험 재료 주의를 적용해 검수본을 만든 뒤 검사한다.
// 원본 파일은 읽기만 하고 절대 고치지 않는다.
// 실행: node scripts/build-data.mjs   (검수본에 오류가 있으면 종료 코드 1)

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_RECIPES = join(ROOT, 'hanip_recipe_catalog_230.json');
const SRC_INGREDIENTS = join(ROOT, 'hanip_ingredient_guide_30.csv');
const DIR_RECIPES = join(ROOT, 'data', 'recipes');
const DIR_INGREDIENTS = join(ROOT, 'data', 'ingredients');
const CORRECTIONS = join(DIR_RECIPES, 'hanip_recipe_corrections.json');
const RISKS = join(DIR_INGREDIENTS, 'hanip_risk_ingredients.json');
const EXPECTED_RECIPES = 230;
const EXPECTED_INGREDIENTS = 30;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
const rel = (p) => p.replace(ROOT, '').replace(/^[\\/]/, '').replace(/\\/g, '/');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const uniq = (a) => [...new Set(a)];
const byKey = (arr, key) => arr.reduce((m, x) => ((m[x[key]] ??= []).push(x), m), {});

// 같은 내용이면 건너뛰고, 다른 내용이 이미 있으면 덮어쓰지 않고 멈춘다.
function copyOriginal(src, destDir) {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, src.split(/[\\/]/).pop());
  const srcBuf = readFileSync(src);
  if (existsSync(dest)) {
    if (sha(readFileSync(dest)) !== sha(srcBuf)) {
      throw new Error(`${dest} 에 다른 내용의 파일이 이미 있어 덮어쓰지 않았습니다.`);
    }
  } else {
    copyFileSync(src, dest);
  }
  return dest;
}

// RFC 4180 CSV 파서 (따옴표, 따옴표 안 쉼표·줄바꿈, "" 이스케이프 지원)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

// ---------- 제목에서 재료 찾기 (부분 글자 오인식 방지) ----------
// 긴 단어 안에 들어 있는 짧은 단어는 재료로 보지 않는다. 예: 양배추 안의 배추·배, 무침의 무, 김치의 김, 오트밀의 밀.
const CONTAINER_WORDS = ['무침', '김치', '오트밀', '양배추', '배추', '고구마 줄기', '고구마줄기', '미역줄기', '콩나물',
  '완두콩', '메추리알', '흰살생선', '땅콩버터', '방울토마토', '카레', '파스타', '들깨', '참깨'];
// 제목에 직접 없어도 요리 이름이 뜻하는 재료
const IMPLIED = [
  { re: /미음|죽|진밥|덮밥|주먹밥|볶음밥|비빔밥|리소토/, ing: '쌀' },
  { re: /뭇국/, ing: '무', required: true },
  { re: /닭/, ing: '닭고기', required: true },
  { re: /북엇국|북어/, ing: '북어', required: true },
  { re: /고구마\s?줄기/, ing: '고구마줄기', required: true },
];
const ALIASES = { 계란: '달걀' };
// '채소', '야채'처럼 종류가 없는 제목. 수정 규칙의 vegetable_specifications로 정한 채소만 제목에 없어도 허용한다.
const GENERIC_VEG = /채소|야채/;

let VOCAB = [];
const cleanTitle = (t) => t.replace(/\S+\s*없는/g, ' '); // "김치 없는", "간장 없는"은 들어 있지 않다는 뜻

function titleHas(title, term) {
  const t = cleanTitle(title);
  const longer = VOCAB.filter((w) => w !== term && w.length > term.length && w.includes(term));
  let from = 0;
  for (let i = t.indexOf(term, from); i !== -1; i = t.indexOf(term, i + 1)) {
    const covered = longer.some((w) => {
      for (let j = t.indexOf(w); j !== -1; j = t.indexOf(w, j + 1)) {
        if (j <= i && i + term.length <= j + w.length) return true;
      }
      return false;
    });
    if (!covered) return true;
  }
  return false;
}
const matchesRisk = (recipe, terms) =>
  terms.some((m) => recipe.main_ingredients.includes(m) || titleHas(recipe.title, m));

// ---------- 알레르기 대응 ----------
const INGREDIENT_ALLERGEN = {
  달걀: '계란', 메추리알: '계란', 두부: '대두', 콩나물: '대두', 연어: '생선', 대구: '생선', 고등어: '생선',
  흰살생선: '생선', 북어: '생선', 새우: '갑각류', 파스타: '밀', 요거트: '우유', 치즈: '우유',
  땅콩: '땅콩', 참깨: '참깨', 들깨: '들깨', 밀: '밀',
};

// ---------- 검사 ----------
function lint(recipes, { corrections, risks }) {
  const errors = [];
  const err = (r, code, msg) => errors.push({ id: r.id, title: r.title, code, msg });
  for (const r of recipes) {
    const ings = r.main_ingredients ?? [];
    const allergenSet = new Set(r.allergens ?? []);
    const anyAllergen = new Set([...(r.allergens ?? []), ...(r.possible_allergens ?? []).map((p) => p.allergen)]);
    if (!ings.length) err(r, 'EMPTY_INGREDIENTS', '재료가 비어 있음');
    if (r.min_months === null || r.min_months === undefined) err(r, 'NULL_MIN_MONTHS', 'min_months가 비어 있음 (0개월로 오인될 위험)');
    for (const ing of ings) {
      const implied = IMPLIED.some((x) => x.ing === ing && x.re.test(r.title))
        || (GENERIC_VEG.test(r.title) && (r.specified_vegetables ?? []).includes(ing));
      if (!titleHas(r.title, ing) && !implied) err(r, 'INGREDIENT_NOT_IN_TITLE', `제목에 없는 재료 '${ing}' (다른 단어의 일부를 잘못 뽑았을 가능성)`);
      const need = INGREDIENT_ALLERGEN[ing];
      if (need && !allergenSet.has(need)) err(r, 'ALLERGEN_MISSING', `재료 '${ing}'의 알레르기 '${need}' 표시 없음`);
    }
    for (const v of VOCAB.filter((w) => !CONTAINER_WORDS.includes(w) || ings.includes(w))) {
      const norm = ALIASES[v] ?? v;
      if (titleHas(r.title, v) && !ings.includes(norm)) err(r, 'TITLE_INGREDIENT_MISSING', `제목의 '${v}'가 재료에 없음`);
    }
    for (const x of IMPLIED.filter((x) => x.required)) {
      if (x.re.test(r.title) && !ings.includes(x.ing)) err(r, 'TITLE_INGREDIENT_MISSING', `'${x.ing}'가 재료에 없음`);
    }
    for (const rule of corrections.allergen_rules) {
      if (!new RegExp(rule.title).test(cleanTitle(r.title))) continue;
      for (const a of rule.add ?? []) if (!allergenSet.has(a)) err(r, 'ALLERGEN_MISSING', `'${rule.title}' 요리인데 '${a}' 표시 없음`);
      for (const a of rule.possible ?? []) if (!anyAllergen.has(a)) err(r, 'POSSIBLE_ALLERGEN_MISSING', `'${rule.title}' 요리인데 '${a}' 가능성 표시 없음`);
    }
    for (const risk of risks.items.filter((x) => x.block_under_months)) {
      if (matchesRisk(r, risk.match) && (r.min_months ?? 0) < risk.block_under_months) {
        err(r, 'BLOCKED_INGREDIENT', `${risk.name}: ${risk.block_under_months}개월 미만 대상에 넣을 수 없음`);
      }
    }
  }
  const dupIds = Object.entries(byKey(recipes, 'id')).filter(([, g]) => g.length > 1).map(([k]) => k);
  for (const id of dupIds) errors.push({ id, code: 'DUPLICATE_ID', msg: 'ID 중복' });
  return errors;
}

// ---------- 수정 규칙 적용 ----------
function applyCorrections(recipes, corrections, risks) {
  const src = (k) => risks.sources[k]?.url ?? k;
  return recipes.map((orig) => {
    const r = structuredClone(orig);
    const log = [];
    r.possible_allergens = [];
    r.cautions = [];
    r.review_flags = [];

    const cat = corrections.category_min_months[r.category];
    if (cat && r.min_months !== cat.min_months) {
      log.push({ field: 'min_months', before: r.min_months, after: cat.min_months, reason: cat.reason });
      r.min_months = cat.min_months;
    }

    for (const fix of corrections.ingredient_fixes.filter((f) => f.ids.includes(r.id))) {
      const before = [...r.main_ingredients];
      let after = before.filter((i) => !(fix.remove ?? []).includes(i));
      if (fix.replace) after = after.map((i) => fix.replace[i] ?? i);
      after = uniq([...after, ...(fix.add ?? [])]);
      log.push({ field: 'main_ingredients', before, after, reason: fix.reason });
      r.main_ingredients = after;
    }

    const veg = corrections.vegetable_specifications?.items?.[r.id];
    if (veg) {
      if (!GENERIC_VEG.test(r.title)) throw new Error(`${r.id} ${r.title}: 제목에 '채소'가 없는데 vegetable_specifications에 있음`);
      const before = [...r.main_ingredients];
      r.main_ingredients = uniq([...before, ...veg]);
      r.specified_vegetables = veg;
      log.push({ field: 'main_ingredients', before, after: r.main_ingredients, reason: corrections.vegetable_specifications.reason });
    }

    for (const rule of corrections.allergen_rules) {
      if (!new RegExp(rule.title).test(cleanTitle(r.title))) continue;
      const add = (rule.add ?? []).filter((a) => !r.allergens.includes(a));
      if (add.length) {
        log.push({ field: 'allergens', before: [...r.allergens], after: [...r.allergens, ...add], reason: rule.reason });
        r.allergens.push(...add);
      }
      for (const a of rule.possible ?? []) {
        if (!r.allergens.includes(a) && !r.possible_allergens.some((p) => p.allergen === a)) {
          r.possible_allergens.push({ allergen: a, reason: rule.reason });
        }
      }
    }
    // 재료에서 알레르기를 다시 맞춘다 (재료를 고친 뒤에 실행)
    for (const ing of r.main_ingredients) {
      const a = INGREDIENT_ALLERGEN[ing];
      if (a && !r.allergens.includes(a)) {
        log.push({ field: 'allergens', before: [...r.allergens], after: [...r.allergens, a], reason: `재료 '${ing}'의 알레르기` });
        r.allergens.push(a);
      }
    }
    if (r.possible_allergens.length) log.push({ field: 'possible_allergens', before: [], after: r.possible_allergens.map((p) => p.allergen), reason: '부재료 알레르기 가능성 (실제 레시피에서 확정)' });

    for (const risk of risks.items) {
      const limit = risk.caution_under_months ?? risk.block_under_months;
      if (limit && r.min_months < limit && matchesRisk(r, risk.match)) {
        r.cautions.push({ risk_id: risk.id, text: risk.recipe_caution, sources: risk.sources.map(src) });
      }
    }
    for (const c of corrections.title_cautions) {
      if (r.min_months < 60 && new RegExp(c.title).test(r.title)) r.cautions.push({ risk_id: 'shape', text: c.text, sources: c.sources.map(src) });
    }
    for (const f of corrections.review_flags) {
      if (new RegExp(f.title).test(r.title) && !(GENERIC_VEG.test(f.title) && r.specified_vegetables)) r.review_flags.push(f.flag);
    }
    if (r.possible_allergens.length) r.review_flags.push('부재료 알레르기 확정 필요');

    r.corrections = log;
    return r;
  });
}

function riskMarkdown(risks) {
  const s = (keys) => keys.map((k) => `[${k}](${risks.sources[k].url})`).join(', ');
  const lines = [
    '# 위험 재료 설명',
    '',
    `자동 생성: \`data/ingredients/hanip_risk_ingredients.json\` → \`node scripts/build-data.mjs\`. 이 파일을 직접 고치지 말 것. 소아과 전문의 감수 전.`,
    '',
    '| 재료 | 구분 | 레시피 차단 | 주의 표시 | 설명 | 대신 이렇게 | 출처 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...risks.items.map((x) => `| ${x.name} | ${x.level} | ${x.block_under_months ? `${x.block_under_months}개월 미만` : ''} | ${x.caution_under_months ? `${x.caution_under_months}개월 미만` : ''} | ${x.description} | ${x.instead} | ${s(x.sources)} |`),
    '',
    '## 출처',
    '',
    ...Object.entries(risks.sources).map(([k, v]) => `- ${k}: [${v.title}](${v.url})`),
    '',
  ];
  return lines.join('\n');
}

// =====================================================================
const report = { generated_at: new Date().toISOString() };

// 식재료 (CSV → JSON)
const ingDest = copyOriginal(SRC_INGREDIENTS, DIR_INGREDIENTS);
const csvText = readFileSync(SRC_INGREDIENTS, 'utf8').replace(/^﻿/, '');
const [header, ...body] = parseCsv(csvText);
const items = body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
const ingJsonPath = join(DIR_INGREDIENTS, 'hanip_ingredient_guide_30.json');
writeJson(ingJsonPath, { source: 'hanip_ingredient_guide_30.csv', columns: header, total: items.length, items });
const reread = readJson(ingJsonPath);
const nameKey = header[0];
report.ingredients = {
  file_csv: rel(ingDest),
  file_json: rel(ingJsonPath),
  columns: header,
  actual_count: items.length,
  expected: EXPECTED_INGREDIENTS,
  count_ok: items.length === EXPECTED_INGREDIENTS,
  rows_with_wrong_column_count: body.map((r, i) => ({ line: i + 2, cols: r.length })).filter((x) => x.cols !== header.length),
  duplicate_names: Object.entries(byKey(items, nameKey)).filter(([, g]) => g.length > 1).map(([k]) => k),
  empty_cells: items.flatMap((it) => header.filter((h) => !it[h].trim()).map((h) => `${it[nameKey]}:${h}`)),
  compound_names: items.map((it) => it[nameKey]).filter((n) => n.includes('/')),
  json_round_trip_identical: body.every((r, i) => header.every((h, j) => reread.items[i][h] === r[j])),
};

// 레시피
const recipeDest = copyOriginal(SRC_RECIPES, DIR_RECIPES);
const catalog = readJson(SRC_RECIPES);
const corrections = readJson(CORRECTIONS);
const risks = readJson(RISKS);
const guideNames = items.flatMap((it) => it[nameKey].split('/'));
VOCAB = uniq([
  ...guideNames,
  ...catalog.recipes.flatMap((r) => r.main_ingredients),
  ...corrections.ingredient_fixes.flatMap((f) => [...(f.add ?? []), ...Object.values(f.replace ?? {})]),
  ...CONTAINER_WORDS,
]);

const idNums = catalog.recipes.map((r) => Number(String(r.id).replace('HN-', '')));
report.recipes_original = {
  file: rel(recipeDest),
  declared_total: catalog.total,
  actual_count: catalog.recipes.length,
  count_ok: catalog.recipes.length === EXPECTED_RECIPES && catalog.total === EXPECTED_RECIPES,
  missing_id_numbers: Array.from({ length: EXPECTED_RECIPES }, (_, i) => i + 1).filter((n) => !idNums.includes(n)),
  duplicate_titles: Object.entries(byKey(catalog.recipes, 'title')).filter(([, g]) => g.length > 1)
    .map(([title, g]) => ({ title, items: g.map((r) => `${r.id} ${r.category}`) })),
  review_status: Object.fromEntries(Object.entries(byKey(catalog.recipes, 'review_status')).map(([k, g]) => [k, g.length])),
};
const originalErrors = lint(catalog.recipes, { corrections, risks });
report.recipes_original.lint_error_count = originalErrors.length;
report.recipes_original.lint_by_code = Object.fromEntries(Object.entries(byKey(originalErrors, 'code')).map(([k, g]) => [k, g.length]));

const reviewed = applyCorrections(catalog.recipes, corrections, risks);
const reviewedErrors = lint(reviewed, { corrections, risks });
const reviewedPath = join(DIR_RECIPES, 'hanip_recipes_reviewed.json');
writeJson(reviewedPath, {
  status: '검수본: 원본에 수정 규칙과 위험 재료 주의를 적용한 것. 계량·조리법이 없어 모두 검수 전. 서비스 배포 전 조리·영양·알레르기 검수 필요',
  source: rel(recipeDest),
  source_sha256: sha(readFileSync(SRC_RECIPES)),
  corrections_file: rel(CORRECTIONS),
  risk_file: rel(RISKS),
  total: reviewed.length,
  recipes: reviewed,
});
report.recipes_reviewed = {
  file: rel(reviewedPath),
  count: reviewed.length,
  changed_recipes: reviewed.filter((r) => r.corrections.length).length,
  with_possible_allergens: reviewed.filter((r) => r.possible_allergens.length).length,
  with_cautions: reviewed.filter((r) => r.cautions.length).length,
  with_review_flags: reviewed.filter((r) => r.review_flags.length).length,
  min_months_by_category: Object.fromEntries(Object.entries(byKey(reviewed, 'category')).map(([k, g]) => [k, uniq(g.map((r) => r.min_months))])),
  lint_errors: reviewedErrors,
};
report.cross = {
  recipe_ingredients_not_in_guide: uniq(reviewed.flatMap((r) => r.main_ingredients)).filter((n) => !guideNames.includes(n)).sort(),
  guide_names_not_used_in_recipes: guideNames.filter((n) => !reviewed.some((r) => r.main_ingredients.includes(n))),
};

// ---------- 가이드·알레르기 정책·조리법 ----------
// JSON Schema의 일부(type, required, properties, items, enum, pattern, $ref)만 검사하는 작은 검사기
function validateSchema(value, schema, root = schema, path = '$') {
  const errs = [];
  if (schema.$ref) return validateSchema(value, schema.$ref.replace('#/', '').split('/').reduce((o, k) => o[k], root), root, path);
  if (schema.type) {
    const types = [].concat(schema.type);
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
    const ok = types.some((t) => t === actual || (t === 'number' && actual === 'integer'));
    if (!ok) return [`${path}: ${types.join('|')} 이어야 하는데 ${actual}`];
  }
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path}: 허용값 ${schema.enum.join(', ')} 아님 (${JSON.stringify(value)})`);
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) errs.push(`${path}: 형식 ${schema.pattern} 아님`);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required ?? []) if (!(k in value)) errs.push(`${path}.${k}: 필수 항목 없음`);
    for (const [k, s] of Object.entries(schema.properties ?? {})) if (k in value) errs.push(...validateSchema(value[k], s, root, `${path}.${k}`));
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errs.push(...validateSchema(v, schema.items, root, `${path}[${i}]`)));
  return errs;
}
const SCHEMAS = join(ROOT, 'data', 'schemas');
const sources = readJson(join(ROOT, 'data', 'guides', 'hanip_sources.json')).sources;
const guide = readJson(join(ROOT, 'data', 'guides', 'hanip_weaning_guide.json'));
const policy = readJson(join(ROOT, 'data', 'allergens', 'hanip_allergen_policy.json'));
const drafts = readJson(join(DIR_RECIPES, 'hanip_recipe_method_drafts.json')).drafts;

const STAGE_OF = { 첫한입_초기: 'early', 첫한입_중기: 'middle', 첫한입_후기: 'late', 첫한입_완료기: 'complete', 쑥쑥한입: 'toddler', 같이한입: 'family' };
const emptyMethod = () => ({ status: 'pending_review', steps: [] });
const methods = {
  about: '레시피별 토핑식·혼합식 조리법. 계량·조리 시간·보관 기간은 검증 전이라 비어 있다(null). pending_review는 앱에 노출하지 않는다. 자동 생성: scripts/build-data.mjs',
  total: reviewed.length,
  items: reviewed.map((r) => {
    const d = drafts[r.id] ?? {};
    return {
      recipeId: r.id,
      category: r.category,
      stage: STAGE_OF[r.category],
      ingredients: r.main_ingredients,
      allergenTags: { confirmed: r.allergens, possible: r.possible_allergens.map((p) => p.allergen) },
      toppingMethod: d.toppingMethod ?? emptyMethod(),
      mixedMethod: d.mixedMethod ?? emptyMethod(),
      cookingTime: null,
      textureGuide: null,
      storageGuide: null,
      safetyNotes: r.cautions.map((c) => c.text),
      reviewStatus: [d.toppingMethod, d.mixedMethod].every((m) => m?.status === 'expert_reviewed') ? 'expert_reviewed' : 'pending_review',
      sourceReferences: [],
    };
  }),
};
const methodsPath = join(DIR_RECIPES, 'hanip_recipe_methods.json');
writeJson(methodsPath, methods);

// 안전 검사: 스키마, 출처, 검수 상태
const contentErrors = [
  ...validateSchema(guide, readJson(join(SCHEMAS, 'weaning_guide.schema.json'))).map((e) => `가이드 ${e}`),
  ...validateSchema(policy, readJson(join(SCHEMAS, 'allergen_policy.schema.json'))).map((e) => `알레르기 정책 ${e}`),
  ...validateSchema(methods, readJson(join(SCHEMAS, 'recipe_methods.schema.json'))).map((e) => `조리법 ${e}`),
];
const citeCheck = (where, keys, status) => {
  for (const k of keys ?? []) {
    if (!sources[k]) contentErrors.push(`${where}: 없는 출처 키 '${k}'`);
    else if (status !== 'pending_review' && !sources[k].verified) contentErrors.push(`${where}: 원문 미확인 출처 '${k}'를 근거로 씀`);
  }
  if (status === 'source_verified' && !(keys ?? []).length) contentErrors.push(`${where}: source_verified인데 출처가 없음`);
};
citeCheck('가이드.readiness', guide.readiness.sources, guide.readiness.reviewStatus);
guide.readiness.checklist.forEach((c) => citeCheck(`가이드.checklist.${c.id}`, c.sources, 'source_verified'));
['notSigns', 'milk', 'consult'].forEach((k) => citeCheck(`가이드.readiness.${k}`, guide.readiness[k].sources, 'source_verified'));
guide.stages.forEach((s) => citeCheck(`가이드.stage.${s.id}`, s.sources, s.reviewStatus));
guide.faq.forEach((f) => {
  citeCheck(`가이드.faq.${f.id}`, f.sources, f.reviewStatus);
  if (f.reviewStatus === 'pending_review' && f.a.trim()) contentErrors.push(`가이드.faq.${f.id}: 검수 전 답변에 내용이 있음 (노출 위험)`);
});
citeCheck('가이드.first30', guide.first30.sources, guide.first30.reviewStatus);
for (const ing of guide.first30.ingredientOrder) {
  if (!reviewed.some((r) => r.category === '첫한입_초기' && r.main_ingredients.includes(ing))) contentErrors.push(`가이드.first30: '${ing}'가 들어간 초기 레시피가 카탈로그에 없음`);
  if (INGREDIENT_ALLERGEN[ing]) contentErrors.push(`가이드.first30: 알레르기 식품 '${ing}'를 자동 식단에 넣음`);
}
policy.riskQuestions.forEach((q) => citeCheck(`알레르기.risk.${q.id}`, q.sources, 'pending_review'));
policy.introRules.forEach((x, i) => citeCheck(`알레르기.introRules[${i}]`, x.sources, 'pending_review'));
policy.repeatGuidance.forEach((x) => citeCheck('알레르기.repeatGuidance', [x.source], 'source_verified'));
policy.allergens.forEach((a) => citeCheck(`알레르기.${a.key}`, a.sources, 'source_verified'));
citeCheck('알레르기.emergency', policy.emergency.sources, 'source_verified');
citeCheck('알레르기.repeatInterval', [policy.repeatIntervalSource], 'source_verified');
// 검수 전 조리법에 계량·시간·기간 같은 수치가 들어가면 안 된다
const NUMERIC_UNIT = /\d+(\.\d+)?\s*(g|kg|ml|mL|L|컵|큰술|작은술|숟가락|스푼|분|시간|일|개월|℃|도)/;
for (const m of methods.items) {
  for (const key of ['toppingMethod', 'mixedMethod']) {
    const meth = m[key];
    if (meth.status === 'expert_reviewed' && !(meth.reviewedBy && meth.reviewedAt)) contentErrors.push(`${m.recipeId}.${key}: 검수 완료인데 검수자·검수일 없음`);
    if (meth.status !== 'expert_reviewed' && meth.steps.some((s) => NUMERIC_UNIT.test(s))) contentErrors.push(`${m.recipeId}.${key}: 검수 전 조리법에 계량·시간 수치가 있음`);
  }
  if (m.reviewStatus !== 'expert_reviewed' && (m.cookingTime || m.textureGuide || m.storageGuide)) contentErrors.push(`${m.recipeId}: 검수 전인데 조리 시간·질감·보관 정보가 채워짐`);
}
// 냉장고 보관: 기간은 원문 확인한 출처가 있는 그룹만, 재료 이름은 한 그룹에만
const storage = readJson(join(DIR_INGREDIENTS, 'hanip_storage_guide.json'));
const seenMatch = new Map();
for (const g of storage.groups) {
  if (g.fridgeDays) {
    citeCheck(`보관.${g.id}`, g.sources, 'source_verified');
    if (!(g.fridgeDays.min >= 0 && g.fridgeDays.max >= g.fridgeDays.min)) contentErrors.push(`보관.${g.id}: 기간 범위가 이상함`);
  } else citeCheck(`보관.${g.id}`, g.sources, 'pending_review');
  for (const m of g.match) {
    if (seenMatch.has(m)) contentErrors.push(`보관: '${m}'가 ${seenMatch.get(m)}와 ${g.id}에 함께 있음`);
    seenMatch.set(m, g.id);
  }
}
citeCheck('보관.disclaimer', storage.disclaimerSources, 'source_verified');

report.content = { errors: contentErrors, methods_total: methods.items.length, methods_with_drafts: Object.keys(drafts).length, methods_expert_reviewed: methods.items.filter((m) => m.reviewStatus === 'expert_reviewed').length };

// 프로토타입 앱(app/)이 읽는 데이터. 검수본만 내보낸다.
const APP_DATA = join(ROOT, 'app', 'data');
mkdirSync(APP_DATA, { recursive: true });
writeJson(join(APP_DATA, 'recipes.json'), readJson(reviewedPath));
writeJson(join(APP_DATA, 'ingredients.json'), readJson(ingJsonPath));
writeJson(join(APP_DATA, 'risks.json'), risks);
writeJson(join(APP_DATA, 'guide.json'), guide);
writeJson(join(APP_DATA, 'sources.json'), { sources });
writeJson(join(APP_DATA, 'allergen_policy.json'), policy);
writeJson(join(APP_DATA, 'storage.json'), storage);
// 앱에는 검수 전 조리 단계를 보내지 않는다 (상태만 보냄)
writeJson(join(APP_DATA, 'methods.json'), {
  items: methods.items.map((m) => ({
    ...m,
    toppingMethod: m.toppingMethod.status === 'expert_reviewed' ? m.toppingMethod : { status: m.toppingMethod.status, steps: [] },
    mixedMethod: m.mixedMethod.status === 'expert_reviewed' ? m.mixedMethod : { status: m.mixedMethod.status, steps: [] },
  })),
});
const [sitHeader, ...sitRows] = parseCsv(readFileSync(join(ROOT, 'content', 'situations.csv'), 'utf8').replace(/^﻿/, ''));
writeJson(join(APP_DATA, 'situations.json'), {
  status: 'AI 초안, 출처 검증·감수 전 (content/situations.csv)',
  items: sitRows.map((r) => Object.fromEntries(sitHeader.map((h, i) => [h, r[i] ?? '']))),
});

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'hanip_risk_ingredients.md'), riskMarkdown(risks), 'utf8');
writeJson(join(ROOT, 'data', 'validation_report.json'), { ...report, recipes_original_lint_errors: originalErrors });

console.log(JSON.stringify({
  ingredients: { count: report.ingredients.actual_count, round_trip: report.ingredients.json_round_trip_identical },
  original: { count: report.recipes_original.actual_count, lint: report.recipes_original.lint_by_code },
  reviewed: { ...report.recipes_reviewed, lint_errors: reviewedErrors.length },
  content: { ...report.content, errors: contentErrors.length },
}, null, 2));
if (reviewedErrors.length || contentErrors.length) {
  if (reviewedErrors.length) console.error('검수본 오류:\n' + reviewedErrors.map((e) => `  ${e.id} ${e.title ?? ''} [${e.code}] ${e.msg}`).join('\n'));
  if (contentErrors.length) console.error('콘텐츠 오류:\n' + contentErrors.map((e) => `  ${e}`).join('\n'));
  process.exit(1);
}
