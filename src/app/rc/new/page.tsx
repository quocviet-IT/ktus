import { listCatalogGroups, listPaymentMethods } from "@/lib/data";
import NhapRCForm from "./rc-new-form";

export default async function NhapRC() {
  const [paymentMethods, catalogGroups] = await Promise.all([listPaymentMethods(), listCatalogGroups()]);
  const labels = (key: string) => catalogGroups.find((group) => group.key === key)?.items.map((item) => item.label) ?? [];
  return (
    <NhapRCForm
      paymentMethods={paymentMethods}
      catalogOptions={{
        sources: labels("source"),
        sales: labels("sales_counter"),
        salesOnline: labels("sales_online"),
        bellCodes: labels("bell_code"),
      }}
    />
  );
}
