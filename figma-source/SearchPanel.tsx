import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

export interface SearchEntry {
  id: string;
  pageNumber: number;
  title: string;
  articleTitle?: string;
  pageTitle?: string;
  chapter?: string;
  text: string;
}

interface SearchPanelProps {
  isOpen: boolean;
  entries: SearchEntry[];
  query: string;
  onClose: () => void;
  onNavigate: (pageNumber: number) => void;
}

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const buildSnippet = (text: string, query: string) => {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const normalizedText = normalizeText(cleanText);
  const normalizedQuery = normalizeText(query);
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex < 0) {
    return cleanText.length > 150
      ? `${cleanText.slice(0, 150).trim()}...`
      : cleanText;
  }

  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(
    cleanText.length,
    matchIndex + normalizedQuery.length + 90,
  );
  const prefix = start > 0 ? "..." : "";
  const suffix = end < cleanText.length ? "..." : "";

  return `${prefix}${cleanText.slice(start, end).trim()}${suffix}`;
};

export function SearchPanel({
  isOpen,
  entries,
  query,
  onClose,
  onNavigate,
}: SearchPanelProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    if (normalizedQuery.length < 2) {
      return [];
    }

    const queryTerms = normalizedQuery
      .split(" ")
      .map((term) => term.trim())
      .filter(Boolean);

    return entries
      .map((entry) => {
        const searchable = normalizeText(
          `${entry.articleTitle || ""} ${entry.pageTitle || ""} ${entry.title} ${entry.chapter || ""} ${entry.text}`,
        );
        const hasExactMatch =
          searchable.includes(normalizedQuery);
        const matchedTerms = queryTerms.filter((term) =>
          searchable.includes(term),
        );

        if (!hasExactMatch && matchedTerms.length === 0) {
          return null;
        }

        const score =
          (hasExactMatch ? 100 : 0) +
          matchedTerms.length * 10 +
          (normalizeText(
            entry.articleTitle || entry.title,
          ).includes(normalizedQuery)
            ? 60
            : 0) +
          (normalizeText(entry.pageTitle || "").includes(
            normalizedQuery,
          )
            ? 35
            : 0) +
          (entry.chapter &&
          normalizeText(entry.chapter).includes(normalizedQuery)
            ? 25
            : 0);

        return {
          ...entry,
          score,
          snippet: buildSnippet(
            entry.text,
            hasExactMatch ? query : matchedTerms[0] || query,
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
      .slice(0, 40);
  }, [entries, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed left-3 right-3 top-[4.75rem] z-50 md:left-6 md:right-auto md:w-[min(92vw,560px)]"
      role="region"
      aria-label="Search results"
    >
      <section
        className="overflow-hidden rounded-2xl border border-[#267999]/40 bg-[#0A1C27]/96 shadow-2xl backdrop-blur-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#267999]/30 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#F8F3E8]">
              Search results
            </h2>
            <p className="mt-0.5 text-xs text-[#AF9355]/75">
              Matches update from the search pill in the top
              bar.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#AF9355] transition-colors hover:bg-[#113143]/70 hover:text-[#D1B880]"
            aria-label="Close search results"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-3">
          {query.trim().length < 2 ? (
            <div className="px-4 py-10 text-center text-sm text-[#AF9355]/75">
              Type at least two letters to search the magazine.
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#AF9355]/75">
              No matches found for “{query.trim()}”.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-2 pb-1 text-xs text-[#AF9355]/70">
                {results.length}{" "}
                {results.length === 1 ? "result" : "results"}
              </div>

              {results.map((result) => {
                const articleName =
                  result.articleTitle || result.title;
                const pageLabel = `Page ${result.pageNumber}`;
                const pageTitle =
                  result.pageTitle &&
                  result.pageTitle !== articleName
                    ? result.pageTitle
                    : "";

                return (
                  <article
                    key={`${result.id}-${result.pageNumber}`}
                    className="rounded-xl border border-transparent px-4 py-3 text-left transition-colors hover:border-[#267999]/50 hover:bg-[#113143]/70 focus-within:border-[#AF9355]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate(result.pageNumber)
                          }
                          className="block max-w-full truncate text-left text-sm font-semibold text-[#F8F3E8] underline-offset-4 transition-colors hover:text-[#D1B880] hover:underline focus:outline-none focus-visible:underline"
                          aria-label={`Open ${articleName} on ${pageLabel}`}
                        >
                          {articleName}
                        </button>

                        {pageTitle && (
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate(result.pageNumber)
                            }
                            className="mt-1 block max-w-full truncate text-left text-xs text-[#F8F3E8]/70 underline-offset-4 transition-colors hover:text-[#D1B880] hover:underline focus:outline-none focus-visible:underline"
                            aria-label={`Open section ${pageTitle} on ${pageLabel}`}
                          >
                            {pageTitle}
                          </button>
                        )}

                        <div className="mt-1 text-xs text-[#AF9355]/75">
                          {result.chapter
                            ? `${result.chapter} · `
                            : ""}
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate(result.pageNumber)
                            }
                            className="rounded-full px-1 py-0.5 font-semibold text-[#D1B880] underline-offset-4 transition-colors hover:bg-[#AF9355]/15 hover:underline focus:outline-none focus-visible:underline"
                            aria-label={`Go to ${pageLabel}`}
                          >
                            {pageLabel}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(result.pageNumber)
                        }
                        className="flex-shrink-0 rounded-full bg-[#AF9355]/15 px-2 py-1 text-xs font-medium text-[#D1B880] transition-colors hover:bg-[#AF9355]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AF9355]/70"
                        aria-label={`Go to ${articleName} on ${pageLabel}`}
                      >
                        Go
                      </button>
                    </div>

                    {result.snippet && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(result.pageNumber)
                        }
                        className="mt-2 block w-full text-left text-xs leading-relaxed text-[#F8F3E8]/75 transition-colors hover:text-[#F8F3E8] focus:outline-none"
                        aria-label={`Open search match from ${articleName} on ${pageLabel}`}
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
        </div>
      </section>
    </div>
  );
}