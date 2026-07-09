export const exams = [
  {
    id: "ap",
    name: "応用情報技術者試験",
    shortName: "AP",
    description: "ITエンジニアの登竜門。技術からマネジメント・戦略まで幅広く問う（午前）",
    // IPA公式シラバスの中分類（23）。弱点分析はこの中分類＋genre（系）で集計する。
    categories: [
      "基礎理論",
      "アルゴリズムとプログラミング",
      "コンピュータ構成要素",
      "システム構成要素",
      "ソフトウェア",
      "ハードウェア",
      "ユーザーインタフェース",
      "情報メディア",
      "データベース",
      "ネットワーク",
      "セキュリティ",
      "システム開発技術",
      "ソフトウェア開発管理技術",
      "プロジェクトマネジメント",
      "サービスマネジメント",
      "システム監査",
      "システム戦略",
      "システム企画",
      "経営戦略マネジメント",
      "技術戦略マネジメント",
      "ビジネスインダストリ",
      "企業活動",
      "法務",
    ],
    color: "from-sky-500 to-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    textColor: "text-sky-600",
    badgeBg: "bg-sky-100",
  },
  {
    id: "fe",
    name: "基本情報技術者試験",
    shortName: "FE",
    description: "ITの基礎を証明する人気の国家試験。IT業界への第一歩（科目A）",
    categories: [
      "基礎理論",
      "アルゴリズムとプログラミング",
      "コンピュータ構成・ハードウェア",
      "ソフトウェア・OS",
      "データベース",
      "ネットワーク",
      "セキュリティ",
      "システム開発",
      "マネジメント",
      "ストラテジ・経営",
    ],
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    textColor: "text-violet-600",
    badgeBg: "bg-violet-100",
  },
  {
    id: "ip",
    name: "ITパスポート試験",
    shortName: "IP",
    description: "社会人の必須教養。IT・経営・マネジメントの基礎を幅広く問う入門資格",
    categories: [
      "ストラテジ系（経営全般）",
      "マネジメント系（IT管理）",
      "テクノロジ系（IT技術）",
      "セキュリティ",
      "ネットワーク",
      "データベース",
      "経営戦略・法務",
      "プロジェクトマネジメント",
    ],
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    badgeBg: "bg-pink-100",
  },
  {
    id: "am1",
    name: "午前Ⅰ（高度共通）",
    shortName: "午前Ⅰ",
    description: "全高度区分で共通の午前Ⅰ。テクノロジ・マネジメント・ストラテジを幅広く問う",
    categories: [
      "基礎理論",
      "アルゴリズムとプログラミング",
      "コンピュータ構成・システム",
      "データベース",
      "ネットワーク",
      "セキュリティ",
      "システム開発技術",
      "プロジェクト・サービスマネジメント",
      "システム戦略・経営戦略",
      "企業活動・法務",
    ],
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-600",
    badgeBg: "bg-indigo-100",
  },
  {
    id: "pm",
    name: "プロジェクトマネージャ試験",
    shortName: "PM",
    description: "プロジェクト計画・管理・リーダーシップを問う高度試験",
    categories: [
      "プロジェクト統合マネジメント",
      "プロジェクトスコープマネジメント",
      "プロジェクトスケジュールマネジメント",
      "プロジェクトコストマネジメント",
      "プロジェクト品質マネジメント",
      "プロジェクト資源マネジメント",
      "プロジェクトリスクマネジメント",
      "プロジェクト調達マネジメント",
      "プロジェクトコミュニケーションマネジメント",
      "プロジェクトステークホルダマネジメント",
    ],
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-600",
    badgeBg: "bg-blue-100",
  },
  {
    id: "sc",
    name: "情報処理安全確保支援士試験",
    shortName: "SC",
    description: "セキュリティ設計・実装・管理を問う高度試験",
    categories: [
      "情報セキュリティ管理",
      "情報セキュリティ対策",
      "セキュリティ技術評価",
      "暗号技術",
      "認証・認可技術",
      "ネットワークセキュリティ",
      "アプリケーションセキュリティ",
      "インシデント対応・フォレンジクス",
    ],
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-600",
    badgeBg: "bg-red-100",
  },
  {
    id: "st",
    name: "ITストラテジスト試験",
    shortName: "ST",
    description: "IT戦略立案・経営課題解決を問う高度試験",
    categories: [
      "経営戦略マネジメント",
      "技術戦略マネジメント",
      "ビジネスインダストリ",
      "システム戦略",
      "システム企画",
      "業務改革（BPR）",
      "ソリューションビジネス",
      "経営分析・財務",
    ],
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-600",
    badgeBg: "bg-purple-100",
  },
  {
    id: "nw",
    name: "ネットワークスペシャリスト試験",
    shortName: "NW",
    description: "ネットワーク設計・構築・運用を問う高度試験",
    categories: [
      "ネットワークアーキテクチャ",
      "データリンク層技術",
      "ネットワーク層技術（IP・ルーティング）",
      "トランスポート層・アプリケーション層",
      "ネットワーク管理・運用",
      "ネットワークセキュリティ",
      "無線LAN",
      "クラウドネットワーク",
    ],
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-600",
    badgeBg: "bg-green-100",
  },
  {
    id: "db",
    name: "データベーススペシャリスト試験",
    shortName: "DB",
    description: "DB設計・SQL・パフォーマンスチューニングを問う高度試験",
    categories: [
      "データベース方式",
      "データモデリング・正規化",
      "関係データベース設計",
      "SQL（問合せ・更新・定義）",
      "トランザクション管理・排他制御",
      "障害回復",
      "データベース性能チューニング",
      "分散データベース・NoSQL",
    ],
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-600",
    badgeBg: "bg-orange-100",
  },
  {
    id: "sa",
    name: "システムアーキテクト試験",
    shortName: "SA",
    description: "システム設計・アーキテクチャ選定を問う高度試験",
    categories: [
      "要件定義",
      "システム方式設計",
      "ソフトウェアアーキテクチャ設計",
      "信頼性・可用性設計",
      "性能・スケーラビリティ設計",
      "セキュリティアーキテクチャ",
      "システム移行計画",
      "テスト計画・評価",
    ],
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-600",
    badgeBg: "bg-teal-100",
  },
  {
    id: "sm",
    name: "ITサービスマネージャ試験",
    shortName: "SM",
    description: "ITサービスの運用・管理・改善を問う高度試験",
    categories: [
      "サービスレベル管理（SLA）",
      "インシデント管理",
      "問題管理",
      "変更管理・リリース管理",
      "構成管理・資産管理",
      "キャパシティ管理",
      "可用性管理",
      "ITサービス継続管理",
    ],
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-600",
    badgeBg: "bg-cyan-100",
  },
  {
    id: "au",
    name: "システム監査技術者試験",
    shortName: "AU",
    description: "ITシステムの監査・評価・リスク管理を問う高度試験",
    categories: [
      "システム監査計画",
      "システム監査実施",
      "システム監査報告・フォローアップ",
      "内部統制（IT全般統制）",
      "IT業務処理統制",
      "情報セキュリティ監査",
      "リスクアセスメント",
      "個人情報保護・法令対応",
    ],
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-600",
    badgeBg: "bg-slate-100",
  },
  {
    id: "es",
    name: "エンベデッドシステムスペシャリスト試験",
    shortName: "ES",
    description: "組込み・IoTシステムの設計・開発を問う高度試験",
    categories: [
      "組込みシステム",
      "プロセッサ",
      "メモリ",
      "リアルタイムOS",
      "電子回路",
      "論理回路",
      "センサ・アクチュエータ",
      "通信・ネットワーク",
      "セキュリティ",
      "ソフトウェア開発",
      "システム構成",
      "標準化・法規",
    ],
    color: "from-lime-500 to-lime-600",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200",
    textColor: "text-lime-600",
    badgeBg: "bg-lime-100",
  },
  // ===== 2027年開始の新試験（仮称）。問題演習は構成元試験の過去問を横断出題する（TRACK_SOURCES参照） =====
  {
    id: "dm",
    name: "データマネジメント試験（仮称）",
    shortName: "DM",
    description: "データ・AI利活用の基本を問う2027年開始の新設試験。ITパスポートの次のステップ",
    categories: [],
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    badgeBg: "bg-pink-100",
  },
  {
    id: "pd-m",
    name: "プロフェッショナルデジタルスキル試験（仮称）マネジメント区分",
    shortName: "PD-M",
    description: "デジタル活用をマネジメントする専門知識・技能を問う2027年開始の新設試験",
    categories: ["プロジェクトマネジメント", "サービスマネジメント", "経営戦略マネジメント", "システム監査", "ガバナンス"],
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    badgeBg: "bg-pink-100",
  },
  {
    id: "pd-d",
    name: "プロフェッショナルデジタルスキル試験（仮称）データ・AI区分",
    shortName: "PD-D",
    description: "データ基盤・データ整備・AI活用の専門知識・技能を問う2027年開始の新設試験",
    categories: ["データベース", "データマネジメント", "データ分析", "AI利活用"],
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    badgeBg: "bg-pink-100",
  },
  {
    id: "pd-s",
    name: "プロフェッショナルデジタルスキル試験（仮称）システム区分",
    shortName: "PD-S",
    description: "システムの要件定義・アーキテクチャ設計・開発・運用を問う2027年開始の新設試験",
    categories: ["システムアーキテクチャ", "ネットワーク", "組込み・IoT", "開発・運用"],
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    badgeBg: "bg-pink-100",
  },
];

