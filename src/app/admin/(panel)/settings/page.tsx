import { requireTenantContext } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Ayarlar — QR Menü" };

export default async function SettingsPage() {
  const { tenant } = await requireTenantContext();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <SettingsForm tenant={tenant} />
    </div>
  );
}
