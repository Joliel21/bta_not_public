import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookOpen,
  Grid3x3,
  Lock,
  LockOpen,
  Undo,
  Redo,
  Save,
  RotateCcw,
  Music,
  List,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Repeat,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";

import { PageJumpInput } from "./PageJumpInput";

import { useEffect, useRef, useState } from "react";

import type { MusicTrack } from "@/app/components/MusicControl";

interface TopBarProps {
  issueTitle: string;

  currentPage: number | "cover";

  totalPages: number;

  isSpread: boolean;

  showBranding?: boolean;

  brandLabel?: string;

  brandLogoUrl?: string;

  brandLogoAlt?: string;

  onPrevious: () => void;

  onNext: () => void;

  onBackToCover: () => void;

  onToggleTOC: () => void;

  onToggleThumbnails: () => void;

  onPageJump: (page: number) => void;

  bookmarkedPages?: number[];

  isCurrentPageBookmarked?: boolean;

  onToggleBookmark?: () => void;

  onGoToBookmark?: (page: number) => void;

  onClearBookmarks?: () => void;

  canGoPrevious: boolean;

  canGoNext: boolean;

  isEditMode: boolean;

  onToggleEditMode: (enabled: boolean) => void;

  isPageLocked: boolean;

  onToggleLock: (locked: boolean) => void;

  onUndo: () => void;

  onRedo: () => void;

  onSave: () => void;

  canUndo: boolean;

  canRedo: boolean;

  onResetLeft?: () => void;

  onResetRight?: () => void;

  onResetBoth?: () => void;

  canResetLeft?: boolean;

  canResetRight?: boolean;

  isMusicPlaying: boolean;

  onToggleMusic: (playing: boolean) => void;

  musicVolume: number;

  onMusicVolumeChange: (volume: number) => void;

  musicLibrary: MusicTrack[];

  selectedTrackId: string | null;

  onSelectTrack: (id: string | null) => void;

  onPreviousTrack?: () => void;

  onNextTrack?: () => void;

  isRepeatingCurrentTrack?: boolean;

  onToggleRepeatTrack?: () => void;

  isSinglePage: boolean;

  onViewModeChange: (isSinglePage: boolean) => void;

  currentTilt: number;

  onTiltChange: (tilt: number) => void;
}

