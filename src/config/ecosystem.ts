export interface EcosystemLink {
  id: string;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  href: string;
}

export interface AgentGuidelineRule {
  id: string;
  titleZh: string;
  titleEn: string;
  detailZh: string;
  detailEn: string;
}

export const UPSTREAM_REPO = 'leanprover-community/riemann-hypothesis';

export const ECOSYSTEM_LINKS: readonly EcosystemLink[] = [
  {
    id: 'rh-shrink',
    labelZh: 'rh-shrink 瘦身看板',
    labelEn: 'rh-shrink.github.io',
    descriptionZh: '证明树摇、代码体积缩减与模块依赖图追踪',
    descriptionEn: 'Proof tree-shaking, code shrinkage, and module dependency tracker',
    href: 'https://rh-shrink.github.io/',
  },
  {
    id: 'rh-kernel-backbone',
    labelZh: 'rh-kernel-backbone',
    labelEn: 'rh-kernel-backbone',
    descriptionZh: 'Lean 4.33.1 内核最小支配树与零死引用核心骨架',
    descriptionEn: 'Kernel-grounded minimal dominator tree and witness chains',
    href: 'https://github.com/thekeunpie-hash/rh-kernel-backbone',
  },
  {
    id: 'riemann-verifytask',
    labelZh: 'riemann.verifytask.cn',
    labelEn: 'riemann.verifytask.cn',
    descriptionZh: '中文社区任务拆解与协作验证进度镜像',
    descriptionEn: 'Community task decomposition and verification tracker',
    href: 'https://riemann.verifytask.cn/',
  },
  {
    id: 'lean-zulip',
    labelZh: 'Lean Zulip 频道',
    labelEn: 'Lean Zulip',
    descriptionZh: 'leanprover.zulipchat.com 实时维护者协调与队列讨论',
    descriptionEn: 'Real-time maintainer coordination on Lean Zulip',
    href: 'https://leanprover.zulipchat.com/',
  },
  {
    id: 'upstream-agents',
    labelZh: '上游 AGENTS.md (#312)',
    labelEn: 'Upstream AGENTS.md (#312)',
    descriptionZh: 'riemann-hypothesis 官方贡献与 AI Agent 防踩坑指南',
    descriptionEn: 'Official upstream rules for contributors and AI agents',
    href: 'https://github.com/leanprover-community/riemann-hypothesis/blob/main/AGENTS.md',
  },
  {
    id: 'tech-debt-229',
    labelZh: '技术债总表 #229',
    labelEn: 'Tech Debt #229',
    descriptionZh: '上游技术债追踪与低门槛整理议题',
    descriptionEn: 'Upstream technical-debt tracking thread',
    href: 'https://github.com/leanprover-community/riemann-hypothesis/issues/229',
  },
];

export const AGENT_GUARDRAIL_RULES: readonly AgentGuidelineRule[] = [
  {
    id: 'tactic-modern',
    titleZh: '优先 lia / grind / zify; grind，避免手写冗余证明链',
    titleEn: 'Prefer lia / grind / zify; grind over manual have chains',
    detailZh:
      '依据上游 AGENTS.md (#312) 与 lean-proof-golfing：ℕ/ℤ 线性算术优先用 lia 而非 omega；优先 grind、zify; grind 与 Mathlib 现成定理，不把单行 nlinarith 拆成多行手写 calc。',
    detailEn:
      'Per upstream AGENTS.md (#312) & lean-proof-golfing: prefer lia over omega on Nat/Int, use grind / zify; grind / Mathlib lemmas first, and never expand nlinarith into multi-step have/calc chains.',
  },
  {
    id: 'no-instance-hack',
    titleZh: '严禁 attribute [-instance] 或 local instance high 掩盖问题',
    titleEn: 'Never use attribute [-instance] or local instance high hacks',
    detailZh:
      '关闭或强提局部实例优先级会污染下游模块解析；请用 trace.Meta.synthInstance 定位源头并从根因修复。',
    detailEn:
      'Tweaking instance priorities hides typeclass search bottlenecks and leaks across imports; diagnose with trace.Meta.synthInstance instead.',
  },
  {
    id: 'frozen-comparator',
    titleZh: '禁止修改 Comparator 冻结契约文件',
    titleEn: 'Do not modify frozen Comparator challenge files',
    detailZh:
      'src/Challenge.lean、comparator.json、export-targets.txt 与 comparator/* 受 CI 硬性拦截，仅允许使用 propext / Quot.sound / Classical.choice。',
    detailEn:
      'CI rejects edits to src/Challenge.lean, comparator.json, export-targets.txt, and comparator/*. No sorry or extra axioms.',
  },
  {
    id: 'pr-conventions',
    titleZh: '遵循 Mathlib PR 规范并如实声明 LLM 协助',
    titleEn: 'Follow Mathlib PR title format & omit local timing fluff',
    detailZh:
      '标题使用 <type>(<scope>): <subject>（小写祈使句、无句号、<=100 字符）；正文精简不报本机跑分，且检查当前 PR 是否已被 Batch 收编或撞上 Mega-Refactor。',
    detailEn:
      'Use <type>(<scope>): <subject> (lowercase imperative, no trailing period, <=100 chars). Keep bodies concise, omit local build timings, and avoid subsumed/mega-refactor hotspots.',
  },
];

export const AGENT_COPY_PROMPT_EN = `Before writing code or opening a PR on leanprover-community/riemann-hypothesis:
1. Check /data/board.json (or /llms.txt) on rh-triage-board: avoid files touched by active Mega-Refactors (diffStatus=overflow) and skip any PR already subsumed by a Batch PR.
2. Follow upstream AGENTS.md (#312): never edit frozen Comparator files (src/Challenge.lean, comparator.json, export-targets.txt, comparator/*); keep zero sorry/axioms.
3. Proof golfing: use Mathlib lemmas first, prefer lia (over omega), grind, zify; grind, and term-mode; do NOT replace nlinarith with multi-line have/calc chains; NEVER use attribute [-instance] or local instance high.
4. PR format: <type>(<optional-scope>): <lowercase imperative subject without period> (<=100 chars), concise body, disclose LLM assistance, and do NOT claim local machine timings.`;

export const AGENT_COPY_PROMPT_ZH = `在为 leanprover-community/riemann-hypothesis 编写代码或提交 PR 前，请先遵守：
1. 先读取看板 /data/board.json 或 /llms.txt：避开存在 Mega-Refactor（diffStatus=overflow）全局冲突或高频目录碰撞的热区，切勿对已被 Batch PR 收编的碎片 PR 重复提交或做无效 Rebase。
2. 严守上游 AGENTS.md（#312）：禁止修改冻结的 Comparator 文件（src/Challenge.lean、comparator.json、export-targets.txt、comparator/*），零 sorry、零额外公理。
3. 证明精简规范：优先复用 Mathlib 定理；ℕ/ℤ 线性算术用 lia（替代旧式 omega），善用 grind、zify; grind；严禁把 nlinarith 改成冗长 have/calc，严禁使用 attribute [-instance] 或 local instance high。
4. PR 格式：<type>(<scope>): <小写祈使句，无句号>（<=100 字符），正文精简、不汇报本机编译耗时，并注明 AI 辅助声明。`;
