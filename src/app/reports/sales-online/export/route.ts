import { NextResponse } from "next/server";
import { listTransactions } from "@/lib/data";
import { buildSalesOnlineTable, renderExcelHtml } from "@/lib/report-export";

export async function GET() {
  const transactions = (await listTransactions()).filter((t) => t.saleOnline);
  const table = buildSalesOnlineTable(transactions);

  return new NextResponse(renderExcelHtml(table), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