export function TopBar({
  issueTitle,

  currentPage,

  totalPages,

  isSpread,

  showBranding = true,

  brandLabel = "Breathtaking Awareness",

  brandLogoUrl = "",

  brandLogoAlt = "Breathtaking Awareness",

  onPrevious,

  onNext,

  onBackToCover,

  onToggleTOC,

  onToggleThumbnails,

  onPageJump,

  bookmarkedPages = [],

  isCurrentPageBookmarked = false,

  onToggleBookmark,

  onGoToBookmark,

  onClearBookmarks,

  canGoPrevious,

  canGoNext,

  isEditMode,

  onToggleEditMode,

  isPageLocked,

  onToggleLock,

  onUndo,

  onRedo,

  onSave,

  canUndo,

  canRedo,

  onResetLeft,

  onResetRight,

  onResetBoth,

  canResetLeft,

  canResetRight,

  isMusicPlaying,

  onToggleMusic,

  musicVolume,

  onMusicVolumeChange,

  musicLibrary,

  selectedTrackId,

  onSelectTrack,

  onPreviousTrack,

  onNextTrack,

  isRepeatingCurrentTrack = false,

  onToggleRepeatTrack,

  isSinglePage,

  onViewModeChange,

  currentTilt,

  onTiltChange,
}: TopBarProps) {
  const [showMusicDropdown, setShowMusicDropdown] =
    useState(false);
  const [showBookmarksDropdown, setShowBookmarksDropdown] =
    useState(false);
  const [
    isMandatoryCompactToolbar,
    setIsMandatoryCompactToolbar,
  ] = useState(false);
  const [isPhoneToolbar, setIsPhoneToolbar] = useState(false);
  const [isTwoRowToolbar, setIsTwoRowToolbar] = useState(false);
  const [
    isMusicTransportOnTopBar,
    setIsMusicTransportOnTopBar,
  ] = useState(false);
  const toolbarInnerRef = useRef<HTMLDivElement | null>(null);

  // Any non-zero tilt is a magazine turn. The reader should show one page first,
  // then rotate that one page. Do not wait until 90 degrees to leave spread view.
  const isMagazineTurn = currentTilt !== 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const getToolbarWidth = () => {
      const measuredWidth =
        toolbarInnerRef.current?.getBoundingClientRect()
          .width || 0;

      return measuredWidth > 0
        ? measuredWidth
        : window.innerWidth;
    };

    const updateResponsiveToolbarState = () => {
      const width = getToolbarWidth();

      setIsMandatoryCompactToolbar(width <= 1119);
      setIsPhoneToolbar(width <= 759);
      setIsTwoRowToolbar(width <= 519);

      // Hard safety rule: the full music transport row needs enough measured
      // toolbar width for all four 44px music buttons, the logo, divider,
      // spacing, and the left/center controls. If that space is not available,
      // hide skip-back / skip-forward / repeat before they can touch the edge.
      setIsMusicTransportOnTopBar(width >= 1240);
    };

    updateResponsiveToolbarState();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" &&
      toolbarInnerRef.current
        ? new ResizeObserver(updateResponsiveToolbarState)
        : null;

    if (resizeObserver && toolbarInnerRef.current) {
      resizeObserver.observe(toolbarInnerRef.current);
    }

    window.addEventListener(
      "resize",
      updateResponsiveToolbarState,
    );
    window.addEventListener(
      "orientationchange",
      updateResponsiveToolbarState,
    );

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener(
        "resize",
        updateResponsiveToolbarState,
      );
      window.removeEventListener(
        "orientationchange",
        updateResponsiveToolbarState,
      );
    };
  }, []);

  useEffect(() => {
    if (!showMusicDropdown && !showBookmarksDropdown) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMusicDropdown(false);
        setShowBookmarksDropdown(false);
      }
    };

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showMusicDropdown, showBookmarksDropdown]);

  useEffect(() => {
    if (isMandatoryCompactToolbar && currentTilt !== 0) {
      onTiltChange(0);
    }
  }, [currentTilt, isMandatoryCompactToolbar, onTiltChange]);

  const getPageIndicator = () => {
    if (currentPage === "cover") {
      return "Cover";
    }

    if (isSpread && !isMagazineTurn) {
      const pageNum = currentPage as number;

      const isEven = pageNum % 2 === 0;

      const leftNum = isEven ? pageNum : pageNum - 1;

      const rightNum = leftNum + 1;

      if (leftNum > 0 && rightNum <= totalPages) {
        return `Pages ${leftNum}–${rightNum} of ${totalPages}`;
      } else if (leftNum > 0) {
        return `Page ${leftNum} of ${totalPages}`;
      } else {
        return `Page ${rightNum} of ${totalPages}`;
      }
    }

    return `Page ${currentPage} of ${totalPages}`;
  };

  const getBookmarkLabel = (page: number) => {
    if (page <= 0) return "Inside cover";
    return `Page ${page}`;
  };

  const sortedBookmarkedPages = [...bookmarkedPages].sort(
    (a, b) => a - b,
  );

  const commonButtonClasses =
    "min-h-11 min-w-11 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent";

  const touchButtonClasses =
    "min-h-11 min-w-11 touch-manipulation";

  const selectedTrack = musicLibrary.find(
    (track) => track.id === selectedTrackId,
  );

  const isMusicTransportVisibleOnTopBar =
    isMusicTransportOnTopBar;

  const groupedMusicTracks = musicLibrary.reduce(
    (groups, track) => {
      const groupName = track.type || "Music";

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push(track);
      return groups;
    },
    {} as Record<string, MusicTrack[]>,
  );

  const musicGroupNames = Object.keys(groupedMusicTracks).sort(
    (a, b) => a.localeCompare(b),
  );

  const handleSelectTrack = (trackId: string) => {
    onSelectTrack(trackId);
    onToggleMusic(true);
    setShowMusicDropdown(false);
  };

  const handleMusicOff = () => {
    onToggleMusic(false);
    onSelectTrack(null);
    setShowMusicDropdown(false);
  };

  const handleMusicClick = () => {
    // Keep the music note as the dropdown opener.
    // Play/pause is handled inside the dropdown so track selection remains visible.
    setShowBookmarksDropdown(false);
    setShowMusicDropdown(!showMusicDropdown);
  };

  const handleViewModeClick = () => {
    if (isMandatoryCompactToolbar) return;

    // Keep this control available only when the reader is wide enough to allow
    // a true spread. Mandatory one-page mode should not offer spread view.
    onViewModeChange(!isSinglePage);
  };

  const handleTiltClick = () => {
    let nextTilt = 0;

    if (currentTilt === 0) {
      nextTilt = 45;
    } else if (currentTilt === 45) {
      nextTilt = 90;
    } else if (currentTilt === 90) {
      nextTilt = -45;
    } else if (currentTilt === -45) {
      nextTilt = -90;
    } else {
      nextTilt = 0;
    }

    onTiltChange(nextTilt);
  };

  return (
    <header
      className="absolute top-0 left-0 right-0 z-[2147483647] !block !visible !opacity-100 pointer-events-auto transition-colors duration-300 bg-[#0A1C27] border-b border-[#267999]/30 overflow-visible"
      role="banner"
    >
      <div
        ref={toolbarInnerRef}
        className="flex items-center h-[clamp(72px,6.15vw,92px)] px-[clamp(16px,1.5vw,24px)] gap-[clamp(10px,1vw,16px)] overflow-visible max-[520px]:h-[144px] max-[520px]:flex-wrap max-[520px]:content-center max-[520px]:items-center max-[520px]:gap-y-1 max-[520px]:px-2 max-[520px]:py-2"
      >
        <div className="flex items-center gap-3 min-w-0 shrink-0 max-[759px]:flex-none max-[520px]:basis-auto max-[520px]:justify-start max-[520px]:gap-2">
          {showBranding && (
            <>
              <button
                type="button"
                onClick={onBackToCover}
                className="hidden max-[759px]:flex items-center justify-center h-[84px] w-[96px] bg-transparent rounded-full select-none border-none shrink-0 hover:bg-[#113143]/50 transition-colors touch-manipulation"
                title="Back to Cover"
                aria-label="Go to magazine cover"
              >
                <img
                  src={brandLogoUrl}
                  alt={brandLogoAlt || brandLabel || issueTitle || ""}
                  className="h-[78px] w-auto max-w-[128px] object-contain"
                />
              </button>

              <button
                type="button"
                onClick={onBackToCover}
                className="hidden min-[760px]:flex items-center justify-start gap-2 min-h-11 w-[304px] px-5 py-3 bg-transparent rounded-md select-none border-none shrink-0 hover:bg-[#113143]/50 transition-colors touch-manipulation"
                title="Back to Cover"
                aria-label="Go to magazine cover"
              >
                <span
                  className="text-base md:text-xl whitespace-nowrap select-none font-semibold tracking-wider"
                  style={{ color: "#F8F3E8" }}
                >
                  {brandLabel || issueTitle}
                </span>
              </button>
            </>
          )}

          {false && issueTitle && (
            <h1 className="hidden 2xl:block text-base md:text-lg text-[#D1B880] truncate select-none font-medium max-w-[220px]">
              {brandLabel || issueTitle}
            </h1>
          )}

          <div className="flex items-center gap-2 shrink-0 max-[520px]:gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTOC}
              aria-label="Toggle table of contents"
              title="Table of Contents"
              className="min-h-11 min-w-11 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880]"
            >
              <List className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleThumbnails}
              aria-label="Toggle thumbnails"
              title="Thumbnails"
              className="min-h-11 min-w-11 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880]"
            >
              <Grid3x3 className="w-6 h-6" />
            </Button>

            <button
              onClick={handleTiltClick}
              className="relative hidden min-[1120px]:inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-full bg-transparent text-[#AF9355] hover:bg-[#113143]/50 transition-all duration-200 touch-manipulation"
              title={`Tilt: ${currentTilt}°`}
              aria-label={`Tilt magazine view. Current tilt is ${currentTilt} degrees.`}
            >
              <RotateCcw
                className="w-5 h-5"
                style={{
                  transform: `rotate(${currentTilt}deg)`,
                }}
              />

              {currentTilt !== 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold text-[#0A1C27] bg-[#AF9355] rounded-full w-4 h-4 flex items-center justify-center">
                  {Math.abs(currentTilt)}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowMusicDropdown(false);
                  setShowBookmarksDropdown(
                    !showBookmarksDropdown,
                  );
                }}
                className={`relative min-h-11 min-w-11 p-2 rounded-full transition-all duration-200 touch-manipulation ${
                  isCurrentPageBookmarked
                    ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                    : "bg-transparent text-[#AF9355] hover:bg-[#113143]/50"
                }`}
                title="Save or open bookmarks"
                aria-label="Save or open bookmarks"
                aria-haspopup="menu"
                aria-expanded={showBookmarksDropdown}
                aria-pressed={isCurrentPageBookmarked}
              >
                <Bookmark
                  className={`w-4 h-4 ${
                    isCurrentPageBookmarked
                      ? "fill-current"
                      : ""
                  }`}
                />

                {sortedBookmarkedPages.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#AF9355] text-[#0A1C27] text-[9px] font-bold leading-4 text-center">
                    {sortedBookmarkedPages.length}
                  </span>
                )}
              </button>

              {showBookmarksDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() =>
                      setShowBookmarksDropdown(false)
                    }
                  />

                  <div
                    className="absolute top-full left-0 mt-2 w-56 bg-[#0A1C27]/95 backdrop-blur-lg rounded-lg shadow-2xl border border-[#267999]/30 overflow-hidden z-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b border-[#267999]/20 bg-white/5">
                      <h3 className="text-[#AF9355] font-medium text-xs">
                        Bookmarks
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        onToggleBookmark?.();
                      }}
                      disabled={
                        currentPage === "cover" ||
                        !onToggleBookmark
                      }
                      className="w-full text-left px-3 py-2 border-b border-[#267999]/20 text-[#AF9355] hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <div className="text-sm font-medium">
                        {isCurrentPageBookmarked
                          ? "Remove this bookmark"
                          : "Bookmark this page"}
                      </div>
                      <div className="text-xs mt-0.5 text-[#AF9355]/60">
                        {currentPage === "cover"
                          ? "Open the magazine to save a page"
                          : getBookmarkLabel(currentPage)}
                      </div>
                    </button>

                    <div className="max-h-56 overflow-y-auto">
                      {sortedBookmarkedPages.length > 0 ? (
                        sortedBookmarkedPages.map((page) => (
                          <button
                            key={page}
                            onClick={() => {
                              onGoToBookmark?.(page);
                              setShowBookmarksDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[#AF9355] hover:bg-white/10 transition-colors"
                          >
                            <div className="text-sm font-medium">
                              {getBookmarkLabel(page)}
                            </div>
                            <div className="text-xs mt-0.5 text-[#AF9355]/60">
                              Go to saved place
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-[#AF9355]/60 text-xs leading-relaxed">
                          No saved bookmarks yet.
                        </div>
                      )}
                    </div>

                    {sortedBookmarkedPages.length > 0 && (
                      <button
                        onClick={() => {
                          onClearBookmarks?.();
                          setShowBookmarksDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 border-t border-[#267999]/20 text-[#AF9355]/80 hover:bg-white/10 transition-colors"
                      >
                        Clear all bookmarks
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleViewModeClick}
              className="hidden min-[1120px]:inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-full bg-transparent text-[#AF9355] hover:bg-[#113143]/50 transition-all duration-200 touch-manipulation"
              title={
                isSinglePage
                  ? "Single Page View — click for Two Page Spread"
                  : "Two Page Spread — click for Single Page View"
              }
              aria-label={
                isSinglePage
                  ? "Switch to two page spread"
                  : "Switch to single page view"
              }
            >
              <BookOpen
                className={`w-5 h-5 ${isSinglePage ? "opacity-60" : ""}`}
              />
            </button>

            <div className="hidden max-[759px]:flex max-[520px]:hidden items-center gap-2 shrink-0 ml-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                aria-label="Previous page"
                className="min-h-11 min-w-11 px-0 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft
                  className="w-7 h-7"
                  strokeWidth={3.25}
                />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!canGoNext}
                aria-label="Next page"
                className="min-h-11 min-w-11 px-0 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight
                  className="w-7 h-7"
                  strokeWidth={3.25}
                />
              </Button>

              <button
                type="button"
                onClick={handleMusicClick}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowMusicDropdown(!showMusicDropdown);
                }}
                className={`${!isMusicTransportVisibleOnTopBar && !isTwoRowToolbar ? "flex" : "hidden"} h-11 w-11 items-center justify-center rounded-full transition-all duration-200 overflow-hidden touch-manipulation ${
                  isMusicPlaying
                    ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                    : "bg-transparent text-[#AF9355] hover:bg-[#113143]/50"
                }`}
                title="Open music menu"
                aria-label="Open music menu"
                aria-haspopup="dialog"
                aria-expanded={showMusicDropdown}
              >
                <Music className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden min-[760px]:flex items-center justify-center gap-2 shrink-0 ml-2 max-[1279px]:ml-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            aria-label="Previous page"
            className="min-h-11 min-w-8 px-0 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft
              className="w-9 h-9"
              strokeWidth={3.5}
            />
          </Button>

          <div
            className="hidden min-[1280px]:block flex-shrink-0 px-1 text-center text-base text-[#AF9355] select-none"
            aria-live="polite"
            aria-atomic="true"
          >
            {getPageIndicator()}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Next page"
            className="min-h-11 min-w-8 px-0 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight
              className="w-9 h-9"
              strokeWidth={3.5}
            />
          </Button>

          <button
            type="button"
            onClick={handleMusicClick}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowMusicDropdown(!showMusicDropdown);
            }}
            className={`${!isMusicTransportVisibleOnTopBar && !isTwoRowToolbar ? "flex" : "hidden"} h-11 w-11 items-center justify-center rounded-full transition-all duration-200 overflow-hidden touch-manipulation ${
              isMusicPlaying
                ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                : "bg-transparent text-[#AF9355] hover:bg-[#113143]/50"
            }`}
            title="Open music menu"
            aria-label="Open music menu"
            aria-haspopup="dialog"
            aria-expanded={showMusicDropdown}
          >
            <Music className="w-5 h-5" />
          </button>

          {currentPage !== "cover" && (
            <div className="hidden min-[1120px]:max-[1279px]:block ml-2 text-white">
              <PageJumpInput
                totalPages={totalPages}
                onPageJump={onPageJump}
              />
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0 max-[759px]:gap-2 max-[520px]:ml-0 max-[520px]:basis-full max-[520px]:justify-start max-[520px]:pl-[104px] max-[520px]:gap-0">
          <div className="flex items-center gap-1 max-[520px]:hidden">
            {currentPage !== "cover" && (
              <div className="text-white hidden min-[1280px]:block">
                <PageJumpInput
                  totalPages={totalPages}
                  onPageJump={onPageJump}
                />
              </div>
            )}
          </div>

          <div className="flex items-center px-0 py-1 bg-transparent shrink-0 max-[520px]:hidden">
            {currentPage !== "cover" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToCover}
                aria-label="Back to cover"
                title="Back to Cover"
                className="hidden min-[900px]:flex text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880]"
              >
                <img
                  src={brandLogoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-[78px] w-auto max-w-[128px] object-contain"
                />
              </Button>
            )}
          </div>

          <div className="hidden min-[900px]:block h-8 w-px bg-[#AF9355]/40 mx-2 shrink-0" />

          <div
            className="relative flex items-center gap-3 rounded-full px-0 py-1 bg-transparent max-[520px]:gap-1"
            style={{ backgroundColor: "transparent" }}
          >
            {showMusicDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[9991]"
                  onClick={() => setShowMusicDropdown(false)}
                />

                <div
                  className="absolute top-full right-0 mt-2 w-72 max-h-[min(520px,calc(100vh-120px))] bg-[#0A1C27]/95 backdrop-blur-lg rounded-lg shadow-2xl border border-[#267999]/30 overflow-hidden z-[9992] max-[760px]:fixed max-[760px]:left-3 max-[760px]:right-3 max-[760px]:top-[84px] max-[760px]:mt-0 max-[760px]:w-auto max-[760px]:max-h-[calc(100svh-104px)] max-[760px]:overflow-y-auto max-[520px]:top-[116px] max-[520px]:max-h-[calc(100svh-128px)]"
                  role="dialog"
                  aria-label="Music controls and track selection"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-[#267999]/20 bg-white/5">
                    <h3 className="text-[#AF9355] font-medium text-xs">
                      Select Music
                    </h3>
                    {selectedTrack && (
                      <div className="mt-2 rounded-md border border-[#267999]/20 bg-[#113143]/35 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-[#AF9355]/60">
                          {isMusicPlaying
                            ? "Now playing"
                            : "Paused"}
                        </div>
                        <div className="truncate text-sm font-medium text-[#AF9355]">
                          {selectedTrack.name}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isMusicTransportVisibleOnTopBar && (
                    <div className="flex items-center justify-center gap-4 border-b border-[#267999]/20 bg-[#113143]/25 px-3 pt-3 pb-2">
                      <button
                        type="button"
                        onClick={onPreviousTrack}
                        disabled={
                          !onPreviousTrack ||
                          musicLibrary.length < 2
                        }
                        className="flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full text-[#AF9355] hover:bg-white/10 hover:text-[#D1B880] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                        title="Previous music track"
                        aria-label="Previous music track"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={onNextTrack}
                        disabled={
                          !onNextTrack ||
                          musicLibrary.length < 2
                        }
                        className="flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full text-[#AF9355] hover:bg-white/10 hover:text-[#D1B880] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                        title="Next music track"
                        aria-label="Next music track"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={onToggleRepeatTrack}
                        disabled={
                          !onToggleRepeatTrack ||
                          !selectedTrackId
                        }
                        className={`flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${
                          isRepeatingCurrentTrack
                            ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                            : "text-[#AF9355] hover:bg-white/10 hover:text-[#D1B880]"
                        }`}
                        title={
                          isRepeatingCurrentTrack
                            ? "Repeat current song is on"
                            : "Repeat current song"
                        }
                        aria-label={
                          isRepeatingCurrentTrack
                            ? "Turn off repeat current song"
                            : "Repeat current song"
                        }
                        aria-pressed={isRepeatingCurrentTrack}
                      >
                        <Repeat className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 border-b border-[#267999]/20 bg-[#113143]/30 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !selectedTrackId &&
                          musicLibrary.length > 0
                        ) {
                          onSelectTrack(musicLibrary[0].id);
                        }

                        onToggleMusic(true);
                      }}
                      disabled={musicLibrary.length === 0}
                      className="flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full text-[#AF9355] hover:bg-white/10 hover:text-[#D1B880] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                      title="Play music"
                      aria-label="Play music"
                    >
                      <Play className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedTrackId) return;
                        onToggleMusic(!isMusicPlaying);
                      }}
                      disabled={!selectedTrackId}
                      className={`flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${
                        selectedTrackId && !isMusicPlaying
                          ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                          : "text-[#AF9355] hover:bg-white/10 hover:text-[#D1B880]"
                      }`}
                      title={
                        isMusicPlaying
                          ? "Pause music"
                          : "Resume music"
                      }
                      aria-label={
                        isMusicPlaying
                          ? "Pause music"
                          : "Resume music"
                      }
                      aria-pressed={
                        !!selectedTrackId && !isMusicPlaying
                      }
                    >
                      <Pause className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleMusicOff}
                      disabled={
                        !selectedTrackId && !isMusicPlaying
                      }
                      className="flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full text-[#AF9355] hover:bg-white/10 hover:text-[#D1B880] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                      title="Stop music"
                      aria-label="Stop music"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="border-b border-[#267999]/20 bg-[#113143]/30 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-[#AF9355]">
                      <span className="select-none">
                        Volume
                      </span>
                      <span className="select-none text-[#AF9355]/70">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(musicVolume * 100)}
                      onChange={(e) =>
                        onMusicVolumeChange(
                          Number(e.target.value) / 100,
                        )
                      }
                      className="mt-2 w-full accent-[#AF9355]"
                      aria-label="Music volume"
                    />
                  </div>

                  <div className="max-h-[320px] overflow-y-auto max-[760px]:max-h-none">
                    {musicLibrary.length > 0 ? (
                      musicGroupNames.map((groupName) => (
                        <div key={groupName}>
                          <div className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-[#F8F3E8]/80 select-none">
                            {groupName}
                          </div>

                          {groupedMusicTracks[groupName].map(
                            (track) => {
                              const isSelected =
                                track.id === selectedTrackId;

                              return (
                                <button
                                  key={track.id}
                                  onClick={() =>
                                    handleSelectTrack(track.id)
                                  }
                                  className={`w-full text-left px-3 py-2 hover:bg-white/10 transition-colors ${
                                    isSelected
                                      ? "bg-[#AF9355] text-[#0A1C27]"
                                      : "text-[#AF9355]"
                                  }`}
                                >
                                  <div className="text-sm font-medium">
                                    {track.name}
                                  </div>

                                  {track.attribution && (
                                    <div
                                      className={`text-xs mt-0.5 ${isSelected ? "text-[#0A1C27]/70" : "text-[#AF9355]/60"}`}
                                    >
                                      {track.attribution}
                                    </div>
                                  )}
                                </button>
                              );
                            },
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-[#AF9355]/60 text-xs leading-relaxed">
                        <div className="mb-2 font-medium">
                          No music configured
                        </div>

                        <div className="text-[#AF9355]/50">
                          Add tracks to publish_manifest.json
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {selectedTrack && (
              <div className="hidden 2xl:flex max-w-[150px] flex-col leading-tight select-none">
                <span className="text-[10px] uppercase tracking-wide text-[#AF9355]/60">
                  {isMusicPlaying ? "Now playing" : "Paused"}
                </span>
                <span className="truncate text-xs text-[#AF9355]">
                  {selectedTrack.name}
                </span>
              </div>
            )}

            <button
              onClick={onPreviousTrack}
              disabled={
                !onPreviousTrack || musicLibrary.length < 2
              }
              className={`${isMusicTransportVisibleOnTopBar ? "flex" : "hidden"} h-11 w-11 items-center justify-center p-0 rounded-full bg-transparent text-[#AF9355] hover:bg-[#113143]/50 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent`}
              title="Previous music track"
              aria-label="Previous music track"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handleMusicClick}
              onContextMenu={(e) => {
                e.preventDefault();

                setShowMusicDropdown(!showMusicDropdown);
              }}
              className={`relative ${isMusicTransportVisibleOnTopBar || isTwoRowToolbar ? "flex" : "hidden"} h-11 w-11 items-center justify-center rounded-full transition-all duration-200 overflow-visible touch-manipulation ${
                isMusicPlaying
                  ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                  : "bg-transparent text-[#AF9355] hover:bg-[#113143]/50"
              }`}
              title="Open music menu"
              aria-label="Open music menu"
              aria-haspopup="dialog"
              aria-expanded={showMusicDropdown}
            >
              <Music className="w-5 h-5" />
            </button>

            <div className="hidden max-[520px]:flex items-center gap-1 shrink-0 ml-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                aria-label="Previous page"
                className="min-h-11 min-w-11 px-0 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft
                  className="w-7 h-7"
                  strokeWidth={3.25}
                />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!canGoNext}
                aria-label="Next page"
                className="min-h-11 min-w-11 px-0 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight
                  className="w-7 h-7"
                  strokeWidth={3.25}
                />
              </Button>
            </div>

            <button
              onClick={onNextTrack}
              disabled={!onNextTrack || musicLibrary.length < 2}
              className={`${isMusicTransportVisibleOnTopBar ? "flex" : "hidden"} h-11 w-11 items-center justify-center p-0 rounded-full bg-transparent text-[#AF9355] hover:bg-[#113143]/50 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent`}
              title="Next music track"
              aria-label="Next music track"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleRepeatTrack}
              disabled={
                !onToggleRepeatTrack || !selectedTrackId
              }
              className={`${isMusicTransportVisibleOnTopBar ? "flex" : "hidden"} h-11 w-11 items-center justify-center p-0 rounded-full transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent ${
                isRepeatingCurrentTrack
                  ? "bg-[#AF9355] text-[#0A1C27] hover:bg-[#D1B880]"
                  : "bg-transparent text-[#AF9355] hover:bg-[#113143]/50"
              }`}
              title={
                isRepeatingCurrentTrack
                  ? "Repeat current song is on"
                  : "Repeat current song"
              }
              aria-label={
                isRepeatingCurrentTrack
                  ? "Turn off repeat current song"
                  : "Repeat current song"
              }
              aria-pressed={isRepeatingCurrentTrack}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 ml-2 max-[1119px]:hidden max-[520px]:ml-0">
            {isEditMode && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  aria-label="Undo"
                  title="Undo"
                  className={commonButtonClasses}
                >
                  <Undo className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  aria-label="Redo"
                  title="Redo"
                  className={commonButtonClasses}
                >
                  <Redo className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSave}
                  aria-label="Save"
                  title="Save Changes"
                  className="min-h-11 min-w-11 text-[#AF9355] hover:bg-[#113143]/50 hover:text-[#D1B880]"
                >
                  <Save className="w-5 h-5" />
                </Button>

                {(canResetLeft || canResetRight) && (
                  <>
                    <div className="w-px h-6 bg-[#267999]/30 mx-1" />

                    {canResetLeft && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResetLeft}
                        aria-label="Reset Left Page"
                        title="Reset Left Page Layout"
                        className="text-red-300 hover:text-red-200 hover:bg-red-900/30"
                      >
                        <div className="flex items-center">
                          <RotateCcw className="w-3 h-3 mr-1" />

                          <span className="text-[10px] font-bold">
                            L
                          </span>
                        </div>
                      </Button>
                    )}

                    {canResetLeft && canResetRight && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResetBoth}
                        aria-label="Reset Both Pages"
                        title="Reset Both Pages"
                        className="text-red-300 hover:text-red-200 hover:bg-red-900/30"
                      >
                        <div className="flex items-center">
                          <RotateCcw className="w-3 h-3 mr-1" />

                          <span className="text-[10px] font-bold">
                            ALL
                          </span>
                        </div>
                      </Button>
                    )}

                    {canResetRight && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResetRight}
                        aria-label="Reset Right Page"
                        title="Reset Right Page Layout"
                        className="text-red-300 hover:text-red-200 hover:bg-red-900/30"
                      >
                        <div className="flex items-center">
                          <RotateCcw className="w-3 h-3 mr-1" />

                          <span className="text-[10px] font-bold">
                            R
                          </span>
                        </div>
                      </Button>
                    )}
                  </>
                )}

                <div className="w-px h-6 bg-[#267999]/30 mx-1" />

                <Button
                  variant={
                    isPageLocked ? "destructive" : "outline"
                  }
                  size="sm"
                  onClick={() => onToggleLock(!isPageLocked)}
                  aria-label={
                    isPageLocked ? "Unlock Page" : "Lock Page"
                  }
                  title={
                    isPageLocked
                      ? "Unlock Page Navigation"
                      : "Lock Page Navigation (Enable Drag/Resize)"
                  }
                  className={
                    isPageLocked
                      ? "bg-red-600 hover:bg-red-700 text-white border-none"
                      : "text-[#AF9355] border-[#AF9355]/50 hover:bg-[#113143]/50 hover:text-[#D1B880] bg-transparent"
                  }
                >
                  {isPageLocked ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <LockOpen className="w-5 h-5" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}