import { useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useT() {
  const language = useAppStore(s => s.language)
  return useCallback((en, fr) => language === 'en' ? en : fr, [language])
}
