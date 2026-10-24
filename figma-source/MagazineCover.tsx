import React, { useState } from "react";

interface MagazineCoverContext {
  brandLine1?: string;
  brandLine2?: string;
  title?: string;
  volume?: string;
  logoUrl?: string;
  logoAlt?: string;
}

interface MagazineCoverProps {
  issueTitle?: string;
  className?: string;
  coverContext?: MagazineCoverContext;
}

function CoverLogo({ logoUrl, logoAlt }: { logoUrl?: string; logoAlt?: string }) {
  if (!logoUrl) return null;

  return (
    <img
      src={logoUrl}
      alt={logoAlt || ""}
      className="mt-1"
      style={{
        width: "170px",
        height: "auto",
        objectFit: "contain",
      }}
    />
  );
}

export const MagazineCover: React.FC<MagazineCoverProps> = ({
  issueTitle = "",
  className = "",
  coverContext,
}) => {
  const brandLine1 = coverContext?.brandLine1 || "";
  const brandLine2 = coverContext?.brandLine2 || "";
  const title = coverContext?.title || issueTitle || "";
  const volume = coverContext?.volume || "";
  return (
    <div
      className={`relative w-full h-full bg-[#0A1C27] ${className}`}
      style={{ width: "100%", height: "100%" }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#0A1C27] overflow-hidden text-center">
        <div className="absolute inset-0 bg-[#0A1C27]" />

        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 80% 18%, rgba(43,155,192,0.16), transparent 34%), radial-gradient(circle at 12% 82%, rgba(0,95,115,0.22), transparent 38%), linear-gradient(180deg, #01101C 0%, #0A1C27 48%, #01101C 100%)",
          }}
        />

        <div className="absolute left-[64px] top-[72px] h-[1px] w-[130px] bg-[#AF9355]/65 z-10" />
        <div className="absolute -right-[120px] top-[-110px] h-[330px] w-[330px] rounded-full border border-[#267999]/35 z-10" />
        <div className="absolute -left-[160px] bottom-[-150px] h-[360px] w-[360px] rounded-full border border-[#267999]/32 z-10" />
        <div className="absolute bottom-[24px] right-[-42px] h-[1px] w-[210px] rotate-[-45deg] bg-[#AF9355]/75 z-10" />

        <div className="absolute z-20 left-0 right-0 top-[118px] flex flex-col items-center w-full px-10">
          <h1
            className="flex flex-col gap-4 text-center"
            style={{
              color: "#AF9355",
              textShadow: "0 3px 12px rgba(0,0,0,0.75)",
            }}
          >
            <span
              style={{
                fontFamily: "'Priestacy', var(--font-serif-primary), serif",
                fontSize: "4.55rem",
                lineHeight: 0.78,
                fontWeight: 400,
              }}
            >
              {brandLine1}
            </span>

            <span
              style={{
                fontFamily: "'Priestacy', var(--font-serif-primary), serif",
                fontSize: "4.55rem",
                lineHeight: 0.78,
                fontWeight: 400,
              }}
            >
              {brandLine2}
            </span>
          </h1>

          <div className="w-[260px] h-[2px] bg-[#AF9355] mt-12 mb-9" />

          <h2
            className="font-serif-primary text-center"
            style={{
              color: "#F8F3E8",
              fontSize: "1.7rem",
              lineHeight: 1.08,
              fontWeight: 600,
              textShadow: "0 3px 12px rgba(0,0,0,0.75)",
            }}
          >
            {title}
          </h2>

          <div className="w-[150px] h-[1px] bg-[#AF9355]/75 mt-8 mb-6" />

          <div
            className="text-center uppercase"
            style={{
              color: "#F8F3E8",
              fontFamily:
                "Arial Narrow, Avenir Next Condensed, Roboto Condensed, Helvetica Neue, sans-serif",
              fontSize: "0.86rem",
              lineHeight: 1.2,
              fontWeight: 300,
              letterSpacing: "0.18em",
              textShadow: "0 3px 12px rgba(0,0,0,0.75)",
            }}
          >
            {volume}
          </div>

          <CoverLogo logoUrl={coverContext?.logoUrl} logoAlt={coverContext?.logoAlt} />
        </div>
      </div>
    </div>
  );
};
