"use client"

export default function ToggleSwitch({
  checked,
  onChange,
  disabled,
  size = "md",
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  size?: "sm" | "md"
}) {
  const dims = size === "sm" ? { track: "h-5 w-9", knob: "h-3 w-3", on: "translate-x-4", off: "translate-x-1" } : { track: "h-6 w-11", knob: "h-4 w-4", on: "translate-x-5", off: "translate-x-1" }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${dims.track} shrink-0 items-center rounded-full transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-primary-2 shadow-[0_0_0_3px_var(--color-ring)]" : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block ${dims.knob} transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
          checked ? dims.on : dims.off
        }`}
      />
    </button>
  )
}
