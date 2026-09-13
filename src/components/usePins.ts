"use client";

import { useCallback, useEffect, useState } from "react";

export interface Pin {
  href: string;
  label: string;
}

const PINS_KEY = "afPins";

function loadPins(): Pin[] {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage can throw (private browsing, disabled storage) — pins are a
    // convenience, never worth breaking the page over.
  }
  return [];
}

function savePins(pins: Pin[]) {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch {
    // see loadPins
  }
}

/** Per-browser "pin to top bar" quick-access list, ported from the prototype's loadPins/savePins/togglePin. */
export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    setPins(loadPins());
  }, []);

  const toggle = useCallback((href: string, label: string) => {
    setPins((prev) => {
      const idx = prev.findIndex((p) => p.href === href);
      const next = idx === -1 ? [...prev, { href, label }] : prev.filter((_, i) => i !== idx);
      savePins(next);
      return next;
    });
  }, []);

  const unpinAt = useCallback((index: number) => {
    setPins((prev) => {
      const next = prev.filter((_, i) => i !== index);
      savePins(next);
      return next;
    });
  }, []);

  const isPinned = useCallback((href: string) => pins.some((p) => p.href === href), [pins]);

  return { pins, toggle, unpinAt, isPinned };
}
