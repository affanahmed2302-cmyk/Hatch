"use client";
import { useEffect } from "react";
import { applyThemeVars, getPreviewThemeId } from "@/lib/themes";

/** Applies localStorage preview theme on load. Only affects this browser. */
export default function ThemePreview() {
  useEffect(() => {
    applyThemeVars(getPreviewThemeId());
    const onChange = () => applyThemeVars(getPreviewThemeId());
    window.addEventListener("hatch-theme-preview", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("hatch-theme-preview", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return null;
}
