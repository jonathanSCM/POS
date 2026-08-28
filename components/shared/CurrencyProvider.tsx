"use client"

import { createContext, useContext } from "react"

const CurrencyContext = createContext<string>("$")

export function CurrencyProvider({
  symbol,
  children,
}: {
  symbol: string
  children: React.ReactNode
}) {
  return (
    <CurrencyContext.Provider value={symbol}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrencySymbol(): string {
  return useContext(CurrencyContext)
}
