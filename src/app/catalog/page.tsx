import PageHeader from "@/components/page-header";
import { listCatalogGroups } from "@/lib/data";
import CatalogManager from "./catalog-manager";

export default async function Catalog() {
  const groups = await listCatalogGroups();
  return (
    <>
      <PageHeader crumb="Kho & danh mục / Danh mục" title="Danh mục dùng chung (Validation List)" />
      <CatalogManager groups={groups} />
    </>
  );
}
