// SPDX-License-Identifier: MIT
"use client";

import { useState } from "react";

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  const [init, setInit] = useState(false);
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        data-on={on}
        onClick={() => {
          setInit(true);
          onChange(!on);
        }}
        className={`t-toggle relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full p-[3px] ${init ? "is-init" : ""} ${on ? "bg-ink" : "bg-line"}`}
      >
        <span className="t-toggle-thumb block size-[18px] rounded-full bg-white shadow-sm" />
      </button>
      {label}
    </label>
  );
}
