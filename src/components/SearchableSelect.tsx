"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function SearchableSelect({
  name,
  options,
  placeholder,
  defaultValue,
}: {
  name: string;
  options: string[];
  placeholder: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  }, [options, query]);

  function select(option: string) {
    setValue(option);
    setQuery(option);
    setOpen(false);
  }

  function clear() {
    setValue("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-md">
          <li>
            <button
              type="button"
              onClick={clear}
              className="block w-full px-3 py-2 text-right text-slate-500 hover:bg-slate-50"
            >
              {placeholder}
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">موردی یافت نشد</li>
          ) : (
            filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => select(option)}
                  className={`block w-full px-3 py-2 text-right hover:bg-slate-50 ${
                    option === value ? "bg-slate-100 font-medium" : ""
                  }`}
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
