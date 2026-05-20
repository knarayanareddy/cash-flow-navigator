import { useEffect } from "react";

interface Shortcuts {
  onSave?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onSave, onReset, onExport, onEscape }: Shortcuts) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const tgt = e.target as HTMLElement | null;
      const inField =
        tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable);

      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s" && onSave) {
        e.preventDefault();
        onSave();
      } else if (key === "r" && onReset && !inField) {
        e.preventDefault();
        onReset();
      } else if (key === "e" && onExport) {
        e.preventDefault();
        onExport();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, onReset, onExport, onEscape]);
}
