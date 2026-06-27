import PageHeader from "@/components/page-header";
import { listCatalogGroupsManage } from "@/lib/data";
import CatalogManager from "./catalog-manager";

export default async function Catalog() {
  const groups = await listCatalogGroupsManage();
  return (
    <>
      <PageHeader crumb="Kho & danh mục / Danh mục" title="Danh mục dùng chung (Validation List)" />
      <CatalogManager groups={groups} />
    </>
  );
}
