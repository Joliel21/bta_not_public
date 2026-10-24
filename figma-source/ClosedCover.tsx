import {
  useState,
  useRef,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { MagazineCover } from "./MagazineCover";
import { ClosedBackCover } from "./ClosedBackCover";

interface ClosedCoverProps {
  coverImageUrl: string;
  issueTitle: string;
  onOpen: () => void;
  spineText?: string;
  backCoverImageUrl?: string;
  backCoverText?: string;
  publisher?: string;
  issueNumber?: string;
  publicationDate?: string;
  coverContext?: {
    brandLine1?: string;
    brandLine2?: string;
    title?: string;
    volume?: string;
    logoUrl?: string;
    logoAlt?: string;
  };
  backCoverContext?: {
    authorName?: string;
    authorImageUrl?: string;
    authorImageAlt?: string;
    bio?: string;
    buttonText?: string;
    buttonUrl?: string;
    supportLine?: string;
  };
  width?: number;
  height?: number;
}

export function ClosedCover({
  onOpen,
  issueTitle,
  spineText = "",
  coverContext,
  backCoverContext,
  width = 480,
  height = 660,
}: ClosedCoverProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHolding, setIsHolding] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
      : false;

  const creaseOffset = 18;
  const spineWidth = 24;
  const coverFrameColor = "#0A1C27";
  const pageTexture =
    "repeating-linear-gradient(to right, #FAFAFA 0px, #FAFAFA 2px, #E5E5E5 2px, #E5E5E5 3px)";

  const pageTextureVertical =
    "repeating-linear-gradient(to bottom, #FAFAFA 0px, #FAFAFA 2px, #E5E5E5 2px, #E5E5E5 3px)";

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isHolding) {
      setIsHolding(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else {
      setIsHolding(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isHolding) return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;

    setRotation((prev) => ({
      x: prev.x - deltaY * 0.5,
      y: prev.y + deltaX * 0.5,
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleDoubleClick = () => {
    onOpen();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onOpen();
      return;
    }

    if (e.key === " ") {
      e.preventDefault();
      setIsHolding((current) => !current);
    }
  };

  useEffect(() => {
    if (isHolding) {
      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        window.removeEventListener(
          "mousemove",
          handleMouseMove,
        );
      };
    }
  }, [isHolding]);

  return (
    <div className="relative flex items-center justify-center h-full">
      <div
        className={`relative ${
          isHolding ? "cursor-grabbing" : "cursor-pointer"
        }`}
        style={{ perspective: "2000px" }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label={
          isHolding
            ? "Holding magazine cover. Move mouse to rotate. Click or press Space to release. Press Enter to open."
            : "Closed magazine cover. Click or press Space to hold and rotate. Double-click or press Enter to open."
        }
        tabIndex={0}
      >
        <div
          className={`relative ${
            !prefersReducedMotion
              ? "transition-transform duration-100 ease-out"
              : ""
          }`}
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: "preserve-3d",
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center text-center p-0"
              style={{
                backgroundColor: coverFrameColor,
                transform: "translateZ(12px)",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.08)",
                transformStyle: "preserve-3d",
                borderRadius: "0",
                backfaceVisibility: "hidden",
              }}
            >
              <div className="absolute inset-0 z-20 overflow-hidden">
                <MagazineCover issueTitle={issueTitle} coverContext={coverContext} />
              </div>

              <div
                className="absolute top-0 bottom-0 left-0 w-[6px] z-30 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to right, rgba(0,0,0,0.18), transparent)",
                  mixBlendMode: "multiply",
                }}
              />

              <div
                className="absolute top-0 bottom-0 z-40 pointer-events-none"
                style={{
                  left: `${creaseOffset}px`,
                  width: "1px",
                  background: "#FFFFFF",
                }}
              />
            </div>

            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                backgroundColor: coverFrameColor,
                transform: "translateZ(-12px) rotateY(180deg)",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            >
              <ClosedBackCover
                coverImageUrl=""
                issueTitle={issueTitle}
                onOpen={onOpen}
                width={width}
                height={height}
                showButton={false}
                embedded
                backCoverContext={backCoverContext}
              />
            </div>

            {/* SPINE - dark teal with readable title */}
            <div
              className="absolute top-0 left-0 h-full flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: coverFrameColor,
                width: `${spineWidth}px`,
                transform: "rotateY(-90deg) translateX(-12px)",
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                boxShadow: "inset -3px 0 6px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 whitespace-nowrap"
                style={{
                  transform:
                    "translate(-50%, -50%) rotate(-90deg)",
                  color: "#F8F3E8",
                  fontFamily:
                    "Inter, 'Arial Narrow', 'Helvetica Neue Condensed', 'Helvetica Neue', Arial, sans-serif",
                  fontSize: "11px",
                  fontWeight: 300,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  textShadow: "0 1px 4px rgba(0,0,0,0.55)",
                }}
              >
                {spineText}
              </div>
            </div>

            <div
              className="absolute top-0 right-0 h-full"
              style={{
                width: "24px",
                background: pageTexture,
                transform: "rotateY(90deg) translateX(12px)",
                transformOrigin: "right center",
                transformStyle: "preserve-3d",
                boxShadow:
                  "inset 3px 0 5px -2px rgba(0,0,0,0.22), inset -1px 0 0 rgba(255,255,255,0.75)",
              }}
            />

            <div
              className="absolute top-0 left-0 w-full"
              style={{
                height: "24px",
                background: pageTextureVertical,
                transform: "rotateX(90deg) translateY(-12px)",
                transformOrigin: "top center",
                transformStyle: "preserve-3d",
                boxShadow:
                  "inset 0 3px 5px -2px rgba(0,0,0,0.22), inset 0 -1px 0 rgba(255,255,255,0.75)",
              }}
            />

            <div
              className="absolute bottom-0 left-0 w-full"
              style={{
                height: "24px",
                background: pageTextureVertical,
                transform: "rotateX(-90deg) translateY(12px)",
                transformOrigin: "bottom center",
                transformStyle: "preserve-3d",
                boxShadow:
                  "inset 0 -3px 5px -2px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.75)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClosedCover;