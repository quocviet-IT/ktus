import { listPaymentMethods } from "@/lib/data";
import NhapRCForm from "./rc-new-form";

export default async function NhapRC() {
  const paymentMethods = await listPaymentMethods();
  return <NhapRCForm paymentMethods={paymentMethods} />;
}
