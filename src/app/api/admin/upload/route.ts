import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireTenantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_IMAGES_PER_TENANT,
  MAX_UPLOAD_BYTES,
  isAllowedMime,
  processProductImage,
} from "@/lib/images";
import { menuTag } from "@/lib/menu";

export const runtime = "nodejs";

/**
 * Ürün görseli yükleme — multipart/form-data: { productId, file }
 * Yetki: oturum + RLS (ürün, kullanıcının tenant'ına ait olmalı).
 * Client SERİ kuyruğa uyar (tek dosya/istek) — LVE dostu.
 */
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const productId = form.get("productId");
  const file = form.get("file");
  if (typeof productId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "productId ve file zorunlu" }, { status: 400 });
  }
  if (!isAllowedMime(file.type)) {
    return NextResponse.json({ error: "Yalnızca JPG, PNG veya WebP yükleyin" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Dosya 10MB sınırını aşıyor" }, { status: 413 });
  }

  const supabase = await createClient();

  // Ürün gerçekten bu tenant'ın mı? (RLS zaten korur; açık kontrol = net hata mesajı)
  const { data: product } = await supabase
    .from("products")
    .select("id, tenant_id")
    .eq("id", productId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  // Tenant görsel kotası
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenant.id);
  if ((count ?? 0) >= MAX_IMAGES_PER_TENANT) {
    return NextResponse.json(
      { error: `Görsel kotası dolu (${MAX_IMAGES_PER_TENANT})` },
      { status: 409 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processProductImage(buffer, ctx.tenant.id);

    // Sona ekle
    const { data: maxRow } = await supabase
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: row, error } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        tenant_id: ctx.tenant.id,
        file_stem: processed.fileStem,
        width: processed.width,
        height: processed.height,
        blur_data: processed.blurData,
        sort_order: (maxRow?.sort_order ?? 0) + 10,
      })
      .select("id, file_stem, width, height, blur_data, sort_order")
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Kayıt oluşturulamadı" }, { status: 500 });
    }

    revalidateTag(menuTag(ctx.tenant.slug), { expire: 0 });
    return NextResponse.json({ image: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Görsel işlenemedi";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
