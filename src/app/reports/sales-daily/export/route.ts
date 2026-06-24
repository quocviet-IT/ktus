import { NextResponse } from "next/server";
import { listTransactions } from "@/lib/data";
import { buildSalesDailyTable, renderExcelHtml } from "@/lib/report-export";
import type { CompanyCode } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company: CompanyCode = searchParams.get("company") === "Trans" ? "Trans" : "PC49";
  const date = searchParams.get("date") || "all";
  const all = await listTransactions({ company });
  const transactions = date === "all" ? all : all.filter((t) => t.ngay === date);
  const table = buildSalesDailyTable({ transactions, company, date });

  return new NextResponse(renderExcelHtml(table), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
