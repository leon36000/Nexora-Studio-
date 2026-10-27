'use client'

import { useEffect, useRef } from 'react'

/**
 * Hands the form what was typed into its fields before React took control of them.
 *
 * A controlled field keeps its value in state, and the sign-in page ships about a megabyte of JavaScript: on a slow
 * phone a person (or the browser's autofill, Face ID password fill) can fill the fields before hydration finishes.
 * The text stays on screen but the state is empty, so the submit button, which waits for both, stays disabled
 * until another keystroke. Called once after hydration, it reads each field by id and passes a non-empty value to
 * its setter.
 */
export function usePrehydrationValues(setters: Record<string, (value: string) => void>): void {
  const settersRef = useRef(setters)
  useEffect(() => {
    for (const [id, set] of Object.entries(settersRef.current)) {
      const field = document.getElementById(id)
      if (field instanceof HTMLInputElement && field.value) set(field.value)
    }
  }, [])
}
