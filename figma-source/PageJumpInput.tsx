import { useState, FormEvent } from "react";
import { Label } from "@/app/components/ui/label";

interface PageJumpInputProps {
  totalPages: number;
  onPageJump: (page: number) => void;
}

export function PageJumpInput({
  totalPages,
  onPageJump,
}: PageJumpInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const pageNum = parseInt(value, 10);

    if (isNaN(pageNum)) {
      setError("Invalid page");
      return;
    }

    if (pageNum < 1 || pageNum > totalPages) {
      setError(`1-${totalPages}`);
      return;
    }

    setError("");
    setValue("");
    onPageJump(pageNum);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValue(e.target.value);
    if (error) setError("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative hidden md:block rounded-full overflow-hidden"
      style={{
        backgroundColor: "rgba(10, 28, 39, 0.65)",
        border: "1px solid rgba(38, 121, 153, 0.4)",
      }}
      aria-label="Jump to page"
    >
      <Label htmlFor="page-jump" className="sr-only">
        Jump to page
      </Label>
      <input
        id="page-jump"
        type="text"
        placeholder="Go to page…"
        value={value}
        onChange={handleChange}
        className={`w-32 h-8 px-4 py-1 rounded-full text-sm select-none text-[#AF9355] border-none placeholder:text-[#AF9355]/70 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#267999] ${error ? "border-red-500 focus:ring-red-500" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? "page-jump-error" : undefined}
      />
      {error && (
        <span
          id="page-jump-error"
          className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap select-none"
          role="alert"
        >
          {error}
        </span>
      )}
    </form>
  );
}