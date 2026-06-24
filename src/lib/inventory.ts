// Dữ liệu tồn kho PC49 — đối chiếu KT ↔ US (② PC49 DASHBOARD)
// Different = Book Inventory (KT) − Available (US)
export interface GoldRow {
  loai: string;        // Description
  dvt: string;         // Unit
  beginning: number;
  sale: number;
  deposit: number;
  po: number;
  bookKT: number;      // Book Inventory (KT)
  availUS: number;     // Available Inventory (US) — nhập tay
  unitPrice: number;   // nhập tay
}

export const INVENTORY: GoldRow[] = [
  { loai: "Grain", dvt: "Gram", beginning: 2048.29, sale: 0, deposit: 0, po: 0, bookKT: 2048.29, availUS: 2110.49, unitPrice: 89.92 },
  { loai: "9999", dvt: "Lượng", beginning: 1, sale: 0, deposit: 0, po: 0, bookKT: 1, availUS: 23, unitPrice: 3900 },
  { loai: "Rong Phung", dvt: "Lượng", beginning: 4, sale: 0, deposit: 0, po: 0, bookKT: 4, availUS: 4, unitPrice: 5290 },
  { loai: "Credit Suisse", dvt: "Oz", beginning: 5, sale: 0, deposit: 0, po: 0, bookKT: 5, availUS: 5, unitPrice: 4520 },
  { loai: "Maple Leaf", dvt: "Oz", beginning: 6, sale: 0, deposit: 0, po: 0, bookKT: 6, availUS: 7.4, unitPrice: 4585 },
];

export const different = (g: GoldRow) => +(g.bookKT - g.availUS).toFixed(2);
