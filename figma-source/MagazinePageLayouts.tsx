import { MagazinePage } from "@/app/data/magazine-data";
import { useDrag, useDrop } from "react-dnd";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  type CSSProperties,
} from "react";
import { CollageBlock } from "./CollageBlock";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Resizable } from "re-resizable";
import Draggable from "react-draggable";
import ReactMarkdown from "react-markdown";

const brandLogo = "/images/brand/gold-logo.png";

const GrainOverlay = () => (
  <div
    className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-multiply z-0"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  ></div>
);

interface DraggableBlockProps {
  id: string;
  index: number;
  moveBlock: (
    index: number,
    pos: { x: number; y: number },
  ) => void;
  resizeBlock: (
    index: number,
    size: { width: string; height: string },
    pos?: { x: number; y: number },
  ) => void;
  onInteractionStart?: () => void;
  width?: string;
  height?: string;
  x?: number;
  y?: number;
  isEditable?: boolean;
  children: React.ReactNode;
}

const DraggableBlock = ({
  id,
  index,
  moveBlock,
  resizeBlock,
  onInteractionStart,
  width,
  height,
  x,
  y,
  isEditable,
  children,
}: DraggableBlockProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleCommonClass =
    "bg-blue-500 w-4 h-4 rounded-full shadow-md border-2 border-white z-[60] opacity-60 hover:opacity-100 transition-opacity absolute";
  const handleClasses = {
    top: "hidden",
    right: "hidden",
    bottom: "hidden",
    left: "hidden",
    topRight: isEditable
      ? `${handleCommonClass} right-0 top-0 translate-x-1/2 -translate-y-1/2`
      : "hidden",
    bottomRight: isEditable
      ? `${handleCommonClass} right-0 bottom-0 translate-x-1/2 translate-y-1/2`
      : "hidden",
    bottomLeft: isEditable
      ? `${handleCommonClass} left-0 bottom-0 -translate-x-1/2 translate-y-1/2`
      : "hidden",
    topLeft: isEditable
      ? `${handleCommonClass} left-0 top-0 -translate-x-1/2 -translate-y-1/2`
      : "hidden",
  };

  const enableConfig = isEditable
    ? {
        top: false,
        right: true,
        bottom: true,
        left: false,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }
    : false;

  // If no position is provided (initial render or flow mode), render relatively
  if (x === undefined || y === undefined) {
    return (
      <div
        ref={nodeRef}
        className={`relative ${isEditable ? "hover:ring-2 hover:ring-blue-400" : ""}`}
        style={{ width: width || "100%" }}
        onMouseDownCapture={(e) => {
          if (isEditable && onInteractionStart) {
            onInteractionStart();
          }
        }}
      >
        <Resizable
          size={{
            width: width || "100%",
            height: height || "auto",
          }}
          onResizeStop={(e, direction, ref, d) => {
            if (onInteractionStart) onInteractionStart();
            resizeBlock(index, {
              width: ref.style.width,
              height: ref.style.height,
            });
          }}
          enable={enableConfig}
          handleClasses={handleClasses}
        >
          {children}
        </Resizable>
      </div>
    );
  }

  // Absolute positioning mode
  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x, y }}
      onStop={(e, data) =>
        moveBlock(index, { x: data.x, y: data.y })
      }
      disabled={!isEditable}
    >
      <div
        ref={nodeRef}
        className={`absolute ${isEditable ? "cursor-move hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 z-50" : "z-10"}`}
        style={{ width: width || "100%" }}
      >
        {isEditable && (
          <div className="absolute -top-3 right-0 p-1 opacity-0 group-hover:opacity-100 bg-blue-500 text-white text-[10px] rounded px-2 z-[60] pointer-events-none">
            Drag
          </div>
        )}

        <Resizable
          size={{
            width: width || "100%",
            height: height || "auto",
          }}
          onResizeStop={(e, direction, ref, d) => {
            const newPos = { x, y };
            if (direction.includes("Left")) {
              newPos.x -= d.width;
            }
            if (direction.includes("Top")) {
              newPos.y -= d.height;
            }
            resizeBlock(
              index,
              {
                width: ref.style.width,
                height: ref.style.height,
              },
              newPos,
            );
          }}
          enable={enableConfig}
          handleClasses={handleClasses}
        >
          {children}
        </Resizable>
      </div>
    </Draggable>
  );
};

export interface PageLayoutProps {
  page: MagazinePage;
  onNavigate?: (pageNumber: number | "back-cover") => void;
  isEditable?: boolean;
  blocks?: ContentBlock[];
  onUpdateBlocks?: (blocks: ContentBlock[]) => void;
}

const MarginGuides = ({
  isRightPage,
}: {
  isRightPage: boolean;
}) => (
  <div className="absolute inset-0 pointer-events-none z-50">
    {/* Margins: Top 60px, Bottom 40px */}
    <div className="absolute left-0 right-0 top-[60px] border-b border-blue-600 opacity-20 border-dashed"></div>
    <div className="absolute left-0 right-0 bottom-[40px] border-t border-blue-600 opacity-20 border-dashed"></div>

    {/* Side Margins depends on Left/Right Page 
        Right Page (Odd): Left 56px (Inner/Gutter), Right 48px (Outer)
        Left Page (Even): Left 48px (Outer), Right 56px (Inner/Gutter)
    */}
    <div
      className={`absolute top-0 bottom-0 border-r border-red-600 opacity-20 border-dashed ${isRightPage ? "left-[56px]" : "left-[48px]"}`}
    ></div>
    <div
      className={`absolute top-0 bottom-0 border-l border-red-600 opacity-20 border-dashed ${isRightPage ? "right-[48px]" : "right-[56px]"}`}
    ></div>

    {/* Safe Area Content Box */}
    <div
      className="absolute border border-green-600 opacity-10 border-dashed"
      style={{
        top: "60px",
        bottom: "40px",
        left: isRightPage ? "56px" : "48px",
        right: isRightPage ? "48px" : "56px",
      }}
    ></div>
  </div>
);

// --- MASTER COMPONENT STRUCTURE ---

// Theme Helper
export type PageTheme = "light" | "dark" | "olive";

export const getPageTheme = (pageNumber: number): PageTheme => {
  return "light";
};

const PageMasterBase = ({
  children,
  pageNumber,
  className = "bg-ivory",
  dark = false,
  showGuides = false,
}: {
  children: React.ReactNode;
  pageNumber: number;
  className?: string;
  dark?: boolean;
  showGuides?: boolean;
}) => {
  // Determine if Right (Odd) or Left (Even) Page
  // Note: Usually Page 1 is Right.
  const isRightPage = pageNumber % 2 !== 0;

  // Margins per spec
  // Top: 60px
  // Bottom: 40px
  // Inner (Gutter): 56px
  // Outer: 48px

  const paddingLeft = isRightPage ? "56px" : "48px";
  const paddingRight = isRightPage ? "48px" : "56px";
  const paddingTop = "60px";
  const paddingBottom = "40px";
  return (
    <div
      className={`h-[660px] w-[480px] ${className} flex flex-col relative overflow-hidden`}
      style={{
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
      }}
    >
      {showGuides && <MarginGuides isRightPage={isRightPage} />}
      {/* 
         Content Wrapper to enforce safe area width.
         Safe Width = 480 - 56 - 48 = 376px.
      */}
      <div className="flex-1 flex flex-col w-full h-full relative">
        {children}
      </div>
    </div>
  );
};

const getMarkdownContentFromBlocks = (blocks?: ContentBlock[]) => {
  const markdownBlock = blocks?.find(
    (block) => block.type === "markdown" && typeof (block as any).content === "string",
  ) as { type: "markdown"; content: string } | undefined;

  return markdownBlock?.content || "";
};

const githubMarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="font-serif-primary text-[19px] leading-tight font-bold mb-4 text-[#021A2B]">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="font-serif-primary text-[14px] font-bold mb-2 text-[#021A2B]">
      {children}
    </h2>
  ),
  p: ({ children }: any) => <p className="mb-2">{children}</p>,
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#6F7552] underline underline-offset-[2px]">
      {children}
    </a>
  ),
};

export const InsideCoverLayout = ({
  page,
  blocks,
}: PageLayoutProps) => {
  const markdownContent = getMarkdownContentFromBlocks(blocks);

  return (
    <div className="h-[660px] w-[480px] relative overflow-hidden bg-[#F6F5F2] text-charcoal">
      <div
        className="absolute top-0 bottom-0 right-0 w-[36px] z-30 pointer-events-none"
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.03) 60%, transparent 100%)",
          mixBlendMode: "multiply",
          opacity: 1,
        }}
      />

      <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-black/10 z-40 pointer-events-none" />

      <div className="absolute inset-0 px-[42px] z-10">
        <div className="pt-[72px] pb-[64px] h-full overflow-hidden text-[9.5px] leading-[1.35] text-[#2D2D2D]">
          {markdownContent ? (
            <ReactMarkdown components={githubMarkdownComponents}>
              {markdownContent}
            </ReactMarkdown>
          ) : null}
        </div>
      </div>
    </div>
  );
};


const splitInsideBackCoverMarkdown = (markdown = "") => {
  const sections = String(markdown)
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean);

  let title = "Carry This Forward";
  const leftSections: string[] = [];
  const centerSections: string[] = [];
  let signUpSection = "";
  let copyrightSection = "";

  let isCenteredPart = false;

  sections.forEach((section) => {
    if (/^#*\s*Carry This Forward/i.test(section)) {
      isCenteredPart = true;
      title = section.replace(/^#+\s+/, "").trim();
      return;
    }

    if (!signUpSection && /^##\s+/.test(section)) {
      signUpSection = section;
      return;
    }

    if (!copyrightSection && /^©/.test(section)) {
      copyrightSection = section;
      return;
    }

    if (isCenteredPart) {
      centerSections.push(section);
    } else {
      leftSections.push(section);
    }
  });

  return {
    title,
    leftSections,
    centerSections,
    signUpSection,
    copyrightSection,
  };
};

