import { useEffect, useState, useRef } from "react";
import { MagazinePage } from "@/app/data/magazine-data";
import {
  LAYOUT_REGISTRY,
  ContentBlock,
} from "./MagazinePageLayouts";

interface ReadingViewProps {
  currentPage: number;
  pages: MagazinePage[];
  onPrevious: () => void;
  onNext: () => void;
  onNavigate?: (page: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  tiltAngle?: number;
  isSinglePageMode?: boolean;
  width?: number;
  height?: number;
  isPageLocked?: boolean;
  isEditMode?: boolean;
  layoutState?: Record<string, { blocks: ContentBlock[] }>;
  onUpdateLayout?: (
    pageId: string,
    blocks: ContentBlock[],
  ) => void;
}

const PageContent = ({
  page,
  onNavigate,
  isEditable,
  blocks,
  onUpdateBlocks,
}: {
  page: MagazinePage;
  onNavigate?: (page: number) => void;
  isEditable?: boolean;
  blocks?: ContentBlock[];
  onUpdateBlocks?: (blocks: ContentBlock[]) => void;
}) => {
  if (
    page.type === "layout" &&
    page.layoutId &&
    LAYOUT_REGISTRY[page.layoutId]
  ) {
    const LayoutComponent = LAYOUT_REGISTRY[page.layoutId];
    return (
      <LayoutComponent
        page={page}
        onNavigate={onNavigate}
        isEditable={isEditable}
        blocks={blocks}
        onUpdateBlocks={onUpdateBlocks}
      />
    );
  }

  return (
    <img
      src={page.imageUrl}
      alt={page.alt}
      className="w-full h-full object-cover relative z-10"
    />
  );
};

export function ReadingView({
  currentPage,
  pages,
  onPrevious,
  onNext,
  onNavigate,
  canGoPrevious,
  canGoNext,
  tiltAngle = 0,
  isSinglePageMode = false,
  width = 480,
  height = 660,
  isPageLocked = false,
  isEditMode = false,
  layoutState,
  onUpdateLayout,
}: ReadingViewProps) {
  const [isDesktop, setIsDesktop] = useState(
    window.innerWidth >= 768,
  );
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Any visible magazine turn should start as one full page.
  // Do not render the first 45-degree turn as a two-page spread.
  const isMagazineTurn = tiltAngle !== 0;
  const isSidewaysTurn = Math.abs(tiltAngle) === 90;
  const effectiveSinglePageMode =
    isSinglePageMode || isMagazineTurn;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () =>
      window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setImagesLoaded(false);

    const getVisiblePageNumbers = () => {
      if (isDesktop && !effectiveSinglePageMode) {
        const isEven = currentPage % 2 === 0;
        const leftPageNum = isEven
          ? currentPage
          : currentPage - 1;
        return [leftPageNum, leftPageNum + 1];
      }

      return [currentPage];
    };

    const visiblePageNumbers = getVisiblePageNumbers();
    const preloadPageNumbers = new Set<number>();

    visiblePageNumbers.forEach((pageNumber) => {
      for (let offset = -3; offset <= 3; offset++) {
        const preloadPageNumber = pageNumber + offset;

        if (preloadPageNumber >= 0) {
          preloadPageNumbers.add(preloadPageNumber);
        }
      }
    });

    const imagesToLoad = Array.from(preloadPageNumbers)
      .map((pageNumber) =>
        pages.find((page) => page.pageNumber === pageNumber),
      )
      .filter((page): page is MagazinePage =>
        Boolean(page?.imageUrl),
      )
      .map((page) => page.imageUrl as string);

    const uniqueImagesToLoad = Array.from(
      new Set(imagesToLoad),
    );

    if (uniqueImagesToLoad.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    let isCancelled = false;
    const totalImages = uniqueImagesToLoad.length;

    uniqueImagesToLoad.forEach((url) => {
      const img = new Image();

      img.onload = () => {
        if (isCancelled) return;

        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };

      img.onerror = () => {
        if (isCancelled) return;

        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };

      img.src = url;
    });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, isDesktop, pages, effectiveSinglePageMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPageLocked) return;

      if (e.key === "ArrowLeft" && canGoPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === "ArrowRight" && canGoNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoPrevious,
    canGoNext,
    onPrevious,
    onNext,
    isPageLocked,
  ]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPageLocked) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPageLocked || !touchStartRef.current) return;

    const deltaX =
      e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY =
      e.changedTouches[0].clientY - touchStartRef.current.y;

    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > 50
    ) {
      if (deltaX > 0 && canGoPrevious) {
        onPrevious();
      } else if (deltaX < 0 && canGoNext) {
        onNext();
      }
    }

    touchStartRef.current = null;
  };

  let leftPage: MagazinePage | undefined;
  let rightPage: MagazinePage | undefined;

  if (isDesktop && !effectiveSinglePageMode) {
    // Standard book imposition: Page 1 is on the Right.
    // Even pages are Left, Odd pages are Right.
    // If currentPage is 1 (Odd), it is on the Right. Left (0) is empty.
    // If currentPage is 2 (Even), it is on the Left. Right (3) is next.

    const isEven = currentPage % 2 === 0;
    const leftPageNum = isEven ? currentPage : currentPage - 1;
    const rightPageNum = leftPageNum + 1;

    leftPage = pages.find((p) => p.pageNumber === leftPageNum);
    rightPage = pages.find(
      (p) => p.pageNumber === rightPageNum,
    );
  } else {
    // Single page view (Mobile or Desktop Single)
    leftPage = pages.find((p) => p.pageNumber === currentPage);
  }

  const outsidePageStackWidth = 64;
  const visibleSpreadWidth = width * 2;
  const spreadWidthWithOutsideStacks =
    visibleSpreadWidth + outsidePageStackWidth * 2;

  const sortedPrintablePageNumbers = pages
    .map((page) => page.pageNumber)
    .filter((pageNumber) => pageNumber > 0)
    .sort((a, b) => a - b);

  const firstPrintablePageNumber =
    sortedPrintablePageNumbers[0] || 1;
  const lastPrintablePageNumber =
    sortedPrintablePageNumbers[
      sortedPrintablePageNumbers.length - 1
    ] || pages.length;
  const totalPages = lastPrintablePageNumber;

  const currentSpreadLeftPageNumber =
    isDesktop && !effectiveSinglePageMode
      ? currentPage % 2 === 0
        ? currentPage
        : currentPage - 1
      : currentPage;
  const currentSpreadRightPageNumber =
    isDesktop && !effectiveSinglePageMode
      ? currentSpreadLeftPageNumber + 1
      : currentPage;

  const leftStackPageCount =
    isDesktop && !effectiveSinglePageMode
      ? sortedPrintablePageNumbers.filter(
          (pageNumber) =>
            pageNumber < currentSpreadLeftPageNumber,
        ).length
      : sortedPrintablePageNumbers.filter(
          (pageNumber) => pageNumber < currentPage,
        ).length;
  const rightStackPageCount =
    isDesktop && !effectiveSinglePageMode
      ? sortedPrintablePageNumbers.filter(
          (pageNumber) =>
            pageNumber > currentSpreadRightPageNumber,
        ).length
      : sortedPrintablePageNumbers.filter(
          (pageNumber) => pageNumber > currentPage,
        ).length;

  // Realistic page-stack edge effect.
  // Left stack = pages already read/turned under the left side of the book.
  // Right stack = pages still unread under the right side of the book.
  // Render ONLY thin paper-line edges, never full offset white page slabs.
  const pageStackRealism = {
    pageStackEdges: true,
    // Fine vertical hairlines: enough density to read as individual paper pages,
    // not enough thickness to become a bulky white slab.
    maxVisibleEdgeLines: 52,
    minVisibleEdgePx: 3,
    totalSubstackThicknessPx: 34,
    edgeSide: "both" as const,
    edgeProgressMode: "current-spread" as const,
  };

  const visibleSpreadPageCount =
    isDesktop && !effectiveSinglePageMode ? 2 : 1;
  const printablePageCount = Math.max(
    1,
    sortedPrintablePageNumbers.length,
  );
  const totalSubstackPageCount = Math.max(
    1,
    printablePageCount - visibleSpreadPageCount,
  );

  const leftStackRatio = Math.min(
    1,
    leftStackPageCount / totalSubstackPageCount,
  );
  const rightStackRatio = Math.min(
    1,
    rightStackPageCount / totalSubstackPageCount,
  );

  const getVisibleEdgeLineCount = (pageCount: number) => {
    if (pageCount <= 0) return 0;

    const ratio = Math.min(
      1,
      pageCount / totalSubstackPageCount,
    );

    // Real books show page density as many fine hairlines, not thick slabs.
    return Math.max(
      2,
      Math.min(
        pageStackRealism.maxVisibleEdgeLines,
        Math.round(10 + ratio * 42),
      ),
    );
  };

  const leftStackCount = getVisibleEdgeLineCount(
    leftStackPageCount,
  );
  const rightStackCount = getVisibleEdgeLineCount(
    rightStackPageCount,
  );

  const getSubstackThickness = (pageCount: number) => {
    if (pageCount <= 0) return 0;

    // Thickness follows the actual share of pages under that side of the spread.
    // The cap is intentionally narrow so it reads as book paper depth, not a block.
    const ratio = Math.min(
      1,
      pageCount / totalSubstackPageCount,
    );

    return Math.max(
      pageStackRealism.minVisibleEdgePx,
      Math.round(
        Math.pow(ratio, 0.85) *
          pageStackRealism.totalSubstackThicknessPx,
      ),
    );
  };

  const leftStackThickness = getSubstackThickness(
    leftStackPageCount,
  );
  const rightStackThickness = getSubstackThickness(
    rightStackPageCount,
  );

  const renderPageEdgeLines = (
    side: "left" | "right",
    thickness: number,
    lineCount: number,
    pageCount: number,
  ) => {
    if (thickness <= 0 || lineCount <= 0 || pageCount <= 0) {
      return null;
    }

    const safeThickness = Math.max(
      pageStackRealism.minVisibleEdgePx,
      thickness,
    );
    const safeLineCount = Math.max(
      3,
      Math.min(lineCount, pageStackRealism.maxVisibleEdgeLines),
    );
    const isLeft = side === "left";

    // Keep both outer page stacks visually matched. The right stack already
    // read correctly; the left stack needs the same warm paper depth and
    // visible individual page hairlines when most turned pages are under it.
    // Use the same contrast profile on both sides, mirrored only by direction.
    const paperBase = isLeft
      ? "linear-gradient(to right, #cfc6b4 0%, #e5dccb 18%, #faf5e9 48%, #efe6d7 76%, #d8cfbd 100%)"
      : "linear-gradient(to left, #cfc6b4 0%, #e5dccb 18%, #faf5e9 48%, #efe6d7 76%, #d8cfbd 100%)";

    const sideShadow = isLeft
      ? "inset -2px 0 2px rgba(70,56,38,0.18), inset 1px 0 0 rgba(255,255,255,0.72), 0 0 2px rgba(52,41,28,0.16)"
      : "inset 2px 0 2px rgba(70,56,38,0.18), inset -1px 0 0 rgba(255,255,255,0.72), 0 0 2px rgba(52,41,28,0.16)";

    const usableWidth = Math.max(1, safeThickness - 1);
    const lines = Array.from(
      { length: safeLineCount },
      (_, index) => {
        const progress =
          safeLineCount === 1 ? 0 : index / (safeLineCount - 1);
        const distanceFromPage = progress * usableWidth;
        const x = isLeft
          ? safeThickness - 1 - distanceFromPage
          : distanceFromPage;

        // Slightly stronger on the left so the already-read stack does not
        // collapse into one flat light strip at large page counts.
        const alphaBase = isLeft ? 0.39 : 0.31;
        const alphaStrong = isLeft ? 0.52 : 0.43;
        const alpha = index % 5 === 0 ? alphaStrong : alphaBase;
        const lineWidth = index % 11 === 0 ? 0.9 : 0.56;

        return (
          <span
            key={`${side}-paper-line-${index}`}
            style={{
              position: "absolute",
              top: "0px",
              bottom: "0px",
              left: `${x}px`,
              width: `${lineWidth}px`,
              background: `rgba(88, 74, 52, ${alpha})`,
              boxShadow: isLeft
                ? "-0.5px 0 0 rgba(255,255,255,0.58)"
                : "0.5px 0 0 rgba(255,255,255,0.58)",
            }}
            aria-hidden="true"
          />
        );
      },
    );

    return (
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          [isLeft ? "left" : "right"]: 0,
          width: `${safeThickness}px`,
          height: `${height}px`,
          transform: isLeft
            ? `translateX(-${safeThickness}px)`
            : `translateX(${safeThickness}px)`,
          zIndex: 80,
          overflow: "hidden",
          borderRadius: isLeft ? "2px 0 0 2px" : "0 2px 2px 0",
          background: paperBase,
          boxShadow: sideShadow,
        }}
        aria-hidden="true"
      >
        {lines}

        {/* Outer paper boundary: visible, but not dark enough to stain. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            [isLeft ? "left" : "right"]: 0,
            width: "1px",
            background: "rgba(82,67,45,0.38)",
          }}
        />

        {/* Where the visible page sits over the stack. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            [isLeft ? "right" : "left"]: 0,
            width: "1px",
            background: "rgba(94,78,53,0.36)",
            boxShadow: isLeft
              ? "1px 0 0 rgba(255,255,255,0.58), -2px 0 3px rgba(68,54,36,0.12)"
              : "-1px 0 0 rgba(255,255,255,0.58), 2px 0 3px rgba(68,54,36,0.12)",
          }}
        />
      </div>
    );
  };

  useEffect(() => {
    if (
      imagesLoaded &&
      scrollContainerRef.current &&
      isDesktop
    ) {
      const container = scrollContainerRef.current;
      // Scrollable ONLY if 45 degrees. 90 degrees is now "fit to screen"
      const isScrollable = false;

      if (isScrollable) {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: 0,
            left: 0,
            behavior: "auto",
          });
        });
      }
    }
  }, [imagesLoaded, tiltAngle, isDesktop]);

  // Desktop: single page view
  if (isDesktop && effectiveSinglePageMode) {
    const angleRadians = (Math.abs(tiltAngle) * Math.PI) / 180;
    const turnedBoxWidth =
      Math.abs(Math.cos(angleRadians)) * width +
      Math.abs(Math.sin(angleRadians)) * height;
    const turnedBoxHeight =
      Math.abs(Math.sin(angleRadians)) * width +
      Math.abs(Math.cos(angleRadians)) * height;

    // The outer box must match the rotated page's bounding box.
    // Example: a 480 x 660 page at 90 degrees needs a 660 x 480 box.
    // Without this, the page rotates inside a 480 x 660 box and gets cut off.
    const viewportWidth = isMagazineTurn
      ? turnedBoxWidth
      : width;
    const viewportHeight = isMagazineTurn
      ? turnedBoxHeight
      : height;

    const transition = "transform 500ms ease-out";

    return (
      <div
        ref={scrollContainerRef}
        className="w-full h-full flex items-center justify-center px-4 overflow-visible"
      >
        <div
          className={`relative ${imagesLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            width: `${viewportWidth}px`,
            height: `${viewportHeight}px`,
            perspective: "2000px",
            transformStyle: "preserve-3d",
            overflow: "visible",
            transition: "opacity 500ms ease-out",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {leftPage && (
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: `${width}px`,
                height: `${height}px`,
                transform: `translate(-50%, -50%) rotate(${tiltAngle}deg)`,
                transformOrigin: "center center",
                transformStyle: "preserve-3d",
                transition,
              }}
            >
              <div
                className="bg-[#F2EFE8] relative shadow-2xl overflow-hidden"
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                }}
              >
                <PageContent
                  page={leftPage}
                  onNavigate={onNavigate}
                  isEditable={isEditMode}
                  blocks={layoutState?.[leftPage.id]?.blocks}
                  onUpdateBlocks={(newBlocks) =>
                    onUpdateLayout?.(leftPage!.id, newBlocks)
                  }
                />

                {canGoPrevious && !isPageLocked && (
                  <button
                    onClick={onPrevious}
                    className="absolute top-0 bottom-0 left-0 w-1/3 cursor-pointer opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity z-30"
                    aria-label="Previous page"
                  >
                    <div className="h-full flex items-center justify-start pl-4">
                      <div className="bg-[#F9F8F4]/90 rounded-full p-2 shadow-lg">
                        <svg
                          className="w-6 h-6 text-gray-900"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                )}

                {canGoNext && !isPageLocked && (
                  <button
                    onClick={onNext}
                    className="absolute top-0 bottom-0 right-0 w-1/3 cursor-pointer opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity z-30"
                    aria-label="Next page"
                  >
                    <div className="h-full flex items-center justify-end pr-4">
                      <div className="bg-[#F9F8F4]/90 rounded-full p-2 shadow-lg">
                        <svg
                          className="w-6 h-6 text-gray-900"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: two-page spread
  if (isDesktop && !effectiveSinglePageMode) {
    const isScrollable = false; // Only 45 degrees needs scrolling now
    const is45Degrees = Math.abs(tiltAngle) === 45;
    const is90Degrees = Math.abs(tiltAngle) === 90;

    // Scale margins based on height ratio relative to base 660px
    const scaleRatio = height / 660;

    let topMargin = "0";
    let bottomMargin = "0";

    // Remove large margins for 90 degrees so it fits in screen
    if (is90Degrees) {
      topMargin = "0";
      bottomMargin = "0";
    } else if (is45Degrees) {
      topMargin = `${430 * scaleRatio}px`;
      bottomMargin = `${10 * scaleRatio}px`;
    }

    return (
      <div
        ref={scrollContainerRef}
        className={`w-full h-full flex items-center justify-center px-4 ${isScrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"}`}
      >
        <div
          className={`relative transition-all duration-500 ease-out ${imagesLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            width: `${spreadWidthWithOutsideStacks}px`,
            height: `${height}px`,
            perspective: "2000px",
            transformStyle: "preserve-3d",
            marginTop: topMargin,
            marginBottom: bottomMargin,
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="absolute top-0 flex"
            style={{
              left: `${outsidePageStackWidth}px`,
              width: `${visibleSpreadWidth}px`,
              height: `${height}px`,
              transformStyle: "preserve-3d",
              transform: `rotate(${tiltAngle}deg)`,
              transition: "transform 500ms ease-out",
            }}
          >
            {/* Left Stack */}
            <div
              className="relative"
              style={{
                transformStyle: "preserve-3d",
                overflow: "visible",
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              {/* Left fore-edge page lines are drawn as a thin strip, not full page slabs. */}

              {/* Left Page */}
              <div
                className="relative group"
                style={{ zIndex: 5 }}
              >
                <div
                  className="bg-[#F2EFE8] relative overflow-visible"
                  style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  {leftPage && (
                    <PageContent
                      page={leftPage}
                      onNavigate={onNavigate}
                      isEditable={isEditMode}
                      blocks={
                        layoutState?.[leftPage.id]?.blocks
                      }
                      onUpdateBlocks={(newBlocks) =>
                        onUpdateLayout?.(
                          leftPage!.id,
                          newBlocks,
                        )
                      }
                    />
                  )}

                  {pageStackRealism.pageStackEdges &&
                    renderPageEdgeLines(
                      "left",
                      leftStackThickness,
                      leftStackCount,
                      leftStackPageCount,
                    )}

                  {canGoPrevious && !isPageLocked && (
                    <button
                      onClick={onPrevious}
                      className="absolute top-0 bottom-0 left-0 w-1/3 cursor-pointer opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity z-30"
                      aria-label="Previous page"
                    >
                      <div className="h-full flex items-center justify-start pl-4">
                        <div className="bg-[#F9F8F4]/90 rounded-full p-2 shadow-lg">
                          <svg
                            className="w-6 h-6 text-gray-900"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mirrored Inside Spine / Gutter Shadow */}
            <div
              className="absolute left-1/2 pointer-events-none"
              style={{
                width: "118px",
                height: "112%",
                top: "-6%",
                transform: "translateX(-50%)",
                zIndex: 200,
                overflow: "visible",
              }}
              aria-hidden="true"
            >
              {/* Left page inner gutter: mirrored to match the right page. */}
              <div
                className="absolute left-0 top-0 h-full w-1/2"
                style={{
                  mixBlendMode: "multiply",
                  opacity: 0.82,
                  background:
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.15) 54%, rgba(0,0,0,0.34) 86%, rgba(0,0,0,0.48) 100%)",
                }}
              />
              {/* Right page inner gutter. */}
              <div
                className="absolute right-0 top-0 h-full w-1/2"
                style={{
                  mixBlendMode: "multiply",
                  opacity: 0.82,
                  background:
                    "linear-gradient(to right, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.34) 14%, rgba(0,0,0,0.15) 46%, rgba(0,0,0,0.05) 78%, transparent 100%)",
                }}
              />
              {/* Narrow center crease. */}
              <div
                className="absolute left-1/2 top-0 h-full"
                style={{
                  width: "16px",
                  transform: "translateX(-50%)",
                  mixBlendMode: "multiply",
                  opacity: 0.55,
                  background:
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.42) 42%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.42) 58%, transparent 100%)",
                }}
              />
              {/* Subtle center-only highlight. Keep it off the page faces so the gutter does not wash out. */}
              <div
                className="absolute left-1/2 top-0 h-full"
                style={{
                  width: "20px",
                  transform: "translateX(-50%)",
                  mixBlendMode: "screen",
                  opacity: 0.12,
                  background:
                    "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.18) 46%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.18) 54%, transparent 100%)",
                }}
              />
            </div>

            {/* Right Stack */}
            <div
              className="relative"
              style={{
                transformStyle: "preserve-3d",
                overflow: "visible",
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              {/* Right Page */}
              <div
                className="relative group"
                style={{ zIndex: 5 }}
              >
                <div
                  className="bg-[#F2EFE8] relative overflow-visible"
                  style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  {rightPage && (
                    <PageContent
                      page={rightPage}
                      onNavigate={onNavigate}
                      isEditable={isEditMode}
                      blocks={
                        layoutState?.[rightPage.id]?.blocks
                      }
                      onUpdateBlocks={(newBlocks) =>
                        onUpdateLayout?.(
                          rightPage!.id,
                          newBlocks,
                        )
                      }
                    />
                  )}

                  {pageStackRealism.pageStackEdges &&
                    renderPageEdgeLines(
                      "right",
                      rightStackThickness,
                      rightStackCount,
                      rightStackPageCount,
                    )}

                  {canGoNext && !isPageLocked && (
                    <button
                      onClick={onNext}
                      className="absolute top-0 bottom-0 right-0 w-1/3 cursor-pointer opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity z-30"
                      aria-label="Next page"
                    >
                      <div className="h-full flex items-center justify-end pr-4">
                        <div className="bg-[#F9F8F4]/90 rounded-full p-2 shadow-lg">
                          <svg
                            className="w-6 h-6 text-gray-900"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Right fore-edge page lines are drawn as a thin strip, not full page slabs. */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: single page
  // Use explicit dimensions if App passes them (for scrolling)
  return (
    <div className="flex items-center justify-center h-full px-4">
      <div
        className={`relative transition-opacity duration-300 ${imagesLoaded ? "opacity-100" : "opacity-0"}`}
      >
        {leftPage && (
          <div
            className="shadow-2xl overflow-hidden bg-[#F2EFE8]"
            style={{
              // Mobile often ignores App.tsx transform and uses internal logic,
              // but we need to match the new scrolling behavior if App.tsx enabled it.
              // However, App.tsx wraps THIS component.
              // So if App.tsx scales this up, this div just needs to render the page content.
              // We should remove the max-height constraint if we want it to be scrollable via parent.
              width: `${width}px`,
              height: `${height}px`,
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.4), 0 10px 40px rgba(0, 0, 0, 0.3)",
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <PageContent
              page={leftPage}
              onNavigate={onNavigate}
              isEditable={isEditMode}
            />

            <div className="absolute inset-0 flex pointer-events-none">
              {canGoPrevious && !isPageLocked && (
                <button
                  onClick={onPrevious}
                  className="flex-1 opacity-0 active:opacity-100 pointer-events-auto"
                  aria-label="Previous page"
                >
                  <div className="h-full" />
                </button>
              )}
              {canGoNext && !isPageLocked && (
                <button
                  onClick={onNext}
                  className="flex-1 opacity-0 active:opacity-100 pointer-events-auto"
                  aria-label="Next page"
                >
                  <div className="h-full" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}