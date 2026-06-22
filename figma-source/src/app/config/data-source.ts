/**
 * Data Source Configuration
 *
 * This file controls where the magazine reader loads content from in both:
 * - standalone Vite preview/builds, and
 * - WordPress plugin embeds.
 *
 * In WordPress, the PHP plugin passes URLs through window.theWordsWeCarryConfig.
 * Always prefer those WordPress URLs when they exist.
 */

declare global {
  interface Window {
    theWordsWeCarryConfig?: {
      configUrl?: string;
      defaultConfigUrl?: string;
      pluginUrl?: string;
      assetsUrl?: string;
      localManifestUrl?: string;
      localViewerUrl?: string;
      articlesUrl?: string;
      chaptersUrl?: string;
      baseRawUrl?: string;
      frontMatterUrl?: string;
      chapterDescriptionsUrl?: string;
      magazineManifestUrl?: string;
      wordpressMagazineUrl?: string;
      legacyWordPressMagazineUrl?: string;
      adsUrl?: string;
      analyticsUrl?: string;
      issueUrl?: string;
      sourcePriority?: string[];
    };
  }
}

export type DataFileType =
  | "ISSUE_JSON"
  | "VIEWER_JSON"
  | "PUBLISH_MANIFEST_JSON"
  | "RUNTIME_CSS"
  | "RUNTIME_JS"
  | "ARTICLES_JSON"
  | "CHAPTERS_JSON"
  | "FRONT_MATTER_JSON"
  | "CHAPTER_DESCRIPTIONS_JSON"
  | "MAGAZINE_MANIFEST_JSON"
  | "WORDPRESS_MAGAZINE_JSON"
  | "LEGACY_WORDPRESS_MAGAZINE_JSON"
  | "ADS_URL"
  | "ANALYTICS_URL"
  | "BASE_RAW_URL";

export const DATA_SOURCE_CONFIG = {
  USE_EXTERNAL_URLS: true,

  EXTERNAL_URLS: {
    ISSUE_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json",
    VIEWER_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/viewer.json",
    PUBLISH_MANIFEST_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/publish_manifest.json",
    RUNTIME_CSS:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/runtime.css",
    RUNTIME_JS:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/runtime.js",
    ARTICLES_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/articles.json",
    CHAPTERS_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/chapters.json",
    FRONT_MATTER_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/front-matter.json",
    CHAPTER_DESCRIPTIONS_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/chapter-descriptions.json",
    MAGAZINE_MANIFEST_JSON:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/magazine-manifest.json",
    WORDPRESS_MAGAZINE_JSON: "",
    LEGACY_WORDPRESS_MAGAZINE_JSON: "",
    ADS_URL: "",
    ANALYTICS_URL: "",
    BASE_RAW_URL:
      "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/",
  },

  LOCAL_PATHS: {
    ISSUE_JSON: "/content/issue.json",
    VIEWER_JSON: "/viewer.json",
    PUBLISH_MANIFEST_JSON: "/publish_manifest.json",
    RUNTIME_CSS: "/runtime.css",
    RUNTIME_JS: "/runtime.js",
    ARTICLES_JSON: "/content/articles.json",
    CHAPTERS_JSON: "/content/chapters.json",
    FRONT_MATTER_JSON: "/content/front-matter.json",
    CHAPTER_DESCRIPTIONS_JSON:
      "/content/chapter-descriptions.json",
    MAGAZINE_MANIFEST_JSON: "/content/magazine-manifest.json",
    WORDPRESS_MAGAZINE_JSON: "",
    LEGACY_WORDPRESS_MAGAZINE_JSON: "",
    ADS_URL: "",
    ANALYTICS_URL: "",
    BASE_RAW_URL: "/",
  },
};

function getWordPressConfigUrl(
  fileType: DataFileType,
): string | null {
  if (typeof window === "undefined") return null;

  const wpConfig = window.theWordsWeCarryConfig;
  if (!wpConfig) return null;

  switch (fileType) {
    case "ISSUE_JSON":
      return (
        wpConfig.issueUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/issue.json"
      );
    case "PUBLISH_MANIFEST_JSON":
      return (
        wpConfig.configUrl ||
        wpConfig.localManifestUrl ||
        wpConfig.defaultConfigUrl ||
        null
      );
    case "VIEWER_JSON":
      return wpConfig.localViewerUrl || null;
    case "ARTICLES_JSON":
      return (
        wpConfig.articlesUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/articles.json"
      );
    case "CHAPTERS_JSON":
      return (
        wpConfig.chaptersUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/chapters.json"
      );
    case "FRONT_MATTER_JSON":
      return (
        wpConfig.frontMatterUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/front-matter.json"
      );
    case "CHAPTER_DESCRIPTIONS_JSON":
      return (
        wpConfig.chapterDescriptionsUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/chapter-descriptions.json"
      );
    case "MAGAZINE_MANIFEST_JSON":
      return (
        wpConfig.magazineManifestUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/content/magazine-manifest.json"
      );
    case "WORDPRESS_MAGAZINE_JSON":
      return wpConfig.wordpressMagazineUrl || null;
    case "LEGACY_WORDPRESS_MAGAZINE_JSON":
      return wpConfig.legacyWordPressMagazineUrl || null;
    case "ADS_URL":
      return wpConfig.adsUrl || null;
    case "ANALYTICS_URL":
      return wpConfig.analyticsUrl || null;
    case "BASE_RAW_URL":
      return (
        wpConfig.baseRawUrl ||
        "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/"
      );
    case "RUNTIME_CSS":
      return wpConfig.assetsUrl
        ? `${wpConfig.assetsUrl}runtime.css`
        : null;
    case "RUNTIME_JS":
      return wpConfig.assetsUrl
        ? `${wpConfig.assetsUrl}runtime.js`
        : null;
    default:
      return null;
  }
}

/**
 * Get the URL for a data file.
 * WordPress-localized URLs win over standalone defaults.
 */
export function getDataUrl(fileType: DataFileType): string {
  const wpUrl = getWordPressConfigUrl(fileType);
  if (wpUrl) return wpUrl;

  if (DATA_SOURCE_CONFIG.USE_EXTERNAL_URLS) {
    return DATA_SOURCE_CONFIG.EXTERNAL_URLS[fileType];
  }

  return DATA_SOURCE_CONFIG.LOCAL_PATHS[fileType];
}

/**
 * Get the reader content-source priority from WordPress when available.
 * The Reader Display Plugin currently sends:
 * 1. Magazine Content Plugin endpoint
 * 2. Legacy WordPress endpoint, temporary only
 * 3. Built-in emergency fallback
 *
 * Standalone/Figma preview still uses the GitHub content files because it is not
 * running inside the WordPress plugin shell.
 */
export function getWordPressSourcePriority(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const sourcePriority =
    window.theWordsWeCarryConfig?.sourcePriority;
  return Array.isArray(sourcePriority)
    ? sourcePriority.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}