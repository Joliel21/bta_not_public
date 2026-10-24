import React from "react";

interface SectionDividerProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  body?: string;
  pageNumber?: number;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

/**
 * Standalone section/chapter divider component.
 *
 * This file exists so imports like:
 *   import SectionDivider from "@/app/components/SectionDivider";
 *   import { SectionDivider } from "@/app/components/SectionDivider";
 *
 * both work safely.
 */
export function SectionDivider({
  title = "",
  subtitle = "",
  eyebrow = "",
  body = "",
  pageNumber,
  backgroundColor = "#F2EFE8",
  textColor = "#021A2B",
  accentColor = "#AF9355",
}: SectionDividerProps) {
  return (
    <section
      className="relative flex h-[660px] w-[480px] flex-col justify-center overflow-hidden"
      style={{
        backgroundColor,
        color: textColor,
        padding: "60px 56px 40px 48px",
      }}
      aria-label={title || "Section divider"}
    >
      <div
        className="absolute left-10 top-10 h-[92px] w-[1px]"
        style={{ backgroundColor: accentColor, opacity: 0.45 }}
        aria-hidden="true"
      />
      <div
        className="absolute left-10 top-10 h-[1px] w-[92px]"
        style={{ backgroundColor: accentColor, opacity: 0.45 }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-10 h-[1px] w-[120px]"
        style={{ backgroundColor: accentColor, opacity: 0.45 }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-10 h-[92px] w-[1px]"
        style={{ backgroundColor: accentColor, opacity: 0.45 }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {eyebrow ? (
          <p
            className="mb-8 uppercase tracking-[0.28em]"
            style={{
              fontFamily:
                "var(--font-sans-accent, Montserrat, Inter, Arial, sans-serif)",
              fontSize: "9pt",
              fontWeight: 500,
              color: accentColor,
            }}
          >
            {eyebrow}
          </p>
        ) : null}

        {title ? (
          <h1
            className="mb-5 text-left"
            style={{
              fontFamily: "var(--font-serif-primary, serif)",
              fontSize: title.length > 30 ? "40pt" : "48pt",
              lineHeight: 0.94,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: textColor,
            }}
          >
            {title}
          </h1>
        ) : null}

        <div
          className="mb-6 h-[2px] w-44"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />

        {subtitle ? (
          <p
            className="mb-4 text-left"
            style={{
              fontFamily: "var(--font-serif-secondary, serif)",
              fontSize: "15pt",
              lineHeight: 1.3,
              fontWeight: 500,
              color: textColor,
              opacity: 0.88,
            }}
          >
            {subtitle}
          </p>
        ) : null}

        {body ? (
          <p
            className="max-w-[360px] text-left"
            style={{
              fontFamily: "var(--font-serif-secondary, serif)",
              fontSize: "12pt",
              lineHeight: 1.45,
              color: textColor,
              opacity: 0.82,
            }}
          >
            {body}
          </p>
        ) : null}
      </div>

      {typeof pageNumber === "number" ? (
        <span
          className="absolute bottom-6 right-8"
          style={{
            fontFamily:
              "var(--font-sans-accent, Montserrat, Inter, Arial, sans-serif)",
            fontSize: "8pt",
            color: textColor,
            opacity: 0.45,
          }}
        >
          {pageNumber}
        </span>
      ) : null}
    </section>
  );
}

export default SectionDivider;
