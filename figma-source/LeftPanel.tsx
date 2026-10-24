import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type {
  MagazinePage,
  TOCEntry,
} from "@/app/data/magazine-data";
import {
  LAYOUT_REGISTRY,
  type ContentBlock,
} from "@/app/components/MagazinePageLayouts";
import type { SearchEntry } from "@/app/components/SearchPanel";

const THUMBNAIL_PAGE_WIDTH = 480;
const THUMBNAIL_PAGE_HEIGHT = 660;

const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const buildSearchSnippet = (text: string, query: string) => {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const normalizedText = normalizeSearchText(cleanText);
  const normalizedQuery = normalizeSearchText(query);
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex < 0) {
    return cleanText.length > 120
      ? `${cleanText.slice(0, 120).trim()}...`
      : cleanText;
  }

  const start = Math.max(0, matchIndex - 45);
  const end = Math.min(
    cleanText.length,
    matchIndex + normalizedQuery.length + 70,
  );
  const prefix = start > 0 ? "..." : "";
  const suffix = end < cleanText.length ? "..." : "";

  return `${prefix}${cleanText.slice(start, end).trim()}${suffix}`;
};

interface ThumbnailPreviewProps {
  thumbnail: {
    pageNumber: number;
    imageUrl?: string;
    page?: MagazinePage;
    blocks?: ContentBlock[];
  };
}

