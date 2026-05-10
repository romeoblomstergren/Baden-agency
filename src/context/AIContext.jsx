import { createContext, useContext, useState, useCallback } from 'react'

const AICtx = createContext({})

export function AIProvider({ children }) {
  const [pageContext, setPageContext] = useState({})

  const setContext = useCallback((ctx) => {
    setPageContext(prev => ({ ...prev, ...ctx }))
  }, [])

  return (
    <AICtx.Provider value={{ pageContext, setContext }}>
      {children}
    </AICtx.Provider>
  )
}

export function useAIContext() {
  return useContext(AICtx)
}
