import { create } from "zustand"
import Decimal from "decimal.js"

export interface CartLine {
  id: string
  productId: string
  productName: string
  productSku: string
  quantity: Decimal
  unitPrice: Decimal
  discount: Decimal
  unitType: string
}

export interface Customer {
  id?: string
  name: string
  phone?: string
  taxId?: string
}

export interface Payment {
  method: "CASH" | "CARD" | "QR" | "TRANSFER" | "CREDIT"
}

interface CartStore {
  lines: CartLine[]
  customer: Customer | null
  payment: Payment | null
  globalDiscount: Decimal
  heldSaleId: string | null

  addLine: (line: Omit<CartLine, "id">) => void
  removeLine: (id: string) => void
  updateLineQty: (id: string, qty: Decimal) => void
  incrementLineQty: (id: string, amount: Decimal) => void
  updateLineDiscount: (id: string, discount: Decimal) => void
  setCustomer: (customer: Customer | null) => void
  setPayment: (payment: Payment | null) => void
  setGlobalDiscount: (discount: Decimal) => void
  setHeldSaleId: (id: string | null) => void
  clear: () => void
  getTotalBeforeDiscount: () => Decimal
  getTotalDiscount: () => Decimal
  getTotalAfterDiscount: () => Decimal
}

export const useCartStore = create<CartStore>((set, get) => ({
  lines: [],
  customer: null,
  payment: null,
  globalDiscount: new Decimal(0),
  heldSaleId: null,

  addLine: (line) =>
    set((state) => ({
      lines: [
        ...state.lines,
        {
          ...line,
          id: Math.random().toString(36).substr(2, 9),
          quantity: new Decimal(line.quantity.toString()),
          unitPrice: new Decimal(line.unitPrice.toString()),
          discount: new Decimal(line.discount?.toString() || 0),
        },
      ],
    })),

  removeLine: (id) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.id !== id),
    })),

  updateLineQty: (id, qty) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.id === id ? { ...l, quantity: new Decimal(qty.toString()) } : l
      ),
    })),

  incrementLineQty: (id, amount) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.id === id ? { ...l, quantity: l.quantity.plus(amount) } : l
      ),
    })),

  updateLineDiscount: (id, discount) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.id === id ? { ...l, discount: new Decimal(discount.toString()) } : l
      ),
    })),

  setCustomer: (customer) => set({ customer }),

  setPayment: (payment) => set({ payment }),

  setGlobalDiscount: (discount) =>
    set({ globalDiscount: new Decimal(discount.toString()) }),

  setHeldSaleId: (id) => set({ heldSaleId: id }),

  clear: () =>
    set({
      lines: [],
      customer: null,
      payment: null,
      globalDiscount: new Decimal(0),
      heldSaleId: null,
    }),

  getTotalBeforeDiscount: () => {
    const state = get()
    return state.lines.reduce(
      (sum, line) => sum.plus(line.unitPrice.times(line.quantity)),
      new Decimal(0)
    )
  },

  getTotalDiscount: () => {
    const state = get()
    const lineDiscounts = state.lines.reduce(
      (sum, line) => sum.plus(line.discount),
      new Decimal(0)
    )
    const subtotal = get().getTotalBeforeDiscount()
    const globalDiscountAmount = subtotal.times(state.globalDiscount.div(100))
    return lineDiscounts.plus(globalDiscountAmount)
  },

  getTotalAfterDiscount: () => {
    const state = get()
    return state.getTotalBeforeDiscount().minus(state.getTotalDiscount())
  },
}))