// 2027新試験の科目A-2（専門知識）に相当する構成元試験（横断出題のソース）。dmは構成元なし＝出題不可
export const TRACK_SOURCES: Record<string, string[]> = {
  "pd-m": ["st", "pm", "sm", "au"],
  "pd-d": ["db"],
  "pd-s": ["sa", "nw", "es"],
};

// 試験のグルーピング（トップ＝初級、別ページ＝高度）
export const BASIC_EXAM_IDS = ["ip", "fe", "ap"] as const; // メイン（やさしい順：IP→FE→AP）
export const ADVANCED_EXAM_IDS = ["pm", "sc", "nw", "db", "sa", "st", "sm", "au", "es"] as const; // 高度9区分

export const basicExams = BASIC_EXAM_IDS.map((id) => exams.find((e) => e.id === id)!);
export const advancedExams = ADVANCED_EXAM_IDS.map((id) => exams.find((e) => e.id === id)!);
export const am1Exam = exams.find((e) => e.id === "am1")!;

export function getExam(id: string) {
  return exams.find((e) => e.id === id);
}

// 中分類名の表記を試験ごとの正式名に出し分けて表示する。
// データは "ユーザーインタフェース" で統一保持（FE/APの正式名・レーダー軸も統一）。
// ITパスポートのみIPAが「情報デザイン」（中分類19）へ改称済みのため、表示だけ差し替える。
export function displayCategory(examId: string, category: string): string {
  if (examId === "ip" && category === "ユーザーインタフェース") return "情報デザイン";
  return category;
}

