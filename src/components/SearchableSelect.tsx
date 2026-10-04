"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronDown } from "lucide-react";

export function SearchableSelect({
  name,
  options,
  placeholder,
  defaultValue,
  onValueChange,
}: {
  name: string;
  options: string[];
  placeholder: string;
  defaultValue?: string;
  onValueChange?: () => void;
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

  // flushSync so the hidden input already holds the new value when the
  // parent reacts (e.g. submits the filter form).
  function select(option: string) {
    flushSync(() => {
      setValue(option);
      setQuery(option);
      setOpen(false);
    });
    onValueChange?.();
  }

  function clear() {
    flushSync(() => {
      setValue("");
      setQuery("");
      setOpen(false);
    });
    onValueChange?.();
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
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm outline-none"
        />
        <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {open && (
        <ul className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-white bg-white p-1.5 text-sm shadow-xl shadow-slate-300/40">
          <li>
            <button
              type="button"
              onClick={clear}
              className="block w-full rounded-xl px-3 py-2 text-right text-slate-500 hover:bg-slate-50"
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
                  className={`block w-full rounded-xl px-3 py-2 text-right hover:bg-violet-50 ${
                    option === value ? "bg-violet-50 font-bold text-violet-700" : ""
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
