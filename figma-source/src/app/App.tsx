import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlaceMagazineAnimation } from "@/app/components/PlaceMagazineAnimation";
import { FirstOpenAnimation } from "@/app/components/FirstOpenAnimation";
import { ReadingView } from "@/app/components/ReadingView";
import { TopBar } from "@/app/components/TopBar";
import { LeftPanel } from "@/app/components/LeftPanel";
import type { SearchEntry } from "@/app/components/SearchPanel";
import { ClosedCover } from "@/app/components/ClosedCover";
import { ClosedBackCover } from "@/app/components/ClosedBackCover";
import type { MusicTrack } from "@/app/components/MusicControl";
import type {
  MagazinePage,
  TOCEntry,
  MagazineData,
} from "@/app/data/magazine-data";
import {
  FALLBACK_MAGAZINE_DATA,
  FALLBACK_MANIFEST,
  type PublishManifest,
} from "@/app/data/fallback-data";
import { getDataUrl, getWordPressSourcePriority } from "@/app/config/data-source";
import {
  contentMap as initialContentMap,
  ContentBlock,
} from "@/app/components/MagazinePageLayouts";

const ISSUE_URL = getDataUrl("ISSUE_JSON");
const ARTICLES_URL = getDataUrl("ARTICLES_JSON");
const CHAPTERS_URL = getDataUrl("CHAPTERS_JSON");
const FRONT_MATTER_URL = getDataUrl("FRONT_MATTER_JSON");
const CHAPTER_DESCRIPTIONS_URL = getDataUrl(
  "CHAPTER_DESCRIPTIONS_JSON",
);
const MAGAZINE_MANIFEST_URL = getDataUrl("MAGAZINE_MANIFEST_JSON");
const WORDPRESS_MAGAZINE_URL = getDataUrl("WORDPRESS_MAGAZINE_JSON");
const LEGACY_WORDPRESS_MAGAZINE_URL = getDataUrl(
  "LEGACY_WORDPRESS_MAGAZINE_JSON",
);
const ADS_URL = getDataUrl("ADS_URL");
const ANALYTICS_URL = getDataUrl("ANALYTICS_URL");
const BASE_RAW_URL = getDataUrl("BASE_RAW_URL");
const WORDPRESS_SOURCE_PRIORITY = getWordPressSourcePriority();
const IS_WORDPRESS_READER_EMBED =
  typeof window !== "undefined" && !!window.theWordsWeCarryConfig;

const fetchNoStore = async (url: string) => {
  const finalUrl =
    typeof import.meta !== "undefined" && import.meta.env?.DEV
      ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`
      : url;

  return fetch(finalUrl, { cache: "no-store" });
};

const BOOKMARKS_STORAGE_KEY =
  "breathtaking-awareness-magazine-reader-bookmarks";
const CONTINUE_READING_STORAGE_KEY =
  "breathtaking-awareness-magazine-reader-last-page";

const ARTICLE_IMAGE_OVERRIDES: Record<string, string> = {};

const ARTICLE_EXTRA_IMAGE_OVERRIDES: Record<string, string[]> =
  {};

const ARTICLE_IMAGE_SUPPRESSIONS = new Set<string>();


const normalizeArticleKey = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const PUBLIC_MAGAZINE_URL =
  "https://joliel21.github.io/bta_public/";

const PAGE_STACK_OUTSIDE_WIDTH = 64;
const DESKTOP_BREAKPOINT = 768;
const AUTO_SINGLE_PAGE_BREAKPOINT = 1120;
const PHONE_SINGLE_PAGE_BREAKPOINT = 760;
const TOOLBAR_MIN_HEIGHT = 72;
const TOOLBAR_MAX_HEIGHT = 92;
const TOOLBAR_TWO_ROW_BREAKPOINT = 520;
const TOOLBAR_TWO_ROW_HEIGHT = 144;
const TOOLBAR_WIDTH_RATIO = 0.0615;
const MAX_READING_SCALE = 1.68;

const getResponsiveToolbarHeight = (width: number) => {
  if (width < TOOLBAR_TWO_ROW_BREAKPOINT) {
    return TOOLBAR_TWO_ROW_HEIGHT;
  }

  return Math.round(
    Math.min(
      TOOLBAR_MAX_HEIGHT,
      Math.max(TOOLBAR_MIN_HEIGHT, width * TOOLBAR_WIDTH_RATIO),
    ),
  );
};

const getPublicArticleShareUrl = (
  articleId: string | number,
) => {
  const safeArticleId = normalizeArticleKey(
    String(articleId || ""),
  );

  if (!safeArticleId) {
    return PUBLIC_MAGAZINE_URL;
  }

  return new URL(
    `share/${encodeURIComponent(safeArticleId)}/`,
    PUBLIC_MAGAZINE_URL,
  ).toString();
};

const sendMagazineAnalyticsEvent = (event: Record<string, unknown>) => {
  if (!ANALYTICS_URL || typeof navigator === "undefined") return;

  const eventType =
    typeof event.eventType === "string"
      ? event.eventType
      : typeof event.event === "string"
        ? event.event
        : "reader_event";

  const payload = JSON.stringify({
    ...event,
    eventType,
    issueId: event.issueId || "the-words-we-carry-volume-1",
    pageUrl:
      typeof window !== "undefined" ? window.location.href : undefined,
    referrerUrl:
      typeof document !== "undefined" ? document.referrer : undefined,
    timestamp: new Date().toISOString(),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        ANALYTICS_URL,
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }
  } catch (err) {
    // Fall through to fetch.
  }

  fetch(ANALYTICS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
};

const getCandidateItemsFromContentPayload = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.articles)) return payload.articles;
  if (Array.isArray(payload.pages)) return payload.pages;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const fetchWordPressMagazinePayload = async (
  url: string,
  sourceLabel: string,
) => {
  if (!url) return null;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${sourceLabel} returned ${response.status}`);
  }

  const payload = await response.json();
  const candidateItems = getCandidateItemsFromContentPayload(payload);

  if (candidateItems.length === 0) {
    throw new Error(`${sourceLabel} returned no magazine items`);
  }

  return payload;
};

