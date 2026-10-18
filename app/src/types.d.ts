// 한입씩 앱 데이터 타입. data/schemas/*.schema.json 과 같은 모양이다.

export type ReviewStatus = 'pending_review' | 'source_verified' | 'expert_reviewed';
export type MethodId = 'topping' | 'mixed' | 'both';
export type AllergenStatus = 'not_tried' | 'introducing' | 'tried' | 'suspected' | 'consult';

export interface Recipe {
  id: string;
  category: string;
  title: string;
  main_ingredients: string[];
  allergens: string[];
  possible_allergens: { allergen: string; reason: string }[];
  cautions: { risk_id: string; text: string; sources: string[] }[];
  review_flags: string[];
  review_status: string;
  min_months: number;
  corrections: { field: string; before: unknown; after: unknown; reason: string }[];
}

export interface CookingMethod { status: 'pending_review' | 'expert_reviewed'; steps: string[]; reviewedBy?: string; reviewedAt?: string }
export interface RecipeMethods {
  recipeId: string; category: string; stage: string; ingredients: string[];
  allergenTags: { confirmed: string[]; possible: string[] };
  toppingMethod: CookingMethod; mixedMethod: CookingMethod;
  cookingTime: { minutes: number } | null; textureGuide: string | null; storageGuide: string | null;
  safetyNotes: string[]; reviewStatus: 'pending_review' | 'expert_reviewed'; sourceReferences: string[];
}

export interface Source { org: string; title: string; year: number | null; url: string; checkedAt: string; verified: boolean; keyPoints: string[]; note?: string }
export interface Cited { text: string; sources: string[] }

export interface Stage {
  id: 'early' | 'middle' | 'late' | 'complete'; label: string; ageNote: string; catalogCategory: string; goal: string;
  purpose: string; texture: string; meals: string; nutrition: string; cooking: string; nextSignals: string;
  reviewStatus: ReviewStatus; sources: string[];
}
export interface Guide {
  readiness: { reviewStatus: ReviewStatus; title: string; lead: string; sources: string[]; checklist: { id: string; text: string; detail: string; sources: string[] }[]; notSigns: Cited; milk: Cited; consult: Cited };
  stages: Stage[];
  stageNote: string;
  faq: { id: string; q: string; a: string; reviewStatus: ReviewStatus; sources: string[] }[];
  methods: { note: string; options: { id: string; label: string; nick: string; desc: string; pros: string[]; cons: string[] }[]; choices: { id: MethodId; label: string; sub: string }[] };
  first30: { reviewStatus: ReviewStatus; title: string; lead: string; rules: string[]; intervalOptions: number[]; defaultInterval: number; ingredientOrder: string[]; orderNote: string; sources: string[] };
}

export interface AllergenPolicy {
  statuses: { id: AllergenStatus; label: string; tone: string; caution?: string }[];
  riskQuestions: { id: RiskKey; text: string; highRisk: boolean; sources: string[] }[];
  highRiskMessage: string; medicalPlanMessage: string;
  introRules: Cited[];
  repeatGuidance: { source: string; text: string }[];
  repeatIntervalDays: number;
  repeatIntervalSource: string;
  reactionSigns: string[]; reactionSignsSources: string[];
  emergency: Cited; afterReaction: Cited; prohibited: Cited[];
  allergens: { key: string; label: string; safeForm: string; sources: string[]; order: number }[];
}

export type RiskKey = 'eczema' | 'foodAllergy' | 'reaction' | 'medicalPlan';
export interface AllergenRecord { status: AllergenStatus; first: string | null; last: string | null; log: { date: string; ok: boolean; byDoctor?: boolean }[] }
export interface DayRecord { done?: boolean; offered?: string; offeredUnit?: string; eaten?: string; eatenUnit?: string; suspected?: boolean }
export interface Kid {
  id: string; name: string; birth: string; started: boolean; startDate: string;
  allergies: string[];
  risk: Record<RiskKey, boolean | null>;
  allergen: Record<string, AllergenRecord>;
  foods: Record<string, string>;
  suspectedFoods: Record<string, string>;
  plan: { interval: number; offset: number; pausedAt: string | null; records: Record<string, DayRecord> };
}
export interface AppState {
  v: 2; example: boolean; adults: number; selected: string;
  prefs: { method: MethodId };
  today: { date: string; items: string[]; riceAtHome: boolean; family: boolean };
  fridge: FridgeItem[];
  kids: Kid[];
}

export interface FridgeItem { id: string; name: string; bought: string }
export interface StorageGroup { id: string; label: string; match: string[]; fridgeDays: { min: number; max: number } | null; tips: string[]; sources: string[] }
export interface StorageGuide { disclaimer: string; disclaimerSources: string[]; groups: StorageGroup[]; fallback: { label: string; tips: string[] } }