// 学習する（learn_terms）の分野を、IPAの3大区分（ストラテジ系/マネジメント系/テクノロジ系）で
// グループ化して表示するための定義。配列順＝表示順（各試験のシラバス大分類の並びに合わせる）。
// ※ITパスポートは開発技術（システム開発）がマネジメント系、FE/APはテクノロジ系（IPAの区分どおり）。
export const learnCategoryGroups: Record<string, { group: string; categories: string[] }[]> = {
  ip: [
    { group: "ストラテジ系", categories: ["企業活動", "法務", "経営戦略", "システム戦略・企画"] },
    { group: "マネジメント系", categories: ["システム開発", "プロジェクトマネジメント", "サービスマネジメント・監査"] },
    { group: "テクノロジ系", categories: ["基礎理論・アルゴリズム", "コンピュータシステム", "情報デザイン・メディア", "データベース", "ネットワーク", "セキュリティ"] },
  ],
  fe: [
    { group: "テクノロジ系", categories: ["基礎理論", "アルゴリズムとプログラミング", "コンピュータ構成・ハードウェア", "ソフトウェア・OS", "データベース", "ネットワーク", "セキュリティ", "システム開発"] },
    { group: "マネジメント系", categories: ["マネジメント"] },
    { group: "ストラテジ系", categories: ["ストラテジ・経営"] },
  ],
  ap: [
    { group: "テクノロジ系", categories: ["基礎理論", "アルゴリズムとプログラミング", "コンピュータ構成要素", "システム構成要素", "ソフトウェア", "ハードウェア", "ユーザーインタフェース", "情報メディア", "データベース", "ネットワーク", "セキュリティ", "システム開発技術", "ソフトウェア開発管理技術"] },
    { group: "マネジメント系", categories: ["プロジェクトマネジメント", "サービスマネジメント", "システム監査"] },
    { group: "ストラテジ系", categories: ["システム戦略", "システム企画", "経営戦略マネジメント", "技術戦略マネジメント", "ビジネスインダストリ", "企業活動", "法務"] },
  ],
};