const stripMarkdownLinkLabel = (value = "") =>
  String(value)
    .replace(/^#+\s*/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();

const getFirstMarkdownLink = (value = "") => {
  const match = String(value).match(/\[(.*?)\]\((.*?)\)/);

  return {
    label: match?.[1] || stripMarkdownLinkLabel(value),
    href: match?.[2] || "#",
  };
};

export const InsideBackCoverLayout = ({
  page,
  blocks: propBlocks,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { blocks: [] };
  const items = (propBlocks || data.blocks || []) as Array<{
    type?: string;
    content?: string;
  }>;
  const markdownBlock = items.find(
    (item) => item?.type === "markdown" && typeof item.content === "string",
  );
  const markdownContent = markdownBlock?.content || "";
  const { title, leftSections, centerSections, signUpSection, copyrightSection } =
    splitInsideBackCoverMarkdown(markdownContent);
  const signupLink = getFirstMarkdownLink(signUpSection);

  return (
    <div className="h-[660px] w-[480px] relative overflow-hidden bg-[#F6F5F2] text-charcoal">
      <div
        className="absolute top-0 bottom-0 left-0 w-[36px] z-30 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.03) 60%, transparent 100%)",
          mixBlendMode: "multiply",
          opacity: 1,
        }}
      />

      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-black/10 z-40 pointer-events-none" />

      <div className="absolute inset-0 px-[42px] z-10">
        <div className="flex h-full flex-col pt-[72px] pb-[28px]">
          {leftSections.length > 0 && (
            <div className="w-full text-left mb-8 space-y-1.5 text-[9.5px] leading-[1.35] text-[#2D2D2D]">
              {leftSections.map((section, index) => (
                <ReactMarkdown
                  key={`inside-back-left-${index}`}
                  components={{
                    p: ({ children }) => <p>{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#6F7552] underline underline-offset-[2px] decoration-[1px]"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {section}
                </ReactMarkdown>
              ))}
            </div>
          )}

          <div className="w-full text-left">
            <h1 className="font-serif-primary text-[19px] leading-tight font-bold mb-4 text-[#021A2B] text-left">
              {title}
            </h1>

            <div className="w-full max-w-[330px] space-y-2.5 text-[9.5px] leading-[1.35] text-[#2D2D2D] text-left">
              {centerSections.map((section, index) => (
                <ReactMarkdown
                  key={`inside-back-center-${index}`}
                  components={{
                    p: ({ children }) => <p>{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#6F7552] underline underline-offset-[2px] decoration-[1px]"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {section}
                </ReactMarkdown>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <img
              src={brandLogo}
              alt=""
              className="w-[170px] h-auto object-contain opacity-95"
              draggable={false}
            />
          </div>

          {signUpSection ? (
            <div className="mt-5 w-full max-w-[310px] border-y border-[#AF9355]/45 py-4 text-left">
              <a
                href={signupLink.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-[210px] items-center justify-center rounded-full border border-[#AF9355]/70 bg-[#F9F5EA] px-5 py-2 font-serif-primary text-[14px] font-bold leading-tight text-[#6F7552] no-underline shadow-sm transition-colors hover:bg-[#F3EBD7]"
              >
                {signupLink.label || "Sign Up for Updates"}
              </a>
              <p className="mt-2 text-[8.5px] leading-[1.3] text-[#4C4C4C]">
                Future issues, article updates, podcast news, and advocacy resources.
              </p>
            </div>
          ) : null}

          <div className="flex-1" />

          {copyrightSection ? (
            <div className="border-t border-[#AF9355]/35 pt-4 text-left">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="text-[8.6px] leading-[1.32] text-[#4C4C4C]">{children}</p>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#6F7552] underline underline-offset-[2px] decoration-[1px]"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {copyrightSection}
              </ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const Page1Layout = ({
  page,
  title = "Untitled",
  subtitle = "",
  summary = "",
  byline = "",
}: PageLayoutProps & {
  title?: string;
  subtitle?: string;
  summary?: string;
  byline?: string;
}) => {
  // Page 1 is always Right Page (Odd)
  const isRightPage = true;

  return (
    <div className="h-[660px] w-[480px] relative overflow-hidden bg-ivory text-charcoal select-none">
      {/* Grain Overlay */}
      <GrainOverlay />

      {/* Spine Shadow (Left Side for Right Page) */}
      <div
        className="absolute top-0 bottom-0 left-0 w-[36px] z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.03) 60%, transparent 100%)",
          mixBlendMode: "multiply",
          opacity: 1,
        }}
      />
      {/* SPINE LINE - Left Edge */}
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-black/10 z-30 pointer-events-none" />

      {/* Content Container - Centered in Safe Area
                Safe Area: Top 60, Bottom 40, Left 56 (Inner), Right 48 (Outer).
            */}
      <div
        className="absolute flex flex-col justify-center items-center text-center z-10"
        style={{
          top: "60px",
          bottom: "40px",
          left: "56px",
          right: "48px",
        }}
      >
        <h1 className="type-major-opener text-charcoal w-full mb-[20px]">
          {title}
        </h1>

        <h2
          className="type-subhead text-charcoal font-sans-accent font-normal w-full mb-[18px]"
          style={{
            fontFamily:
              "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
            fontWeight: 300,
          }}
        >
          {subtitle}
        </h2>

        <div className="w-full flex justify-center mb-[28px]">
          <p className="type-minor-head italic text-forest max-w-[340px]">
            {summary}
          </p>
        </div>

        <p className="type-kicker text-forest">{byline}</p>
      </div>
    </div>
  );
};

export const GenericPageLayout = ({
  page,
}: PageLayoutProps) => (
  <div className="h-[660px] w-[480px] bg-ivory relative overflow-hidden">
    <GrainOverlay />
  </div>
);

export type ContentBlock =
  | {
      type: "paragraph";
      content: React.ReactNode;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
      dropCap?: boolean;
    }
  | {
      type: "kicker";
      content: string;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "byline";
      content: string;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "subheading";
      content: string;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "list";
      content: React.ReactNode[];
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "signoff";
      content: React.ReactNode;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "link-button";
      text: string;
      href: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "references";
      content: string[];
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "pull-quote";
      content: string;
      style?: "standard" | "oversized-marks";
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "qa";
      question: string;
      answer: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      className?: string;
      credit?: string;
      fullPage?: boolean;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "image-collage";
      images: {
        src: string;
        alt: string;
        className: string;
        credit?: string;
      }[];
      containerClassName?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "collage-block";
      items: {
        src: string;
        alt: string;
        title?: string;
        subtitle?: string;
      }[];
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "fact-box";
      title?: string;
      content: string;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "toc-section";
      title: string;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "toc-entry";
      title: string;
      pageNumber: string;
      showDivider?: boolean;
      className?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "team-grid";
      members: {
        name: string;
        title: string;
        imageUrl: string;
      }[];
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "markdown";
      content: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "chapter-divider";
      title: string;
      subtitle?: string;
      eyebrow?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    }
  | {
      type: "share";
      articleId: string;
      articleTitle: string;
      articleUrl?: string;
      width?: string;
      height?: string;
      x?: number;
      y?: number;
      _id?: string;
    };

export const contentMap: Record<
  string,
  {
    title?: string;
    byline?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    blocks: ContentBlock[];
  }
> = {};

export const SectionDividerLayout = ({
  page,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { title: "", blocks: [] };
  const title = data.title || "";
  const bodyBlock = data.blocks?.find(
    (b) => b.type === "paragraph",
  );
  const bodyText =
    bodyBlock && typeof bodyBlock.content === "string"
      ? bodyBlock.content
      : "";

  const isRightPage = page.pageNumber % 2 !== 0;
  const paddingLeft = isRightPage ? "56px" : "48px";
  const paddingRight = isRightPage ? "48px" : "56px";
  const paddingTop = "60px";
  const paddingBottom = "40px";
  return (
    <div
      className="h-[660px] w-[480px] bg-ivory flex flex-col justify-center items-center text-center relative overflow-hidden"
      style={{
        paddingLeft,
        paddingRight,
        paddingTop,
        paddingBottom,
      }}
    >
      <div className="flex flex-col items-center w-full">
        <h1
          className="type-prestige-opener mb-8"
          style={{ color: "#021A2B" }}
        >
          {title}
        </h1>
        {bodyText && (
          <p className="type-body text-charcoal opacity-80 max-w-[65%] mx-auto">
            {bodyText}
          </p>
        )}
      </div>
    </div>
  );
};

export const ChristinaFeatureLayout = ({
  page,
  onNavigate,
  isEditable,
  blocks: propBlocks,
  onUpdateBlocks,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { title: "", blocks: [] };

  const [localItems, setLocalItems] = useState(() => {
    const blocks =
      data && data.blocks
        ? data.blocks.filter(
            (b) => !(b.type === "image" && b.fullPage),
          )
        : [];
    return blocks.map((b, i) => ({
      ...b,
      _id:
        b._id ||
        `block-${page.id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
    }));
  });

  const items = propBlocks || localItems;
  const containerRef = useRef<HTMLDivElement>(null);

  const convertLayout = useCallback(() => {
    if (!containerRef.current) return;
    const unpositionedIndices = items
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.x === undefined || b.y === undefined)
      .map(({ i }) => i);

    if (unpositionedIndices.length === 0) return;

    const containerRect =
      containerRef.current.getBoundingClientRect();
    const children = Array.from(containerRef.current.children);

    const updates: {
      index: number;
      x: number;
      y: number;
      width: string;
      height: string;
    }[] = [];

    unpositionedIndices.forEach((index) => {
      const child = children[index] as HTMLElement;
      if (!child) return;

      const rect = child.getBoundingClientRect();

      const x = Math.round(rect.left - containerRect.left);
      const y = Math.round(rect.top - containerRect.top);

      const width = child.style.width || `${rect.width}px`;
      const height = child.style.height || `${rect.height}px`;

      updates.push({ index, x, y, width, height });
    });

    if (updates.length > 0) {
      if (onUpdateBlocks && propBlocks) {
        const newItems = [...propBlocks];
        updates.forEach((u) => {
          newItems[u.index] = {
            ...newItems[u.index],
            x: u.x,
            y: u.y,
            width: newItems[u.index].width || u.width,
          };
        });
        onUpdateBlocks(newItems);
      } else {
        setLocalItems((prev: any) => {
          const newItems = [...prev];
          updates.forEach((u) => {
            newItems[u.index] = {
              ...newItems[u.index],
              x: u.x,
              y: u.y,
              width: newItems[u.index].width || u.width,
            };
          });
          return newItems;
        });
      }
    }
  }, [items, onUpdateBlocks, propBlocks]);

  const moveBlock = useCallback(
    (index: number, pos: { x: number; y: number }) => {
      if (onUpdateBlocks && propBlocks) {
        const newItems = [...propBlocks];
        newItems[index] = { ...newItems[index], ...pos };
        onUpdateBlocks(newItems);
      } else {
        setLocalItems((prevItems: any) => {
          const newItems = [...prevItems];
          newItems[index] = { ...newItems[index], ...pos };
          return newItems;
        });
      }
    },
    [onUpdateBlocks, propBlocks],
  );

  const resizeBlock = useCallback(
    (
      index: number,
      size: { width: string; height: string },
      pos?: { x: number; y: number },
    ) => {
      if (onUpdateBlocks && propBlocks) {
        const newItems = [...propBlocks];
        newItems[index] = {
          ...newItems[index],
          ...size,
          ...(pos || {}),
        };
        onUpdateBlocks(newItems);
      } else {
        setLocalItems((prevItems: any) => {
          const newItems = [...prevItems];
          newItems[index] = {
            ...newItems[index],
            ...size,
            ...(pos || {}),
          };
          return newItems;
        });
      }
    },
    [onUpdateBlocks, propBlocks],
  );

  if (!data) {
    return (
      <div className="h-[660px] w-[480px] bg-ivory px-16 pt-10 pb-16 flex flex-col relative overflow-hidden"></div>
    );
  }

  // Inside Cover (Page 0)
  if (page.pageNumber === 0) {
    return (
      <div className="h-[660px] w-[480px] bg-[#F5F2EA] relative flex flex-col items-center justify-center">
        {/* Shadow for spine */}
        <div
          className="absolute top-0 bottom-0 right-0 w-[6px] z-30 pointer-events-none"
          style={{
            background:
              "linear-gradient(to left, rgba(0,0,0,0.08), transparent)",
            mixBlendMode: "multiply",
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-[660px] w-[480px] bg-ivory relative overflow-hidden flex flex-col">
      <GrainOverlay />
      {/* Spine Shadow based on page side */}
      <div
        className="absolute top-0 bottom-0 w-[6px] z-30 pointer-events-none"
        style={{
          left: page.pageNumber % 2 !== 0 ? 0 : "auto",
          right: page.pageNumber % 2 === 0 ? 0 : "auto",
          background:
            page.pageNumber % 2 !== 0
              ? "linear-gradient(to right, rgba(0,0,0,0.08), transparent)"
              : "linear-gradient(to left, rgba(0,0,0,0.08), transparent)",
          mixBlendMode: "multiply",
        }}
      />

      <div ref={containerRef} className="absolute inset-0">
        {items.map((block, index) => (
          <DraggableBlock
            key={block._id || index}
            id={block._id || `${index}`}
            index={index}
            moveBlock={moveBlock}
            resizeBlock={resizeBlock}
            width={block.width}
            height={block.height}
            x={block.x}
            y={block.y}
            isEditable={isEditable}
          >
            {/* Content Rendering based on Type */}
            {block.type === "paragraph" && (
              <div
                className={`type-body text-charcoal ${block.className || ""}`}
              >
                {block.dropCap &&
                typeof block.content === "string" ? (
                  <>
                    <span className="float-left type-prestige-opener leading-[0.8] mr-2 mt-[-2px] font-serif-primary">
                      {block.content[0]}
                    </span>
                    {block.content.substring(1)}
                  </>
                ) : (
                  block.content
                )}
              </div>
            )}
            {block.type === "kicker" && (
              <div
                className={`type-kicker text-charcoal border-b border-charcoal/20 pb-1 mb-4 inline-block ${block.className || ""}`}
              >
                {block.content}
              </div>
            )}
            {block.type === "subheading" && (
              <h3
                className={`type-subhead text-charcoal mb-2 ${block.className || ""}`}
              >
                {block.content}
              </h3>
            )}
            {block.type === "image" && (
              <div className="w-full h-full relative group overflow-hidden">
                <ImageWithFallback
                  src={block.src}
                  alt={block.alt}
                  className={`w-full h-full object-cover ${block.className || ""}`}
                />
                {block.credit && (
                  <div className="absolute bottom-0 right-0 bg-white/80 px-1 type-caption text-charcoal/60">
                    {block.credit}
                  </div>
                )}
              </div>
            )}
            {block.type === "collage-block" && (
              <CollageBlock items={block.items} />
            )}
            {block.type === "pull-quote" && (
              <blockquote
                className={`type-subhead italic text-charcoal pl-4 my-4 ${block.style === "oversized-marks" ? "relative" : ""}`}
              >
                {block.style === "oversized-marks" && (
                  <span className="absolute -left-4 -top-4 text-4xl text-gold/30">
                    “
                  </span>
                )}
                {block.content}
              </blockquote>
            )}
            {block.type === "fact-box" && (
              <div
                className={`bg-linen p-4 border border-gold/30 ${block.className || ""}`}
              >
                {block.title && (
                  <h4 className="type-minor-head text-charcoal mb-2">
                    {block.title}
                  </h4>
                )}
                <p className="type-body text-charcoal">
                  {block.content}
                </p>
              </div>
            )}
            {block.type === "list" && (
              <ul className="list-disc pl-5 type-body text-charcoal space-y-1">
                {block.content.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {block.type === "byline" && (
              <div
                className={`type-kicker text-charcoal ${block.className || ""}`}
              >
                {block.content}
              </div>
            )}
            {block.type === "signoff" && (
              <div className="type-body italic text-charcoal mt-4 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-charcoal/30"></span>
                {block.content}
              </div>
            )}
            {block.type === "qa" && (
              <div className="mb-4">
                <p className="type-body font-bold text-charcoal mb-1">
                  {block.question}
                </p>
                <p className="type-body text-charcoal">
                  {block.answer}
                </p>
              </div>
            )}
            {block.type === "references" && (
              <div className="mt-8 pt-4 border-t border-charcoal/10">
                <h5 className="type-kicker mb-2">References</h5>
                <ul className="type-caption text-charcoal/70 space-y-1 list-none">
                  {block.content.map((ref, i) => (
                    <li key={i}>{ref}</li>
                  ))}
                </ul>
              </div>
            )}
            {block.type === "link-button" && (
              <a
                href={block.href}
                className="inline-block px-4 py-2 border border-charcoal type-kicker hover:bg-charcoal hover:text-ivory transition-colors text-center no-underline"
              >
                {block.text}
              </a>
            )}
            {block.type === "toc-section" && (
              <h3 className="type-section-head text-charcoal mb-4 border-b border-charcoal pb-2">
                {block.title}
              </h3>
            )}
            {block.type === "toc-entry" && (
              <div className="flex justify-between items-baseline mb-2 group cursor-pointer">
                <span className="type-body text-charcoal font-serif-primary">
                  {block.title}
                </span>
                {block.showDivider && (
                  <span className="flex-1 mx-2 border-b border-charcoal/20 border-dotted h-1"></span>
                )}
                <span className="type-body text-charcoal font-sans-accent">
                  {block.pageNumber}
                </span>
              </div>
            )}
            {block.type === "team-grid" && (
              <div className="grid grid-cols-2 gap-4">
                {block.members.map((member, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-gray-200">
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="type-minor-head leading-tight">
                      {member.name}
                    </h4>
                    <p className="type-caption uppercase text-charcoal/60 mt-1">
                      {member.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DraggableBlock>
        ))}
      </div>
    </div>
  );
};

export const ArticleLayout = ({
  page,
  blocks: propBlocks,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { blocks: [] };
  const items = propBlocks || data.blocks || [];
  const markdownBlock = items.find(
    (b) => b.type === "markdown",
  ) as { type: "markdown"; content: string } | undefined;

  const isRightPage = page.pageNumber % 2 !== 0;
  const paddingLeft = isRightPage ? "56px" : "48px";
  const paddingRight = isRightPage ? "48px" : "56px";
  const paddingTop = "60px";
  const paddingBottom = "40px";

  return (
    <div
      className="h-[660px] w-[480px] bg-ivory overflow-y-auto relative"
      style={{
        paddingLeft,
        paddingRight,
        paddingTop,
        paddingBottom,
      }}
    >
      <GrainOverlay />
      <div className="max-w-none text-charcoal">
        {markdownBlock ? (
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1
                  className="type-prestige-opener mb-8 text-left font-normal leading-tight"
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="mt-6 mb-3 text-left font-serif-primary text-[18px] leading-tight font-normal text-[#021A2B]"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="mt-5 mb-3 text-left font-serif-primary text-[16px] leading-tight font-normal text-[#021A2B]"
                  {...props}
                />
              ),
              h4: ({ node, ...props }) => (
                <h4
                  className="mt-5 mb-2 text-left font-serif-primary text-[15px] leading-tight font-normal text-[#021A2B]"
                  {...props}
                />
              ),
              h5: ({ node, ...props }) => (
                <h5
                  className="mt-4 mb-2 text-left font-serif-primary text-[14px] leading-tight font-normal text-[#021A2B]"
                  {...props}
                />
              ),
              h6: ({ node, ...props }) => (
                <h6
                  className="mt-4 mb-2 text-left font-serif-primary text-[13px] leading-tight font-normal text-[#021A2B]"
                  {...props}
                />
              ),
              strong: ({ node, ...props }) => (
                <span className="font-normal" {...props} />
              ),
              b: ({ node, ...props }) => (
                <span className="font-normal" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="type-body mb-4" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="text-rust underline" target="_blank" rel="noopener noreferrer" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul
                  className="list-disc pl-6 mb-4 type-body"
                  {...props}
                />
              ),
              ol: ({ node, ...props }) => (
                <ol
                  className="list-decimal pl-6 mb-4 type-body"
                  {...props}
                />
              ),
              li: ({ node, ...props }) => (
                <li className="mb-1" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="pl-4 italic my-4 type-body"
                  {...props}
                />
              ),
              hr: () => <span className="block h-4"></span>,
            }}
          >
            {markdownBlock.content}
          </ReactMarkdown>
        ) : null}
      </div>

      {isWelcomePage && (
        <div className="absolute left-0 right-0 bottom-0 bg-[#19454B] px-[56px] py-5 text-[#F8F3E8]">
          <h2
            className="mb-2"
            style={{
              fontFamily: "var(--font-serif-primary)",
              fontSize: "15pt",
              lineHeight: 1.08,
              fontWeight: 700,
              color: "#8FC7D2",
            }}
          >
            Mission Statement
          </h2>

          <p className="text-[8.5px] leading-[1.35] text-[#F8F3E8]">
            
          </p>

          <p
            className="mt-3 text-center"
            style={{
              fontFamily:
                "var(--font-serif-primary), cursive",
              fontSize: "25pt",
              lineHeight: 1,
              color: "#AF9355",
              textShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}
          >
            
          </p>

          <p className="mt-2 text-center text-[8px] leading-tight text-[#F8F3E8]/90">
            
          </p>
        </div>
      )}
    </div>
  );
};

export const ArticleImageLayout = ({
  page,
  blocks: propBlocks,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { blocks: [] };
  const items = propBlocks || data.blocks || [];
  const imageBlock = items.find((b) => b.type === "image") as
    | { type: "image"; src: string; alt: string; caption?: string; href?: string }
    | undefined;

  return (
    <div className="h-[660px] w-[480px] bg-[#1a1a1a] relative overflow-hidden">
      {imageBlock && (
        <>
          {imageBlock.href ? (
            <a
              href={imageBlock.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={imageBlock.alt || "Open linked image"}
              className="block w-full h-full"
            >
              <ImageWithFallback
                src={imageBlock.src}
                alt={imageBlock.alt}
                className="w-full h-full object-cover opacity-90"
              />
            </a>
          ) : (
            <ImageWithFallback
              src={imageBlock.src}
              alt={imageBlock.alt}
              className="w-full h-full object-cover opacity-90"
            />
          )}
          {imageBlock.caption && (
            <div className="absolute left-6 right-6 bottom-5 rounded bg-black/55 px-3 py-2 text-center text-[11px] leading-snug text-white/90">
              {imageBlock.caption}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const ArticleTitleLayout = ({
  page,
  blocks: propBlocks,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { blocks: [] };
  const items = (propBlocks || data.blocks || []) as Array<{
    type?: string;
    content?: string;
  }>;

  const toPlainText = (value = "") =>
    String(value)
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

  const splitMarkdownTitlePage = (markdown = "") => {
    const lines = markdown
      .split(/\n+/)
      .map((line) => toPlainText(line))
      .filter(Boolean);

    return {
      title: lines[0] || page.title || "Untitled",
      subtitle:
        lines[1] &&
        !/^editorial$/i.test(lines[1]) &&
        !/^by\s+/i.test(lines[1])
          ? lines[1]
          : "",
      metaLines: lines.filter(
        (line, index) =>
          index > 0 &&
          !(
            index === 1 &&
            !/^editorial$/i.test(line) &&
            !/^by\s+/i.test(line)
          ),
      ),
    };
  };

  const markdownBlock = items.find(
    (block) => block.type === "markdown",
  );
  const markdownData = markdownBlock?.content
    ? splitMarkdownTitlePage(markdownBlock.content)
    : null;

  const kicker = toPlainText(
    items.find((block) => block.type === "kicker")?.content ||
      "",
  );

  const paragraphs = items
    .filter((block) => block.type === "paragraph")
    .map((block) => toPlainText(block.content || ""))
    .filter(Boolean);

  const title =
    markdownData?.title ||
    paragraphs[0] ||
    page.title ||
    "Untitled";
  const subtitle =
    markdownData?.subtitle || paragraphs[1] || "";
  const metaLines =
    markdownData?.metaLines ||
    paragraphs.slice(2).filter(Boolean);

  const isRightPage = page.pageNumber % 2 !== 0;
  const paddingLeft = isRightPage ? "54px" : "48px";
  const paddingRight = isRightPage ? "48px" : "54px";

  return (
    <div
      className="relative h-[660px] w-[480px] overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #021A2B 0%, #0A2736 54%, #021A2B 100%)",
        paddingLeft,
        paddingRight,
        paddingTop: "64px",
        paddingBottom: "56px",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 82% 16%, rgba(43,155,192,0.18), transparent 30%), radial-gradient(circle at 14% 88%, rgba(175,147,85,0.13), transparent 34%)",
        }}
      />

      <div className="absolute left-[42px] top-[48px] h-[1px] w-[122px] bg-[#AF9355]/70" />
      <div className="absolute right-[44px] top-[74px] h-[1px] w-[86px] bg-[#2B9BC0]/60" />
      <div className="absolute left-[-116px] bottom-[-120px] h-[300px] w-[300px] rounded-full border border-[#2B9BC0]/18" />
      <div className="absolute right-[-118px] top-[-112px] h-[280px] w-[280px] rounded-full border border-[#AF9355]/18" />
      <div className="absolute bottom-[72px] right-[-36px] h-[1px] w-[220px] rotate-[-32deg] bg-[#AF9355]/55" />

      <div className="absolute inset-[30px] border border-[#AF9355]/26 pointer-events-none" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div
            className="mb-8 uppercase tracking-[0.24em]"
            style={{
              fontFamily:
                "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
              fontSize: "9pt",
              fontWeight: 400,
              lineHeight: 1.2,
              color: "#AF9355",
            }}
          >
            {kicker || ""}
          </div>

          <div className="max-w-[340px]">
            <h1
              style={{
                fontFamily: "var(--font-serif-primary)",
                fontSize: title.length > 92 ? "22pt" : "26pt",
                lineHeight: 1.05,
                fontWeight: 600,
                color: "#F8F3E8",
              }}
            >
              {title}
            </h1>

            {subtitle ? (
              <>
                <div className="mt-7 h-[2px] w-28 bg-[#2B9BC0]" />
                <p
                  className="mt-6"
                  style={{
                    fontFamily:
                      "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
                    fontSize: "15pt",
                    lineHeight: 1.28,
                    fontWeight: 300,
                    color: "#F3E8D3",
                  }}
                >
                  {subtitle}
                </p>
              </>
            ) : (
              <div className="mt-7 h-[2px] w-28 bg-[#2B9BC0]" />
            )}
          </div>
        </div>

        <div className="pb-2">
          {metaLines.map((line, index) => (
            <p
              key={`${page.id}-meta-${index}`}
              className={index === 0 ? "" : "mt-2"}
              style={{
                fontFamily:
                  "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
                fontSize: index === 0 ? "10pt" : "10.5pt",
                lineHeight: 1.35,
                fontWeight: index === 0 ? 500 : 300,
                letterSpacing:
                  index === 0 ? "0.14em" : "0.04em",
                textTransform:
                  index === 0 ? "uppercase" : "none",
                color:
                  index === 0
                    ? "#AF9355"
                    : "rgba(248,243,232,0.9)",
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChapterDividerBlock = ({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) => {
  const normalizedTitle = title.trim().toLowerCase();
  const isPhlipSide = normalizedTitle === "the phlip-side";
  const isContributionsInWriting =
    normalizedTitle === "contributions in writing";
  const titleLines = isPhlipSide
    ? ["The", "PHlip-side"]
    : isContributionsInWriting
      ? ["Contributions", "in Writing"]
      : [title];
  const titleFontSize = isPhlipSide
    ? "47pt"
    : isContributionsInWriting
      ? "42pt"
      : title.length > 28
        ? "44pt"
        : "58pt";
  const chapterPaddingClass = isContributionsInWriting
    ? "pl-16 pr-10 py-12"
    : "px-10 py-12";

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-center overflow-hidden bg-[#021A2B] ${chapterPaddingClass} text-ivory`}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, rgba(43,155,192,0.28), transparent 34%), radial-gradient(circle at 15% 85%, rgba(0,95,115,0.42), transparent 38%), linear-gradient(180deg, #01101C 0%, #021A2B 46%, #01101C 100%)",
        }}
      />
      <div className="absolute right-[-118px] bottom-[-96px] h-[320px] w-[320px] rounded-full border border-[#AF9355]/18" />
      <div className="absolute left-[-120px] top-[-110px] h-[290px] w-[290px] rounded-full border border-[#2B9BC0]/24" />
      <div className="absolute top-[118px] right-[-54px] h-[1px] w-[260px] rotate-[28deg] bg-[#AF9355]/58" />
      <div className="absolute left-10 top-10 h-[92px] w-[1px] bg-[#C9A45C]/45" />
      <div className="absolute left-10 top-10 h-[1px] w-[92px] bg-[#C9A45C]/45" />

      <div className="relative z-10">
        {eyebrow && (
          <p
            className="mb-8 font-sans-accent uppercase tracking-[0.28em] text-[#C9A45C]"
            style={{ fontSize: "14px" }}
          >
            {eyebrow}
          </p>
        )}

        <h1
          className="mb-5 text-left"
          style={{
            fontFamily: "var(--font-serif-primary)",
            fontSize: titleFontSize,
            lineHeight: isContributionsInWriting ? 0.92 : 0.86,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: "#AF9355",
            textShadow: "0 3px 12px rgba(0,0,0,0.45)",
          }}
        >
          {titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <div className="mb-6 h-[2px] w-44 bg-[#2B9BC0]" />

        {subtitle && (
          <p
            className="text-left text-ivory/90"
            style={{
              fontFamily:
                "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
              fontSize: "15pt",
              lineHeight: 1.3,
              fontWeight: 300,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

const SHARE_COVER_LOGO_SOURCES = [
  `${import.meta.env.BASE_URL}images/brand/Cover_Logo.png`,
  "/Magazine/images/brand/Cover_Logo.png",
  "/images/brand/Cover_Logo.png",
  "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/images/brand/Cover_Logo.png",
];

const ShareCoverLogo = () => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  const handleError = () => {
    if (sourceIndex < SHARE_COVER_LOGO_SOURCES.length - 1) {
      setSourceIndex((currentIndex) => currentIndex + 1);
      return;
    }

    setIsHidden(true);
  };

  if (isHidden) return null;

  return (
    <img
      src={SHARE_COVER_LOGO_SOURCES[sourceIndex]}
      alt=""
      className="h-[276px] w-auto object-contain"
      onError={handleError}
      draggable={false}
    />
  );
};

const EditorialShareBlock = ({
  articleId,
  articleTitle,
  articleUrl,
  articleExcerpt = "",
  articleImage = "",
  pageNumber = 1,
}: {
  articleId: string;
  articleTitle: string;
  articleUrl?: string;
  articleExcerpt?: string;
  articleImage?: string;
  pageNumber?: number;
}) => {
  const [copyStatus, setCopyStatus] = useState("");
  const [manualShareUrl, setManualShareUrl] = useState("");
  const [showShareOptions, setShowShareOptions] =
    useState(false);

  const getShareUrl = () => {
    if (articleUrl) return articleUrl;
    if (typeof window === "undefined") return "";

    const url = new URL(window.location.href);
    url.hash = "";

    // Keep the outward-facing URL clean. Remove reader/navigation-only params
    // so shared links do not open at odd page numbers.
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (key !== "article") url.searchParams.delete(key);
    });

    url.searchParams.set("article", articleId);
    return url.toString();
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (error) {
      // Continue to the legacy fallback.
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.setAttribute("readonly", "true");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);

      return copied;
    } catch (error) {
      return false;
    }
  };

  const copyShareText = async () => {
    const shareUrl = getShareUrl();
    setManualShareUrl(shareUrl);

    const copied = await copyToClipboard(shareUrl);

    setCopyStatus(
      copied
        ? "Link copied"
        : "Copy blocked — use the visible link below",
    );
    window.setTimeout(() => setCopyStatus(""), 2600);
    return copied;
  };

  const openShareWindow = (url: string) => {
    if (typeof window === "undefined") return false;

    const popup = window.open(
      url,
      "_blank",
      "noopener,noreferrer,width=760,height=680",
    );

    if (popup) {
      popup.opener = null;
      return true;
    }

    return false;
  };

  const handleShare = async (
    platform: "linkedin" | "facebook" | "x" | "copy",
  ) => {
    updateSharePreviewMetadata();

    const shareUrl = getShareUrl();
    const encodedUrl = encodeURIComponent(shareUrl);

    if (platform === "copy") {
      const copied = await copyShareText();
      setShowShareOptions(false);

      if (!copied) {
        setManualShareUrl(shareUrl);
      }

      return;
    }

    setShowShareOptions(false);

    if (platform === "linkedin") {
      const opened = openShareWindow(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      );

      if (!opened) {
        setManualShareUrl(shareUrl);
        setCopyStatus(
          "Popup blocked — use the visible link below",
        );
        window.setTimeout(() => setCopyStatus(""), 3200);
      }

      return;
    }

    if (platform === "facebook") {
      // Facebook pulls title, description, and image from the public share page's
      // Open Graph tags. This works best after the reader is published online.
      const opened = openShareWindow(
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      );

      if (!opened) {
        setManualShareUrl(shareUrl);
        setCopyStatus(
          "Popup blocked — use the visible link below",
        );
        window.setTimeout(() => setCopyStatus(""), 3200);
      }

      return;
    }

    if (platform === "x") {
      const encodedTitle = encodeURIComponent(
        articleTitle.trim(),
      );
      const opened = openShareWindow(
        `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      );

      if (!opened) {
        setManualShareUrl(shareUrl);
        setCopyStatus(
          "Popup blocked — use the visible link below",
        );
        window.setTimeout(() => setCopyStatus(""), 3200);
      }

      return;
    }
  };

  const cleanArticleTitle =
    articleTitle.trim().replace(/[?!\.]+$/, "") ||
    "this editorial";
  const isRightPage = pageNumber % 2 !== 0;
  const shareBoxEdgeStyle = isRightPage
    ? { right: "78px" }
    : { left: "78px" };
  const logoCircleNudgeStyle = isRightPage
    ? { transform: "translateX(14px)" }
    : { transform: "translateX(-14px)" };

  const updateSharePreviewMetadata = () => {
    if (typeof document === "undefined") return;

    const upsertMeta = (
      selector: string,
      attributeName: "property" | "name",
      attributeValue: string,
      content: string,
    ) => {
      if (!content) return;

      let element = document.head.querySelector(
        selector,
      ) as HTMLMetaElement | null;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    const shareUrl = getShareUrl();
    const description = articleExcerpt || articleTitle;

    upsertMeta(
      'meta[property="og:title"]',
      "property",
      "og:title",
      articleTitle,
    );
    upsertMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      description,
    );
    upsertMeta(
      'meta[property="og:url"]',
      "property",
      "og:url",
      shareUrl,
    );
    upsertMeta(
      'meta[property="og:type"]',
      "property",
      "og:type",
      "article",
    );
    upsertMeta(
      'meta[property="og:image"]',
      "property",
      "og:image",
      articleImage,
    );
    upsertMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      "summary_large_image",
    );
    upsertMeta(
      'meta[name="twitter:title"]',
      "name",
      "twitter:title",
      articleTitle,
    );
    upsertMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      description,
    );
    upsertMeta(
      'meta[name="twitter:image"]',
      "name",
      "twitter:image",
      articleImage,
    );
  };

  const buttonClass =
    "rounded-full border px-5 py-2.5 text-[13px] uppercase tracking-[0.12em] transition-colors focus:outline-none focus:ring-2" +
    " border-[#2B9BC0]/55 text-[#F8F3E8] hover:bg-[#2B9BC0]/20 hover:border-[#2B9BC0] hover:text-white focus:ring-[#2B9BC0]/40";

  const shareUrlForMenu = getShareUrl();
  const encodedShareUrlForMenu =
    encodeURIComponent(shareUrlForMenu);
  const encodedTitleForMenu = encodeURIComponent(
    articleTitle.trim(),
  );
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrlForMenu}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrlForMenu}`;
  const xShareUrl = `https://x.com/intent/tweet?text=${encodedTitleForMenu}&url=${encodedShareUrlForMenu}`;

  const handleNativeShareLinkClick = () => {
    updateSharePreviewMetadata();
    setShowShareOptions(false);
  };

  return (
    <div
      className="relative h-full w-full text-center"
      style={{
        background:
          "radial-gradient(circle at 82% 18%, rgba(43,155,192,0.18) 0%, rgba(43,155,192,0.05) 28%, transparent 42%), linear-gradient(180deg, #01101C 0%, #021A2B 42%, #01101C 100%)",
        color: "#F8F3E8",
      }}
    >
      <div
        className="absolute top-[34%] z-20 flex w-[326px] max-w-[68%] -translate-y-1/2 flex-col items-center text-center"
        style={{
          ...shareBoxEdgeStyle,
          border: "1.35px solid rgba(201,164,92,0.78)",
          padding: "26px 22px 24px",
          boxShadow:
            "0 0 0 1px rgba(201,164,92,0.18), 0 18px 42px rgba(0,0,0,0.22)",
          background:
            "linear-gradient(180deg, rgba(1,16,28,0.18) 0%, rgba(2,26,43,0.28) 100%)",
        }}
      >
        <div
          className="absolute left-4 top-4 h-[22px] w-[22px] border-l border-t border-[#C9A45C]/70"
          aria-hidden="true"
        />
        <div
          className="absolute right-4 top-4 h-[22px] w-[22px] border-r border-t border-[#C9A45C]/70"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-4 left-4 h-[22px] w-[22px] border-b border-l border-[#C9A45C]/70"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-4 right-4 h-[22px] w-[22px] border-b border-r border-[#C9A45C]/70"
          aria-hidden="true"
        />

        <div className="mb-5 h-[1px] w-14 bg-[#2B9BC0]/80" />
        <p
          className="type-minor-head mb-1.5"
          style={{ color: "#C9A45C" }}
        >
          Enjoyed
        </p>
        <h2
          className="mb-4 max-w-[280px]"
          style={{
            fontFamily: "var(--font-serif-primary)",
            fontSize:
              cleanArticleTitle.length > 76
                ? "14.5pt"
                : cleanArticleTitle.length > 62
                  ? "16pt"
                  : "18.5pt",
            lineHeight: 1.14,
            fontWeight: 700,
            color: "#F8F3E8",
            overflowWrap: "break-word",
            wordBreak: "normal",
          }}
        >
          {cleanArticleTitle}?
        </h2>
        <div className="relative flex w-full max-w-[300px] flex-col items-center justify-center">
          <button
            type="button"
            className={`${buttonClass} min-w-[142px]`}
            aria-expanded={showShareOptions}
            aria-controls={`share-options-${articleId}`}
            onClick={() =>
              setShowShareOptions((current) => !current)
            }
          >
            Share
          </button>

          {showShareOptions && (
            <div
              id={`share-options-${articleId}`}
              className="absolute top-[40px] z-[9999] flex w-[188px] flex-col overflow-hidden rounded-lg border border-[#C9A45C]/70 bg-[#021A2B] shadow-xl"
            >
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] text-[#F8F3E8] transition-colors hover:bg-[#0B3A4F] no-underline"
                onClick={handleNativeShareLinkClick}
              >
                LinkedIn
              </a>
              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-t border-[#C9A45C]/25 px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] text-[#F8F3E8] transition-colors hover:bg-[#0B3A4F] no-underline"
                onClick={handleNativeShareLinkClick}
              >
                Facebook
              </a>
              <a
                href={xShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-t border-[#C9A45C]/25 px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] text-[#F8F3E8] transition-colors hover:bg-[#0B3A4F] no-underline"
                onClick={handleNativeShareLinkClick}
              >
                X-Twitter
              </a>
              <button
                type="button"
                className="border-t border-[#C9A45C]/25 px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] text-[#F8F3E8] transition-colors hover:bg-[#0B3A4F]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleShare("copy");
                }}
              >
                Copy Link
              </button>
            </div>
          )}
        </div>

        {copyStatus && (
          <p
            className="type-caption mt-4"
            style={{ color: "#2B9BC0" }}
            role="status"
          >
            {copyStatus}
          </p>
        )}

        {manualShareUrl && (
          <div className="mt-3 w-full max-w-[280px]">
            <label
              className="sr-only"
              htmlFor={`share-url-${articleId}`}
            >
              Share URL
            </label>
            <input
              id={`share-url-${articleId}`}
              readOnly
              value={manualShareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-md border border-[#C9A45C]/60 bg-[#F8F3E8] px-3 py-2 text-center text-[9px] leading-tight text-[#021A2B]"
            />
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute top-[75%] z-0 flex w-[326px] max-w-[68%] -translate-y-1/2 items-center justify-center"
        style={shareBoxEdgeStyle}
        aria-hidden="true"
      >
        <div style={logoCircleNudgeStyle}>
          <ShareCoverLogo />
        </div>
      </div>
    </div>
  );
};

export const ArticleTextLayout = ({
  page,
  blocks: propBlocks,
}: PageLayoutProps) => {
  const data = contentMap[page.id] || { blocks: [] };
  const items = propBlocks || data.blocks || [];
  const markdownBlock = items.find(
    (b) => b.type === "markdown",
  ) as { type: "markdown"; content: string } | undefined;
  const shareBlock = items.find((b) => b.type === "share") as
    | {
        type: "share";
        articleId: string;
        articleTitle: string;
        articleUrl?: string;
        articleExcerpt?: string;
        articleImage?: string;
      }
    | undefined;
  const chapterDividerBlock = items.find(
    (b) => b.type === "chapter-divider",
  ) as
    | {
        type: "chapter-divider";
        title: string;
        subtitle?: string;
        eyebrow?: string;
      }
    | undefined;
  const isGeneratedTitlePage =
    Boolean(
      markdownBlock?.content?.includes("By "),
    ) && page.id.includes("-title");
  const isWelcomePage =
    page.id === "welcome-to-breathtaking-awareness";
  const isMissionStatementPage =
    page.id === "mission-statement-page";
  const isHowToUsePage =
    page.id === "how-to-use-this-volume-page";
  const isAboutBreathtakingAwarenessPage =
    page.id === "about-breathtaking-awareness-page";
  const showWelcomeHeader = isAboutBreathtakingAwarenessPage;
  const isFrontOpenerPage = false;
  const isVolumeOnePage = page.id === "volume-one-page";
  const isChapterDescriptionPage =
    page.id.startsWith("chapter-") &&
    page.id.endsWith("-description");
  const isStoryTextPage =
    !chapterDividerBlock &&
    !shareBlock &&
    !isGeneratedTitlePage &&
    !isWelcomePage &&
    !isMissionStatementPage &&
    !showWelcomeHeader &&
    !isHowToUsePage &&
    !isFrontOpenerPage &&
    !isVolumeOnePage &&
    !isChapterDescriptionPage;

  const isRightPage = page.pageNumber % 2 !== 0;
  const paddingLeft = isRightPage ? "56px" : "48px";
  const paddingRight = isRightPage ? "48px" : "56px";
  const articleStoryPaddingX = "58px";
  const articleStoryPaddingTop = "64px";
  const articleStoryPaddingBottom = "78px";
  const paddingTop = "60px";
  const paddingBottom = "40px";

  const titleHeadingStyle = {
    fontFamily: "var(--font-serif-primary)",
    fontWeight: 700,
    lineHeight: 1.08,
    letterSpacing: "-0.01em",
  } as CSSProperties;

  const titlePageComponents = {
    h1: ({ node, ...props }: any) => (
      <h1
        className="text-center text-charcoal mb-7"
        style={{ ...titleHeadingStyle, fontSize: "34pt" }}
        {...props}
      />
    ),
    h2: ({ node, ...props }: any) => (
      <h2
        className="text-center text-charcoal mb-7"
        style={{ ...titleHeadingStyle, fontSize: "30pt" }}
        {...props}
      />
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        className="text-center text-charcoal mb-7"
        style={{ ...titleHeadingStyle, fontSize: "26pt" }}
        {...props}
      />
    ),
    h4: ({ node, ...props }: any) => (
      <h4
        className="text-center text-charcoal mb-7"
        style={{ ...titleHeadingStyle, fontSize: "22pt" }}
        {...props}
      />
    ),
    h5: ({ node, ...props }: any) => (
      <h5
        className="text-center text-charcoal mb-8"
        style={{
          fontFamily: "var(--font-serif-secondary)",
          fontSize: "12pt",
          lineHeight: 1.35,
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    h6: ({ node, ...props }: any) => (
      <h6
        className="text-center text-charcoal mb-8"
        style={{
          fontFamily: "var(--font-serif-secondary)",
          fontSize: "11pt",
          lineHeight: 1.35,
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    strong: ({ node, ...props }: any) => (
      <strong style={{ fontWeight: 700 }} {...props} />
    ),
    b: ({ node, ...props }: any) => (
      <strong style={{ fontWeight: 700 }} {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p
        className="text-center text-charcoal mb-4"
        style={{
          fontFamily: "var(--font-serif-secondary)",
          fontSize: "10pt",
          lineHeight: 1.4,
          fontWeight: 500,
        }}
        {...props}
      />
    ),
    a: ({ node, ...props }: any) => (
      <a
        className="text-forest underline font-sans-accent"
        {...props}
      />
    ),
    ul: ({ node, ...props }: any) => (
      <ul
        className="list-disc pl-6 mb-5 type-body"
        {...props}
      />
    ),
    ol: ({ node, ...props }: any) => (
      <ol
        className="list-decimal pl-6 mb-5 type-body"
        {...props}
      />
    ),
    li: ({ node, ...props }: any) => (
      <li className="mb-2" {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className="pl-6 italic my-6 type-body text-charcoal/80"
        {...props}
      />
    ),
    hr: () => (
      <div
        aria-hidden="true"
        className="my-5 h-px w-full bg-[#AF9355]/55"
      />
    ),
    img: ({ node, ...props }: any) => (
      <img
        className="w-full h-auto max-h-[300px] object-cover my-6"
        {...props}
      />
    ),
  };

  const storyComponents = {
    h1: ({ node, ...props }: any) => (
      <h1
        className={`text-left font-normal leading-tight ${
          isMissionStatementPage ? "mb-4" : "mb-8"
        }`}
        style={
          isWelcomePage
            ? { display: "none" }
            : isMissionStatementPage
              ? {
                  fontFamily: "var(--font-serif-primary)",
                  fontSize: "20pt",
                  lineHeight: 1.08,
                  color: "#021A2B",
                }
              : isHowToUsePage
                ? {
                    fontFamily: "var(--font-serif-primary)",
                    fontSize: "34pt",
                    lineHeight: 1.05,
                    color: "#021A2B",
                  }
                : {
                    fontFamily: "var(--font-serif-primary)",
                    fontSize: "34pt",
                    lineHeight: 1.05,
                    color: "#021A2B",
                  }
        }
        {...props}
      />
    ),
    h2: ({ node, ...props }: any) => (
      <h2
        className="mt-6 mb-3 text-left font-serif-primary text-[18px] leading-tight font-normal text-[#021A2B]"
        {...props}
      />
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        className="mt-5 mb-3 text-left font-serif-primary text-[16px] leading-tight font-normal text-[#021A2B]"
        {...props}
      />
    ),
    h4: ({ node, ...props }: any) => (
      <h4
        className="mt-5 mb-2 text-left font-serif-primary text-[15px] leading-tight font-normal text-[#021A2B]"
        {...props}
      />
    ),
    h5: ({ node, ...props }: any) => (
      <h5
        className="mt-4 mb-2 text-left font-serif-primary text-[14px] leading-tight font-normal text-[#021A2B]"
        {...props}
      />
    ),
    h6: ({ node, ...props }: any) => (
      <h6
        className="mt-4 mb-2 text-left font-serif-primary text-[13px] leading-tight font-normal text-[#021A2B]"
        {...props}
      />
    ),
    strong: ({ node, ...props }: any) => (
      <span className="font-normal" {...props} />
    ),
    b: ({ node, ...props }: any) => (
      <span className="font-normal" {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p
        className="type-body mb-3 text-justify"
        style={
          isStoryTextPage
            ? {
                lineHeight: 1.42,
              }
            : undefined
        }
        {...props}
      />
    ),
    a: ({ node, ...props }: any) => (
      <a
        className="text-forest underline font-sans-accent"
        {...props}
      />
    ),
    ul: ({ node, ...props }: any) => (
      <ul
        className="list-disc pl-6 mb-5 type-body"
        {...props}
      />
    ),
    ol: ({ node, ...props }: any) => (
      <ol
        className="list-decimal pl-6 mb-5 type-body"
        {...props}
      />
    ),
    li: ({ node, ...props }: any) => (
      <li className="mb-2" {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className="pl-6 italic my-6 type-body text-charcoal/80"
        {...props}
      />
    ),
    hr: () => (
      <div
        aria-hidden="true"
        className="my-5 h-px w-full bg-[#AF9355]/55"
      />
    ),
    img: ({ node, ...props }: any) => (
      <img
        className="w-full h-auto max-h-[300px] object-cover my-6"
        {...props}
      />
    ),
  };

  if (isGeneratedTitlePage && markdownBlock) {
    const toPlainTitleText = (value = "") =>
      String(value)
        .replace(/^#+\s*/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim();

    const titleLines = markdownBlock.content
      .split(/\n+/)
      .map((line) => toPlainTitleText(line))
      .filter(Boolean);

    const titleText = titleLines[0] || page.alt || "Untitled";
    const hasSubtitle =
      Boolean(titleLines[1]) &&
      !/^editorial$/i.test(titleLines[1]) &&
      !/^by\s+/i.test(titleLines[1]) &&
      !/^published\s+/i.test(titleLines[1]);

    const subtitleText = hasSubtitle ? titleLines[1] : "";
    const kicker = toPlainTitleText(
      items.find((block) => block.type === "kicker")?.content || ""
    );
    const metaLines = titleLines.filter(
      (line, index) =>
        index > 0 && !(hasSubtitle && index === 1),
    );

    const titleSize =
      page.pageNumber === 118 || page.pageNumber === 127
        ? titleText.length > 112
          ? "24pt"
          : titleText.length > 86
            ? "27pt"
            : "30pt"
        : titleText.length > 112
          ? "20pt"
          : titleText.length > 86
            ? "23pt"
            : "26pt";

    return (
      <div
        className="relative h-[660px] w-[480px] overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #021A2B 0%, #0A2736 54%, #021A2B 100%)",
          paddingLeft,
          paddingRight,
          paddingTop: "64px",
          paddingBottom: "56px",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 82% 16%, rgba(43,155,192,0.18), transparent 30%), radial-gradient(circle at 14% 88%, rgba(175,147,85,0.13), transparent 34%)",
          }}
        />

        <div className="absolute left-[42px] top-[48px] h-[1px] w-[122px] bg-[#AF9355]/70" />
        <div className="absolute right-[44px] top-[74px] h-[1px] w-[86px] bg-[#2B9BC0]/60" />
        <div className="absolute left-[-116px] bottom-[-120px] h-[300px] w-[300px] rounded-full border border-[#2B9BC0]/18" />
        <div className="absolute right-[-118px] top-[-112px] h-[280px] w-[280px] rounded-full border border-[#AF9355]/18" />
        <div className="absolute bottom-[72px] right-[-36px] h-[1px] w-[220px] rotate-[-32deg] bg-[#AF9355]/55" />
        <div className="absolute inset-[30px] border border-[#AF9355]/26 pointer-events-none" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <div
              className="mb-8 uppercase tracking-[0.24em]"
              style={{
                fontFamily:
                  "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
                fontSize: "9pt",
                fontWeight: 400,
                lineHeight: 1.2,
                color: "#AF9355",
              }}
            >
              {kicker || ""}
            </div>

            <div className="max-w-[340px]">
              <h1
                style={{
                  fontFamily: "var(--font-serif-primary)",
                  fontSize: titleSize,
                  lineHeight: 1.05,
                  fontWeight: 600,
                  color: "#F8F3E8",
                }}
              >
                {titleText}
              </h1>

              {subtitleText ? (
                <>
                  <div className="mt-7 h-[2px] w-28 bg-[#2B9BC0]" />
                  <p
                    className="mt-6"
                    style={{
                      fontFamily:
                        "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
                      fontSize: "15pt",
                      lineHeight: 1.28,
                      fontWeight: 300,
                      color: "#F3E8D3",
                    }}
                  >
                    {subtitleText}
                  </p>
                </>
              ) : (
                <div className="mt-7 h-[2px] w-28 bg-[#2B9BC0]" />
              )}
            </div>
          </div>

          <div className="pb-2">
            {metaLines.map((line, index) => (
              <p
                key={`${page.id}-meta-${index}`}
                className={index === 0 ? "" : "mt-2"}
                style={{
                  fontFamily:
                    "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
                  fontSize: index === 0 ? "10pt" : "10.5pt",
                  lineHeight: 1.35,
                  fontWeight: index === 0 ? 500 : 300,
                  letterSpacing:
                    index === 0 ? "0.14em" : "0.04em",
                  textTransform:
                    index === 0 ? "uppercase" : "none",
                  color:
                    index === 0
                      ? "#AF9355"
                      : "rgba(248,243,232,0.9)",
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isChapterDescriptionPage && markdownBlock) {
    return (
      <div className="relative h-[660px] w-[480px] overflow-hidden bg-[#021A2B] text-[#F8F3E8] select-none">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(circle at 18% 22%, rgba(175,147,85,0.14), transparent 30%), radial-gradient(circle at 88% 76%, rgba(43,155,192,0.24), transparent 36%), linear-gradient(160deg, #01101C 0%, #021A2B 52%, #082B3A 100%)",
          }}
        />

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-20 top-[-80px] h-[300px] w-[300px] rounded-full border border-[#2B9BC0]/25" />
          <div className="absolute -left-28 bottom-[-120px] h-[340px] w-[340px] rounded-full border border-[#C9A45C]/18" />
          <div className="absolute bottom-16 right-[-40px] h-[1px] w-[300px] rotate-[-32deg] bg-[#C9A45C]/60" />
          <div className="absolute left-10 top-10 h-[92px] w-[1px] bg-[#C9A45C]/45" />
          <div className="absolute left-10 top-10 h-[1px] w-[92px] bg-[#C9A45C]/45" />
        </div>

        <div
          className="relative z-10 flex h-full flex-col justify-center py-12"
          style={{
            paddingLeft:
              page.pageNumber === 117
                ? "72px"
                : page.pageNumber === 11
                  ? "56px"
                  : "40px",
            paddingRight:
              page.pageNumber === 117
                ? "24px"
                : page.pageNumber === 11
                  ? "24px"
                  : "40px",
          }}
        >
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }: any) => (
                <h1
                  className="mb-8 text-left"
                  style={{
                    fontFamily: "var(--font-serif-primary)",
                    fontSize: "34pt",
                    lineHeight: 0.94,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "#AF9355",
                    textShadow: "0 3px 12px rgba(0,0,0,0.45)",
                  }}
                  {...props}
                />
              ),
              h2: ({ node, ...props }: any) => (
                <h2
                  className="mb-8 text-left"
                  style={{
                    fontFamily: "var(--font-serif-primary)",
                    fontSize: "34pt",
                    lineHeight: 0.94,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "#AF9355",
                    textShadow: "0 3px 12px rgba(0,0,0,0.45)",
                  }}
                  {...props}
                />
              ),
              p: ({ node, ...props }: any) => (
                <p
                  className="max-w-[360px] text-left"
                  style={{
                    fontFamily:
                      "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
                    fontSize: "14pt",
                    lineHeight: 1.42,
                    fontWeight: 300,
                    color: "rgba(248,243,232,0.92)",
                  }}
                  {...props}
                />
              ),
              strong: ({ node, ...props }: any) => (
                <strong
                  style={{ fontWeight: 700 }}
                  {...props}
                />
              ),
              em: ({ node, ...props }: any) => (
                <em
                  style={{ fontStyle: "italic" }}
                  {...props}
                />
              ),
            }}
          >
            {markdownBlock.content}
          </ReactMarkdown>

          <div className="mt-8 h-[2px] w-44 bg-[#2B9BC0]" />
        </div>
      </div>
    );
  }

  if (isVolumeOnePage) {
    const volumeMarkdown = markdownBlock?.content || "";

    return (
      <div className="h-[660px] w-[480px] relative overflow-hidden bg-ivory text-charcoal select-none">
        <GrainOverlay />

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-[86px] top-[-82px] h-[220px] w-[220px] rounded-full border border-[#19454B]/14" />
          <div className="absolute -left-[110px] bottom-[-92px] h-[250px] w-[250px] rounded-full border border-[#19454B]/10" />
          <div className="absolute left-[54px] top-[58px] h-[96px] w-[1px] bg-[#AF9355]/55" />
          <div className="absolute left-[54px] top-[58px] h-[1px] w-[132px] bg-[#AF9355]/55" />
          <div className="absolute right-[58px] bottom-[74px] h-[1px] w-[132px] bg-[#AF9355]/55" />
          <div className="absolute right-[58px] bottom-[74px] h-[96px] w-[1px] bg-[#AF9355]/55" />
        </div>

        <div className="absolute left-[56px] right-[48px] top-[132px] bottom-[96px] flex flex-col items-center justify-center text-center">
          {volumeMarkdown ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p
                    className="uppercase mb-9 text-center"
                    style={{
                      fontFamily:
                        "Arial Narrow, Avenir Next Condensed, Roboto Condensed, Helvetica Neue, sans-serif",
                      fontSize: "8.5pt",
                      lineHeight: 1.2,
                      letterSpacing: "0.28em",
                      color: "#19454B",
                    }}
                  >
                    {children}
                  </p>
                ),
                h1: ({ children }) => (
                  <h1
                    className="text-center mb-8"
                    style={{
                      fontFamily: "var(--font-serif-primary)",
                      fontSize: "46pt",
                      lineHeight: 0.92,
                      fontWeight: 700,
                      letterSpacing: "-0.035em",
                      color: "#021A2B",
                    }}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2
                    className="text-center"
                    style={{
                      fontFamily: "var(--font-serif-primary)",
                      fontSize: "19pt",
                      lineHeight: 1.1,
                      fontWeight: 700,
                      color: "#19454B",
                    }}
                  >
                    {children}
                  </h2>
                ),
                hr: () => <div className="w-[172px] h-[2px] bg-[#AF9355]/80 my-8" />,
              }}
            >
              {volumeMarkdown}
            </ReactMarkdown>
          ) : null}
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-[34px] pointer-events-none bg-gradient-to-l from-black/[0.055] to-transparent" />
      </div>
    );
  }


  if (isFrontOpenerPage) {
    return (
      <div className="h-[660px] w-[480px] bg-ivory overflow-hidden relative text-charcoal">
        <GrainOverlay />

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[96px] bottom-[84px] h-[1px] w-[288px] bg-[#AF9355]/42" />
          <div className="absolute -right-[126px] top-[-104px] h-[260px] w-[260px] rounded-full border border-[#AF9355]/16" />
          <div className="absolute -left-[140px] bottom-[-128px] h-[280px] w-[280px] rounded-full border border-[#AF9355]/14" />
        </div>

        <div className="absolute left-[58px] right-[58px] top-[54px] bottom-[120px] flex flex-col items-center justify-center text-center">
          <div className="w-[210px] h-[2px] bg-[#AF9355]/70 mb-10" />

          <h1
            className="mb-8 text-center"
            style={{
              fontFamily: "var(--font-serif-primary)",
              fontSize: "42pt",
              lineHeight: 0.92,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: "#021A2B",
            }}
          >
            
          </h1>

          <div className="w-[168px] h-[2px] bg-[#AF9355] mb-8" />

          <h2
            className="mb-6 text-center"
            style={{
              fontFamily: "var(--font-serif-primary)",
              fontSize: "21pt",
              lineHeight: 1.08,
              fontWeight: 700,
              color: "#021A2B",
            }}
          >
            
          </h2>

          <p
            className="uppercase mb-0 text-center"
            style={{
              fontFamily:
                "Arial Narrow, Avenir Next Condensed, Roboto Condensed, Helvetica Neue, sans-serif",
              fontSize: "13pt",
              lineHeight: 1.15,
              letterSpacing: "0.24em",
              color: "#5A5A5A",
            }}
          >
            
          </p>
        </div>

        <p
          className="absolute left-[48px] right-[48px] bottom-[38px] text-center uppercase"
          style={{
            fontFamily:
              "Arial Narrow, Avenir Next Condensed, Roboto Condensed, Helvetica Neue, sans-serif",
            fontSize: "7.25pt",
            lineHeight: 1.35,
            letterSpacing: "0.18em",
            color: "#AF9355",
          }}
        >
          
        </p>

        <div className="absolute right-0 top-0 bottom-0 w-[34px] pointer-events-none bg-gradient-to-l from-black/[0.055] to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={`h-[660px] w-[480px] bg-ivory overflow-hidden relative ${isGeneratedTitlePage ? "flex items-center" : ""}`}
      style={
        chapterDividerBlock || shareBlock
          ? {
              paddingLeft: "0px",
              paddingRight: "0px",
              paddingTop: "0px",
              paddingBottom: "0px",
            }
          : isMissionStatementPage || showWelcomeHeader
            ? {
                paddingLeft: "0px",
                paddingRight: "0px",
                paddingTop: "0px",
                paddingBottom,
              }
            : isStoryTextPage
              ? {
                  paddingLeft: articleStoryPaddingX,
                  paddingRight: articleStoryPaddingX,
                  paddingTop: articleStoryPaddingTop,
                  paddingBottom: articleStoryPaddingBottom,
                }
              : {
                  paddingLeft,
                  paddingRight,
                  paddingTop: isWelcomePage
                    ? "76px"
                    : isHowToUsePage
                      ? "92px"
                      : paddingTop,
                  paddingBottom: isWelcomePage
                    ? "120px"
                    : paddingBottom,
                }
      }
    >
      <GrainOverlay />
      <div
        className={`max-w-none text-charcoal flex flex-col h-full ${isGeneratedTitlePage ? "justify-center w-full" : ""}`}
      >
        {showWelcomeHeader && (
          <h1
            className="mb-3 text-left"
            style={{
              fontFamily: "var(--font-serif-primary)",
              fontSize: "30pt",
              lineHeight: 1.05,
              color: "#021A2B",
              fontWeight: 400,
              paddingTop: "82px",
              paddingLeft,
              paddingRight,
            }}
          >
            
          </h1>
        )}

        {isWelcomePage && (
          <h1
            className="mb-7 text-left"
            style={{
              fontFamily: "var(--font-serif-primary)",
              fontSize: "20pt",
              lineHeight: 1.08,
              fontWeight: 400,
              color: "#021A2B",
            }}
          >
            Dear Reader,
          </h1>
        )}

        <div
          className={
            isMissionStatementPage || showWelcomeHeader
              ? "flex-1"
              : "contents"
          }
          style={
            isMissionStatementPage || showWelcomeHeader
              ? {
                  paddingLeft,
                  paddingRight,
                  paddingTop: isMissionStatementPage
                    ? "82px"
                    : "18px",
                }
              : undefined
          }
        >
          {chapterDividerBlock ? (
            <ChapterDividerBlock
              title={chapterDividerBlock.title}
              subtitle={chapterDividerBlock.subtitle}
              eyebrow={chapterDividerBlock.eyebrow}
            />
          ) : shareBlock ? (
            <EditorialShareBlock
              articleId={shareBlock.articleId}
              articleTitle={shareBlock.articleTitle}
              articleUrl={shareBlock.articleUrl}
              articleExcerpt={shareBlock.articleExcerpt}
              articleImage={shareBlock.articleImage}
              pageNumber={page.pageNumber}
            />
          ) : markdownBlock ? (
            <ReactMarkdown
              components={
                isGeneratedTitlePage
                  ? titlePageComponents
                  : storyComponents
              }
            >
              {markdownBlock.content}
            </ReactMarkdown>
          ) : null}
        </div>
      </div>

      {isWelcomePage && (
        <p
          className="absolute right-[56px] bottom-[54px] text-right"
          style={{
            fontFamily: "var(--font-serif-primary)",
            fontSize: "27pt",
            fontWeight: 400,
            fontStyle: "normal",
            letterSpacing: "0.01em",
            lineHeight: 1,
            color: "#021A2B",
            opacity: 0.88,
            textShadow: "none",
          }}
        >
          
        </p>
      )}
    </div>
  );
};

const BrandLogoArtwork = ({
  dark = false,
}: {
  dark?: boolean;
}) => (
  <div
    className="flex h-[86px] w-[86px] items-center justify-center rounded-full"
    style={{
      backgroundColor: dark
        ? "rgba(248,243,232,0.96)"
        : "rgba(255,255,255,0.82)",
      border: dark
        ? "1px solid rgba(175,147,85,0.62)"
        : "1px solid rgba(175,147,85,0.45)",
      boxShadow: dark
        ? "0 18px 42px rgba(0,0,0,0.28)"
        : "0 16px 38px rgba(2,26,43,0.12)",
    }}
  >
    <img
      src={brandLogo}
      alt=""
      className="h-[58px] w-[58px] object-contain"
      style={{ filter: dark ? "none" : "saturate(0.95)" }}
    />
  </div>
);

const CONTENTS_LOGO_DATA_URI = "https://raw.githubusercontent.com/Joliel21/bta_public/main/public/images/brand/gold-logo.png";

const ContentsLineIcon = ({
  kind,
}: {
  kind: string;
}) => {
  const stroke = "#021A2B";

  if (kind === "logo" || kind === "author") {
    return (
      <img
        src={CONTENTS_LOGO_DATA_URI}
        alt=""
        className="h-[38px] w-[38px] object-contain opacity-90"
      />
    );
  }

  if (kind === "pen") {
    return (
      <svg
        viewBox="0 0 36 36"
        className="h-[38px] w-[38px]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M24.5 4.5c3 2.3 4.6 5.5 4.5 9.2-.2 6.3-5.9 11.5-14.7 16.8 1.3-8.7 3.9-16.4 10.2-26Z"
          stroke={stroke}
          strokeWidth="1.2"
        />
        <path
          d="M10 31c3.7-5.6 8.2-11.4 14.5-17.5"
          stroke={stroke}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M19 10.5c2 1.1 3.8 2.7 5.2 4.7"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "people") {
    return (
      <svg
        viewBox="0 0 36 36"
        className="h-[38px] w-[38px]"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="11"
          r="4.2"
          stroke={stroke}
          strokeWidth="1.2"
        />
        <path
          d="M10.5 28c.9-5 3.6-8 7.5-8s6.6 3 7.5 8"
          stroke={stroke}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle
          cx="8.5"
          cy="15.5"
          r="3"
          stroke={stroke}
          strokeWidth="1"
        />
        <path
          d="M3.6 27c.5-3.3 2.4-5.4 5.2-5.7"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle
          cx="27.5"
          cy="15.5"
          r="3"
          stroke={stroke}
          strokeWidth="1"
        />
        <path
          d="M32.4 27c-.5-3.3-2.4-5.4-5.2-5.7"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "chat") {
    return (
      <svg
        viewBox="0 0 36 36"
        className="h-[38px] w-[38px]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 8.5h22a3 3 0 0 1 3 3v10.2a3 3 0 0 1-3 3H16.8L9 31v-6.3H7a3 3 0 0 1-3-3V11.5a3 3 0 0 1 3-3Z"
          stroke={stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 14.5h15M10.5 18.5h12M10.5 22.5h8"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 36 36"
      className="h-[38px] w-[38px]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 4v4M18 28v4M5 18h4M27 18h4M8.8 8.8l2.8 2.8M24.4 24.4l2.8 2.8M27.2 8.8l-2.8 2.8M11.6 24.4l-2.8 2.8"
        stroke={stroke}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M13 20.5c-2.5-2.8-2.1-7.4 1.1-9.7 2.4-1.8 5.8-1.8 8.2 0 3.2 2.3 3.5 6.9 1 9.7-1.3 1.5-2.1 2.8-2.3 4.5h-6c-.1-1.7-.9-3-2-4.5Z"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M15 28h6"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

const contentsItems: any[] = [];

export const WhatsInsideLeftPageLayout = ({
  page,
  blocks,
}: PageLayoutProps) => {
  const markdownContent = getMarkdownContentFromBlocks(blocks) || `# What's\nInside`;

  return (
    <div className="h-[660px] w-[480px] relative overflow-hidden bg-[#021A2B] text-[#F8F3E8] select-none">
      <div
        className="absolute inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(circle at 82% 16%, rgba(43,155,192,0.2), transparent 34%), radial-gradient(circle at 15% 86%, rgba(175,147,85,0.12), transparent 38%), linear-gradient(180deg, #01101C 0%, #021A2B 46%, #01101C 100%)",
        }}
      />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-[136px] bottom-[-122px] h-[310px] w-[310px] rounded-full border border-[#AF9355]/14" />
        <div className="absolute -right-[132px] top-[-110px] h-[288px] w-[288px] rounded-full border border-[#2B9BC0]/18" />
        <div className="absolute left-[58px] top-[74px] h-[1px] w-[136px] bg-[#AF9355]/62" />
        <div className="absolute left-[58px] top-[74px] h-[108px] w-[1px] bg-[#AF9355]/45" />
        <div className="absolute right-[64px] bottom-[86px] h-[1px] w-[116px] bg-[#AF9355]/42" />
      </div>

      <div className="absolute left-[58px] top-[198px] text-left">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1
                style={{
                  fontFamily: "var(--font-serif-primary)",
                  fontSize: "58pt",
                  lineHeight: 0.86,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "#AF9355",
                  textShadow: "0 3px 14px rgba(0,0,0,0.44)",
                }}
              >
                {children}
              </h1>
            ),
          }}
        >
          {markdownContent}
        </ReactMarkdown>
        <div className="mt-8 h-[2px] w-[136px] bg-[#AF9355]/80" />
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-[38px] pointer-events-none bg-gradient-to-l from-black/[0.2] to-transparent" />
    </div>
  );
};


export const WhatsInsideRightPageLayout = ({
  page,
  onNavigate,
  blocks,
}: PageLayoutProps) => {
  const pageOverrides = new Map<string, string>();
  const githubContentsItems = (blocks || [])
    .filter((block: any) => block.type === "contents-item")
    .map((block: any) => ({
      title: block.title || "",
      body: block.body || "",
      page: block.page || "",
      icon: block.icon || "column",
      target: block.target,
    }))
    .filter((item: any) => item.title);
  const displayContentsItems = githubContentsItems.length > 0 ? githubContentsItems : contentsItems;

  blocks?.forEach((block) => {
    if (block.type === "toc-entry") {
      pageOverrides.set(block.title, block.pageNumber);
    }
  });

  const getTargetPage = (item: any) => {
    if ("target" in item && item.target === "back-cover") {
      return "back-cover" as const;
    }

    const pageValue =
      pageOverrides.get(item.title) || item.page;
    const pageNumber = Number.parseInt(pageValue, 10);
    return Number.isFinite(pageNumber) ? pageNumber : null;
  };

  const formatPage = (item: any) => {
    if ("target" in item && item.target === "back-cover") {
      return "";
    }

    const pageValue =
      pageOverrides.get(item.title) || item.page;
    const pageNumber = Number.parseInt(pageValue, 10);
    if (!Number.isFinite(pageNumber)) return pageValue;
    return String(pageNumber).padStart(2, "0");
  };

  return (
    <div className="h-[660px] w-[480px] relative overflow-hidden bg-ivory text-charcoal select-none">
      <GrainOverlay />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-[122px] top-[-112px] h-[288px] w-[288px] rounded-full border border-[#19454B]/10" />
        <div className="absolute left-[54px] top-[60px] h-[1px] w-[128px] bg-[#AF9355]/45" />
        <div className="absolute right-[56px] bottom-[76px] h-[96px] w-[1px] bg-[#AF9355]/32" />
        <div className="absolute right-[56px] bottom-[76px] h-[1px] w-[124px] bg-[#AF9355]/32" />
      </div>

      <div className="absolute left-[56px] right-[44px] top-[78px] bottom-[72px]">
        <div className="flex h-full flex-col justify-between">
          {displayContentsItems.map((item: any) => {
            const targetPage = getTargetPage(item);
            const isLinked = Boolean(onNavigate && targetPage);

            const content = (
              <>
                <div
                  className="text-right"
                  style={{
                    fontFamily: "var(--font-serif-primary)",
                    fontSize: "20pt",
                    lineHeight: 1,
                    fontWeight: 700,
                    color: "#021A2B",
                  }}
                >
                  {formatPage(item)}
                </div>

                <div className="flex justify-center pt-[2px]">
                  <ContentsLineIcon kind={item.icon} />
                </div>

                <div className="pt-[1px] text-left">
                  <h2
                    className="inline-block border-b border-[#2B9BC0]/80 pb-[2px]"
                    style={{
                      fontFamily: "var(--font-serif-primary)",
                      fontSize: "14pt",
                      lineHeight: 1.04,
                      fontWeight: 700,
                      color: "#021A2B",
                    }}
                  >
                    {item.title}
                  </h2>
                  <p
                    className="mt-[4px]"
                    style={{
                      fontFamily: "var(--font-serif-secondary)",
                      fontSize: "8.6pt",
                      lineHeight: 1.28,
                      color: "#3F3F3F",
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              </>
            );

            if (!isLinked || !targetPage) {
              return (
                <div
                  key={item.title}
                  className="grid grid-cols-[48px_48px_1fr] items-start gap-4"
                >
                  {content}
                </div>
              );
            }

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onNavigate?.(targetPage)}
                className="grid grid-cols-[48px_48px_1fr] items-start gap-4 text-left cursor-pointer transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#AF9355]/45 focus:ring-offset-2 focus:ring-offset-ivory"
                aria-label={
                  targetPage === "back-cover"
                    ? `Go to ${item.title} on the back cover`
                    : `Go to ${item.title}, page ${formatPage(item)}`
                }
                title={
                  targetPage === "back-cover"
                    ? `${item.title} on the back cover`
                    : `Go to ${item.title}`
                }
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-[34px] pointer-events-none bg-gradient-to-r from-black/[0.05] to-transparent" />
    </div>
  );
};

const BREATHTAKING_AWARENESS_AD: Record<string, string> = {};

export const BreathtakingAwarenessAdLayout = ({
  page,
  blocks,
}: PageLayoutProps) => {
  const adConfig = (blocks || []).find((block: any) => block.type === "ad-config") as any;
  const adContent = {
    ...BREATHTAKING_AWARENESS_AD,
    ...(adConfig || {}),
  };
  const isRightPage = page.pageNumber % 2 !== 0;
  const edgePadding = isRightPage
    ? { paddingLeft: "58px", paddingRight: "46px" }
    : { paddingLeft: "46px", paddingRight: "58px" };

  return (
    <div className="relative h-[660px] w-[480px] overflow-hidden bg-[#021A2B] text-[#F8F3E8] select-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 82% 18%, rgba(43,155,192,0.23), transparent 31%), radial-gradient(circle at 16% 78%, rgba(201,164,92,0.18), transparent 34%), linear-gradient(160deg, #01101C 0%, #021A2B 52%, #082B3A 100%)",
        }}
      />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[36px] top-[36px] right-[36px] bottom-[36px] border border-[#C9A45C]/35" />
        <div className="absolute left-[54px] top-[58px] h-[1px] w-[130px] bg-[#C9A45C]/70" />
        <div className="absolute right-[54px] top-[84px] h-[1px] w-[88px] bg-[#2B9BC0]/70" />
        <div className="absolute -right-[118px] top-[-110px] h-[290px] w-[290px] rounded-full border border-[#2B9BC0]/22" />
        <div className="absolute -left-[134px] bottom-[-128px] h-[316px] w-[316px] rounded-full border border-[#C9A45C]/18" />
        <div className="absolute bottom-[86px] right-[-42px] h-[1px] w-[252px] rotate-[-32deg] bg-[#C9A45C]/55" />
      </div>

      <div
        className="relative z-10 flex h-full flex-col justify-between py-[58px]"
        style={edgePadding}
      >
        <div>
          <p
            className="uppercase mb-8"
            style={{
              fontFamily:
                "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
              fontSize: "9pt",
              lineHeight: 1.2,
              letterSpacing: "0.28em",
              color: "#C9A45C",
            }}
          >
            {adContent.eyebrow || adContent.title}
          </p>

          <h1
            className="mb-7"
            style={{
              fontFamily: "var(--font-serif-primary)",
              fontSize: "43pt",
              lineHeight: 0.9,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: "#F8F3E8",
            }}
          >
            {adContent.headline}
          </h1>

          <div className="h-[2px] w-[136px] bg-[#2B9BC0] mb-7" />

          <p
            className="max-w-[350px] mb-7"
            style={{
              fontFamily:
                "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
              fontSize: "17pt",
              lineHeight: 1.24,
              fontWeight: 300,
              color: "#F3E8D3",
            }}
          >
            {adContent.subheadline}
          </p>
        </div>

        <div>
          <a
            href={adContent.buttonUrl || adContent.signupUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-[#2B9BC0]/85 bg-[#2B9BC0]/20 px-8 py-4 uppercase no-underline transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-[#C9A45C]/70"
            style={{
              fontFamily:
                "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
              fontSize: "13pt",
              letterSpacing: "0.16em",
              fontWeight: 700,
              color: "#F8F3E8",
            }}
          >
            {adContent.buttonText || adContent.signupLabel}
          </a>

          <p
            className="mt-5 uppercase"
            style={{
              fontFamily:
                "Inter, Avenir Next, Helvetica Neue, Arial, sans-serif",
              fontSize: "7.5pt",
              lineHeight: 1.2,
              letterSpacing: "0.18em",
              color: "rgba(201,164,92,0.9)",
            }}
          >
            {adContent.footer}
          </p>
        </div>
      </div>
    </div>
  );
};

export const LAYOUT_REGISTRY: Record<
  string,
  React.ComponentType<PageLayoutProps>
> = {
  "article-image-layout": ArticleImageLayout,
  "article-title-layout": ArticleTitleLayout,
  "article-text-layout": ArticleTextLayout,
  "breathtaking-awareness-ad": BreathtakingAwarenessAdLayout,
  "article-layout": ArticleLayout,
  "inside-cover": InsideCoverLayout,
  "inside-back-cover": InsideBackCoverLayout,
  "page-1": Page1Layout,
  "whats-inside-left-page": WhatsInsideLeftPageLayout,
  "whats-inside-right-page": WhatsInsideRightPageLayout,
  "volume-one-page": ArticleTextLayout,
  "section-divider": SectionDividerLayout,
  "christina-feature": ChristinaFeatureLayout,
};
