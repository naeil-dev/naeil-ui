// Canonical header-only copy and catalog extracted from the existing site.
// Application page dictionaries and framework i18n stay outside the package.
export const headerLocales = ["en", "ko", "ja"] as const;
export type NaeilHeaderLocale = (typeof headerLocales)[number];
export const headerLocaleNames = { en: "English", ko: "한국어", ja: "日本語" } as const;
export const headerProjects = [
  {
    "key": "naeilUi",
    "href": "/design",
    "accent": "oklch(0.623 0.214 259)",
    "icon": "whale",
    "status": "active" as "active" | "coming"
  }
] as const;
export const headerContent = {
  "en": {
    "nav": {
      "home": "Home",
      "projects": "Projects",
      "blog": "Blog",
      "navigation": "Main navigation",
      "menu": "Menu",
      "closeMenu": "Close menu"
    },
    "theme": {
      "switchToLight": "Switch to light theme",
      "switchToDark": "Switch to dark theme"
    },
    "locale": {
      "switchLabel": "Language"
    },
    "projects": {
      "cc": {
        "name": "Content Collector",
        "description": "Automated content collection from RSS, YouTube, Reddit + AI summarization"
      },
      "pkm": {
        "name": "PKM",
        "description": "Personal knowledge management — document parsing, embeddings, semantic search"
      },
      "naeilUi": {
        "name": "naeil-ui",
        "description": "Minimal design system — OKLCH tokens, Tailwind v4, shadcn"
      },
      "sa": {
        "name": "Sustainability Analyzer",
        "description": "AI-powered ESG report analysis — PDF parsing, qualitative assessment, comparison tables"
      },
      "babyAgent": {
        "name": "Baby Agent",
        "description": "Parenting AI agent — LINE-based Q&A, records, reminders"
      },
      "status": {
        "active": "Active",
        "coming": "Coming Soon"
      }
    }
  },
  "ko": {
    "nav": {
      "home": "홈",
      "projects": "프로젝트",
      "blog": "블로그",
      "navigation": "주요 메뉴",
      "menu": "메뉴",
      "closeMenu": "메뉴 닫기"
    },
    "theme": {
      "switchToLight": "밝은 테마로 전환",
      "switchToDark": "어두운 테마로 전환"
    },
    "locale": {
      "switchLabel": "언어"
    },
    "projects": {
      "cc": {
        "name": "Content Collector",
        "description": "RSS, YouTube, Reddit 자동 수집 + AI 요약"
      },
      "pkm": {
        "name": "PKM",
        "description": "개인 지식 관리 — 문서 파싱, 임베딩, 시맨틱 검색"
      },
      "naeilUi": {
        "name": "naeil-ui",
        "description": "미니멀 디자인 시스템 — OKLCH 토큰, Tailwind v4, shadcn"
      },
      "sa": {
        "name": "Sustainability Analyzer",
        "description": "ESG 리포트 AI 분석 — PDF 파싱, 정성평가, 비교표 자동 생성"
      },
      "babyAgent": {
        "name": "Baby Agent",
        "description": "육아 AI 에이전트 — LINE 기반 Q&A, 기록, 리마인더"
      },
      "status": {
        "active": "활성",
        "coming": "준비 중"
      }
    }
  },
  "ja": {
    "nav": {
      "home": "ホーム",
      "projects": "プロジェクト",
      "blog": "ブログ",
      "navigation": "メインナビゲーション",
      "menu": "メニュー",
      "closeMenu": "メニューを閉じる"
    },
    "theme": {
      "switchToLight": "ライトテーマに切り替える",
      "switchToDark": "ダークテーマに切り替える"
    },
    "locale": {
      "switchLabel": "言語"
    },
    "projects": {
      "cc": {
        "name": "Content Collector",
        "description": "RSS、YouTube、Redditの自動収集 + AI要約"
      },
      "pkm": {
        "name": "PKM",
        "description": "個人ナレッジ管理 — ドキュメント解析、埋め込み、セマンティック検索"
      },
      "naeilUi": {
        "name": "naeil-ui",
        "description": "ミニマルデザインシステム — OKLCHトークン、Tailwind v4、shadcn"
      },
      "sa": {
        "name": "Sustainability Analyzer",
        "description": "ESGレポートAI分析 — PDF解析、定性評価、比較表の自動生成"
      },
      "babyAgent": {
        "name": "Baby Agent",
        "description": "育児AIエージェント — LINE Q&A、記録、リマインダー"
      },
      "status": {
        "active": "アクティブ",
        "coming": "準備中"
      }
    }
  }
} as const;