// 学習する（learn_terms）の分野名 → questionsテーブルの分野名（IPA中分類）の対応。
// IP/FEは学習側が複数の中分類を統合した分野名のため、演習に接続するときはここで展開する。
// 未定義の分野名は同名の中分類として扱う（APは全分野が中分類そのままなので定義不要）。
const learnToQuestionCategories: Record<string, Record<string, string[]>> = {
  ip: {
    経営戦略: ["経営戦略マネジメント", "技術戦略マネジメント", "ビジネスインダストリ"],
    "システム戦略・企画": ["システム戦略", "システム企画"],
    システム開発: ["システム開発技術", "ソフトウェア開発管理技術"],
    "サービスマネジメント・監査": ["サービスマネジメント", "システム監査"],
    "基礎理論・アルゴリズム": ["基礎理論", "アルゴリズムとプログラミング"],
    コンピュータシステム: ["コンピュータ構成要素", "システム構成要素", "ソフトウェア", "ハードウェア"],
    "情報デザイン・メディア": ["ユーザーインタフェース", "情報メディア"],
  },
  fe: {
    "コンピュータ構成・ハードウェア": ["コンピュータ構成要素", "システム構成要素", "ハードウェア"],
    "ソフトウェア・OS": ["ソフトウェア", "ユーザーインタフェース", "情報メディア"],
    システム開発: ["システム開発技術", "ソフトウェア開発管理技術"],
    マネジメント: ["プロジェクトマネジメント", "サービスマネジメント", "システム監査"],
    "ストラテジ・経営": ["システム戦略", "システム企画", "経営戦略マネジメント", "技術戦略マネジメント", "ビジネスインダストリ", "企業活動", "法務"],
  },
};
export function questionCategoriesFor(examId: string, category: string): string[] {
  return learnToQuestionCategories[examId]?.[category] ?? [category];
}

// 逆引き: questionsの分野名（IPA中分類）→「学習する」の分野名。
// 弱点分析（中分類ベース）から学習パスへ誘導するときに使う。
export function learnCategoryFor(examId: string, questionCategory: string): string {
  const map = learnToQuestionCategories[examId];
  if (map) {
    for (const [learnCat, qCats] of Object.entries(map)) {
      if (qCats.includes(questionCategory)) return learnCat;
    }
  }
  return questionCategory;
}

// 分野一覧を3大区分の順に並べ替える（定義にない分野は末尾へ）。
export function orderLearnCategories(examId: string, cats: string[]): string[] {
  const groups = learnCategoryGroups[examId];
  if (!groups) return cats;
  const order = groups.flatMap((g) => g.categories);
  const known = order.filter((c) => cats.includes(c));
  const unknown = cats.filter((c) => !order.includes(c));
  return [...known, ...unknown];
}

// 問題ごとの正式な出典表記を生成する。
// 例(午前Ⅱ): 出典：IPA プロジェクトマネージャ試験 令和6年度 秋期 午前Ⅱ 問1
// 例(午前Ⅰ): 出典：IPA 高度情報処理技術者試験 午前Ⅰ（全区分共通） 令和6年度 春期 問1
// 試験区分ごとの「セクション表記」（出典に使う）。未指定は午前Ⅱ（高度）。
const SECTION_LABEL: Record<string, string> = {
  am1: "午前Ⅰ（全区分共通）",
  ap: "午前",
  fe: "科目A",
  ip: "", // ITパスポートは午前/午後の区別なし
  dm: "", // DMサンプル問題はyear側に「科目A サンプル問題」を持つため区分ラベル不要
};

// 高度系（午前Ⅰ・午前Ⅱ）かどうか
export function isAdvancedExam(examId: string): boolean {
  return examId === "am1" || (ADVANCED_EXAM_IDS as readonly string[]).includes(examId);
}

// ページ見出しの肩書（IP/FE/APは「情報処理技術者試験」、高度系は「高度情報処理技術者試験」）
export function examGroupLabel(examId: string): string {
  return isAdvancedExam(examId) ? "高度情報処理技術者試験" : "情報処理技術者試験";
}

// 区分ごとのセクション名（UI表示用）。IPは午前/午後の区別なし→空文字。
export function sectionLabel(examId: string): string {
  if (examId === "am1") return "午前Ⅰ";
  if (examId === "ap") return "午前";
  if (examId === "fe") return "科目A";
  if (examId === "ip" || examId === "dm") return "";
  if (TRACK_SOURCES[examId]) return "科目A-2（専門知識）相当";
  return "午前Ⅱ";
}

export function questionSource(examId: string, year: string, qNumber?: number | null) {
  const q = qNumber ? ` 問${qNumber}` : "";
  if (examId === "am1") {
    return `出典：IPA 高度情報処理技術者試験 午前Ⅰ（全区分共通） ${year}${q}`;
  }
  const e = getExam(examId);
  if (examId in SECTION_LABEL) {
    const sec = SECTION_LABEL[examId];
    return `出典：IPA ${e?.name ?? ""} ${year}${sec ? ` ${sec}` : ""}${q}`;
  }
  return `出典：IPA ${e?.name ?? ""} ${year} 午前Ⅱ${q}`;
}