const fetchActiveAdsPayload = async () => {
  if (!ADS_URL) return null;

  try {
    const response = await fetch(ADS_URL);
    if (!response.ok) {
      throw new Error(`Ads endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    const ads = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.ads)
        ? payload.ads
        : [];

    return { payload, ads };
  } catch (err) {
    console.warn("Ads/Sponsors endpoint could not be loaded.", err);
    return null;
  }
};

const createAdMarkdown = (ad: any) => {
  const lines = [
    ad.sponsorDisclosure || "Sponsored placement",
    ad.headline || ad.title,
    ad.subheadline,
    ad.body,
    ad.ctaText && ad.ctaUrl ? `[${ad.ctaText}](${ad.ctaUrl})` : "",
  ];

  return lines
    .filter((line) => typeof line === "string" && line.trim().length > 0)
    .join("\n\n");
};

const buildAdPageFromPlacement = (
  ad: any,
  pageNumber: number,
): MagazinePage => ({
  id: String(ad.pageId || ad.id || `ad-${pageNumber}`),
  pageNumber,
  type: "layout",
  layoutId: ad.imageUrl ? "article-image-layout" : "article-text-layout",
  alt: ad.altText || ad.title || ad.headline || "Sponsored placement",
});

const getMissingArticleMarkdown = (articleRecord: any, reason = "") => {
  const title = articleRecord?.title || "Article unavailable";
  const details = reason ? `\n\n_${reason}_` : "";

  return `# ${title}

This article could not be loaded right now. Please refresh the page or try again later.${details}`;
};

const ARTICLE_DATE_OVERRIDES: Record<string, string> = {};

type AppState =
  | "loading"
  | "closed-cover"
  | "closed-back"
  | "first-open"
  | "reading";
type PanelType = "toc" | "thumbnails" | null;

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [currentPage, setCurrentPage] = useState<
    number | "cover"
  >("cover");
  const [bookmarkedPages, setBookmarkedPages] = useState<
    number[]
  >([]);
  const [openPanel, setOpenPanel] = useState<PanelType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBranding, setShowBranding] = useState(true);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isSinglePageMode, setIsSinglePageMode] =
    useState(false);

  const [magazineData, setMagazineData] = useState<
    MagazinePage[]
  >(FALLBACK_MAGAZINE_DATA.pages);
  const [tocData, setTocData] = useState<TOCEntry[]>(
    FALLBACK_MAGAZINE_DATA.toc,
  );
  const [viewerData, setViewerData] =
    useState<MagazineData | null>(FALLBACK_MAGAZINE_DATA);
  const [manifest, setManifest] =
    useState<PublishManifest | null>(FALLBACK_MANIFEST);
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const [contentLoadMessage, setContentLoadMessage] = useState("");
  const [continueReadingPage, setContinueReadingPage] = useState<number | null>(null);
  const [hasDismissedContinueReading, setHasDismissedContinueReading] = useState(false);
  const [isPageLocked, setIsPageLocked] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBackgroundLoaded, setIsBackgroundLoaded] =
    useState(false);
  const [showIntroAnimation, setShowIntroAnimation] =
    useState(false);

  const [magazineSize] = useState({ width: 480, height: 660 });
  const [layoutScale, setLayoutScale] = useState(1);
  const [readerMetrics, setReaderMetrics] = useState(() => {
    const width =
      typeof window !== "undefined" ? window.innerWidth : 1366;
    const height =
      typeof window !== "undefined" ? window.innerHeight : 820;

    return {
      width,
      height,
      toolbarHeight: getResponsiveToolbarHeight(width),
    };
  });

  const isDesktop = readerMetrics.width >= DESKTOP_BREAKPOINT;
  const toolbarHeight =
    appState === "reading" ? readerMetrics.toolbarHeight : 0;

  // Any visible magazine turn must start from one full page, not a two-page spread.
  // This keeps the first 45-degree turn from rendering as a spread, and it keeps
  // the 90-degree sideways view from clipping inside an upright page box.
  const isMagazineTurn = tiltAngle !== 0;

  // WordPress embeds can become too narrow for a readable two-page spread even
  // while still technically being desktop-sized. When the reader root crosses
  // this breakpoint, force the magazine into one-page view without changing the
  // user's selected view-mode preference.
  const isPhoneOrNarrowReader =
    readerMetrics.width < PHONE_SINGLE_PAGE_BREAKPOINT;

  const isAutoSinglePageDueToNarrowScreen =
    appState === "reading" &&
    !isSinglePageMode &&
    !isMagazineTurn &&
    readerMetrics.width < AUTO_SINGLE_PAGE_BREAKPOINT;

  const effectiveSinglePageMode =
    isSinglePageMode ||
    isMagazineTurn ||
    isAutoSinglePageDueToNarrowScreen;

  const [showExpandScreenNotice, setShowExpandScreenNotice] =
    useState(false);
  const wasAutoSinglePageDueToNarrowScreenRef = useRef(false);

  useEffect(() => {
    const didJustShrinkFromSpreadToSingle =
      isAutoSinglePageDueToNarrowScreen &&
      !wasAutoSinglePageDueToNarrowScreenRef.current;

    if (didJustShrinkFromSpreadToSingle) {
      setShowExpandScreenNotice(true);
    }

    if (!isAutoSinglePageDueToNarrowScreen) {
      setShowExpandScreenNotice(false);
    }

    wasAutoSinglePageDueToNarrowScreenRef.current =
      isAutoSinglePageDueToNarrowScreen;
  }, [isAutoSinglePageDueToNarrowScreen]);

  // Layout State & History
  const [layoutState, setLayoutState] = useState<
    Record<string, { blocks: ContentBlock[] }>
  >(() => {
    // Initialize with IDs to avoid key warnings
    const initialized: any = {};
    if (initialContentMap) {
      Object.entries(initialContentMap).forEach(
        ([key, value]) => {
          initialized[key] = {
            ...value,
            blocks: value.blocks
              ? value.blocks.map((b, i) => ({
                  ...b,
                  _id:
                    b._id ||
                    `block-${key}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                }))
              : [],
          };
        },
      );
    }
    return initialized;
  });

  // History now stores the state AND the page that was modified
  const [history, setHistory] = useState<
    {
      state: Record<string, { blocks: ContentBlock[] }>;
      pageId: string;
    }[]
  >([]);
  const [future, setFuture] = useState<
    {
      state: Record<string, { blocks: ContentBlock[] }>;
      pageId: string;
    }[]
  >([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedBookmarks = window.localStorage.getItem(
        BOOKMARKS_STORAGE_KEY,
      );

      if (!storedBookmarks) return;

      const parsedBookmarks = JSON.parse(storedBookmarks);

      if (Array.isArray(parsedBookmarks)) {
        setBookmarkedPages(
          parsedBookmarks
            .map((page) => Number(page))
            .filter(
              (page) =>
                Number.isInteger(page) &&
                page >= 0 &&
                page <= 10000,
            ),
        );
      }
    } catch (err) {
      console.warn("Could not load magazine bookmarks:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify(bookmarkedPages),
      );
    } catch (err) {
      console.warn("Could not save magazine bookmarks:", err);
    }
  }, [bookmarkedPages]);


  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedPage = Number(
        window.localStorage.getItem(CONTINUE_READING_STORAGE_KEY),
      );

      if (Number.isFinite(storedPage) && storedPage > 1) {
        setContinueReadingPage(storedPage);
      }
    } catch (err) {
      console.warn("Could not load continue-reading page:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appState !== "reading" || typeof currentPage !== "number") return;

    try {
      window.localStorage.setItem(
        CONTINUE_READING_STORAGE_KEY,
        String(currentPage),
      );
      if (currentPage > 1) {
        setContinueReadingPage(currentPage);
      }
    } catch (err) {
      console.warn("Could not save continue-reading page:", err);
    }
  }, [appState, currentPage]);

  const getPageNumberFromId = (id: string): number | null => {
    const page = magazineData.find((p) => p.id === id);
    return page ? page.pageNumber : null;
  };

  const handleUpdateLayout = (
    pageId: string,
    newBlocks: ContentBlock[],
  ) => {
    // Save to history (limit to 10)
    setHistory((prev) => {
      const newHistory = [
        ...prev,
        { state: layoutState, pageId },
      ];
      return newHistory.slice(-10);
    });
    setFuture([]); // Clear redo stack

    setLayoutState((prev) => {
      // Handle both ID formats: 'christina-5' or '5' or internal ID
      // The pageId passed from ReadingView comes from page.id which matches keys in contentMap
      return {
        ...prev,
        [pageId]: { ...prev[pageId], blocks: newBlocks },
      };
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousEntry = history[history.length - 1];
    const { state: previousState, pageId } = previousEntry;

    // Check if we need to navigate
    const targetPageNumber = getPageNumberFromId(pageId);

    // If target page is valid and we are NOT on that page
    if (targetPageNumber && currentPage !== targetPageNumber) {
      // Ask for verification
      if (
        window.confirm(
          `Undo change on Page ${targetPageNumber}?`,
        )
      ) {
        setCurrentPage(targetPageNumber);
        setAppState("reading");
      } else {
        return; // Cancel undo
      }
    }

    const newHistory = history.slice(0, -1);

    // Push current state to future with the SAME pageId (since this is the page being reverted)
    setFuture((prev) => [
      { state: layoutState, pageId },
      ...prev,
    ]);
    setHistory(newHistory);
    setLayoutState(previousState);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextEntry = future[0];
    const { state: nextState, pageId } = nextEntry;

    // Check if we need to navigate
    const targetPageNumber = getPageNumberFromId(pageId);

    if (targetPageNumber && currentPage !== targetPageNumber) {
      if (
        window.confirm(
          `Redo change on Page ${targetPageNumber}?`,
        )
      ) {
        setCurrentPage(targetPageNumber);
        setAppState("reading");
      } else {
        return;
      }
    }

    const newFuture = future.slice(1);

    setHistory((prev) => {
      const newHistory = [
        ...prev,
        { state: layoutState, pageId },
      ];
      return newHistory.slice(-10);
    });
    setFuture(newFuture);
    setLayoutState(nextState);
  };

  const handleResetPage = (pageId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to reset this page to its default layout?",
      )
    )
      return;

    // Save current state to history before resetting
    setHistory((prev) => {
      const newHistory = [
        ...prev,
        { state: layoutState, pageId },
      ];
      return newHistory.slice(-10);
    });
    setFuture([]);

    setLayoutState((prev) => {
      // Reset to initial state from contentMap
      const initialPageData = initialContentMap[pageId];
      if (!initialPageData) return prev; // Should not happen if data is consistent

      // Re-initialize blocks with fresh IDs to ensure clean state
      const resetBlocks = initialPageData.blocks
        ? initialPageData.blocks.map((b, i) => ({
            ...b,
            _id:
              b._id ||
              `block-${pageId}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          }))
        : [];

      return {
        ...prev,
        [pageId]: { ...prev[pageId], blocks: resetBlocks },
      };
    });
  };

  const handleResetBoth = (leftId: string, rightId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to reset BOTH pages to their default layouts?",
      )
    )
      return;

    // Save history (we mark pageId as 'both' or just the first one? History struct expects pageId.
    // Let's just say 'spread' or leftId for now, layoutState captures all.)
    setHistory((prev) => {
      const newHistory = [
        ...prev,
        { state: layoutState, pageId: `${leftId}+${rightId}` },
      ];
      return newHistory.slice(-10);
    });
    setFuture([]);

    setLayoutState((prev) => {
      const newState = { ...prev };

      [leftId, rightId].forEach((pid) => {
        const initialPageData = initialContentMap[pid];
        if (initialPageData) {
          const resetBlocks = initialPageData.blocks
            ? initialPageData.blocks.map((b, i) => ({
                ...b,
                _id:
                  b._id ||
                  `block-${pid}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              }))
            : [];

          newState[pid] = {
            ...newState[pid],
            blocks: resetBlocks,
          };
        }
      });

      return newState;
    });
  };

  // Calculate current visible pages for Reset buttons
  let leftPageId: string | null = null;
  let rightPageId: string | null = null;

  if (appState === "reading" && currentPage !== "cover") {
    if (isDesktop && !effectiveSinglePageMode) {
      const pageNum = currentPage as number;
      const isEven = pageNum % 2 === 0;
      const leftNum = isEven ? pageNum : pageNum - 1;
      const rightNum = leftNum + 1;

      const leftPage = magazineData.find(
        (p) => p.pageNumber === leftNum,
      );
      const rightPage = magazineData.find(
        (p) => p.pageNumber === rightNum,
      );

      if (leftPage) leftPageId = leftPage.id;
      if (rightPage) rightPageId = rightPage.id;
    } else {
      // Single page mode
      const page = magazineData.find(
        (p) => p.pageNumber === currentPage,
      );
      if (page) leftPageId = page.id; // Treat single page as "left" (primary) for simplicity or handle specifically
    }
  }

  const handleSave = () => {
    // In a real app, this would save to Supabase
    alert("Layout changes saved (in-memory)!");
  };

  useEffect(() => {
    const getReaderRect = () => {
      const root = document.getElementById(
        "the-words-we-carry-root",
      );
      const rect = root?.getBoundingClientRect();

      return {
        width:
          rect && rect.width > 0
            ? rect.width
            : window.innerWidth,
        height:
          rect && rect.height > 0
            ? rect.height
            : window.innerHeight,
      };
    };

    const handleResize = () => {
      const { width, height } = getReaderRect();
      const isDesktop = width >= DESKTOP_BREAKPOINT;
      const responsiveToolbarHeight =
        getResponsiveToolbarHeight(width);

      setReaderMetrics((current) => {
        if (
          current.width === width &&
          current.height === height &&
          current.toolbarHeight === responsiveToolbarHeight
        ) {
          return current;
        }

        return {
          width,
          height,
          toolbarHeight: responsiveToolbarHeight,
        };
      });

      const BASE_WIDTH = magazineSize.width;
      const BASE_HEIGHT = magazineSize.height;
      const TOP_BAR_HEIGHT =
        appState === "reading" ? responsiveToolbarHeight : 0;

      // Use the actual WordPress shortcode/root size, not the whole browser
      // window. WordPress themes add headers, margins, admin bars, and page
      // wrappers, so window.innerHeight can make the magazine too tall.
      // Determine target layout first so single-page mode can use more of the
      // available space while still leaving balanced background above/below.
      const isTurn = tiltAngle !== 0;
      const isSpread =
        width >= AUTO_SINGLE_PAGE_BREAKPOINT &&
        !isSinglePageMode &&
        !isTurn;
      const isOnePageLayout = !isSpread && !isTurn;

      const horizontalMargin = isDesktop
        ? isOnePageLayout
          ? Math.max(24, Math.min(56, width * 0.032))
          : Math.max(56, Math.min(96, width * 0.055))
        : 18;
      const verticalMargin = isDesktop
        ? isOnePageLayout
          ? Math.max(12, Math.min(22, height * 0.022))
          : Math.max(24, Math.min(42, height * 0.04))
        : 12;

      const availableWidth = Math.max(
        320,
        width - horizontalMargin,
      );
      const availableHeight = Math.max(
        360,
        height - TOP_BAR_HEIGHT - verticalMargin * 2,
      );

      // Determine target layout dimensions based on view mode.
      // During any visible turn, render one page and fit the rotated page's
      // bounding box.
      let targetWidth: number;
      let targetHeight: number;

      if (isTurn) {
        const radians = (Math.abs(tiltAngle) * Math.PI) / 180;
        targetWidth =
          Math.abs(Math.cos(radians)) * BASE_WIDTH +
          Math.abs(Math.sin(radians)) * BASE_HEIGHT;
        targetHeight =
          Math.abs(Math.sin(radians)) * BASE_WIDTH +
          Math.abs(Math.cos(radians)) * BASE_HEIGHT;
      } else {
        targetWidth = isSpread
          ? BASE_WIDTH * 2 + PAGE_STACK_OUTSIDE_WIDTH * 2
          : BASE_WIDTH;
        targetHeight = BASE_HEIGHT;
      }

      const scaleX = availableWidth / targetWidth;
      const scaleY = availableHeight / targetHeight;

      let newScale: number;

      if (isSpread || isTurn) {
        // Spreads and turned pages must fit fully inside the WordPress root.
        newScale = Math.min(scaleX, scaleY);
      } else {
        // Single-page view should use the available desktop space more fully
        // while preserving the page ratio and keeping balanced background above
        // and below the book. The cap prevents oversized pages on very large
        // monitors but allows a substantially larger single page than spreads.
        newScale = Math.min(scaleX, scaleY, MAX_READING_SCALE);
      }

      // Let very small screens and short landscape viewports scale lower so
      // the page never clips behind the toolbar. Larger screens keep the
      // previous readability floor.
      const minReadableScale =
        width < 420 || height < 520
          ? 0.34
          : width < PHONE_SINGLE_PAGE_BREAKPOINT
            ? 0.42
            : 0.55;

      newScale = Math.max(
        minReadableScale,
        Math.min(newScale, MAX_READING_SCALE),
      );

      setLayoutScale(newScale);
    };

    handleResize();

    const root = document.getElementById(
      "the-words-we-carry-root",
    );
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && root
        ? new ResizeObserver(handleResize)
        : null;

    if (resizeObserver && root) {
      resizeObserver.observe(root);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "orientationchange",
        handleResize,
      );
    };
  }, [appState, isSinglePageMode, magazineSize, tiltAngle]);

  const [musicLibrary, setMusicLibrary] = useState<
    MusicTrack[]
  >([]);
  const [selectedTrackId, setSelectedTrackId] = useState<
    string | null
  >(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isRepeatingCurrentTrack, setIsRepeatingCurrentTrack] =
    useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedTrackIdRef = useRef<string | null>(null);

  const handlePlaceMagazineComplete = () => {
    setAppState("closed-cover");
  };

  const handleOpenMagazine = () => {
    setAppState("reading");
    setCurrentPage(1);
  };

  const handleResumeReading = () => {
    const safePage = Math.min(
      Math.max(1, continueReadingPage || 1),
      Math.max(1, magazineData.length - 1),
    );
    setAppState("reading");
    setCurrentPage(safePage);
  };

  const handleStartFromBeginning = () => {
    setAppState("reading");
    setCurrentPage(1);
  };

  const handleFirstOpenComplete = () => {
    setAppState("reading");
    setCurrentPage(1);
  };

  const handleBackToCover = () => {
    setAppState("closed-cover");
    setCurrentPage("cover");
    setOpenPanel(null);
  };

  const handlePrevious = () => {
    if (currentPage === "cover") return;

    const isDesktop = window.innerWidth >= 768;
    const isSpread =
      readerMetrics.width >= AUTO_SINGLE_PAGE_BREAKPOINT &&
      !effectiveSinglePageMode;

    if (isSpread) {
      if (currentPage <= 1) {
        setAppState("closed-cover");
        setCurrentPage("cover");
        setOpenPanel(null);
      } else {
        setCurrentPage(Math.max(1, currentPage - 2));
      }
    } else {
      if (currentPage <= 0) {
        setAppState("closed-cover");
        setCurrentPage("cover");
        setOpenPanel(null);
      } else {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentPage === "cover") return;

    const isDesktop = window.innerWidth >= 768;
    const isSpread =
      readerMetrics.width >= AUTO_SINGLE_PAGE_BREAKPOINT &&
      !effectiveSinglePageMode;
    const totalPages = magazineData.length;

    if (isSpread) {
      if (currentPage >= totalPages - 2) {
        setAppState("closed-back");
        setCurrentPage("cover");
        setOpenPanel(null);
      } else {
        setCurrentPage(currentPage + 2);
      }
    } else {
      if (currentPage >= totalPages - 1) {
        setAppState("closed-back");
        setCurrentPage("cover");
        setOpenPanel(null);
      } else {
        setCurrentPage(currentPage + 1);
      }
    }
  };

  const handlePageJump = (page: number | "back-cover") => {
    if (page === "back-cover") {
      setAppState("closed-back");
      setCurrentPage("cover");
      setOpenPanel(null);
      return;
    }

    setCurrentPage(page);
    setAppState("reading");
  };

  const currentBookmarkPage =
    currentPage === "cover" ? null : currentPage;

  const isCurrentPageBookmarked =
    currentBookmarkPage !== null &&
    bookmarkedPages.includes(currentBookmarkPage);

  const handleToggleBookmark = () => {
    if (currentBookmarkPage === null) return;

    setBookmarkedPages((currentBookmarks) => {
      const nextBookmarks = new Set(currentBookmarks);

      if (nextBookmarks.has(currentBookmarkPage)) {
        nextBookmarks.delete(currentBookmarkPage);
      } else {
        nextBookmarks.add(currentBookmarkPage);
      }

      return Array.from(nextBookmarks).sort((a, b) => a - b);
    });
  };

  const handleGoToBookmark = (page: number) => {
    handlePageJump(page);
    setOpenPanel(null);
  };

  const handleClearBookmarks = () => {
    setBookmarkedPages([]);
  };

  const getSharedArticleIdFromUrl = () => {
    if (typeof window === "undefined") return "";

    const params = new URLSearchParams(window.location.search);
    return params.get("article") || "";
  };

  const findArticleTitlePageNumber = (
    pages: MagazinePage[],
    sharedArticleId: string,
  ) => {
    const normalizedSharedArticleId =
      normalizeArticleKey(sharedArticleId);

    if (!normalizedSharedArticleId) return null;

    const targetPage = pages.find((page) => {
      if (!page.id.startsWith("article-")) return false;
      if (!page.id.endsWith("-title")) return false;

      const rawArticleId = page.id
        .replace(/^article-/, "")
        .replace(/-title$/, "");

      return (
        normalizeArticleKey(rawArticleId) ===
        normalizedSharedArticleId
      );
    });

    return targetPage?.pageNumber || null;
  };

  const openSharedArticleIfPresent = (
    pages: MagazinePage[],
  ) => {
    const sharedArticleId = getSharedArticleIdFromUrl();
    if (!sharedArticleId) return false;

    const pageNumber = findArticleTitlePageNumber(
      pages,
      sharedArticleId,
    );

    if (!pageNumber) return false;

    setCurrentPage(pageNumber);
    setAppState("reading");
    setOpenPanel(null);
    return true;
  };

  useEffect(() => {
    if (currentPage === "cover") return;

    const isDesktop = window.innerWidth >= 768;
    let announcement = "";

    if (isDesktop && !effectiveSinglePageMode) {
      const pageNum = currentPage as number;
      const isEven = pageNum % 2 === 0;
      const leftNum = isEven ? pageNum : pageNum - 1;
      const rightNum = leftNum + 1;

      if (leftNum > 0 && rightNum <= magazineData.length) {
        announcement = `Pages ${leftNum} to ${rightNum} of ${magazineData.length}`;
      } else if (leftNum > 0) {
        announcement = `Page ${leftNum} of ${magazineData.length}`;
      } else {
        announcement = `Page ${rightNum} of ${magazineData.length}`;
      }
    } else {
      announcement = `Page ${currentPage} of ${magazineData.length}`;
    }

    const announcer = document.createElement("div");
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "sr-only";
    announcer.textContent = announcement;
    document.body.appendChild(announcer);

    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, [currentPage, magazineData.length]);

  const handleToggleTOC = () => {
    setOpenPanel((prev) => (prev === "toc" ? null : "toc"));
  };

  const handleToggleThumbnails = () => {
    setOpenPanel((prev) =>
      prev === "thumbnails" ? null : "thumbnails",
    );
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  const canGoPrevious = currentPage !== "cover";
  const canGoNext = currentPage !== "cover";
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  const handleReaderTouchStart = (
    event: ReactTouchEvent<HTMLElement>,
  ) => {
    if (
      appState !== "reading" ||
      currentPage === "cover" ||
      openPanel
    ) {
      touchStartRef.current = null;
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "button, input, textarea, select, a, [role='button']",
      )
    ) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleReaderTouchEnd = (
    event: ReactTouchEvent<HTMLElement>,
  ) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (
      !start ||
      appState !== "reading" ||
      currentPage === "cover" ||
      openPanel
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const elapsed = Date.now() - start.time;

    const minimumSwipeDistance = isPhoneOrNarrowReader
      ? 42
      : 56;
    const maximumVerticalDrift = isPhoneOrNarrowReader
      ? 92
      : 80;

    if (
      elapsed > 1200 ||
      Math.abs(deltaX) < minimumSwipeDistance ||
      Math.abs(deltaY) > maximumVerticalDrift ||
      Math.abs(deltaX) < Math.abs(deltaY) * 1.15
    ) {
      return;
    }

    if (deltaX < 0 && canGoNext) {
      handleNext();
    } else if (deltaX > 0 && canGoPrevious) {
      handlePrevious();
    }
  };

  const stringifySearchValue = (value: unknown): string => {
    if (value == null || typeof value === "boolean") return "";
    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value
        .map(stringifySearchValue)
        .filter(Boolean)
        .join(" ");
    }
    if (typeof value === "object") {
      const maybeReactNode = value as {
        props?: { children?: unknown };
        title?: unknown;
        content?: unknown;
        text?: unknown;
        alt?: unknown;
        question?: unknown;
        answer?: unknown;
      };

      return [
        maybeReactNode.props?.children,
        maybeReactNode.title,
        maybeReactNode.content,
        maybeReactNode.text,
        maybeReactNode.alt,
        maybeReactNode.question,
        maybeReactNode.answer,
      ]
        .map(stringifySearchValue)
        .filter(Boolean)
        .join(" ");
    }

    return "";
  };

  const generatedTOC = useMemo(() => {
    // Check if current TOC is just the fallback default
    const isFallback =
      tocData.length === 1 &&
      tocData[0].title === "Navigating the Unpredictable";

    // If we have explicit custom TOC entries (more than fallback or different), use them
    if (!isFallback && tocData.length > 0) {
      return tocData.map((entry) => ({
        ...entry,
        level: entry.level ?? 0,
      }));
    }

    // Otherwise, generate dynamic TOC from content
    const entries: TOCEntry[] = [];

    magazineData.forEach((page) => {
      const pageState = layoutState[page.id];
      if (!pageState) return;

      // 1. Page Title (Main Headline)
      if (pageState.title) {
        entries.push({
          id: `toc-${page.id}-title`,
          title: pageState.title,
          pageNumber: page.pageNumber,
          level: 0,
        });
      }

      // 2. Scan blocks
      if (pageState.blocks) {
        pageState.blocks.forEach((block, index) => {
          // Subheadings -> Level 1
          if (block.type === "subheading") {
            entries.push({
              id: `toc-${page.id}-sub-${index}`,
              title: block.content,
              pageNumber: page.pageNumber,
              level: 1,
            });
          }
          // TOC Section -> Level 0
          if (block.type === "toc-section") {
            entries.push({
              id: `toc-${page.id}-sect-${index}`,
              title: block.title,
              pageNumber: page.pageNumber,
              level: 0,
            });
          }
          // TOC Entry -> Level 1 (or 0 if intended)
          if (block.type === "toc-entry") {
            entries.push({
              id: `toc-${page.id}-entry-${index}`,
              title: block.title,
              pageNumber:
                parseInt(block.pageNumber) || page.pageNumber,
              level: 1,
            });
          }
        });
      }
    });

    // If nothing generated (e.g. empty pages), fallback to at least one entry if possible, or just empty
    if (entries.length === 0 && isFallback) {
      return tocData;
    }

    return entries;
  }, [tocData, layoutState, magazineData]);

  const thumbnails = magazineData.map((page) => ({
    pageNumber: page.pageNumber,
    imageUrl: page.imageUrl,
    page,
    blocks: layoutState[page.id]?.blocks,
  }));

  const searchEntries = useMemo<SearchEntry[]>(() => {
    const articleTocEntries = generatedTOC
      .filter((entry) =>
        String(entry.id || "").startsWith("toc-article-"),
      )
      .sort((a, b) => a.pageNumber - b.pageNumber);

    return magazineData
      .filter((page) => page.pageNumber > 0)
      .map((page) => {
        const pageState = layoutState[page.id] as
          | {
              title?: string;
              byline?: string;
              blocks?: ContentBlock[];
            }
          | undefined;

        const tocEntry = generatedTOC.find(
          (entry) => entry.pageNumber === page.pageNumber,
        );

        const exactArticleTocEntry = articleTocEntries.find(
          (entry) => entry.pageNumber === page.pageNumber,
        );

        const currentArticleTocEntry = [...articleTocEntries]
          .reverse()
          .find((entry) => entry.pageNumber <= page.pageNumber);

        const blockText = (pageState?.blocks || [])
          .map((block) => {
            switch (block.type) {
              case "toc-section":
              case "chapter-divider":
                return stringifySearchValue(block.title);
              case "toc-entry":
                return stringifySearchValue(block.title);
              case "qa":
                return `${block.question} ${block.answer}`;
              case "image":
                return `${block.alt || ""} ${block.credit || ""}`;
              case "image-collage":
                return block.images
                  .map(
                    (image) =>
                      `${image.alt || ""} ${image.credit || ""}`,
                  )
                  .join(" ");
              case "collage-block":
                return block.items
                  .map(
                    (item) =>
                      `${item.title || ""} ${item.subtitle || ""} ${item.alt || ""}`,
                  )
                  .join(" ");
              case "fact-box":
                return `${block.title || ""} ${block.content || ""}`;
              case "references":
                return block.content.join(" ");
              case "link-button":
                return `${block.text || ""} ${block.href || ""}`;
              case "share":
                return `${block.articleTitle || ""} ${block.articleUrl || ""}`;
              default:
                return stringifySearchValue(
                  (block as { content?: unknown }).content,
                );
            }
          })
          .filter(Boolean)
          .join(" ");

        const title =
          pageState?.title ||
          tocEntry?.title ||
          (page.layoutId
            ? page.layoutId.replace(/[-_]+/g, " ")
            : "") ||
          `Page ${page.pageNumber}`;

        const searchableText = [
          title,
          pageState?.byline,
          tocEntry?.title,
          page.alt,
          blockText,
        ]
          .map(stringifySearchValue)
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        const articleTitle =
          exactArticleTocEntry?.title ||
          (page.id.startsWith("article-")
            ? currentArticleTocEntry?.title
            : "") ||
          title;

        const pageTitle = title;

        return {
          id: page.id,
          pageNumber: page.pageNumber,
          title: articleTitle,
          articleTitle,
          pageTitle,
          chapter:
            tocEntry?.level === 0 &&
            !String(tocEntry.id || "").startsWith(
              "toc-article-",
            )
              ? tocEntry.title
              : undefined,
          text: searchableText,
        };
      })
      .filter((entry) => entry.text.length > 0);
  }, [magazineData, layoutState, generatedTOC]);

  const handleToggleMusic = (playing: boolean) => {
    if (
      playing &&
      !selectedTrackId &&
      musicLibrary.length > 0
    ) {
      setSelectedTrackId(musicLibrary[0].id);
    }

    setIsMusicPlaying(playing);
  };

  const handleToggleRepeatCurrentTrack = () => {
    setIsRepeatingCurrentTrack((current) => !current);
  };

  const getTrackIndex = (trackId: string | null) =>
    musicLibrary.findIndex((track) => track.id === trackId);

  const getPreviousTrackId = () => {
    if (musicLibrary.length === 0) return null;

    const currentIndex = getTrackIndex(selectedTrackId);
    const previousIndex =
      currentIndex > 0
        ? currentIndex - 1
        : musicLibrary.length - 1;

    return musicLibrary[previousIndex]?.id || null;
  };

  const getNextTrackId = () => {
    if (musicLibrary.length === 0) return null;

    const currentIndex = getTrackIndex(selectedTrackId);
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % musicLibrary.length
        : 0;

    return musicLibrary[nextIndex]?.id || null;
  };

  const handlePreviousMusicTrack = () => {
    const previousTrackId = getPreviousTrackId();
    if (!previousTrackId) return;

    lastPlayedTrackIdRef.current = selectedTrackId;
    setSelectedTrackId(previousTrackId);
    setIsMusicPlaying(true);
  };

  const handleNextMusicTrack = () => {
    const nextTrackId = getNextTrackId();
    if (!nextTrackId) return;

    lastPlayedTrackIdRef.current = selectedTrackId;
    setSelectedTrackId(nextTrackId);
    setIsMusicPlaying(true);
  };

  const handleSelectMusicTrack = (trackId: string | null) => {
    if (!trackId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setSelectedTrackId(null);
      setIsMusicPlaying(false);
      return;
    }

    lastPlayedTrackIdRef.current = selectedTrackId;
    setSelectedTrackId(trackId);
    setIsMusicPlaying(true);
  };

  useEffect(() => {
    if (musicLibrary.length === 0) {
      setSelectedTrackId(null);
      setIsMusicPlaying(false);
      return;
    }

    const trackIds = musicLibrary.map((track) => track.id);

    if (
      !selectedTrackId ||
      !trackIds.includes(selectedTrackId)
    ) {
      setSelectedTrackId(trackIds[0]);
    }
  }, [musicLibrary, selectedTrackId]);

  useEffect(() => {
    const selectedTrack = musicLibrary.find(
      (track) => track.id === selectedTrackId,
    );

    if (!selectedTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.loop = false;
    audio.volume = musicVolume;
    audio.preload = "auto";

    const resolvedAudioUrl = new URL(
      selectedTrack.url,
      window.location.href,
    ).href;

    if (audio.src !== resolvedAudioUrl) {
      audio.pause();
      audio.src = selectedTrack.url;
      audio.currentTime = 0;
      audio.load();
    }

    audio.onended = () => {
      if (isRepeatingCurrentTrack) {
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.error("Error replaying audio:", err);
          setIsMusicPlaying(false);
        });
        return;
      }

      const trackIds = musicLibrary.map((track) => track.id);

      if (trackIds.length === 0) {
        setIsMusicPlaying(false);
        return;
      }

      const currentIndex = trackIds.indexOf(selectedTrack.id);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + 1) % trackIds.length
          : 0;
      const nextTrackId = trackIds[nextIndex];

      lastPlayedTrackIdRef.current = selectedTrack.id;
      setSelectedTrackId(nextTrackId);
      setIsMusicPlaying(true);
    };

    if (isMusicPlaying) {
      audio.play().catch((err) => {
        console.error("Error playing audio:", err);
        setIsMusicPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [
    selectedTrackId,
    isMusicPlaying,
    musicLibrary,
    musicVolume,
    isRepeatingCurrentTrack,
  ]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchGithubData = async () => {
      try {
        setContentLoadMessage("Loading magazine content…");
        let wordpressPayload: any = null;
        let wordpressContentSource = "";

        const wordpressSourcePriority =
          WORDPRESS_SOURCE_PRIORITY.length > 0
            ? WORDPRESS_SOURCE_PRIORITY
            : [
                "wordpress_content_plugin",
                "legacy_wordpress_endpoint_temporary",
              ];

        const wordpressContentSources = wordpressSourcePriority
          .map((sourceKey) => {
            if (sourceKey === "wordpress_content_plugin") {
              return {
                sourceKey,
                label: "Magazine Content Plugin endpoint",
                url: WORDPRESS_MAGAZINE_URL,
              };
            }

            if (sourceKey === "legacy_wordpress_endpoint_temporary") {
              return {
                sourceKey,
                label: "Legacy WordPress endpoint temporary fallback",
                url: LEGACY_WORDPRESS_MAGAZINE_URL,
              };
            }

            return null;
          })
          .filter(
            (source): source is {
              sourceKey: string;
              label: string;
              url: string;
            } => !!source && !!source.url,
          );

        for (const source of wordpressContentSources) {
          try {
            const candidatePayload = await fetchWordPressMagazinePayload(
              source.url,
              source.label,
            );

            if (candidatePayload) {
              wordpressPayload = candidatePayload;
              wordpressContentSource = source.sourceKey;
              break;
            }
          } catch (wordpressErr) {
            console.warn(
              `${source.label} could not be loaded. Trying next configured fallback.`,
              wordpressErr,
            );
          }
        }

        const activeAdsPayload = await fetchActiveAdsPayload();
        const contentSource =
          wordpressContentSource ||
          (IS_WORDPRESS_READER_EMBED
            ? "built_in_emergency"
            : "github");
        let articlesRaw: any;
        let chaptersRaw: any;
        let frontMatterRaw: any;
        let chapterDescriptionsRaw: any;
        let magazineManifestRaw: any = null;

        if (wordpressPayload) {
          articlesRaw = wordpressPayload.articles || wordpressPayload.pages || [];
          chaptersRaw = wordpressPayload.chapters || [];
          frontMatterRaw = wordpressPayload.frontMatter || { pages: [] };
          chapterDescriptionsRaw = wordpressPayload.chapterDescriptions || {};
        } else {
          const issueRes = await fetchNoStore(ISSUE_URL);

          if (!issueRes.ok) {
            throw new Error("Failed to fetch GitHub issue.json");
          }

          const issueRaw = await issueRes.json();
          articlesRaw = { articles: issueRaw.articles || [] };
          chaptersRaw = { chapters: issueRaw.chapters || [] };
          frontMatterRaw = { pages: issueRaw.frontMatterPages || [] };
          chapterDescriptionsRaw = Array.isArray(issueRaw.chapterDescriptions)
            ? issueRaw.chapterDescriptions.reduce((map: Record<string, any>, item: any) => {
                if (item?.slug) map[item.slug] = item;
                return map;
              }, {})
            : issueRaw.chapterDescriptions || {};
          magazineManifestRaw = {
            ...issueRaw,
            runtime: issueRaw.runtime || {},
            music: issueRaw.music || {},
            readerContext: issueRaw.readerContext || {},
            backMatterPages: issueRaw.backMatterPages || [],
            adPages: issueRaw.adPages || [],
          };
        }

        if (articlesRaw && chaptersRaw) {

          const articles = Array.isArray(articlesRaw)
            ? articlesRaw
            : articlesRaw.articles || [];
          const chapters = Array.isArray(chaptersRaw)
            ? chaptersRaw
            : chaptersRaw.chapters || [];
          const frontMatterPages = Array.isArray(frontMatterRaw)
            ? frontMatterRaw
            : frontMatterRaw.pages || [];
          const chapterDescriptionDataBySlug =
            chapterDescriptionsRaw &&
            typeof chapterDescriptionsRaw === "object"
              ? chapterDescriptionsRaw
              : {};

          const resolveGithubContentUrl = (pathValue = "") => {
            const cleanPath = String(pathValue || "")
              .trim()
              .replace(/^public\//, "")
              .replace(/^\//, "");

            if (!cleanPath) return "";
            if (/^https?:\/\//i.test(cleanPath))
              return cleanPath;

            return BASE_RAW_URL + cleanPath;
          };

          const loadGithubMarkdown = async (pathValue = "") => {
            const markdownUrl =
              resolveGithubContentUrl(pathValue);
            if (!markdownUrl) return "";

            try {
              const markdownRes = await fetch(
                encodeURI(markdownUrl),
              );
              return markdownRes.ok
                ? await markdownRes.text()
                : "";
            } catch (markdownErr) {
              console.error(
                "Failed to load GitHub markdown page:",
                markdownErr,
              );
              return "";
            }
          };

          if (!magazineManifestRaw) {
            try {
              const magazineManifestRes = await fetchNoStore(MAGAZINE_MANIFEST_URL);
              magazineManifestRaw = magazineManifestRes.ok
                ? await magazineManifestRes.json()
                : null;
            } catch (magazineManifestErr) {
              console.warn(
                "Magazine manifest could not be loaded. Back-matter placement will use generated content only.",
                magazineManifestErr,
              );
              magazineManifestRaw = null;
            }
          }

          const normalizedChapterDescriptionDataBySlug: Record<
            string,
            { title: string; body: string }
          > = {};

          for (const [slug, rawDescription] of Object.entries(
            chapterDescriptionDataBySlug as Record<string, any>,
          )) {
            const description = rawDescription || {};
            const markdownBody = description.markdownPath
              ? await loadGithubMarkdown(
                  description.markdownPath,
                )
              : "";

            normalizedChapterDescriptionDataBySlug[slug] = {
              title: description.title || "",
              body: markdownBody || description.body || "",
            };
          }

          const newPages: MagazinePage[] = [];
          const newToc: TOCEntry[] = [];
          const newLayoutState: Record<
            string,
            { blocks: ContentBlock[] }
          > = {};

          // Inside cover + TOC + maybe a generic intro?
          // Let's preserve the cover info from FALLBACK_MAGAZINE_DATA, but generate dynamic pages.
          let pageNum = 1;
          let articleIndex = 0;

          const getChapterDividerData = (
            articleRecord: any,
          ) => {
            const chapterTitle =
              articleRecord.chapter ||
              articleRecord.chapterTitle ||
              articleRecord.chapterSlug ||
              "";

            const chapterSlug =
              articleRecord.chapterSlug ||
              String(chapterTitle)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            if (chapterSlug === "the-phlip-side") {
              return {
                slug: chapterSlug,
                title: "The PHlip-side",
                subtitle: "",
                eyebrow:
                  "Pulmonary Hypertension News (Bionews)",
              };
            }

            if (
              chapterSlug ===
              "scleroderma-foundation-of-greater-chicago"
            ) {
              return {
                slug: chapterSlug,
                title: "Beyond the Column",
                subtitle: "",
                eyebrow: "",
              };
            }

            if (chapterSlug === "rants-of-the-psyche") {
              return {
                slug: chapterSlug,
                title: "Rants in Writing",
                subtitle: "",
                eyebrow: "Rants of the Psyche",
              };
            }

            if (chapterSlug === "tips-tricks") {
              return {
                slug: chapterSlug,
                title: "Tips & Tricks",
                subtitle: "Practical support for daily life",
                eyebrow: "Patient and caregiver support",
              };
            }

            return {
              slug: chapterSlug || `chapter-${articleIndex}`,
              title: chapterTitle || "Chapter",
              subtitle: "",
              eyebrow: "",
            };
          };

          let reservedPageId = "inside-front-cover-page";
          let whatsInsideRightPageId =
            "whats-inside-right-page";
          const lockedBlankBeforeDearReaderPageIds =
            new Set<string>();

          for (const frontPage of frontMatterPages) {
            if (!frontPage || !frontPage.id) continue;

            const pageId = String(frontPage.id);
            const pageNumber =
              typeof frontPage.pageNumber === "number"
                ? frontPage.pageNumber
                : pageNum;

            if (pageNumber === 0) {
              reservedPageId = pageId;
            }

            if (pageId === "whats-inside-right-page") {
              whatsInsideRightPageId = pageId;
            }

            if (frontPage.preserveIfBlank) {
              lockedBlankBeforeDearReaderPageIds.add(pageId);
            }

            const markdownContent =
              frontPage.markdownPath || frontPage.contentPath
                ? await loadGithubMarkdown(
                    frontPage.markdownPath ||
                      frontPage.contentPath,
                  )
                : "";

            const frontPageBlocks = markdownContent
              ? [
                  {
                    type: "markdown" as const,
                    content: markdownContent,
                    _id: `md-${pageId}`,
                  },
                ]
              : Array.isArray(frontPage.blocks)
                ? frontPage.blocks
                : [];

            newPages.push({
              id: pageId,
              pageNumber,
              type: frontPage.type || "layout",
              layoutId:
                frontPage.layoutId || "article-text-layout",
              alt: frontPage.alt || pageId,
            });

            newLayoutState[pageId] = {
              blocks: frontPageBlocks,
            };

            if (frontPage.toc?.title) {
              newToc.push({
                id: frontPage.toc.id || `toc-${pageId}`,
                title: frontPage.toc.title,
                pageNumber,
                level: frontPage.toc.level ?? 0,
              });
            }

            if (typeof frontPage.pageNumber !== "number") {
              pageNum++;
            }
          }

          const getChapterDescriptionData = (
            chapterSlug: string,
          ) => {
            const description =
              normalizedChapterDescriptionDataBySlug[
                chapterSlug
              ];

            if (!description?.title && !description?.body) {
              return null;
            }

            return {
              title: description.title || "",
              body: description.body || "",
            };
          };

          const configuredAdPages = Array.isArray(magazineManifestRaw?.adPages)
            ? magazineManifestRaw.adPages
            : [];

          const getConfiguredAdPagesAfterArticle = (articleId: string) => {
            const normalizedArticleId = normalizeArticleKey(articleId || "");
            return configuredAdPages.filter((adPage: any) => {
              const placement = adPage?.placement || {};
              return (
                normalizeArticleKey(placement.afterArticleId || placement.after || "") === normalizedArticleId
              );
            });
          };

          let lastChapterSlug = "";

          const addChapterDividerPage = (chapterData: {
            slug: string;
            title: string;
            subtitle: string;
            eyebrow: string;
          }) => {
            const dividerPageId = `chapter-${chapterData.slug}-divider`;

            newPages.push({
              id: dividerPageId,
              pageNumber: pageNum,
              type: "layout",
              layoutId: "article-text-layout",
              alt: `${chapterData.title} chapter divider`,
            });

            newLayoutState[dividerPageId] = {
              blocks: [
                {
                  type: "chapter-divider",
                  title: chapterData.title,
                  subtitle: chapterData.subtitle,
                  eyebrow: chapterData.eyebrow,
                  _id: `chapter-${chapterData.slug}`,
                },
              ],
            };

            newToc.push({
              id: `toc-chapter-${chapterData.slug}`,
              title: chapterData.title,
              pageNumber: pageNum,
              level: 0,
            });

            pageNum++;
          };

          const addChapterDescriptionPage = (chapterData: {
            slug: string;
            title: string;
          }) => {
            const chapterDescription =
              getChapterDescriptionData(chapterData.slug);

            if (!chapterDescription) return;

            const descriptionPageId = `chapter-${chapterData.slug}-description`;

            newPages.push({
              id: descriptionPageId,
              pageNumber: pageNum,
              type: "layout",
              layoutId: "article-text-layout",
              alt: `${chapterData.title} chapter description`,
            });

            newLayoutState[descriptionPageId] = {
              blocks: [
                {
                  type: "markdown",
                  content: `# ${chapterDescription.title}

${chapterDescription.body}`,
                  _id: `md-${descriptionPageId}`,
                },
              ],
            };

            pageNum++;
          };

          const getTitleHeadingPrefix = (
            title: string,
            subtitle: string,
          ) => {
            const totalLength = `${title} ${subtitle}`.trim()
              .length;
            const titleLength = title.trim().length;

            // Use a real stepped title scale instead of only two sizes.
            // Every returned heading is still larger than normal story copy.
            if (titleLength <= 42 && totalLength <= 90)
              return "#";
            if (titleLength <= 72 && totalLength <= 125)
              return "##";
            if (titleLength <= 105 && totalLength <= 165)
              return "###";
            return "####";
          };

          const getSubtitleMarkdown = (subtitle: string) => {
            if (!subtitle) return "";
            // Slightly larger than story copy, but clearly secondary to the title.
            return `##### **${subtitle}**`;
          };

          const resolveAssetUrl = (
            src: string,
            articleRecord?: any,
          ) => {
            let assetUrl = (src || "").trim();
            if (!assetUrl) return assetUrl;

            if (
              /the[_-]weight[_-]of[_-]staying[_-]well/i.test(
                assetUrl,
              )
            ) {
              return "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/images/articles/scleroderma-foundation-of-greater-chicago/the_weight_of_staying_well_8x11_5.jpg";
            }

            // Local imports are already resolved by the bundler.
            if (articleRecord?.isLocalImport) return assetUrl;

            if (
              assetUrl.startsWith("http") ||
              assetUrl.startsWith("data:") ||
              assetUrl.startsWith("/src/") ||
              assetUrl.startsWith("/")
            ) {
              return encodeURI(assetUrl);
            }

            // Article Markdown can use paths relative to public/content/articles.
            // GitHub article metadata uses paths relative to public/.
            // Both should resolve to raw.githubusercontent.com/.../public/<path>.
            assetUrl = assetUrl
              .replace(/^public\//, "")
              .replace(/^(\.\.\/)+/, "");

            // Article image metadata in articles.json often stores filenames as
            // "phlip-side/file.jpg" or "scleroderma-foundation-of-greater-chicago/file.jpg".
            // Those live in public/images/articles/<folder>/<file>.
            if (
              !assetUrl.startsWith("images/") &&
              !assetUrl.startsWith("content/") &&
              /\.(png|jpe?g|gif|webp|svg)$/i.test(assetUrl)
            ) {
              assetUrl = "images/articles/" + assetUrl;
            }

            // Bare non-image filenames still fall back to the original content/images location.
            if (!assetUrl.includes("/")) {
              assetUrl = "content/images/" + assetUrl;
            }

            return encodeURI(
              BASE_RAW_URL + assetUrl.replace(/^\//, ""),
            );
          };

          const getFirstImageMetadata = (markdown: string) => {
            const imageMatch = markdown.match(
              /^\s*Image(?:\s+\d+)?:\s*([^\n]+)/im,
            );
            if (!imageMatch || !imageMatch[1]) return null;

            const captionMatch = markdown.match(
              /^\s*Caption:\s*([^\n]+)/im,
            );
            const altMatch = markdown.match(
              /^\s*Alt text:\s*([^\n]+)/im,
            );

            return {
              src: imageMatch[1].trim(),
              caption: captionMatch?.[1]?.trim() || "",
              alt: altMatch?.[1]?.trim() || "",
            };
          };

          const getArticleDateCandidates = (
            articleRecord: any,
            markdownText = "",
          ) => {
            const normalizedId = normalizeArticleKey(
              articleRecord.id || "",
            );
            const normalizedTitle = normalizeArticleKey(
              articleRecord.title || "",
            );

            return [
              ARTICLE_DATE_OVERRIDES[normalizedId],
              ARTICLE_DATE_OVERRIDES[normalizedTitle],
              articleRecord.date,
              articleRecord.publishedDate,
              articleRecord.publishDate,
              articleRecord.publicationDate,
              articleRecord.articleDate,
              articleRecord.createdAt,
              articleRecord.updatedAt,
              articleRecord.markdownPath,
              articleRecord.path,
              articleRecord.filename,
              markdownText.match(
                /(?:Editorial|Published|Posted|Updated|Written by[^|\n]*)\s*\|\s*([^*\n<]+)/i,
              )?.[1],
              markdownText.match(
                /(?:Editorial|Published|Posted|Updated|Publication date)\s*[:—-]\s*([^*\n<]+)/i,
              )?.[1],
              markdownText.match(
                /\b(?:January|February|March|April|May|June|July|August|Aug\.|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i,
              )?.[0],
              markdownText.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0],
            ].filter(Boolean);
          };

          const parseArticleDateValue = (
            articleRecord: any,
            markdownText = "",
          ) => {
            const candidateValues = getArticleDateCandidates(
              articleRecord,
              markdownText,
            );

            for (const value of candidateValues) {
              const text = String(value).trim();
              if (!text) continue;

              const isoMatch = text.match(
                /\b\d{4}-\d{2}-\d{2}\b/,
              );
              const monthMatch = text.match(
                /\b(?:January|February|March|April|May|June|July|August|Aug\.|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i,
              );
              const normalized =
                isoMatch?.[0] ||
                monthMatch?.[0]?.replace(/^Aug\./i, "August") ||
                text.replace(/^Aug\./i, "August");
              const parsed = Date.parse(normalized);
              if (!Number.isNaN(parsed)) return parsed;
            }

            return 0;
          };

          const getArticlePublicationDateLabel = (
            articleRecord: any,
            markdownText = "",
          ) => {
            const candidateValues = getArticleDateCandidates(
              articleRecord,
              markdownText,
            );

            for (const value of candidateValues) {
              const text = String(value).trim();
              if (!text) continue;

              const monthMatch = text.match(
                /\b(?:January|February|March|April|May|June|July|August|Aug\.|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i,
              );
              if (monthMatch?.[0]) {
                return monthMatch[0].replace(
                  /^Aug\./i,
                  "August",
                );
              }

              const isoMatch = text.match(
                /\b\d{4}-\d{2}-\d{2}\b/,
              );
              const normalized =
                isoMatch?.[0] ||
                text.replace(/^Aug\./i, "August");
              const parsed = Date.parse(normalized);

              if (!Number.isNaN(parsed)) {
                return new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(parsed));
              }
            }

            return "";
          };

          const loadArticleMarkdown = async (
            articleRecord: any,
          ) => {
            const inlineBody =
              articleRecord.body ??
              articleRecord.markdownContent ??
              articleRecord.content ??
              articleRecord.text ??
              "";

            if (
              typeof inlineBody === "string" &&
              inlineBody.trim().length > 0
            ) {
              return inlineBody;
            }

            let mdUrl =
              articleRecord.markdownPath ||
              articleRecord.contentPath ||
              articleRecord.path ||
              "";
            if (!mdUrl) {
              return getMissingArticleMarkdown(
                articleRecord,
                "No body or content path was provided for this article.",
              );
            }

            if (!mdUrl.startsWith("http")) {
              mdUrl = BASE_RAW_URL + mdUrl.replace(/^\//, "");
            }

            try {
              const mdRes = await fetch(encodeURI(mdUrl));
              return mdRes.ok
                ? await mdRes.text()
                : getMissingArticleMarkdown(
                    articleRecord,
                    `Content file could not be loaded: ${mdUrl}`,
                  );
            } catch (markdownErr) {
              console.error(
                "Failed to load article markdown:",
                markdownErr,
              );
              return getMissingArticleMarkdown(
                articleRecord,
                `Content file could not be loaded: ${mdUrl}`,
              );
            }
          };

          const resolvedArticles = await Promise.all(
            articles.map(async (article, originalIndex) => {
              const resolvedMarkdownContent =
                await loadArticleMarkdown(article);
              const chapterData =
                getChapterDividerData(article);

              return {
                ...article,
                __originalIndex: originalIndex,
                __chapterSlug: chapterData.slug,
                __resolvedMarkdownContent:
                  resolvedMarkdownContent,
                __dateValue: parseArticleDateValue(
                  article,
                  resolvedMarkdownContent,
                ),
                __publicationDateLabel:
                  getArticlePublicationDateLabel(
                    article,
                    resolvedMarkdownContent,
                  ),
              };
            }),
          );

          const preferredChapterOrder = [
            "scleroderma-foundation-of-greater-chicago",
            "the-phlip-side",
            "rants-of-the-psyche",
            "tips-tricks",
          ];

          const getNormalizedChapterSlug = (
            chapter: any,
            index: number,
          ) =>
            String(
              chapter.slug ||
                chapter.title ||
                `chapter-${index}`,
            )
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

          const orderedChapters = [...chapters].sort(
            (a: any, b: any) => {
              const slugA = getNormalizedChapterSlug(a, 0);
              const slugB = getNormalizedChapterSlug(b, 0);
              const preferredA =
                preferredChapterOrder.indexOf(slugA);
              const preferredB =
                preferredChapterOrder.indexOf(slugB);

              if (preferredA !== -1 || preferredB !== -1) {
                if (preferredA === -1) return 1;
                if (preferredB === -1) return -1;
                return preferredA - preferredB;
              }

              return chapters.indexOf(a) - chapters.indexOf(b);
            },
          );

          const chapterOrder = new Map<string, number>();
          orderedChapters.forEach(
            (chapter: any, index: number) => {
              const chapterSlug = getNormalizedChapterSlug(
                chapter,
                index,
              );

              if (!chapterOrder.has(chapterSlug)) {
                chapterOrder.set(chapterSlug, index);
              }
            },
          );

          const articleById = new Map<string, any>();
          resolvedArticles.forEach((article) => {
            articleById.set(String(article.id || ""), article);
          });

          const sortedArticles: any[] = [];
          const usedArticleIds = new Set<string>();

          orderedChapters.forEach((chapter: any) => {
            const chapterArticleIds = Array.isArray(
              chapter.articleIds,
            )
              ? chapter.articleIds
              : [];

            chapterArticleIds.forEach((articleId: string) => {
              const article = articleById.get(
                String(articleId),
              );
              if (!article) return;

              sortedArticles.push(article);
              usedArticleIds.add(String(article.id || ""));
            });
          });

          resolvedArticles
            .filter(
              (article) =>
                !usedArticleIds.has(String(article.id || "")),
            )
            .sort((a, b) => {
              const chapterA =
                a.__chapterSlug || "uncategorized";
              const chapterB =
                b.__chapterSlug || "uncategorized";
              const chapterCompare =
                (chapterOrder.get(chapterA) ?? 999) -
                (chapterOrder.get(chapterB) ?? 999);

              if (chapterCompare !== 0) return chapterCompare;

              return a.__originalIndex - b.__originalIndex;
            })
            .forEach((article) => sortedArticles.push(article));

          for (const article of sortedArticles) {
            const chapterData = getChapterDividerData(article);

            if (
              chapterData.slug &&
              chapterData.slug !== lastChapterSlug
            ) {
              addChapterDividerPage(chapterData);
              addChapterDescriptionPage(chapterData);

              lastChapterSlug = chapterData.slug;
            }

            const mdContent =
              article.__resolvedMarkdownContent ||
              getMissingArticleMarkdown(article);

            // Convert custom Image/caption placement blocks to standard markdown images
            let processedMd = mdContent;

            const blockRegex =
              /Image\/caption placement[\s\S]*?<!-- BTA_IMAGE_END -->\s*/gi;
            processedMd = processedMd.replace(
              blockRegex,
              (match) => {
                const imgMatch = match.match(
                  /Image(?:\s+\d+)?:\s*([^\n]+)/i,
                );
                const altMatch = match.match(
                  /Alt text:\s*([^\n]+)/i,
                );
                if (imgMatch && imgMatch[1]) {
                  let imgPath = imgMatch[1].trim();
                  if (!imgPath.startsWith("http")) {
                    imgPath =
                      BASE_RAW_URL + imgPath.replace(/^\//, "");
                  }
                  imgPath = encodeURI(imgPath);
                  const altText =
                    altMatch && altMatch[1]
                      ? altMatch[1].trim()
                      : "Image";
                  return `\n\n![${altText}](${imgPath})\n\n`;
                }
                return "";
              },
            );

            // Clean up any stray BTA image markers just in case.
            // Keep the markdown image inside the block so it can become its own image page.
            processedMd = processedMd
              .replace(/<!--\s*BTA_IMAGE_START\s*-->/gi, "")
              .replace(/<!--\s*BTA_IMAGE_END\s*-->/gi, "");

            // Fix Shopping and Errands ordering
            if (
              processedMd.toLowerCase().includes("shopping") &&
              processedMd.toLowerCase().includes("errands")
            ) {
              let mdLines = processedMd.split("\n");
              const shoppingLineIdx = mdLines.findIndex(
                (line) =>
                  line.toLowerCase().includes("shopping"),
              );

              if (shoppingLineIdx !== -1) {
                // Extract shopping block: starts at shoppingLineIdx, ends when we hit a non-empty, non-indented line that isn't a bullet
                // To be safe, just collect until the next line that starts with a letter/number and no indentation, or another header
                let endIdx = shoppingLineIdx;
                while (endIdx + 1 < mdLines.length) {
                  const nextLine = mdLines[endIdx + 1];
                  // If it's empty, or starts with space/tab, or starts with a bullet, it's part of the block
                  if (
                    nextLine.trim() === "" ||
                    nextLine.match(/^[ \t]/) ||
                    nextLine.match(/^[-*]/) ||
                    nextLine.match(/^\d+\./)
                  ) {
                    // wait, if it's another top-level bullet like "- Work", we might grab it too if we allow any bullet.
                    // Let's assume if it starts with a bullet AND it's not indented, it might be a new section.
                    // But list items can be sibling bullets.
                    // If the user wants Shopping below Errands, and Shopping has sibling bullets, we might grab them too if they are part of Shopping.
                    // Let's just say a block ends when we see a word character at the start of the line, or a `#` header.
                    if (
                      nextLine.match(/^[A-Za-z#]/) &&
                      !nextLine
                        .toLowerCase()
                        .includes("shopping") &&
                      !nextLine
                        .toLowerCase()
                        .includes("errands")
                    ) {
                      break;
                    }
                    if (
                      nextLine.toLowerCase().includes("errands")
                    ) {
                      break;
                    }
                    endIdx++;
                  } else {
                    if (nextLine.match(/^[A-Za-z#]/)) break;
                    endIdx++; // safely include it if it's weird punctuation
                  }
                }

                const shoppingBlock = mdLines.splice(
                  shoppingLineIdx,
                  endIdx - shoppingLineIdx + 1,
                );

                // Re-find errands
                const newErrandsIdx = mdLines.findIndex(
                  (line) =>
                    line.toLowerCase().includes("errands"),
                );
                if (newErrandsIdx !== -1) {
                  let errEndIdx = newErrandsIdx;
                  while (errEndIdx + 1 < mdLines.length) {
                    const nextLine = mdLines[errEndIdx + 1];
                    if (
                      nextLine.trim() === "" ||
                      nextLine.match(/^[ \t]/) ||
                      nextLine.match(/^[-*]/) ||
                      nextLine.match(/^\d+\./)
                    ) {
                      if (
                        nextLine.match(/^[A-Za-z#]/) &&
                        !nextLine
                          .toLowerCase()
                          .includes("errands")
                      )
                        break;
                      errEndIdx++;
                    } else {
                      if (nextLine.match(/^[A-Za-z#]/)) break;
                      errEndIdx++;
                    }
                  }

                  // We will also nest the shopping block under Errands by adding 4 spaces to it (strict markdown parsing)
                  const nestedShoppingBlock = shoppingBlock.map(
                    (line) => {
                      if (line.trim() === "") return line;
                      // If it's a header, make it a bullet
                      if (line.startsWith("#"))
                        return (
                          "    - " + line.replace(/^#+\s*/, "")
                        );
                      // If it's already a bullet or text, indent it with 4 spaces
                      return (
                        "    " + line.replace(/^[ \t]*/, "")
                      );
                    },
                  );

                  mdLines.splice(
                    errEndIdx + 1,
                    0,
                    ...nestedShoppingBlock,
                  );
                  processedMd = mdLines.join("\n");
                } else {
                  // Put it back if Errands not found
                  mdLines.splice(
                    shoppingLineIdx,
                    0,
                    ...shoppingBlock,
                  );
                  processedMd = mdLines.join("\n");
                }
              }
            }

            // Extract article subtitle from the first bold/deck-style line, when present.
            const subtitleMatch = processedMd.match(
              /^\s*(?:\*\*([^*\n]+)\*\*|__([^_\n]+)__|#{2,3}\s+([^\n]+))\s*$/m,
            );
            const articleSubtitle = (
              subtitleMatch?.[1] ||
              subtitleMatch?.[2] ||
              subtitleMatch?.[3] ||
              ""
            ).trim();

            // Extract the first image from Markdown, Image/caption metadata, or the article record.
            const imgMatch = processedMd.match(
              /!\[.*?\]\((.*?)\)/,
            );
            const imageMetadata =
              getFirstImageMetadata(processedMd);
            const articleImageRecord =
              Array.isArray(article.images) &&
              article.images.length > 0
                ? article.images[0]
                : null;

            const normalizedArticleId = normalizeArticleKey(
              article.id || "",
            );
            const normalizedArticleTitle = normalizeArticleKey(
              article.title || "",
            );

            const suppressArticleImage =
              ARTICLE_IMAGE_SUPPRESSIONS.has(
                normalizedArticleId,
              ) ||
              ARTICLE_IMAGE_SUPPRESSIONS.has(
                normalizedArticleTitle,
              );

            const imageOverride = suppressArticleImage
              ? null
              : ARTICLE_IMAGE_OVERRIDES[normalizedArticleId] ||
                ARTICLE_IMAGE_OVERRIDES[
                  normalizedArticleTitle
                ] ||
                null;

            let imageUrl = suppressArticleImage
              ? null
              : imageOverride ||
                (imgMatch
                  ? imgMatch[1]
                  : imageMetadata?.src ||
                    article.image ||
                    article.imageUrl ||
                    article.coverImage ||
                    articleImageRecord?.filename ||
                    null);
            const imageAlt =
              article.imageAlt ||
              article.alt ||
              imageMetadata?.alt ||
              articleImageRecord?.alt ||
              article.title ||
              "Article image";
            const imageCaption =
              article.imageCaption ||
              article.caption ||
              imageMetadata?.caption ||
              articleImageRecord?.caption ||
              "";
            const imageLinkUrl =
              article.imageLinkUrl ||
              article.imageUrlTarget ||
              article.imageHref ||
              "";
            const hasArticleImage = !!imageUrl;

            if (imageUrl && typeof imageUrl === "string") {
              imageUrl = resolveAssetUrl(imageUrl, article);
            }

            const extraImageUrls = suppressArticleImage
              ? []
              : (
                  ARTICLE_EXTRA_IMAGE_OVERRIDES[
                    normalizedArticleId
                  ] ||
                  ARTICLE_EXTRA_IMAGE_OVERRIDES[
                    normalizedArticleTitle
                  ] ||
                  []
                ).map((src) => resolveAssetUrl(src, article));

            const getShareExcerpt = (markdownText = "") => {
              const cleanedShareText = markdownText
                .replace(/!\[.*?\]\(.*?\)/g, "")
                .replace(
                  /<!--\s*BTA_IMAGE_START\s*-->[\s\S]*?<!--\s*BTA_IMAGE_END\s*-->/gi,
                  "",
                )
                .replace(/<!--\s*PAGE_BREAK\s*-->/gi, "")
                .replace(/^\s*#+\s+/gm, "")
                .replace(/\*\*(.*?)\*\*/g, "$1")
                .replace(/__(.*?)__/g, "$1")
                .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
                .replace(
                  /^\s*(?:Editorial|Published|Posted|Updated|Written by[^|\n]*)(?:\s*\|\s*[^\n]+)?\s*$/gim,
                  "",
                )
                .replace(/^\s*By\s+[^\n]+$/gim, "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .filter((line) => line !== article.title)
                .filter((line) => line !== articleSubtitle)
                .join(" ");

              return cleanedShareText.length > 155
                ? `${cleanedShareText.slice(0, 152).trim()}…`
                : cleanedShareText;
            };

            const articleShareExcerpt =
              article.excerpt ||
              article.description ||
              article.summary ||
              articleSubtitle ||
              getShareExcerpt(processedMd);

            // Story pages should start clean: no repeated image, image metadata, title, subtitle/deck,
            // Editorial/date line, or manual page-break marker.
            const stripEditorialSignoffs = (value: string) =>
              value
                .replace(
                  /(?:^|\n)\s*For\s+more\s+advocacy,?\s+follow\s+me\s+(?:at|on)\s+@?(?:Breathtaking\s*Awareness|BreathtakingAwareness)\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*You\s+can\s+also\s+follow\s+me\s+(?:at|on)\s+@?(?:Breathtaking\s*Awareness|BreathtakingAwareness)\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*Leave\s+a\s+comment\s+or\s+follow\s+me\s+on\s+Instagram\s+at\s+@?(?:Breathtaking\s*Awareness|BreathtakingAwareness)\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*Please\s+share\s+in\s+the\s+comments\s+below\.\s*You\s+can\s+also\s+follow\s+me\s+on\s+Instagram\s+at\s+@?(?:Breathtaking\s*Awareness|BreathtakingAwareness)\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*Please\s+share\s+your\s+thoughts\s+in\s+the\s+comments\s+below\.\s*Follow\s+me\s+at\s+@?(?:Breathtaking\s*Awareness|BreathtakingAwareness)\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*To\s+learn\s+more\s+about\s+me\s+and\s+my\s+journey,?\s+follow\s+me\s+on\s+(?:Facebook|Instagram)(?:\s+or\s+(?:Facebook|Instagram))?\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*For\s+more\s+of\s+my\s+journey,?\s+follow\s+me\s+(?:at|on)\s+@?(?:Breathtaking\s*Awareness|BreathtakingAwareness)\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(
                  /(?:^|\n)\s*(?:For\s+more|To\s+learn\s+more|You\s+can\s+also|Leave\s+a\s+comment|Please\s+share)\b[^\n]*(?:follow\s+me|comments?|Facebook|Instagram|Breathtaking\s*Awareness|BreathtakingAwareness)[^\n]*\.?\s*(?=\n|$)/gim,
                  "\n",
                )
                .replace(/[ \t]+\n/g, "\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim();

            let cleanMd = processedMd.replace(
              /!\[.*?\]\(.*?\)/,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*#{0,6}\s*Image\/caption placement\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*Image(?:\s+\d+)?:\s*[^\n]*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*Caption:\s*[^\n]*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*Alt text:\s*[^\n]*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(/^\s*#\s+.*$/m, ""); // remove the first h1 title/header
            if (articleSubtitle) {
              // Remove only a duplicated deck/subtitle line from the body copy.
              // Do NOT remove Markdown subheads such as "## Acute Survival Mode";
              // those are in-article section headers and should render in the magazine.
              cleanMd = cleanMd.replace(
                /^\s*(?:\*\*[^*\n]+\*\*|__[^_\n]+__)\s*$/m,
                "",
              );
            }
            cleanMd = cleanMd.replace(
              /^\s*[\*_]?\s*Editorial(?:\s*\|\s*[^*\n]+)?\s*[\*_]?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*[\*_]?\s*By\s+[^*\n]+\s*[\*_]?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*[\*_]?\s*Written by\s+[^|\n]+(?:\s*\|\s*[^*\n]+)?\s*[\*_]?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /<!--\s*PAGE_BREAK\s*-->/gi,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:[\w-]+\/)*i-learn-a-hard-lesson-about-traveling-with-pulmonary-hypertension\.md\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:[\w-]+\/)*[\w-]+\.md\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:Follow|Connect with|Find|Visit)\s+(?:me|us)?\s*(?:for\s+more\s+(?:insights|updates|stories|information)\s+)?(?:on\s+)?(?:Instagram|Facebook|LinkedIn|Twitter|X|social media)\b[^\n]*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:Follow|Connect with|Find|Visit)\s+(?:me|us)?[^\n]*(?:BreathtakingAwareness|Breathtaking\s+Awareness|Instagram|Facebook|LinkedIn|Twitter|X)[^\n]*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:Instagram|Facebook|LinkedIn|Twitter|X)\s*:?\s*@?Breathtaking\s*Awareness\b[^\n]*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*To\s+learn\s+more\s+about\s+me\s+and\s+my\s+journey,?\s+follow\s+me\s+on\s+(?:Facebook|Instagram|social\s+media)(?:\s+or\s+(?:Facebook|Instagram|social\s+media))?\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*For\s+more\s+of\s+my\s+journey,?\s+follow\s+me\s+(?:at|on)\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness|Facebook|Instagram)\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:To\s+learn\s+more|For\s+more)\b[^\n]*(?:follow\s+me|my\s+journey|Facebook|Instagram|BreathtakingAwareness|Breathtaking\s+Awareness)[^\n]*\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*For\s+more\s+advocacy,?\s+follow\s+me\s+(?:at|on)\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*You\s+can\s+also\s+follow\s+me\s+(?:at|on)\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*Leave\s+a\s+comment\s+or\s+follow\s+me\s+on\s+Instagram\s+at\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*Please\s+share\s+(?:in|your\s+thoughts\s+in)\s+the\s+comments\s+below\.\s*(?:You\s+can\s+also\s+)?Follow\s+me\s+(?:at|on\s+Instagram\s+at)\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:Please\s+share|Leave\s+a\s+comment|You\s+can\s+also\s+follow|For\s+more\s+advocacy)\b[^\n]*(?:comments?|follow\s+me|Instagram|Facebook|BreathtakingAwareness|Breathtaking\s+Awareness)[^\n]*\.?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /(?:^|\n)\s*For\s+more\s+advocacy,?\s+follow\s+me\s+(?:at|on)\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?(?=\s*(?:\n|$))/gim,
              "\n",
            );
            cleanMd = cleanMd.replace(
              /(?:^|\n)\s*You\s+can\s+also\s+follow\s+me\s+(?:at|on)\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?(?=\s*(?:\n|$))/gim,
              "\n",
            );
            cleanMd = cleanMd.replace(
              /(?:^|\n)\s*Leave\s+a\s+comment\s+or\s+follow\s+me\s+on\s+Instagram\s+at\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?(?=\s*(?:\n|$))/gim,
              "\n",
            );
            cleanMd = cleanMd.replace(
              /(?:^|\n)\s*Please\s+share\s+in\s+the\s+comments\s+below\.\s*You\s+can\s+also\s+follow\s+me\s+on\s+Instagram\s+at\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?(?=\s*(?:\n|$))/gim,
              "\n",
            );
            cleanMd = cleanMd.replace(
              /(?:^|\n)\s*Please\s+share\s+your\s+thoughts\s+in\s+the\s+comments\s+below\.\s*Follow\s+me\s+at\s+@?(?:BreathtakingAwareness|Breathtaking\s+Awareness)\.?(?=\s*(?:\n|$))/gim,
              "\n",
            );
            cleanMd = cleanMd.replace(
              /(?:^|\n)\s*(?:For\s+more\s+(?:advocacy|of\s+my\s+journey)|To\s+learn\s+more\s+about\s+me\s+and\s+my\s+journey|You\s+can\s+also\s+follow\s+me|Leave\s+a\s+comment|Please\s+share)\b[^\n]*(?:follow\s+me|comments?|Instagram|Facebook|BreathtakingAwareness|Breathtaking\s+Awareness)[^\n]*\.?(?=\s*(?:\n|$))/gim,
              "\n",
            );
            // Keep publication dates and external links off story/body pages.
            // Dates now appear on each article title page instead.
            cleanMd = cleanMd.replace(
              /^\s*[\*_]?\s*(?:(?:Editorial|Published|Posted|Updated|Publication date)\s*(?:\||:|—|-)?\s*)?(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b)(?:\s*;\s*(?:updated|revised)\s*(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b))?\s*[\*_]?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*[\*_]?\s*(?:Updated|Revised)\s+(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b)\s*[\*_]?\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:[\w-]+\/)*i-learn-a-hard-lesson-about-traveling-with-pulmonary-hypertension\.md\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /^\s*(?:[\w-]+\/)*[\w-]+\.md\s*$/gim,
              "",
            );
            cleanMd = cleanMd.replace(
              /\[([^\]]+)\]\((?:https?:\/\/|mailto:)[^)]+\)/g,
              "$1",
            );
            cleanMd = cleanMd.replace(
              /<https?:\/\/[^>\s]+>/g,
              "",
            );
            cleanMd = cleanMd.replace(/https?:\/\/\S+/g, "");
            cleanMd = cleanMd.replace(
              /^\s*(?:Read more|Source|Sources|Link|Links|Original article|References?)\s*:?\s*$/gim,
              "",
            );
            // Keep Markdown subheadings (##, ###, ####, etc.) so article section headers render in the magazine.
            // The article H1/title is already removed above because it has its own title page.
            cleanMd = cleanMd.replace(/^\s*>+\s*/gm, ""); // force blockquotes to be normal paragraphs
            cleanMd = cleanMd.replace(/^\s*[=-]{3,}\s*$/gm, ""); // remove alternative heading underlines / hrs
            // Remove stray markdown emphasis marker lines, such as a standalone "**"
            // that can be left after a bold/deck line is stripped.
            cleanMd = cleanMd.replace(
              /^\s*(?:\*\*|__|\*|_)\s*$/gm,
              "",
            );

            cleanMd = stripEditorialSignoffs(cleanMd);
            cleanMd = cleanMd.replace(/[ \t]+\n/g, "\n");
            cleanMd = cleanMd.replace(/\n{3,}/g, "\n\n").trim();

            // PHlip-side spread alignment:
            // Work from the generated sequence, not fixed page numbers.
            // Add a blank page only when the next PHlip-side title page would land
            // on a right-side/odd page. The blank page is placed before that title,
            // which means it sits after the previous article/share page in the book.
            // This keeps the title page and its image page together on the same spread.
            if (
              chapterData.slug === "the-phlip-side" &&
              hasArticleImage &&
              pageNum % 2 !== 0
            ) {
              const spreadAlignBlankPageId = `article-${article.id}-spread-align-blank-before-title`;

              newPages.push({
                id: spreadAlignBlankPageId,
                pageNumber: pageNum,
                type: "layout",
                layoutId: "article-text-layout",
                alt: "Blank page",
              });

              newLayoutState[spreadAlignBlankPageId] = {
                blocks: [
                  {
                    type: "markdown",
                    content: ``,
                    _id: `md-${spreadAlignBlankPageId}`,
                  },
                ],
              };

              pageNum++;
            }

            // Page 1 for every article: title + subtitle + Editorial + byline.
            const titlePageId = `article-${article.id}-title`;
            const titleHeadingPrefix = getTitleHeadingPrefix(
              article.title,
              articleSubtitle,
            );
            const titlePageMarkdown = [
              `${titleHeadingPrefix} **${article.title}**`,
              getSubtitleMarkdown(articleSubtitle),
              article.categoryLabel || article.typeLabel || "",
              article.byline || article.author ? `By ${article.byline || article.author}` : "",
              article.__publicationDateLabel
                ? `Published ${article.__publicationDateLabel}`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n");

            newPages.push({
              id: titlePageId,
              pageNumber: pageNum,
              type: "layout",
              layoutId: "article-text-layout",
              alt: article.title + " Title",
            });
            newLayoutState[titlePageId] = {
              blocks: [
                {
                  type: "markdown",
                  content: titlePageMarkdown,
                  _id: `md-${titlePageId}`,
                },
              ],
            };

            newToc.push({
              id: `toc-article-${article.id}`,
              title: article.title,
              pageNumber: pageNum,
              level: 0,
            });
            pageNum++;

            // Page 2, only when the piece has a real image. Pieces without images go straight to story text.
            if (hasArticleImage) {
              const imagePageId = `article-${article.id}-image`;
              newPages.push({
                id: imagePageId,
                pageNumber: pageNum,
                type: "layout",
                layoutId: "article-image-layout",
                alt: article.title + " Image",
              });
              newLayoutState[imagePageId] = {
                blocks: [
                  {
                    type: "image",
                    src: imageUrl,
                    alt: imageAlt,
                    caption: imageCaption,
                    href: imageLinkUrl,
                    _id: `img-${imagePageId}`,
                  },
                ],
              };
              pageNum++;
            }

            extraImageUrls.forEach(
              (extraImageUrl, extraImageIndex) => {
                const extraImagePageId = `article-${article.id}-extra-image-${extraImageIndex + 1}`;

                newPages.push({
                  id: extraImagePageId,
                  pageNumber: pageNum,
                  type: "layout",
                  layoutId: "article-image-layout",
                  alt: `${article.title} Image ${extraImageIndex + 2}`,
                });

                newLayoutState[extraImagePageId] = {
                  blocks: [
                    {
                      type: "image",
                      src: extraImageUrl,
                      alt: `${article.title} image ${extraImageIndex + 2}`,
                      _id: `img-${extraImagePageId}`,
                    },
                  ],
                };

                pageNum++;
              },
            );

            // Story text always begins on a new page after the title page and optional image page.
            let currentChunk = "";
            let currentHeight = 0;

            // Article pages are rendered inside a 480x660 page with 64px top and 56px bottom padding.
            // The cap now matches that usable article text area so pages fill lower
            // without running into the page edge.
            const ARTICLE_TEXT_MAX_HEIGHT = 540;
            const ARTICLE_BODY_CHARS_PER_LINE = 50;
            const ARTICLE_BODY_LINE_HEIGHT = 21;
            const ARTICLE_PARAGRAPH_MARGIN = 12;
            const ARTICLE_MIN_SPLIT_HEIGHT =
              ARTICLE_BODY_LINE_HEIGHT * 2;

            const normalizeForMeasure = (text: string) =>
              text.replace(/\s+/g, " ").trim();

            const estimateWrappedLines = (
              text: string,
              charsPerLine = ARTICLE_BODY_CHARS_PER_LINE,
            ) => {
              const normalized = normalizeForMeasure(
                text.replace(/^#{1,6}\s+/, ""),
              );
              if (!normalized) return 0;

              // Average line length in the rendered serif body is about 48-52 characters.
              // Long unbroken text is rare here, but this keeps the estimate stable.
              return Math.max(
                1,
                Math.ceil(normalized.length / charsPerLine),
              );
            };

            const getElementHeight = (
              text: string,
              isContinuation = false,
            ) => {
              const trimmed = text.trim();
              if (!trimmed) return 0;

              const headingMatch =
                trimmed.match(/^(#{2,6})\s+/);
              if (headingMatch) {
                const headingLevel = headingMatch[1].length;
                const headingText = trimmed.replace(
                  /^#{2,6}\s+/,
                  "",
                );
                const headingLines = estimateWrappedLines(
                  headingText,
                  34,
                );
                const headingLineHeight =
                  headingLevel <= 2 ? 23 : 21;
                const topMargin = currentChunk
                  ? headingLevel <= 2
                    ? 24
                    : 20
                  : 0;
                const bottomMargin =
                  headingLevel <= 2 ? 12 : 10;
                return (
                  topMargin +
                  headingLines * headingLineHeight +
                  bottomMargin
                );
              }

              const lines = estimateWrappedLines(trimmed);
              return (
                lines * ARTICLE_BODY_LINE_HEIGHT +
                (isContinuation ? 0 : ARTICLE_PARAGRAPH_MARGIN)
              );
            };

            const appendText = (
              text: string,
              forceParagraphBreak = false,
            ) => {
              const trimmed = text.trim();
              if (!trimmed) return;

              const addition = currentChunk
                ? `${forceParagraphBreak ? "\n\n" : " "}${trimmed}`
                : trimmed;

              currentChunk += addition;
            };

            const flushTextPage = () => {
              const strippedChunk =
                stripEditorialSignoffs(currentChunk);

              if (strippedChunk.trim().length > 0) {
                articlePages.push({
                  type: "text",
                  content: strippedChunk.trim(),
                });
              }

              currentChunk = "";
              currentHeight = 0;
            };

            const splitParagraphForHeight = (
              paragraph: string,
              availableHeight: number,
            ) => {
              const words = paragraph
                .trim()
                .split(/\s+/)
                .filter(Boolean);
              if (words.length === 0) {
                return { head: "", tail: "" };
              }

              let headWords: string[] = [];
              let bestHead = "";
              let bestIndex = 0;

              for (
                let index = 0;
                index < words.length;
                index++
              ) {
                headWords.push(words[index]);
                const candidate = headWords.join(" ");
                const candidateHeight = getElementHeight(
                  candidate,
                  false,
                );

                if (candidateHeight <= availableHeight) {
                  bestHead = candidate;
                  bestIndex = index + 1;
                } else {
                  break;
                }
              }

              // If even a few words cannot fit, move the paragraph to the next page.
              if (
                !bestHead ||
                bestIndex < Math.min(3, words.length)
              ) {
                return { head: "", tail: paragraph.trim() };
              }

              return {
                head: bestHead,
                tail: words.slice(bestIndex).join(" ").trim(),
              };
            };

            const addTextBlock = (text: string) => {
              let remaining = text.trim();
              if (!remaining) return;

              const isHeading = /^(#{2,6})\s+/.test(remaining);
              const fullHeight = getElementHeight(
                remaining,
                false,
              );

              if (isHeading) {
                // Never strand a section heading at the very bottom of a page.
                if (
                  currentHeight > 0 &&
                  currentHeight + fullHeight >
                    ARTICLE_TEXT_MAX_HEIGHT - 36
                ) {
                  flushTextPage();
                }
                appendText(remaining, currentChunk.length > 0);
                currentHeight += getElementHeight(
                  remaining,
                  false,
                );
                return;
              }

              if (
                currentHeight + fullHeight <=
                ARTICLE_TEXT_MAX_HEIGHT
              ) {
                appendText(remaining, currentChunk.length > 0);
                currentHeight += fullHeight;
                return;
              }

              // Paragraph splitting is allowed, but only into the usable safe area.
              // This fills the page without letting text run into the bottom edge.
              while (remaining) {
                const availableHeight =
                  ARTICLE_TEXT_MAX_HEIGHT - currentHeight;

                if (
                  currentHeight > 0 &&
                  availableHeight < ARTICLE_MIN_SPLIT_HEIGHT
                ) {
                  flushTextPage();
                  continue;
                }

                const remainingHeight = getElementHeight(
                  remaining,
                  false,
                );
                if (
                  remainingHeight <=
                  ARTICLE_TEXT_MAX_HEIGHT - currentHeight
                ) {
                  appendText(
                    remaining,
                    currentChunk.length > 0,
                  );
                  currentHeight += remainingHeight;
                  remaining = "";
                  break;
                }

                const split = splitParagraphForHeight(
                  remaining,
                  Math.max(
                    0,
                    ARTICLE_TEXT_MAX_HEIGHT - currentHeight,
                  ),
                );

                if (!split.head) {
                  if (currentHeight > 0) {
                    flushTextPage();
                  } else {
                    // Emergency fallback for an extremely long unbreakable paragraph.
                    const words = remaining
                      .split(/\s+/)
                      .filter(Boolean);
                    const forcedHead = words
                      .slice(0, 90)
                      .join(" ");
                    const forcedTail = words
                      .slice(90)
                      .join(" ");
                    appendText(forcedHead, false);
                    currentHeight += getElementHeight(
                      forcedHead,
                      false,
                    );
                    remaining = forcedTail.trim();
                    flushTextPage();
                  }
                  continue;
                }

                appendText(split.head, currentChunk.length > 0);
                currentHeight += getElementHeight(
                  split.head,
                  false,
                );
                remaining = split.tail;
                flushTextPage();
              }
            };

            const paragraphs = cleanMd.split("\n\n");
            const articlePages: {
              type: "text" | "image";
              content?: string;
              src?: string;
              alt?: string;
            }[] = [];

            for (const p of paragraphs) {
              if (p.trim() === "<!-- PAGE_BREAK -->") {
                flushTextPage();
                continue;
              }

              // Split paragraph by images so any image still receives its own page.
              const parts = p.split(/(!\[.*?\]\(.*?\))/);

              for (const part of parts) {
                if (!part) continue;

                const imgMatch = part.match(
                  /^!\[(.*?)\]\((.*?)\)$/,
                );
                if (imgMatch) {
                  flushTextPage();

                  const src = resolveAssetUrl(
                    imgMatch[2],
                    article,
                  );
                  articlePages.push({
                    type: "image",
                    src: src,
                    alt: imgMatch[1] || article.title,
                  });
                } else {
                  const text = part.trim();
                  if (text.length === 0) continue;

                  // Preserve multi-line markdown blocks line-by-line. Normal article
                  // paragraphs are handled as complete paragraphs and split only when needed.
                  const textBlocks = text.includes("\n")
                    ? text
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                    : [text];

                  textBlocks.forEach(addTextBlock);
                }
              }
            }
            flushTextPage();

            articlePages.forEach((pageData, idx) => {
              if (pageData.type === "text") {
                const textPageId = `article-${article.id}-text-${idx}`;
                newPages.push({
                  id: textPageId,
                  pageNumber: pageNum,
                  type: "layout",
                  layoutId: "article-text-layout",
                  alt: article.title + ` Part ${idx + 1}`,
                });

                newLayoutState[textPageId] = {
                  blocks: [
                    {
                      type: "markdown",
                      content: stripEditorialSignoffs(
                        pageData.content || "",
                      ),
                      _id: `md-${textPageId}`,
                    },
                  ],
                };
              } else if (pageData.type === "image") {
                const imagePageId = `article-${article.id}-inline-img-${idx}`;
                newPages.push({
                  id: imagePageId,
                  pageNumber: pageNum,
                  type: "layout",
                  layoutId: "article-image-layout",
                  alt: pageData.alt || article.title,
                });

                newLayoutState[imagePageId] = {
                  blocks: [
                    {
                      type: "image",
                      src: pageData.src || "",
                      alt: pageData.alt || "",
                      _id: `img-${imagePageId}`,
                    },
                  ],
                };
              }
              pageNum++;
            });

            // Add a generated share page after most editorial/article pages.
            // This keeps share controls out of the GitHub article Markdown so future articles inherit it automatically.
            // Some articles intentionally skip the share card for pacing/visual layout.
            const articleKeyForShare = normalizeArticleKey(
              article.id || "",
            );
            const noSharePageArticleIds = new Set([
              "being-mindful-of-good-moments-helps-me-through-difficult-times",
            ]);

            if (
              !noSharePageArticleIds.has(articleKeyForShare)
            ) {
              const sharePageId = `article-${article.id}-share`;
              newPages.push({
                id: sharePageId,
                pageNumber: pageNum,
                type: "layout",
                layoutId: "article-text-layout",
                alt: `Share ${article.title}`,
              });
              newLayoutState[sharePageId] = {
                blocks: [
                  {
                    type: "share",
                    articleId: String(
                      article.id || articleIndex,
                    ),
                    articleTitle:
                      article.title || "this editorial",
                    articleUrl: getPublicArticleShareUrl(
                      article.id || articleIndex,
                    ),
                    articleExcerpt: articleShareExcerpt,
                    articleImage: imageUrl || "",
                    _id: `share-${sharePageId}`,
                  },
                ],
              };
              pageNum++;
            }

            const configuredAdPagesForArticle = getConfiguredAdPagesAfterArticle(String(article.id || ""));

            configuredAdPagesForArticle.forEach((adPage: any, adIndex: number) => {
              const websiteAdPageId = String(
                adPage.id || `article-${article.id}-github-ad-${adIndex}`,
              );

              newPages.push({
                id: websiteAdPageId,
                pageNumber: pageNum,
                type: "layout",
                layoutId: adPage.layoutId || "breathtaking-awareness-ad",
                alt: adPage.alt || adPage.title || "Magazine advertisement",
              });

              newLayoutState[websiteAdPageId] = {
                blocks: [
                  {
                    type: "ad-config" as any,
                    ...adPage,
                    _id: `ad-config-${websiteAdPageId}`,
                  },
                ],
              };

              pageNum++;
            });

            articleIndex++;
          }

          const addGeneratedBlankPage = (reason: string) => {
            const blankPageId = `generated-blank-${reason}-${pageNum}`;

            newPages.push({
              id: blankPageId,
              pageNumber: pageNum,
              type: "layout",
              layoutId: "article-text-layout",
              alt: "Blank page",
            });

            newLayoutState[blankPageId] = {
              blocks: [
                {
                  type: "blank" as any,
                  content: "preserve-blank-page",
                  _id: `blank-${blankPageId}`,
                },
              ],
            };

            pageNum++;
          };

          const addBackMatterPages = async () => {
            const backMatterPages = Array.isArray(
              magazineManifestRaw?.backMatterPages,
            )
              ? magazineManifestRaw.backMatterPages
              : [];

            for (const backPage of backMatterPages) {
              if (!backPage || !backPage.id) continue;

              const pageId = String(backPage.id);
              const shouldPlaceBeforeBackCover =
                backPage.placement?.before === "back-cover" ||
                backPage.position === "before-back-cover" ||
                backPage.type === "inside-back-cover";

              if (
                shouldPlaceBeforeBackCover &&
                pageNum % 2 !== 0
              ) {
                addGeneratedBlankPage("before-inside-back-cover");
              }

              const markdownContent =
                backPage.markdownPath || backPage.contentPath
                  ? await loadGithubMarkdown(
                      backPage.markdownPath || backPage.contentPath,
                    )
                  : "";

              newPages.push({
                id: pageId,
                pageNumber: pageNum,
                type: "layout",
                layoutId:
                  backPage.layoutId ||
                  (backPage.type === "inside-back-cover"
                    ? "inside-back-cover"
                    : "article-text-layout"),
                alt: backPage.alt || backPage.title || pageId,
              });

              newLayoutState[pageId] = {
                blocks: markdownContent
                  ? [
                      {
                        type: "markdown" as const,
                        content: markdownContent,
                        _id: `md-${pageId}`,
                      },
                    ]
                  : Array.isArray(backPage.blocks)
                    ? backPage.blocks
                    : [],
              };

              if (backPage.toc?.title) {
                newToc.push({
                  id: backPage.toc.id || `toc-${pageId}`,
                  title: backPage.toc.title,
                  pageNumber: pageNum,
                  level: backPage.toc.level ?? 0,
                });
              }

              pageNum++;

              if (
                shouldPlaceBeforeBackCover &&
                pageNum % 2 === 1
              ) {
                addGeneratedBlankPage("after-inside-back-cover");
              }
            }
          };

          await addBackMatterPages();

          const activeAdPlacements = Array.isArray(
            activeAdsPayload?.ads,
          )
            ? activeAdsPayload.ads
            : [];

          activeAdPlacements.forEach((ad: any, index: number) => {
            const adPage = buildAdPageFromPlacement(
              ad,
              pageNum++,
            );
            const adMarkdown = createAdMarkdown(ad);
            const adBlocks: ContentBlock[] = [];

            if (ad.imageUrl) {
              adBlocks.push({
                type: "image",
                src: ad.imageUrl,
                alt:
                  ad.altText ||
                  ad.title ||
                  ad.headline ||
                  "Sponsored placement",
                credit: ad.sponsorDisclosure || "Sponsored placement",
                fullPage: true,
                _id: `image-${adPage.id}`,
              });
            }

            if (adMarkdown) {
              adBlocks.push({
                type: "markdown",
                content: adMarkdown,
                _id: `markdown-${adPage.id}`,
              });
            }

            newLayoutState[adPage.id] = { blocks: adBlocks };

            const placement = ad.placement || {};
            const rule = String(placement.rule || "after");
            const targetId = String(placement.targetId || "");
            let insertIndex = newPages.length;

            if (targetId) {
              const foundIndex = newPages.findIndex(
                (page) => page.id === targetId,
              );

              if (foundIndex >= 0) {
                insertIndex =
                  rule === "before" ? foundIndex : foundIndex + 1;
              }
            }

            newPages.splice(insertIndex + index, 0, adPage);
          });

          // Finalize generated pages without page-number-specific deletions or moves.
          // Articles, images, title pages, story pages, and share pages are tied to article records,
          // not to fixed visible page numbers. Only the inside front cover keeps pageNumber 0.
          const isBlankGeneratedTextPage = (page: any) => {
            if (lockedBlankBeforeDearReaderPageIds.has(page.id))
              return false;
            if (page.layoutId !== "article-text-layout")
              return false;

            const blocks = newLayoutState[page.id]?.blocks;
            if (!Array.isArray(blocks) || blocks.length === 0)
              return true;

            return !blocks.some((block: any) => {
              if (!block) return false;
              if (block.type === "markdown") {
                return (
                  String(block.content || "")
                    .replace(/<!--?[\s\S]*?-->/g, "")
                    .trim().length > 0
                );
              }

              if (
                block.type === "image" ||
                block.type === "share"
              ) {
                return true;
              }

              return Object.values(block).some((value) =>
                typeof value === "string"
                  ? value.trim().length > 0
                  : !!value,
              );
            });
          };

          let finalPages = [...newPages].filter(
            (page) => !isBlankGeneratedTextPage(page),
          );

          // Remove the empty/image-placeholder page that can appear immediately
          // before the share card for this article. This keeps the share page
          // attached to the article without leaving a blank left-side page.
          const removeEmptyPageBeforeArticleShare = (
            pages: any[],
            articleId: string,
          ) => {
            const sharePageId = `article-${articleId}-share`;

            return pages.filter((page, index) => {
              const nextPage = pages[index + 1];
              if (!nextPage || nextPage.id !== sharePageId)
                return true;

              const blocks =
                newLayoutState[page.id]?.blocks || [];
              const hasVisibleMarkdown = blocks.some(
                (block: any) =>
                  block?.type === "markdown"
                    ? String(block.content || "")
                        .replace(/<!--?[\s\S]*?-->/g, "")
                        .trim().length > 0
                    : false,
              );
              const hasShareBlock = blocks.some(
                (block: any) => block?.type === "share",
              );
              const hasImageBlock = blocks.some(
                (block: any) => block?.type === "image",
              );

              // Only remove blank/image-placeholder pages directly before the
              // target share page. Real text/share content is preserved.
              const isBlankOrImagePlaceholder =
                !hasVisibleMarkdown &&
                !hasShareBlock &&
                (blocks.length === 0 ||
                  page.layoutId === "article-image-layout" ||
                  hasImageBlock);

              return !isBlankOrImagePlaceholder;
            });
          };

          finalPages = removeEmptyPageBeforeArticleShare(
            finalPages,
            "how-i-transitioned-from-an-iv-therapy-pump-to-oral-meds",
          );

          let currentNum = 1;
          const oldToNewPageMap: Record<number, number> = {};

          finalPages.forEach((p) => {
            if (p.id === reservedPageId) {
              oldToNewPageMap[p.pageNumber] = 0;
              p.pageNumber = 0;
              return;
            }

            oldToNewPageMap[p.pageNumber] = currentNum;
            p.pageNumber = currentNum++;
          });

          newToc.forEach((entry) => {
            if (oldToNewPageMap[entry.pageNumber]) {
              entry.pageNumber =
                oldToNewPageMap[entry.pageNumber];
            }
          });

          finalPages.sort(
            (a, b) => a.pageNumber - b.pageNumber,
          );

          // Give the in-magazine "What's Inside" page live chapter targets only.
          // The full story list belongs in the top-bar/sidebar Table of Contents.
          // Page numbers are pulled from the final rendered chapter-divider pages,
          // so they update automatically whenever chapters, stories, ads, or blanks shift.
          const whatsInsideChapterTargets = [
            {
              title: "Beyond the Column",
              pageId:
                "chapter-scleroderma-foundation-of-greater-chicago-divider",
            },
            {
              title: "The PHlip-side",
              pageId: "chapter-the-phlip-side-divider",
            },
            {
              title: "Rants in Writing",
              pageId: "chapter-rants-of-the-psyche-divider",
            },
            {
              title: "Tips & Tricks",
              pageId: "chapter-tips-tricks-divider",
            },
          ];

          newLayoutState[whatsInsideRightPageId] = {
            blocks: whatsInsideChapterTargets
              .map((target) => {
                const targetPage = finalPages.find(
                  (page) => page.id === target.pageId,
                );

                if (!targetPage) return null;

                return {
                  type: "toc-entry" as const,
                  title: target.title,
                  pageNumber: String(
                    targetPage.pageNumber,
                  ).padStart(2, "0"),
                  showDivider: false,
                  _id: `whats-inside-link-${target.pageId}`,
                };
              })
              .filter(Boolean) as ContentBlock[],
          };

          // Final content cleanup runs across all generated markdown blocks after article splitting.
          // It is intentionally content-based, not visible-page-number-based.
          // Final hard cleanup for source filenames and unwanted social follow/comment text.
          // This runs across all generated markdown blocks after all page numbering,
          // article splitting, and page-specific cleanup has finished.
          Object.keys(newLayoutState).forEach((pageId) => {
            const pageState = newLayoutState[pageId];
            if (!pageState?.blocks) return;

            pageState.blocks = pageState.blocks.map((block) => {
              if (
                block.type !== "markdown" ||
                typeof block.content !== "string"
              ) {
                return block;
              }

              return {
                ...block,
                content: block.content
                  .replace(
                    /^\s*i-learn-a-hard-lesson-about-traveling-with-pulmonary-hypertension\.md\s*$/gim,
                    "",
                  )
                  .replace(
                    /i-learn-a-hard-lesson-about-traveling-with-pulmonary-hypertension\.md/g,
                    "",
                  )
                  .replace(
                    /^\s*To\s+read\s+more\s+about\s+my\s+journey\s+and\s+PH\s+awareness,\s+follow\s+me\s+at:\s*BreathtakingAwareness\.\s*$/gim,
                    "",
                  )
                  .replace(
                    /To\s+read\s+more\s+about\s+my\s+journey\s+and\s+PH\s+awareness,\s+follow\s+me\s+at:\s*BreathtakingAwareness\./gim,
                    "",
                  )
                  .replace(
                    /,?\s*["“]?Jolie\s+Lizana\s+sits\s+among\s+a\s+fall\s+pumpkin\s+display\.\s*\(Courtesy\s+of\s+Jolie\s+Lizana\)["”]?/gim,
                    "",
                  )
                  .replace(/^\s*[•·▪◦.]\s*$/gm, "")
                  .replace(
                    /Please\s+share\s+your\s+thoughts\s+in\s+the\s+comments\s+below\.\s*Follow\s+me\s+at\s+Breathtaking\s+Awareness\./gim,
                    "",
                  )
                  .replace(/[ \t]+\n/g, "\n")
                  .replace(/\n{3,}/g, "\n\n")
                  .trim(),
              };
            });
          });

          const readerContext = magazineManifestRaw?.readerContext || {};
          const readerIssue = readerContext.issue || {};

          setViewerData({
            ...FALLBACK_MAGAZINE_DATA,
            totalPages: finalPages.length,
            issueTitle: readerIssue.issueTitle || "",
            spineText: readerIssue.spineText || "",
            publisher: readerIssue.publisher || "",
            issueNumber: readerIssue.issueNumber || "",
            publicationDate: readerIssue.publicationDate || "",
            coverContext: readerContext.cover || {},
            backCoverContext: readerContext.backCover || {},
            topBarContext: readerContext.topBar || {},
          } as any);
          setMagazineData(finalPages);
          setTocData(newToc);
          setLayoutState(newLayoutState);
          setContentLoadMessage("");
          sendMagazineAnalyticsEvent({
            eventType: "content_source_used",
            source: contentSource,
            pageCount: finalPages.length,
            adCount: activeAdPlacements.length,
          });
          openSharedArticleIfPresent(finalPages);
        } else {
          throw new Error("Failed to fetch from GitHub");
        }
      } catch (err) {
        console.error("GitHub content could not be loaded:", err);
        setViewerData(FALLBACK_MAGAZINE_DATA);
        setMagazineData([]);
        setTocData([]);
        setLayoutState({});
        setContentLoadMessage(
          "GitHub content could not be loaded. The magazine content is unavailable until GitHub content loads.",
        );
      }

      try {
        const issueManifestRes = await fetchNoStore(ISSUE_URL);

        if (!issueManifestRes.ok) {
          throw new Error("Failed to fetch GitHub issue.json runtime manifest");
        }

        const issueManifest = await issueManifestRes.json();
        const runtimeManifest = {
          runtime: issueManifest.runtime || {},
          music: issueManifest.music || {},
        } as PublishManifest;
        const manifestTracks =
          runtimeManifest.music?.enabled &&
          Array.isArray(runtimeManifest.music.tracks)
            ? runtimeManifest.music.tracks
            : [];

        setManifest(runtimeManifest);
        setMusicLibrary(manifestTracks);
        setShowBranding(
          runtimeManifest.runtime?.brandingEnabled ?? true,
        );
      } catch (manifestErr) {
        console.error(
          "GitHub issue runtime/music settings could not be loaded:",
          manifestErr,
        );
        setManifest({
          runtime: {},
          music: { enabled: false, tracks: [] },
        } as PublishManifest);
        setMusicLibrary([]);
        setShowBranding(true);
      }

      setIsDataLoaded(true);
    };

    fetchGithubData();

    // Load runtime.css if configured
    const loadRuntimeCss = async () => {
      try {
        const cssUrl = getDataUrl("RUNTIME_CSS");
        const response = await fetch(cssUrl);
        if (
          response.ok &&
          response.headers
            .get("content-type")
            ?.includes("text/css")
        ) {
          const cssText = await response.text();
          if (cssText && cssText.trim().length > 0) {
            const styleElement =
              document.createElement("style");
            styleElement.id = "runtime-css";
            styleElement.textContent = cssText;
            document.head.appendChild(styleElement);
          }
        }
      } catch (error) {
        // Runtime CSS is optional, silently fail
      }
    };

    // Load runtime.js if configured
    const loadRuntimeJs = async () => {
      try {
        const jsUrl = getDataUrl("RUNTIME_JS");
        const response = await fetch(jsUrl);
        if (
          response.ok &&
          (response.headers
            .get("content-type")
            ?.includes("javascript") ||
            response.headers
              .get("content-type")
              ?.includes("text/plain"))
        ) {
          const jsText = await response.text();
          // Validate that it's actually JavaScript, not HTML
          if (
            jsText &&
            jsText.trim().length > 0 &&
            !jsText.trim().startsWith("<")
          ) {
            const scriptElement =
              document.createElement("script");
            scriptElement.id = "runtime-js";
            scriptElement.textContent = jsText;
            document.body.appendChild(scriptElement);
          }
        }
      } catch (error) {
        // Runtime JS is optional, silently fail
      }
    };

    loadRuntimeCss();
    loadRuntimeJs();
  }, []);

  const WOOD_BACKGROUND_URL =
    "https://breathtakingawareness.com/wp-content/uploads/2025/12/Wood-Digital-Scrapbook-Paper-9.png";
  const backgroundImage =
    manifest?.runtime.background || WOOD_BACKGROUND_URL;

  // Preload Background Image
  useEffect(() => {
    if (!backgroundImage) {
      setIsBackgroundLoaded(true);
      return;
    }

    // Safety timeout in case image hangs
    const timeout = setTimeout(() => {
      setIsBackgroundLoaded(true);
    }, 3000);

    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      setIsBackgroundLoaded(true);
      clearTimeout(timeout);
    };
    img.onerror = () => {
      setIsBackgroundLoaded(true);
      clearTimeout(timeout);
    };

    return () => clearTimeout(timeout);
  }, [backgroundImage]);

  // Delayed Book Entry Logic
  useEffect(() => {
    if (isBackgroundLoaded) {
      const timer = setTimeout(() => {
        setShowIntroAnimation(true);
      }, 1200); // 1.2s delay after background loads
      return () => clearTimeout(timer);
    }
  }, [isBackgroundLoaded]);

  const coverImageUrl = viewerData?.coverImageUrl || "";
  const displayTitle = viewerData?.issueTitle || "";
  const backCoverImageUrl = viewerData?.backCoverImageUrl;
  const spineText = viewerData?.spineText || "";
  const backCoverText = viewerData?.backCoverText || "";
  const publisher = viewerData?.publisher;
  const issueNumber = viewerData?.issueNumber;
  const publicationDate = viewerData?.publicationDate;
  const coverContext = (viewerData as any)?.coverContext;
  const backCoverContext = (viewerData as any)?.backCoverContext;
  const topBarContext = (viewerData as any)?.topBarContext || {};

  // Determine if we should render a two-page spread or a centered single page.
  const isSpread =
    readerMetrics.width >= AUTO_SINGLE_PAGE_BREAKPOINT &&
    !effectiveSinglePageMode;

  // Keep one-page mode centered and fully visible whether it is selected by the
  // user or automatically forced by a narrow screen. Do not switch to a vertical
  // scroll layout for normal one-page reading because that removes the visible
  // background gap above/below the page.
  const isScrollMode = false;

  const readerVerticalGap =
    appState === "reading"
      ? effectiveSinglePageMode
        ? Math.max(
            12,
            Math.min(22, readerMetrics.height * 0.022),
          )
        : Math.max(
            16,
            Math.min(30, readerMetrics.height * 0.026),
          )
      : 0;

  // Render variables to handle the scrolling container wrapper.
  // During a turn, the visible page is rotated inside ReadingView, so the
  // wrapper must use the rotated bounding-box size. Otherwise the page can clip.
  const turnRadians = (Math.abs(tiltAngle) * Math.PI) / 180;
  const turnedContentWidth =
    Math.abs(Math.cos(turnRadians)) * magazineSize.width +
    Math.abs(Math.sin(turnRadians)) * magazineSize.height;
  const turnedContentHeight =
    Math.abs(Math.sin(turnRadians)) * magazineSize.width +
    Math.abs(Math.cos(turnRadians)) * magazineSize.height;

  const contentWidth = isMagazineTurn
    ? turnedContentWidth
    : isSpread
      ? magazineSize.width * 2 + PAGE_STACK_OUTSIDE_WIDTH * 2
      : magazineSize.width;
  const contentHeight = isMagazineTurn
    ? turnedContentHeight
    : magazineSize.height;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="h-[100dvh] w-full min-h-[600px] overflow-hidden overflow-x-hidden relative flex flex-col items-center justify-center"
        style={{ backgroundColor: "#2C241B" }}
        id="the-words-we-carry-root"
      >
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isBackgroundLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
          aria-hidden="true"
        />

        {appState === "reading" && (
          <>
            <TopBar
              issueTitle={displayTitle}
              currentPage={currentPage}
              totalPages={magazineData.length - 1}
              isSpread={isSpread}
              showBranding={showBranding}
              brandLabel={topBarContext.brandLabel}
              brandLogoUrl={topBarContext.logoUrl}
              brandLogoAlt={topBarContext.logoAlt}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onBackToCover={handleBackToCover}
              onToggleTOC={handleToggleTOC}
              onToggleThumbnails={handleToggleThumbnails}
              onPageJump={handlePageJump}
              bookmarkedPages={bookmarkedPages}
              isCurrentPageBookmarked={isCurrentPageBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onGoToBookmark={handleGoToBookmark}
              onClearBookmarks={handleClearBookmarks}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              isEditMode={isEditMode}
              onToggleEditMode={setIsEditMode}
              isPageLocked={isPageLocked}
              onToggleLock={setIsPageLocked}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onSave={handleSave}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              onResetLeft={() =>
                leftPageId && handleResetPage(leftPageId)
              }
              onResetRight={() =>
                rightPageId && handleResetPage(rightPageId)
              }
              onResetBoth={() => {
                if (leftPageId && rightPageId) {
                  handleResetBoth(leftPageId, rightPageId);
                } else if (leftPageId) {
                  handleResetPage(leftPageId);
                }
              }}
              canResetLeft={!!leftPageId}
              canResetRight={!!rightPageId}
              currentTilt={tiltAngle}
              onTiltChange={setTiltAngle}
              isSinglePage={effectiveSinglePageMode}
              onViewModeChange={(newMode) => {
                setIsSinglePageMode(newMode);
                setTiltAngle(0);

                if (newMode) {
                  setShowExpandScreenNotice(false);
                }

                // When returning to two-page spread, normalize the current page to
                // the left page of the spread so the current spread recenters cleanly.
                if (!newMode && currentPage !== "cover") {
                  const pageNumber = currentPage as number;
                  if (pageNumber > 1 && pageNumber % 2 !== 0) {
                    setCurrentPage(pageNumber - 1);
                  }
                }
              }}
              isMusicPlaying={isMusicPlaying}
              onToggleMusic={handleToggleMusic}
              musicVolume={musicVolume}
              onMusicVolumeChange={setMusicVolume}
              musicLibrary={musicLibrary}
              selectedTrackId={selectedTrackId}
              onSelectTrack={handleSelectMusicTrack}
              onPreviousTrack={handlePreviousMusicTrack}
              onNextTrack={handleNextMusicTrack}
              isRepeatingCurrentTrack={isRepeatingCurrentTrack}
              onToggleRepeatTrack={
                handleToggleRepeatCurrentTrack
              }
            />

            <LeftPanel
              isOpen={openPanel !== null}
              type={openPanel}
              tocEntries={generatedTOC}
              thumbnails={thumbnails}
              onClose={() => setOpenPanel(null)}
              onNavigate={handlePageJump}
              searchEntries={searchEntries}
              searchQuery={searchQuery}
              onSearchQueryChange={handleSearchQueryChange}
              topOffset={toolbarHeight}
            />

            {isAutoSinglePageDueToNarrowScreen &&
              showExpandScreenNotice && (
                <div
                  className="absolute bottom-4 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#AF9355]/40 bg-[#0A1C27]/95 px-4 py-2 text-sm text-[#F8F3E8] shadow-lg backdrop-blur-md"
                  role="status"
                  aria-live="polite"
                >
                  <span>
                    Expand screen size to see full view.
                  </span>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[#AF9355]/50 text-[#AF9355] transition hover:bg-[#AF9355]/20"
                    aria-label="Close screen size message"
                    onClick={() =>
                      setShowExpandScreenNotice(false)
                    }
                  >
                    ×
                  </button>
                </div>
              )}
          </>
        )}

        {contentLoadMessage && appState === "reading" && (
          <div
            className="absolute left-1/2 z-[95] max-w-[min(92vw,560px)] -translate-x-1/2 rounded-b-xl border border-[#AF9355]/35 bg-[#0A1C27]/95 px-4 py-2 text-center text-xs leading-snug text-[#F8F3E8] shadow-lg backdrop-blur-md"
            style={{ top: toolbarHeight }}
            role="status"
            aria-live="polite"
          >
            {contentLoadMessage}
          </div>
        )}

        <main
          onTouchStart={handleReaderTouchStart}
          onTouchEnd={handleReaderTouchEnd}
          className={`absolute left-0 right-0 bottom-0 flex justify-center ${
            isScrollMode
              ? "items-start overflow-y-auto overflow-x-hidden"
              : "items-center overflow-hidden"
          }`}
          style={{
            top: toolbarHeight,
            paddingTop: readerVerticalGap,
            paddingBottom: readerVerticalGap,
            boxSizing: "border-box",
          }}
          role="main"
        >
          <div
            style={{
              // If scroll mode, we set explicit dimensions to force scrollability
              // If not scroll mode (center fit), we let it be auto
              width: isScrollMode
                ? contentWidth * layoutScale
                : "auto",
              height: isScrollMode
                ? contentHeight * layoutScale
                : "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: isScrollMode
                ? "flex-start"
                : "center",
              flexShrink: 0,
              // Add some padding at bottom for scroll mode so it doesn't cut off right at edge
              paddingBottom: isScrollMode ? "40px" : "0",
            }}
          >
            <div
              style={{
                transform: `scale(${layoutScale})`,
                transformOrigin: isScrollMode
                  ? "top center"
                  : "center center",
                transition: "transform 0.2s ease-out",
                // Force explicit dimensions on the transformed element so the wrapper knows what to wrap
                width: contentWidth,
                height: contentHeight,
                flexShrink: 0,
              }}
            >
              {appState === "loading" && (
                <PlaceMagazineAnimation
                  coverImageUrl={coverImageUrl}
                  isActive={showIntroAnimation}
                  issueTitle={displayTitle}
                  onComplete={handlePlaceMagazineComplete}
                  spineText={spineText}
                  backCoverImageUrl={backCoverImageUrl}
                  backCoverText={backCoverText}
                  publisher={publisher}
                  issueNumber={issueNumber}
                  publicationDate={publicationDate}
                  width={magazineSize.width}
                  height={magazineSize.height}
                  coverContext={viewerData?.coverContext}
                  backCoverContext={backCoverContext}
                />
              )}

              {appState === "closed-cover" && (
                <div 
                  className="relative h-full w-full"
                  onPointerDown={() => setHasDismissedContinueReading(true)}
                >
                  <ClosedCover
                    coverImageUrl={coverImageUrl}
                    issueTitle={displayTitle}
                    onOpen={handleOpenMagazine}
                    spineText={spineText}
                    backCoverImageUrl={backCoverImageUrl}
                    backCoverText={backCoverText}
                    publisher={publisher}
                    issueNumber={issueNumber}
                    publicationDate={publicationDate}
                    coverContext={coverContext}
                    backCoverContext={backCoverContext}
                    width={magazineSize.width}
                    height={magazineSize.height}
                  />
                  {!hasDismissedContinueReading && continueReadingPage && continueReadingPage > 1 && (
                    <div className="absolute bottom-8 right-8 z-[2147483647] flex flex-col items-end gap-2 rounded-2xl border border-[#AF9355]/45 bg-[#0A1C27]/90 px-4 py-3 text-[#F8F3E8] shadow-xl backdrop-blur-md md:bottom-12 md:right-12 pointer-events-auto">
                      <button
                        type="button"
                        className="rounded-full bg-[#AF9355] px-5 py-2 text-sm font-semibold text-[#071620] shadow transition hover:bg-[#d4bc7a] focus:outline-none focus:ring-2 focus:ring-[#F8F3E8]"
                        onClick={handleResumeReading}
                      >
                        Continue reading · page {continueReadingPage}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[#F8F3E8]/80 underline underline-offset-4 transition hover:text-[#F8F3E8] pr-2"
                        onClick={handleStartFromBeginning}
                      >
                        Start from the beginning
                      </button>
                    </div>
                  )}
                </div>
              )}

              {appState === "closed-back" && (
                <ClosedBackCover
                  coverImageUrl={coverImageUrl}
                  issueTitle={displayTitle}
                  onOpen={handleOpenMagazine}
                  width={magazineSize.width}
                  height={magazineSize.height}
                  backCoverContext={backCoverContext}
                />
              )}

              {appState === "first-open" && (
                <FirstOpenAnimation
                  coverImageUrl={coverImageUrl}
                  onComplete={handleFirstOpenComplete}
                  width={magazineSize.width}
                  height={magazineSize.height}
                />
              )}

              {appState === "reading" &&
                currentPage !== "cover" && (
                  <ReadingView
                    currentPage={
                      typeof currentPage === "number"
                        ? currentPage
                        : 1
                    }
                    pages={magazineData}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onNavigate={handlePageJump}
                    canGoPrevious={canGoPrevious}
                    canGoNext={canGoNext}
                    tiltAngle={tiltAngle}
                    isSinglePageMode={effectiveSinglePageMode}
                    width={magazineSize.width}
                    height={magazineSize.height}
                    isPageLocked={isPageLocked}
                    isEditMode={isEditMode}
                    layoutState={layoutState}
                    onUpdateLayout={handleUpdateLayout}
                  />
                )}
            </div>
          </div>
        </main>
      </div>
    </DndProvider>
  );
}

export default App;