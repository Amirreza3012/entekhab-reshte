import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

const SIZES = {
  md: { select: "rounded-xl border-slate-200 bg-slate-50/70 px-3 py-2.5 pl-8 text-sm", icon: "h-4 w-4 left-2.5" },
  sm: { select: "rounded-lg border-slate-300 bg-white px-2 py-1.5 pl-7 text-xs", icon: "h-3.5 w-3.5 left-2" },
} as const;

// Native <select> with the app's single chevron style (RTL: chevron on the left,
// native arrow hidden), so every dropdown looks like the search filters.
export function NativeSelect({
  density = "md",
  wrapperClassName = "",
  className = "",
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { density?: "md" | "sm"; wrapperClassName?: string }) {
  const s = SIZES[density];
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        {...props}
        className={`w-full appearance-none border outline-none focus:border-slate-500 ${s.select} ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${s.icon}`}
      />
    </div>
  );
}
