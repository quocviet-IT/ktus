import { NextResponse } from "next/server";
import { listPaymentMethods, listTransactions } from "@/lib/data";
import { buildSalesDailyTable, renderExcelHtml } from "@/lib/report-export";
import type { CompanyCode } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company: CompanyCode = searchParams.get("company") === "Trans" ? "Trans" : "PC49";
  const date = searchParams.get("date") || "all";
  const [all, paymentMethods] = await Promise.all([listTransactions({ company }), listPaymentMethods()]);
  const transactions = date === "all" ? all : all.filter((t) => t.ngay === date);
  const table = buildSalesDailyTable({ transactions, company, date, paymentMethods });

  return new NextResponse(renderExcelHtml(table), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
