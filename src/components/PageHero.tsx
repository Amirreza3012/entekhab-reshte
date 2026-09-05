import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#111827] p-6 text-white shadow-xl sm:p-8">
      <div className="absolute -left-12 -top-16 h-52 w-52 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="absolute -bottom-20 left-40 h-44 w-44 rounded-full bg-[#dfff4f]/8 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-xs font-bold text-[#dfff4f]">{eyebrow}</p><h1 className="!text-white">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-7 text-white/45">{description}</p>}</div>
        {aside}
      </div>
    </div>
  );
}
