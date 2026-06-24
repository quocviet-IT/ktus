---
name: ktus-ui-ux
description: Use when building or editing ANY UI for the KTUS app (Next.js + Tailwind + shadcn/ui). Defines design tokens, layout, components, list-first data display, form patterns, status colors, and Vietnamese copy. Read before creating screens M01–M09.
---

# KTUS — UI/UX Skill

Hướng dẫn thiết kế giao diện cho hệ thống **KTUS — Theo dõi RC** (web app thay Excel/Google Sheets). Mục tiêu: **quen mắt dân kế toán, gọn, ít thao tác, đúng nghiệp vụ**. Stack: Next.js (App Router) + TypeScript + Tailwind CSS + **shadcn/ui** (Radix) + react-hook-form + zod + TanStack Table.

> Tài liệu liên quan: `BRD-QuyTrinh-RC-KTUS.md` (FR/BR), `user-stories.md` (M01–M09), `mockup.html` (wireframe gốc), `schema.sql`.

---

## 1. Nguyên tắc thiết kế (theo thứ tự ưu tiên)
1. **Ít thao tác, nhập nhanh.** Người dùng nhập RC mỗi ngày — form phải nhanh, phím Tab mượt, ít click. Đừng bắt cuộn dài.
2. **Danh sách dạng dòng (list-first), KHÔNG lưới Excel.** Màn duyệt RC/đơn dùng **list dòng gọn** (xem §4). Chỉ dùng bảng cho **báo cáo phải khớp file Excel**.
3. **Nhập tay vs tự tính phải rõ.** Cột/ô do hệ thống tính (CONDITION, tổng cộng) hiển thị **chỉ đọc, có nhãn ƒ**; ô nhập tay rõ ràng (xem §6).
4. **Trạng thái nhìn là hiểu.** Badge màu nhất quán (xem §5). Đơn Cancel vẫn hiện (BR-10) — gạch mờ + badge, không ẩn.
5. **Quen mắt kế toán.** Giữ thuật ngữ &amp; tên cột như file gốc (Receipt, Deposit, PO, RC#, Source…). Tiền tệ USD, canh phải, font mono cho số.
6. **Responsive, nhưng tối ưu desktop.** Người dùng chính làm trên máy tính; vẫn không vỡ trên tablet/mobile.

---

## 2. Bộ nhận diện (design tokens)
Lấy từ thế giới nghiệp vụ: **sổ kế toán kẻ xanh + vàng đồng (kinh doanh vàng) + mực**. Khai báo trong `tailwind.config.ts` / CSS variables.

```css
:root{
  --ground:#EEF2EC;   /* nền app (xanh nhạt giấy sổ) */
  --card:#FFFFFF;
  --sidebar:#16201B;  /* mực đậm */
  --text:#1B2620;
  --muted:#637067;
  --line:#D8E0D4;     /* hairline */
  --accent:#A87B2E;   /* vàng đồng (brass) - thương hiệu vàng */
  --accent-soft:#F3E9D3;
  --green:#2E5D45;    /* xanh sổ cái (ledger) */
  --band:#EFF4EB;     /* dải xen kẽ */
  --red:#BC4632;      /* cảnh báo / thiếu nguồn */
  --red-soft:#F8E5E1;
  --ok:#2E7D55;       /* hoàn tất / khớp */
  --ok-soft:#E2F0E7;
  --info-soft:#E7EDF6;
}
```

Tailwind theme (gợi ý):
```ts
colors: {
  ground:'#EEF2EC', ink:'#16201B', accent:'#A87B2E', brand:'#2E5D45',
  ok:'#2E7D55', danger:'#BC4632', line:'#D8E0D4', muted:'#637067'
}
```

### Typography
| Vai trò | Font | Dùng cho |
|---|---|---|
| Display/heading | serif (vd **Source Serif 4** / "Cambria") | tiêu đề trang, panel |
| Body/UI | sans (vd **Inter** / "Segoe UI") | nội dung, form, nút |
| Mono/data | **JetBrains Mono** / "Consolas" | số tiền, mã RC, mã định danh, nhãn cột |

Quy tắc: **mọi số &amp; mã dùng mono**, canh phải cho số tiền. Heading dùng serif để tạo cảm giác "tài liệu/sổ".

---

## 3. Khung bố cục (layout)
- **Sidebar trái** (nền `--sidebar`, ~248px): logo + điều hướng nhóm theo Quy trình. Active item có vạch vàng `--accent`.
- **Topbar**: tên trang, bộ lọc nhanh (Công ty, Ngày), giá vàng SPOT (nếu cần), avatar.
- **Vùng nội dung**: các panel bo góc (`rounded-xl`), viền `--line`, nền `--card`.
- Khoảng cách: dùng spacing 4/8px grid; panel padding ~16px; gap giữa panel ~13px.

Điều hướng (khớp M01–M09):
```
Bảng điều khiển · Tạo/Sửa RC · Sổ giao dịch RC · Chi tiết đơn
Báo cáo: Bán hàng ngày · Sales Online · Rung chuông
RC thiếu nguồn · Danh mục
```

---

## 4. Danh sách RC/đơn — DẠNG DÒNG (không bảng)
**Đây là quyết định đã chốt:** màn duyệt RC/đơn (Sổ giao dịch, RC mới ở Dashboard) hiển thị **list dòng gọn**, KHÔNG lưới kẻ ô.

Mỗi dòng gồm 4 vùng:
```
[Mã RC]   [Mô tả + dòng phụ (cty·loại·khách·nguồn·sale)]   [Số tiền + hình thức]   [Badge trạng thái]
```
- Mã RC: mono, màu `--green`, đậm.
- Mô tả: 1 dòng, cắt `…` nếu dài; dòng phụ màu `--muted`, nhỏ.
- Số tiền: mono, canh phải, đậm; PO hiển thị số âm màu đỏ.
- Trạng thái: badge (xem §5). Đơn Cancel: chữ hơi mờ + badge Cancel.
- Hover đổi nền `--accent-soft`. Click mở **Chi tiết đơn (M04)**.
- Có **🔔 rung chuông** và **🔗 liên kết cọc↔pickup** ngay trên dòng khi áp dụng.

> Chỉ dùng **bảng (TanStack Table)** cho **báo cáo phải giống Excel** (Bán hàng ngày, Sales Online): giữ đúng tên &amp; thứ tự cột file gốc, có nút **Xuất Excel** (SheetJS).

---

## 5. Màu trạng thái &amp; badge (nhất quán toàn app)
| Trạng thái / nhãn | Màu | Ý nghĩa |
|---|---|---|
| Hoàn tất / Khớp | `--ok` trên `--ok-soft` | xong |
| Đặt cọc / Đang order / Chờ giao | xanh dương nhạt `--info-soft` | đang xử lý |
| Cancel | `--muted` viền, chữ mờ | huỷ — vẫn hiển thị (BR-10) |
| Return / Exchange | cam/đỏ nhạt | hàng trả/đổi |
| Thiếu nguồn | `--red` trên `--red-soft` | cần US bổ sung |
| Rung chuông 🔔 | `--accent` | đơn đạt mốc |
| Nghi trùng | vàng cảnh báo | cần kiểm tra |

Badge: bo tròn (`rounded-full`), chữ mono nhỏ (10–11px), không viền dày.

---

## 6. Form &amp; nhập liệu (react-hook-form + zod)
- **Nhập 2 bước trên cùng 1 đơn:** Bước 1 (theo scan US) → Bước 2 (theo JM). KHÔNG tạo 2 bản ghi. Dùng tab/section "1. Theo scan US" và "2. Theo JM" trong cùng form chi tiết.
- **Nhiều dòng sản phẩm:** lặp dòng nhập (mô tả/SL/đơn giá), nút "＋ Thêm dòng"; **khi lưu gộp &amp; tự tính tổng** (BR-07). Hiển thị tổng động ở chân.
- **Cột tự tính (ƒ):** Return/PO · Receipt · Deposit · TỔNG CỘNG — hiển thị **chỉ đọc**, nền xám nhạt, nhãn nhỏ `ƒ tự tính`. KHÔNG cho gõ.
- **Ô nhập tay (✎):** viền bình thường; trường bắt buộc đánh dấu `*`.
- **Thanh toán nhiều đợt (BR-06):** ô "đợt đầu" + danh sách chú thích "ngày – số tiền – hình thức"; hiển thị **tổng đã thu / còn thiếu** tự cộng.
- **Validation (zod):** trường bắt buộc (Ngày, Công ty, Type, Khách, Số tiền); số ≥ 0; trùng RC# JM → cảnh báo (BR-05, 9000=cọc/1000=bán·pickup); pickup phải có Old Receipt# tồn tại.
- **Dropdown lấy từ Danh mục** (Type, Source, Sales, Account) — không hard-code.
- Lỗi: hiện inline dưới ô, ngắn gọn, nói cách sửa (vd "Số RC này đã tồn tại").

---

## 7. Component (shadcn/ui)
| Nhu cầu | Component |
|---|---|
| Bố cục panel | `Card` |
| Form | `Form` + react-hook-form, `Input`, `Select`, `DatePicker`, `Textarea` |
| Danh sách dòng | tự dựng `RcRow` (div flex) — không dùng `Table` cho list |
| Báo cáo Excel | `Table` (TanStack Table) |
| Badge trạng thái | `Badge` (biến thể theo §5) |
| Thông báo | `Toast` (vd "Đã lưu RC #… ✓") |
| Hộp thoại | `Dialog` / `AlertDialog` (xác nhận Cancel, xoá) |
| Bộ lọc | `Select`, `Tabs` (chọn ngày báo cáo), `Command` (tìm nhanh) |

Toast/nhãn dùng **văn phong khẳng định**: nút "Lưu" → toast "Đã lưu". Hành động giữ nguyên tên xuyên suốt.

---

## 8. Văn phong tiếng Việt (copy)
- **Tiếng Việt, sentence case**, ngắn gọn, đúng thuật ngữ kế toán.
- Gọi theo cái người dùng điều khiển, không theo kỹ thuật ("Nguồn khách" chứ không "source_1").
- Nút nói rõ hành động: "Lưu &amp; đẩy vào sổ", "Gửi US", "Cập nhật JM".
- Trạng thái rỗng là lời mời: "Chưa có RC hôm nay — bấm ＋ Nhập RC".
- Lỗi: nói cái sai + cách sửa, không xin lỗi chung chung.
- Giữ song ngữ ở **tên cột báo cáo** (đúng Excel): TYPE, DECRIPTION, RECEIPT, DEPOSIT… (kể cả lỗi chính tả gốc "DISCRIPTION/DECRIPTION" — giữ để khớp file).

---

## 9. Khả năng tiếp cận &amp; chất lượng
- Tương phản đạt WCAG AA; focus thấy rõ (`focus-visible` viền `--accent`).
- Bấm được bằng bàn phím; nhãn `<label>` gắn input.
- `prefers-reduced-motion`: tắt animation.
- Số tiền/ngày định dạng nhất quán (USD, dd/mm); dùng `date-fns`.
- Loading/skeleton cho danh sách &amp; báo cáo.

---

## 10. Do / Don't
**Do**
- List dòng gọn cho duyệt RC; bảng chỉ cho báo cáo Excel.
- Ô tự tính để chỉ đọc + nhãn ƒ.
- Badge trạng thái nhất quán; Cancel vẫn hiển thị.
- Số &amp; mã dùng mono, canh phải.

**Don't**
- Đừng bê nguyên lưới Excel dày đặc vào màn nhập/duyệt.
- Đừng cho sửa cột tự tính.
- Đừng ẩn đơn Cancel khỏi danh sách theo ngày.
- Đừng hard-code danh mục; đừng đổi tên cột báo cáo khác Excel.
- Đừng tạo 2 bản ghi cho 1 đơn khi nhập 2 bước.

---

## 11. Checklist khi dựng 1 màn
- [ ] Bám wireframe `mockup.html` (M0x tương ứng) + tokens §2.
- [ ] List cho duyệt / Table cho báo cáo Excel — đúng §4.
- [ ] Badge trạng thái theo §5.
- [ ] Ô ƒ chỉ đọc, ô ✎ nhập tay rõ — §6.
- [ ] Validation zod + thông báo lỗi tiếng Việt.
- [ ] Responsive, focus, reduced-motion.
- [ ] Copy tiếng Việt theo §8.
