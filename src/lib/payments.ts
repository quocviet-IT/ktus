import type { Payment, Transaction } from "./types";

export type PaymentDirection = "ar" | "ap";

export interface PaymentMethod {
  code: string;
  label: string;
  active: boolean;
  sort: number;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { code: "cash", label: "Cash", active: true, sort: 10 },
  { code: "bank_wire", label: "Bank wire", active: true, sort: 20 },
  { code: "zelle", label: "Zelle", active: true, sort: 30 },
  { code: "check", label: "Check", active: true, sort: 40 },
  { code: "card", label: "Card", active: true, sort: 50 },
];

const LEGACY_AR_FIELDS: Record<string, keyof Transaction> = {
  cash: "arCash",
  bank_wire: "arBankwire",
  zelle: "arZelle",
  check: "arCheck",
};

const LEGACY_AP_FIELDS: Record<string, keyof Transaction> = {
  cash: "apCash",
  bank_wire: "apBankwire",
  zelle: "apZelle",
  check: "apCheck",
};

const g = globalThis as any;
if (!g.__KTUS_PAYMENT_METHODS) g.__KTUS_PAYMENT_METHODS = [...DEFAULT_PAYMENT_METHODS];

export function normalizePaymentCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function listPaymentMethods(): PaymentMethod[] {
  return [...(g.__KTUS_PAYMENT_METHODS as PaymentMethod[])]
    .filter((method) => method.active)
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
}

export function addPaymentMethod(label: string): PaymentMethod {
  const cleanLabel = label.trim();
  const code = normalizePaymentCode(cleanLabel);
  if (!cleanLabel || !code) throw new Error("Payment method label is required");

  const methods = g.__KTUS_PAYMENT_METHODS as PaymentMethod[];
  const existing = methods.find((method) => method.code === code);
  if (existing) {
    existing.label = cleanLabel;
    existing.active = true;
    return existing;
  }

  const next: PaymentMethod = {
    code,
    label: cleanLabel,
    active: true,
    sort: Math.max(0, ...methods.map((method) => method.sort)) + 10,
  };
  methods.push(next);
  return next;
}

function paymentDirection(payment: Payment): PaymentDirection {
  return payment.direction ?? (payment.soTien < 0 ? "ap" : "ar");
}

function legacyAmount(t: Transaction, method: string, direction: PaymentDirection): number {
  const field = direction === "ar" ? LEGACY_AR_FIELDS[method] : LEGACY_AP_FIELDS[method];
  if (!field) return 0;
  return Number(t[field]) || 0;
}

export function amountByPaymentMethod(t: Transaction, method: string, direction: PaymentDirection): number {
  if (t.payments.length) {
    return t.payments
      .filter((payment) => payment.hinhThuc === method && paymentDirection(payment) === direction)
      .reduce((sum, payment) => sum + Math.abs(payment.soTien), 0);
  }
  if (direction === "ap" && method === "cash" && (t.type === "po" || t.type === "return" || t.type === "exchange")) {
    const legacyAp = ["cash", "bank_wire", "zelle", "check"].reduce((sum, item) => sum + legacyAmount(t, item, "ap"), 0);
    if (legacyAp === 0) return t.expense || 0;
  }
  return legacyAmount(t, method, direction);
}

export function paymentTotal(t: Transaction, direction: PaymentDirection): number {
  if (t.payments.length) {
    return t.payments
      .filter((payment) => paymentDirection(payment) === direction)
      .reduce((sum, payment) => sum + Math.abs(payment.soTien), 0);
  }

  if (direction === "ar") {
    return ["cash", "bank_wire", "zelle", "check"].reduce((sum, method) => sum + legacyAmount(t, method, "ar"), 0);
  }

  const legacyAp = ["cash", "bank_wire", "zelle", "check"].reduce((sum, method) => sum + legacyAmount(t, method, "ap"), 0);
  if (legacyAp === 0 && (t.type === "po" || t.type === "return" || t.type === "exchange")) return t.expense || 0;
  return legacyAp;
}

export function currentAmountByPaymentMethod(t: Transaction, method: string, direction: PaymentDirection): number {
  if (!t.payments.length) return amountByPaymentMethod(t, method, direction);

  const rows = t.payments.filter((payment) => payment.hinhThuc === method && paymentDirection(payment) === direction);
  if (direction === "ar") {
    const firstRows = rows.filter((payment) => payment.isDau);
    if (firstRows.length) return firstRows.reduce((sum, payment) => sum + Math.abs(payment.soTien), 0);
  }
  return rows.reduce((sum, payment) => sum + Math.abs(payment.soTien), 0);
}

export function currentPaymentTotal(t: Transaction, direction: PaymentDirection): number {
  if (!t.payments.length) return paymentTotal(t, direction);

  if (direction === "ar") {
    const firstRows = t.payments.filter((payment) => paymentDirection(payment) === "ar" && payment.isDau);
    if (firstRows.length) return firstRows.reduce((sum, payment) => sum + Math.abs(payment.soTien), 0);
  }

  return t.payments
    .filter((payment) => paymentDirection(payment) === direction)
    .reduce((sum, payment) => sum + Math.abs(payment.soTien), 0);
}
