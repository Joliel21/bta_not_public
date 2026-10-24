import { motion } from "motion/react";
import { useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface CollageBlockProps {
  items: {
    src: string;
    alt: string;
    title?: string;
    subtitle?: string;
    url?: string;
  }[];
}

export const CollageBlock = ({ items }: CollageBlockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const hasMoved = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    hasMoved.current = false;
    // Use clientY and getBoundingClientRect for more reliable coordinates
    setStartY(e.clientY);
    setScrollTop(containerRef.current.scrollTop);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    hasMoved.current = true;
    // Calculate delta using clientY
    const deltaY = e.clientY - startY;
    const walk = deltaY * 2; // Multiplier for faster scroll
    containerRef.current.scrollTop = scrollTop - walk;
  };

  const handleItemClick = (url?: string) => {
    if (!hasMoved.current && url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col group">
      {/* Up Arrow Indicator */}
      <motion.div
        className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          {/* Shadow */}
          <ChevronUp
            size={42}
            strokeWidth={4}
            className="text-[#2D2D2D] absolute top-[2px] left-[1px] opacity-30"
          />
          {/* Main Body */}
          <ChevronUp
            size={42}
            strokeWidth={4}
            className="text-[#4A5D43] relative z-10"
          />
          {/* Silver Sliver */}
          <ChevronUp
            size={42}
            strokeWidth={1.5}
            className="text-[#D1D5DB] absolute top-0 left-0 z-20 mix-blend-overlay opacity-80"
          />
          <ChevronUp
            size={42}
            strokeWidth={1}
            className="text-[#F3F4F6] absolute top-0 left-0 z-20 opacity-60"
          />
        </div>
      </motion.div>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
      >
        <style>{`
          .scroll-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex flex-col gap-24 pt-12 pb-64 px-4 scroll-hide">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ duration: 0.5 }}
              className="snap-center flex flex-col items-center gap-4 shrink-0 justify-center relative z-0 hover:z-50"
            >
              <motion.div
                className={`relative w-full shadow-lg rounded-sm overflow-hidden bg-[#F9F8F4] p-2 border-[4px] border-[#4A5D43] ${item.url ? "cursor-pointer" : ""}`}
                initial={{
                  rotate: 1,
                  scale: 1,
                  filter: "grayscale(100%)",
                }}
                whileHover={{
                  rotate: 0,
                  scale: 1.1,
                  filter: "grayscale(0%)",
                  zIndex: 50,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={() => handleItemClick(item.url)}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-auto block"
                  draggable={false}
                />
              </motion.div>
              {(item.title || item.subtitle) && (
                <div className="text-center mt-2 pointer-events-none select-none">
                  {item.title && (
                    <h4 className="type-subhead text-[#2D2D2D]">
                      {item.title}
                    </h4>
                  )}
                  {item.subtitle && (
                    <p className="type-body italic text-[#555]">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Down Arrow Indicator */}
      <motion.div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        animate={{ y: [0, 8, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          {/* Shadow */}
          <ChevronDown
            size={42}
            strokeWidth={4}
            className="text-[#2D2D2D] absolute top-[2px] left-[1px] opacity-30"
          />
          {/* Main Body */}
          <ChevronDown
            size={42}
            strokeWidth={4}
            className="text-[#4A5D43] relative z-10"
          />
          {/* Silver Sliver */}
          <ChevronDown
            size={42}
            strokeWidth={1.5}
            className="text-[#D1D5DB] absolute top-0 left-0 z-20 mix-blend-overlay opacity-80"
          />
          <ChevronDown
            size={42}
            strokeWidth={1}
            className="text-[#F3F4F6] absolute top-0 left-0 z-20 opacity-60"
          />
        </div>
      </motion.div>
    </div>
  );
};