import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/app/components/ui/button";

interface ClosedBackCoverContext {
  authorName?: string;
  authorImageUrl?: string;
  authorImageAlt?: string;
  bio?: string;
  buttonText?: string;
  buttonUrl?: string;
  supportLine?: string;
}

interface ClosedBackCoverProps {
  coverImageUrl: string;
  issueTitle: string;
  onOpen: () => void;
  backCoverContext?: ClosedBackCoverContext;
  width?: number;
  height?: number;
  showButton?: boolean;
  embedded?: boolean;
}

function AuthorImage({ imageUrl, imageAlt }: { imageUrl?: string; imageAlt?: string }) {
  if (!imageUrl) return null;

  return (
    <img
      src={imageUrl}
      alt={imageAlt || ""}
      className="h-full w-full object-cover"
    />
  );
}

export function ClosedBackCover({
  onOpen,
  backCoverContext,
  width = 480,
  height = 660,
  showButton = true,
  embedded = false,
}: ClosedBackCoverProps) {
  const handleDoubleClick = () => {
    onOpen();
  };

  const authorName = backCoverContext?.authorName || "";
  const bio = backCoverContext?.bio || "";
  const buttonText = backCoverContext?.buttonText || "";
  const buttonUrl = backCoverContext?.buttonUrl || "";
  const supportLine = backCoverContext?.supportLine || "";
  const bioParagraphs = bio
    .replace(new RegExp(`^${authorName}\\s*`, "i"), "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div className="relative flex items-center justify-center h-full">
      <div
        className="relative cursor-pointer"
        style={{ perspective: embedded ? "none" : "2000px" }}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label="Back cover - press Enter or Space to return to the cover"
        tabIndex={0}
      >
        <div
          className="relative"
          style={{
            transformStyle: "preserve-3d",
            width: `${width}px`,
            height: `${height}px`,
            transform: embedded ? "none" : "rotateY(180deg)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                backgroundColor: "#0A1C27",
                boxShadow: embedded
                  ? "none"
                  : "0 30px 60px -12px rgba(0, 0, 0, 0.5), 0 18px 36px -18px rgba(0, 0, 0, 0.4)",
                transform: embedded
                  ? "none"
                  : "rotateY(180deg)",
              }}
            >
              <div className="absolute inset-0 bg-[#0A1C27]" />

              <div
                className="absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(circle at 80% 18%, rgba(43,155,192,0.24), transparent 34%), radial-gradient(circle at 12% 82%, rgba(0,95,115,0.36), transparent 38%), linear-gradient(180deg, #01101C 0%, #0A1C27 48%, #01101C 100%)",
                }}
              />

              <div
                className="absolute pointer-events-none z-20"
                style={{
                  top: "18px",
                  bottom: "18px",
                  left: "36px",
                  right: "18px",
                  border: "2px solid #AF9355",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px rgba(0,0,0,0.35)",
                }}
              />

              <div className="absolute left-[88px] right-[70px] top-[58px] h-[270px] overflow-hidden rounded-none border border-[#AF9355]/45 shadow-2xl bg-[#01101C] z-10">
                <AuthorImage imageUrl={backCoverContext?.authorImageUrl} imageAlt={backCoverContext?.authorImageAlt} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A1C27]/35 pointer-events-none" />
              </div>

              <div className="absolute left-[58px] right-[40px] top-[345px] text-center z-10">
                <p
                  className="text-[#F8F3E8]/92"
                  style={{
                    fontFamily:
                      "'Helvetica Neue', Arial, Helvetica, sans-serif",
                    fontSize: "11.5pt",
                    lineHeight: 1.32,
                    fontWeight: 100,
                    letterSpacing: "0.08em",
                  }}
                >
                  {authorName ? <><strong>{authorName}</strong>{" "}</> : null}
                  {bioParagraphs.map((paragraph, index) => (
                    <span key={`back-cover-bio-${index}`}>
                      {index > 0 ? <><br /><br /></> : null}
                      {paragraph}
                    </span>
                  ))}
                </p>

                {(buttonText || supportLine) ? (
                  <div className="mx-auto mt-6 w-full max-w-[310px] border-y border-[#AF9355]/45 py-4 text-center">
                    {buttonText && buttonUrl ? (
                      <a
                        href={buttonUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-[210px] items-center justify-center rounded-full border border-[#AF9355]/70 bg-[#F9F5EA] px-5 py-2 font-serif-primary text-[14px] font-bold leading-tight text-[#6F7552] no-underline shadow-sm transition-colors hover:bg-[#F3EBD7]"
                      >
                        {buttonText}
                      </a>
                    ) : null}
                    {supportLine ? (
                      <p className="mt-2 text-[8.5px] leading-[1.3] text-[#F8F3E8]/80">
                        {supportLine}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="absolute -right-24 top-[-80px] h-[280px] w-[280px] rounded-full border border-[#267999]/30" />
              <div className="absolute -left-28 bottom-[-120px] h-[340px] w-[340px] rounded-full border border-[#AF9355]/20" />
              <div className="absolute bottom-20 right-[-50px] h-[1px] w-[300px] rotate-[-32deg] bg-[#AF9355]/50" />

              <div className="absolute inset-0 z-30 pointer-events-none border border-[#AF9355]/20" />

              <div
                className="absolute top-0 bottom-0 right-0 w-[6px] z-30 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to left, rgba(0,0,0,0.14), transparent)",
                  mixBlendMode: "multiply",
                }}
              />

              <div
                className="absolute top-0 bottom-0 right-[18px] w-[1px] z-40 pointer-events-none"
                style={{ background: "rgba(255,255,255,0.35)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {showButton && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={onOpen}
            className="px-8 py-6 text-lg shadow-lg"
            aria-label="Return to cover"
          >
            Back to Cover
          </Button>
        </div>
      )}
    </div>
  );
}