function ThumbnailPreview({
  thumbnail,
}: ThumbnailPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;

    const updateScale = () => {
      const rect = element.getBoundingClientRect();
      const nextScale = Math.min(
        rect.width / THUMBNAIL_PAGE_WIDTH,
        rect.height / THUMBNAIL_PAGE_HEIGHT,
      );

      if (Number.isFinite(nextScale) && nextScale > 0) {
        setScale(nextScale);
      }
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const page = thumbnail.page;
  const LayoutComponent =
    page?.type === "layout" &&
    page.layoutId &&
    LAYOUT_REGISTRY[page.layoutId]
      ? LAYOUT_REGISTRY[page.layoutId]
      : null;

  return (
    <div
      ref={previewRef}
      className="aspect-[3/4] bg-[#113143] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg group-hover:shadow-[#267999]/20 transition-shadow border border-[#267999]/30 flex items-center justify-center"
    >
      {thumbnail.imageUrl ? (
        <img
          src={thumbnail.imageUrl}
          alt={`Page ${thumbnail.pageNumber}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : LayoutComponent && page ? (
        <div
          className="relative pointer-events-none select-none"
          style={{
            width: THUMBNAIL_PAGE_WIDTH,
            height: THUMBNAIL_PAGE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <LayoutComponent
            page={page}
            isEditable={false}
            blocks={thumbnail.blocks}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#F8F3E8] text-[#113143] text-sm font-sans select-none">
          Page {thumbnail.pageNumber}
        </div>
      )}
    </div>
  );
}

interface LeftPanelProps {
  isOpen: boolean;
  type: "toc" | "thumbnails" | null;
  tocEntries?: TOCEntry[];
  thumbnails?: {
    pageNumber: number;
    imageUrl?: string;
    page?: MagazinePage;
    blocks?: ContentBlock[];
  }[];
  onClose: () => void;
  onNavigate: (pageNumber: number) => void;
  searchEntries?: SearchEntry[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  topOffset?: number;
}

export function LeftPanel({
  isOpen,
  type,
  tocEntries = [],
  thumbnails = [],
  onClose,
  onNavigate,
  searchEntries = [],
  searchQuery = "",
  onSearchQueryChange,
  topOffset = 0,
}: LeftPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () =>
        document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !type) {
    return null;
  }

  const handleNavigate = (pageNumber: number) => {
    onNavigate(pageNumber);
    onClose();
  };

  const normalizedSearchQuery =
    normalizeSearchText(searchQuery);
  const searchResults =
    type === "toc" && normalizedSearchQuery.length >= 2
      ? searchEntries
          .map((entry) => {
            const searchable = normalizeSearchText(
              `${entry.articleTitle || ""} ${entry.pageTitle || ""} ${entry.title} ${entry.chapter || ""} ${entry.text}`,
            );
            const terms = normalizedSearchQuery
              .split(" ")
              .map((term) => term.trim())
              .filter(Boolean);
            const hasExactMatch = searchable.includes(
              normalizedSearchQuery,
            );
            const matchedTerms = terms.filter((term) =>
              searchable.includes(term),
            );

            if (!hasExactMatch && matchedTerms.length === 0) {
              return null;
            }

            const score =
              (hasExactMatch ? 100 : 0) +
              matchedTerms.length * 10 +
              (normalizeSearchText(
                entry.articleTitle || entry.title,
              ).includes(normalizedSearchQuery)
                ? 60
                : 0) +
              (normalizeSearchText(
                entry.pageTitle || "",
              ).includes(normalizedSearchQuery)
                ? 35
                : 0) +
              (entry.chapter &&
              normalizeSearchText(entry.chapter).includes(
                normalizedSearchQuery,
              )
                ? 25
                : 0);

            return {
              ...entry,
              score,
              snippet: buildSearchSnippet(
                entry.text,
                hasExactMatch
                  ? searchQuery
                  : matchedTerms[0] || searchQuery,
              ),
            };
          })
          .filter(
            (
              result,
            ): result is SearchEntry & {
              score: number;
              snippet: string;
            } => Boolean(result),
          )
          .sort(
            (a, b) =>
              b.score - a.score || a.pageNumber - b.pageNumber,
          )
          .slice(0, 40)
      : [];

  const showSearchResults =
    type === "toc" && normalizedSearchQuery.length >= 2;

  return (
    <>
      <div
        className="absolute left-0 right-0 bottom-0 bg-[#2D2D2D]/30 z-40 backdrop-blur-sm"
        style={{ top: topOffset }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className="absolute left-0 bottom-0 w-[min(100vw,20rem)] md:w-96 bg-[#0A1C27] z-50 shadow-2xl flex flex-col border-r border-[#267999]/30 font-sans"
        style={{ top: topOffset }}
        role="complementary"
        aria-label={
          type === "toc"
            ? "Table of contents"
            : "Page thumbnails"
        }
      >
        <div className="border-b border-[#267999]/30 bg-[#0A1C27]">
          <div className="flex items-center justify-between p-4 pb-3">
            {type === "toc" ? (
              <h2
                className="text-lg font-medium select-none tracking-wide font-sans"
                style={{ color: "#F8F3E8" }}
              >
                Table of Contents
              </h2>
            ) : (
              <h2 className="text-lg font-medium select-none tracking-wide font-sans text-[#D1B880]">
                Thumbnails
              </h2>
            )}

            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close panel"
              className="text-[#D1B880] hover:bg-[#113143]/50 hover:text-[#F8F3E8]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {type === "toc" && (
            <div className="px-4 pb-4">
              <label
                className="sr-only"
                htmlFor="toc-magazine-search"
              >
                Search magazine topics
              </label>
              <div className="flex h-10 items-center gap-2 rounded-full border border-[#C9A45C]/60 bg-[#F8F3E8] px-4 text-[#0A1C27] shadow-sm">
                <Search className="h-4 w-4 flex-shrink-0 text-[#267999]" />
                <input
                  id="toc-magazine-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    onSearchQueryChange?.(event.target.value)
                  }
                  placeholder="Search topics..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#0A1C27] outline-none placeholder:text-[#267999]/70"
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {type === "toc" &&
            (showSearchResults ? (
              <section
                className="p-4"
                aria-label="Search results"
              >
                {searchResults.length === 0 ? (
                  <div className="rounded-xl border border-[#267999]/30 bg-[#113143]/55 px-4 py-8 text-center text-sm text-[#AF9355]/80">
                    No matches found for “{searchQuery.trim()}”.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="px-1 text-xs text-[#AF9355]/75">
                      {searchResults.length}{" "}
                      {searchResults.length === 1
                        ? "result"
                        : "results"}
                    </div>

                    {searchResults.map((result) => {
                      const articleName =
                        result.articleTitle || result.title;
                      const pageLabel = `p${result.pageNumber}`;

                      return (
                        <article
                          key={`${result.id}-${result.pageNumber}`}
                          className="rounded-xl border border-[#C9A45C]/60 bg-[#F8F3E8] p-4 text-[#0A1C27] shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleNavigate(result.pageNumber)
                            }
                            className="flex w-full items-start justify-between gap-3 text-left focus:outline-none focus:ring-1 focus:ring-[#D1B880]"
                            aria-label={`Open ${articleName} on page ${result.pageNumber}`}
                          >
                            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-[#0A1C27] underline-offset-4 hover:underline">
                              {articleName}
                            </span>
                            <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-sm font-medium text-[#267999] underline-offset-4 hover:bg-[#267999]/10 hover:underline">
                              {pageLabel}
                            </span>
                          </button>

                          {result.pageTitle &&
                            result.pageTitle !==
                              articleName && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleNavigate(
                                    result.pageNumber,
                                  )
                                }
                                className="mt-1 block max-w-full truncate text-left text-xs text-[#267999] underline-offset-4 hover:underline focus:outline-none"
                              >
                                {result.pageTitle}
                              </button>
                            )}

                          {result.snippet && (
                            <button
                              type="button"
                              onClick={() =>
                                handleNavigate(
                                  result.pageNumber,
                                )
                              }
                              className="mt-2 block w-full text-left text-xs leading-relaxed text-[#0A1C27]/75 focus:outline-none"
                            >
                              <span className="line-clamp-3">
                                {result.snippet}
                              </span>
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <nav aria-label="Magazine sections">
                <ul className="p-4 space-y-3">
                  {tocEntries.map((entry) => {
                    const isChapter =
                      entry.id.startsWith("toc-chapter-");

                    return (
                      <li key={entry.id}>
                        <button
                          onClick={() =>
                            handleNavigate(entry.pageNumber)
                          }
                          className={`w-full text-left rounded-xl transition-colors select-none flex items-start gap-3 border focus:outline-none focus:ring-1 focus:ring-[#D1B880] shadow-sm p-4 font-sans ${
                            isChapter
                              ? "bg-[#113143] hover:bg-[#113143]/80 focus:bg-[#113143]/80 border-[#D1B880]/50"
                              : "bg-[#F8F3E8] hover:bg-[#EFE5CF] focus:bg-[#EFE5CF] border-[#C9A45C]/60"
                          }`}
                        >
                          <div className="flex flex-col flex-1 gap-1">
                            <div className="flex items-start justify-between gap-3">
                              <span
                                className={`tracking-wide ${
                                  isChapter
                                    ? "font-semibold text-[#F8F3E8]"
                                    : "font-normal text-[#0A1C27]"
                                }`}
                                style={{
                                  fontSize:
                                    "calc(0.875rem + 1pt)",
                                }}
                              >
                                {entry.title}
                              </span>

                              <span
                                className={`flex-shrink-0 ${
                                  isChapter
                                    ? "font-medium text-[#F8F3E8]/85"
                                    : "font-normal text-[#267999]"
                                }`}
                                style={{
                                  fontSize:
                                    "calc(0.75rem + 1pt)",
                                }}
                              >
                                {entry.pageRange ||
                                  `p${entry.pageNumber}`}
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ))}

          {type === "thumbnails" && (
            <div className="p-4">
              <div
                className="grid grid-cols-2 gap-4"
                role="list"
                aria-label="Page thumbnails"
              >
                {thumbnails.map((thumb) => (
                  <div key={thumb.pageNumber} role="listitem">
                    <div
                      onClick={() =>
                        handleNavigate(thumb.pageNumber)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNavigate(thumb.pageNumber);
                        }
                      }}
                      className="relative group focus:outline-none focus:ring-2 focus:ring-[#D1B880] focus:ring-offset-2 focus:ring-offset-[#0A1C27] rounded-lg select-none cursor-pointer block w-full text-left"
                      aria-label={`Go to page ${thumb.pageNumber}`}
                      role="button"
                      tabIndex={0}
                    >
                      <ThumbnailPreview thumbnail={thumb} />

                      <div className="absolute bottom-2 right-2 bg-[#0A1C27]/90 text-[#D1B880] text-xs px-2 py-1 rounded shadow border border-[#267999]/30 select-none font-sans">
                        {thumb.pageNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}