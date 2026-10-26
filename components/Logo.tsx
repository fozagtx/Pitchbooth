// SPDX-License-Identifier: MIT
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-slate text-chalk">
        <span className="chalk text-lg leading-none">P</span>
      </span>
      Pitchbooth
    </Link>
  );
}
