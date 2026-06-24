# BRD — Quy trình cập nhật theo dõi RC mỗi ngày

**HPUS-KT210 · Business Requirements Document**
Phân hệ 1 (MVP) — dự án số hóa nghiệp vụ Kế toán US: từ Excel/Google Sheets sang Web app + Database.

| | |
|---|---|
| **Mã dự án** | HPUS-KTUS-2026 |
| **Phiên bản** | 0.3 (cập nhật theo phản hồi NV) |
| **Ngày lập** | 24/06/2026 |
| **Người lập (BA)** | intern1@ctyhp.vn |
| **Trạng thái** | Nháp — chờ xác nhận nghiệp vụ |
| **Người duyệt** | ____________________ |

> ### ✅ Quyết định đã chốt với người dùng (24/06/2026)
> - **Hiện chỉ 1 người dùng** (KT US) — chưa cần phân quyền nhiều vai trò.
> - **Nhập 2 bước trên cùng 1 bản ghi:** (1) nhập theo **scan RC từ US** → (2) nhập tiếp theo **JM**. Cùng 1 đơn, không tách file.
> - **1 RC có thể nhiều sản phẩm:** nhập từng dòng riêng, **khi lưu hệ thống gộp lại & tự tính tổng**.
> - **1 RC có thể nhiều sales / pickup nhiều lần.**
> - **Mã JM:** `9000…` = đơn **đặt cọc**; `1000…` = đơn **bán hàng / pickup**.
> - **Thanh toán nhiều lần:** ghi nhận đợt đầu; các đợt sau ghi vào **cột chú thích**.
> - **Trạng thái & lọc theo ngày:** đơn bị Cancel vẫn hiển thị ở ngày gốc với trạng thái Cancel (không biến mất).
> - **Chưa** đính kèm file scan (chỉ nhập liệu từ scan). Báo cáo & cột dữ liệu **phải giống file Excel hiện tại**.

---

## Mục lục
1. Mục đích & phạm vi tài liệu
2. Thuật ngữ & định nghĩa
3. Bối cảnh & vấn đề
4. Mục tiêu & chỉ số (KPI)
5. Phạm vi (trong/ngoài)
6. Người dùng & phân quyền
7. Hiện trạng AS-IS (quy trình từng bước)
8. Giải pháp TO-BE (quy trình mới)
9. Use case chi tiết
10. Yêu cầu chức năng (FR)
11. Danh sách màn hình
12. Đặc tả báo cáo
13. Quy tắc nghiệp vụ (BR)
14. Sơ đồ trạng thái (workflow)
15. Quy tắc kiểm tra & xử lý lỗi
16. Từ điển dữ liệu (Data Dictionary)
17. Tích hợp hệ thống
18. Di trú dữ liệu
19. Yêu cầu phi chức năng (NFR)
20. Giả định & phụ thuộc
21. Rủi ro & giảm thiểu
22. Câu hỏi mở cần chốt
23. Nghiệm thu & bước tiếp theo

---

## 1. Mục đích & phạm vi tài liệu
Tài liệu đặc tả yêu cầu nghiệp vụ cho phân hệ đầu tiên: **Quy trình cập nhật theo dõi RC (phiếu thu/giao dịch) mỗi ngày** — từ lúc nhận chứng từ đến khi lên các báo cáo. Là cơ sở thống nhất với người dùng và đầu vào cho thiết kế CSDL, màn hình & phát triển. Đối tượng đọc: người dùng nghiệp vụ (KTUS), quản lý, BA, đội phát triển.

## 2. Thuật ngữ & định nghĩa
| Thuật ngữ | Ý nghĩa |
|---|---|
| RC | Receipt — phiếu thu/giao dịch (bán, mua vào, đặt cọc, pickup…) |
| JM / VVS | Phần mềm bán hàng sinh số RC chính thức & sales receipt |
| SO# | Sales Order number (vd 25.8903) |
| Root Appt ID | Mã lịch hẹn gốc (vd AP-20250221-001) |
| GIA# | Mã giấy giám định kim cương |
| Source | Nguồn khách: WI, TEL, FB, IG-APPT, RF-APPT, RC, VIP… |
| CONDITION | Nhóm cột Return/PO · Receipt · Deposit (cột L,M,N) — tự phân loại theo Type |
| PO | Purchase Order — mua vào / trade-in |
| Rung chuông | Đơn đạt mốc thưởng; mã RC1/RC2/RC3 (quầy), SBO1 (online) |
| A/R · A/P | Phải thu (Receivable) · Phải trả (Payable) |
| USBC101 | File trung tâm nhập tay hiện tại — nhật ký giao dịch & sao kê |
| IMPORTRANGE | Hàm Google Sheets nối dữ liệu giữa các file (hay đứt link) |

## 3. Bối cảnh & vấn đề
KTUS hiện vận hành trên ~30 file Excel/Google Sheets nối bằng IMPORTRANGE. Vấn đề chính:
- **Nhập nhiều lần:** một giao dịch nhập/đối chiếu ở nhiều file (USBC101, RC JM; PC49 còn BC 201/Dashboard).
- **Đứt link:** IMPORTRANGE lỗi `#REF!`, file nặng, giới hạn dòng.
- **Đối chiếu tay 3 nguồn:** scan RC (US), phần mềm JM, sao kê ngân hàng.
- **Đơn rải nhiều file:** một đơn cọc→pickup có thể kéo dài ~1 năm, hàng chục đợt thanh toán.
- **Thiếu kiểm soát:** không phân quyền, không nhật ký → dễ ghi đè, khó truy vết.

## 4. Mục tiêu & chỉ số (KPI)
| Mục tiêu | KPI (điền mốc với người dùng) |
|---|---|
| Gộp điểm nhập | 1 giao dịch: nhiều file → **1 đơn duy nhất** (dù nhập 2 bước) |
| Nhanh hơn | Thời gian nhập 1 RC giảm ___% ; báo cáo ngày realtime |
| Hết lỗi dữ liệu | Sự cố đứt link/#REF! → 0/tháng |
| Sạch nguồn KH | RC thiếu nguồn quá hạn giảm ___% |
| Kiểm soát | 100% thao tác sửa có nhật ký |

## 5. Phạm vi
**Trong phạm vi (Quy trình I):**
- Nhập RC tập trung (2 bước: scan US → JM); tự sinh Báo cáo bán hàng ngày (PC49 & Trans).
- Sổ RC JM (nhập/bổ sung số RC, nguồn, sales).
- Báo cáo Sales Online; Rung chuông; RC thiếu nguồn (kèm vòng xử lý).
- Liên kết cọc↔pickup; thanh toán nhiều đợt; danh mục; nhật ký.

**Ngoài phạm vi (giai đoạn sau):**
- Quy trình II (vàng/tồn kho, PC49 Dashboard, BC 201, đối chiếu KT↔US).
- AP/công nợ, NXT, Scrap, Tổng tài sản, Bonus, Chấm công.
- Tích hợp tự động JM & QuickBooks; OCR scan; đính kèm file scan.

## 6. Người dùng & phân quyền
**Giai đoạn 1 chỉ có 1 người dùng** — Kế toán US (KT) — thực hiện toàn bộ thao tác. Vì vậy **chưa cần phân quyền nhiều vai trò**; chỉ cần đăng nhập an toàn + nhật ký chỉnh sửa.

| Người dùng | Phạm vi |
|---|---|
| Kế toán US (KT) — duy nhất | Nhập/sửa RC (từ scan US & từ JM), nhập số RC/nguồn/sales, xử lý RC thiếu nguồn, quản lý danh mục, xem & xuất báo cáo |

Bên liên quan gián tiếp: **Team US** (gửi scan RC, cung cấp nguồn — qua KT, không đăng nhập), **Quản lý** (xem báo cáo khi cần). CSDL vẫn tách bảng vai trò để **mở rộng đa người dùng về sau**.

## 7. Hiện trạng AS-IS (quy trình từng bước)
```
B1. Team US bán hàng → gửi scan RC (PDF) về VN.
B2. KT nhập tay vào USBC101 (sheet công ty): ngày, type, khách, SKU, tiền A/R… (cột L,M,N tự tính).
B3. Dữ liệu tự chạy (IMPORTRANGE) sang PC49 / Trans Sales Daily Report theo ngày.
B4. KT mở phần mềm JM → nhập số RC, nguồn, sales vào RC JM (PC49 & Trans).
B5. RC JM tự lọc sang: Sales Online ; Rung chuông ; RC thiếu nguồn.
B6. RC thiếu nguồn → gửi US → US bổ sung → KT cập nhật lại JM & tick.
```

### 7.1 File & vai trò
| File | Vai trò | Tính chất |
|---|---|---|
| USBC101 – Account Balance | Nhật ký giao dịch & sao kê 6 công ty | Nhập tay (trừ L,M,N) |
| PC49 / Trans Sales Daily | Báo cáo mua/bán theo ngày | Tự chạy (IMPORTRANGE) |
| PC49 / TRANS RC JM | Sổ số RC, nguồn, sales | Tự kéo chứng từ + nhập tay JM |
| BC Sales Online | Đơn online theo tháng | Tự lọc |
| BC Rung chuông | Đơn đạt mốc + check trùng | Tự lọc |
| Thống kê RC thiếu nguồn | RC chưa có nguồn | Tự lọc + nhập bổ sung |

**3 nguồn dữ liệu:** Scan RC (US) · Phần mềm JM · Sao kê ngân hàng — hiện khớp bằng tay.

> **Ví dụ đơn Travis (~$5,200):** 2 chứng từ (RC viết tay Hung Phat + phiếu VVS/JM), nhiều mã (SO# 25.8903, Appt ID AP-20250221-001, GIA #627473694), 2 dòng hàng (kim cương + ổ nhẫn), ~9 đợt thanh toán từ 02/2025→01/2026, có lệch tiền giữa 2 chứng từ ($5,100/$5,125/$5,200). Minh chứng cho mô hình Đơn–Dòng hàng–Thanh toán nhiều đợt.

## 8. Giải pháp TO-BE (quy trình mới)
```
B1. Bước 1 — nhập theo scan RC (từ US): KT tạo 1 đơn, nhập từng dòng sản phẩm (1 RC có thể nhiều dòng).
B2. Khi lưu: hệ thống gộp các dòng & tự tính tổng, tự phân loại CONDITION (BR-01).
B3. Bước 2 — nhập theo JM: KT mở lại đúng đơn đó, bổ sung số RC JM, nguồn, sales (cùng 1 bản ghi).
B4. Báo cáo bán hàng ngày, Sales Online, Rung chuông tự sinh realtime.
B5. RC thiếu nguồn vào hàng đợi xử lý có trạng thái; KT cập nhật sau khi US cung cấp.
B6. Thanh toán nhiều lần: ghi nhận đợt đầu; các đợt sau ghi vào cột chú thích. Mọi thay đổi ghi nhật ký.
```
Khác biệt cốt lõi: **1 CSDL tập trung** (hết đứt link), **1 đơn = 1 bản ghi** (nhập 2 bước scan US → JM), hỗ trợ **nhiều dòng hàng / nhiều sales / nhiều lần pickup**, **tự gộp & tính tổng**, **tự đối chiếu/cảnh báo**, có **nhật ký**.

## 9. Use case chi tiết

**UC-01 · Nhập RC bán hàng (2 bước: scan US → JM)**
Actor: KT US. Tiền đề: có scan RC từ US.
- *Bước 1 (theo scan US):* "Nhập RC" → chọn Công ty, Type, nhập Khách → nhập **từng dòng sản phẩm** (mô tả, SKU, SL, đơn giá) → nhập Số tiền + Hình thức TT → Lưu.
- *Hệ thống khi lưu:* **gộp dòng & tự tính tổng**; tự xếp tiền vào Receipt/Deposit/Return-PO (BR-01); hiển thị ở Sổ giao dịch & Sales Daily.
- *Bước 2 (theo JM):* mở lại đúng đơn → nhập số RC JM, Source, Sale → Lưu.
- *Ngoại lệ:* thiếu trường bắt buộc → báo lỗi; trùng số RC JM → cảnh báo; để trống Source → vào danh sách RC thiếu nguồn.

**UC-02 · Đơn đặt cọc & theo dõi nhiều đợt**
- Tạo đơn Type=Deposit (mã JM `9000…`) → nhập (các) dòng hàng → **ghi nhận đợt cọc đầu** → các lần sau **ghi vào cột chú thích** (ngày–số tiền–hình thức).
- Hệ thống cộng dồn số đã thu; hiển thị còn thiếu; đủ tiền → cho phép pickup.

**UC-03 · Pickup đơn đã cọc**
- Tạo RC Type=Pick up → nhập **Old Receipt#** của đơn cọc → hệ thống tự nối, lấy Deposit Date, hiển thị số đã cọc → thu phần còn lại → đóng đơn (Hoàn tất). *(1 đơn cọc có thể pickup nhiều lần.)*

**UC-04 · Cập nhật số RC JM / nguồn / sales (nhập sau)**
- Mở RC đã có → nhập số RC JM, Source 1/2, Sale (1/2/3) + %, Sale Online → Lưu. Có Source → gỡ khỏi danh sách thiếu nguồn.

**UC-05 · Xử lý RC thiếu nguồn (vòng US)**
- RC thiếu nguồn → KT "Gửi US" → US "Đã bổ sung" (điền nguồn + lý do) → KT "Cập nhật JM" + tick → Hoàn tất, RC rời danh sách.

**UC-06 · Xem báo cáo**
- Chọn báo cáo (Bán hàng ngày / Online / Rung chuông) → lọc theo công ty/ngày/kỳ → xem realtime → xuất Excel/PDF.

## 10. Yêu cầu chức năng (FR)
Ưu tiên: **M** Must · **S** Should · **C** Could · **W** Won't (GĐ1). `[cần chốt]` = chờ xác nhận.

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-RC-01 | Nhập 1 RC: Ngày, Công ty, Type, SKU, Diễn giải, Khách, Liên hệ, Số tiền, Hình thức TT. | M |
| FR-RC-02 | Tự phân loại Return/PO · Receipt · Deposit theo Type (BR-01) — không nhập tay. | M |
| FR-RC-03 | Nhập 1 đơn → tự hiện ở Sổ RC JM, Sales Daily & báo cáo phụ thuộc. | M |
| FR-RC-04 | Lưu nhiều mã: RC JM, SO#, Appt ID, GIA#. | M |
| FR-RC-05 | **Nhiều dòng sản phẩm trên 1 RC:** nhập từng dòng riêng; khi lưu **gộp lại & tự tính tổng**. | M |
| FR-RC-06 | **Nhập 2 bước trên cùng 1 đơn:** (1) theo scan US, (2) theo JM — không tách bản ghi. | M |
| FR-RC-07 | **Thanh toán nhiều lần:** ghi đợt đầu; các đợt sau ghi vào **cột chú thích**; hệ thống cộng dồn. | M |
| FR-RC-08 | Cảnh báo trùng số RC JM; số JM theo quy tắc 9000=cọc / 1000=bán·pickup (BR-05). | M |
| FR-RC-09 | Đính kèm file scan RC — **chưa làm ở GĐ1**. | W |
| FR-SD-01 | Báo cáo bán hàng ngày tự tổng hợp theo ngày/công ty. | M |
| FR-SD-02 | TỔNG CỘNG = Receipt + Deposit − PO; tách Cash/Bankwire/Zelle/Check. | M |
| FR-SD-03 | Chọn ngày/kỳ; xuất Excel/PDF. `[mẫu]` | S |
| FR-JM-01 | Tự kéo chứng từ; nhập sau số RC JM/nguồn/sales/%/online. | M |
| FR-JM-02 | Liên kết pickup↔cọc qua Old Receipt#; tự lấy Deposit Date; **1 cọc pickup nhiều lần**. | M |
| FR-JM-03 | Theo dõi trạng thái đơn (gồm **Cancel**); đơn Cancel vẫn hiển thị ở ngày gốc khi lọc (BR-10). | M |
| FR-JM-04 | **Nhiều sales chia 1 đơn** (Sale #1/#2/#3 + Online #1/#2/#3) kèm tỷ lệ %. `[cách chia]` | M |
| FR-ON-01 | Tự lọc & tổng hợp đơn Sales Online. | M |
| FR-BELL-01 | Tự gắn cờ rung chuông theo ngưỡng cấu hình. `[ngưỡng]` | M |
| FR-BELL-02 | Cảnh báo nghi trùng đơn. | M |
| FR-MISS-01 | Tự lọc RC chưa có Source. | M |
| FR-MISS-02 | Vòng xử lý: Gửi US → bổ sung → cập nhật JM → hoàn tất. | M |
| FR-CAT-01 | Quản lý danh mục dùng chung. | M |
| FR-SEC-01 | Đăng nhập an toàn (1 người dùng GĐ1). | M |
| FR-SEC-02 | Nhật ký chỉnh sửa (audit log). | M |

## 11. Danh sách màn hình
Tối ưu cho 1 người dùng (bỏ màn quản trị phân quyền). Mã `M0x` để tham chiếu.

| Mã | Tên màn hình | Mục đích | FR liên quan |
|---|---|---|---|
| M01 | Bảng điều khiển | KPI hôm nay, việc cần xử lý, RC mới nhất | FR-SD, FR-MISS |
| M02 | Tạo / Sửa RC | Form nhập 1 đơn — Bước 1 (scan US) & Bước 2 (JM); nhiều dòng SP, gộp khi lưu | FR-RC-01→09 |
| M03 | Sổ giao dịch RC | Danh sách RC: tìm/lọc theo công ty, ngày, trạng thái (gồm Cancel), nguồn | FR-JM, FR-MISS |
| M04 | Chi tiết đơn hàng | Dòng hàng, sales chia %, thanh toán (đợt đầu + chú thích), trạng thái, cọc↔pickup | FR-RC-05/07, FR-JM-02/03/04 |
| M05 | Báo cáo bán hàng ngày | PC49 & Trans theo ngày — đúng cột Excel | FR-SD |
| M06 | Báo cáo Sales Online | Đơn online theo tháng — đúng cột Excel | FR-ON |
| M07 | Báo cáo Rung chuông | Đơn đạt mốc + cảnh báo trùng | FR-BELL |
| M08 | RC thiếu nguồn | Hàng đợi xử lý theo trạng thái | FR-MISS |
| M09 | Danh mục | Quản lý dropdown dùng chung | FR-CAT |

Nhật ký chỉnh sửa (FR-SEC-02) nhúng trong M03/M04. Wireframe tham chiếu: mockup tương tác đã bàn giao.

## 12. Đặc tả báo cáo
**Cột phải giống hệt file Excel hiện tại** (tên & thứ tự).

**12.1 Báo cáo bán hàng ngày — PC49 / Trans**
`STT · TYPE · DISCRIPTION · CUSTOMER · TỔNG CỘNG · PURCHASE/PO (Mua vào) · RECEIPT (Bán ra) [Trans: TOTAL RECEIPT] · DEPOSIT (Khách cọc) · [RECEIVABLES/THU TIỀN] CASH · BANKWIRE · ZELLE · CHECK · [PAYABLES/CHI TIỀN] RECEIVED/ĐÃ CỌC · CASH · BANKWIRE · ZELLE · CHECK · COMPANY`
Lọc: Công ty, Ngày (mỗi ngày 1 sheet) / kỳ. Đầu ra: Web · Excel · PDF.

**12.2 Báo cáo theo dõi bán hàng Sales Online**
`NO. · DATE · CUSTOMER INFORMATION (CUST. NAME · FACEBOOK) · DECRIPTION · JM US DEPOSIT# · JM US RECEIPT N# · SALE US · Team VN (Sale Onl #1 · #2 · #3) · % SUPPORT · TRANSACTION VALUE · LƯỢNG · CHECK`
Lọc: Tháng. Đầu ra: Web · Excel.

**12.3 Báo cáo Rung chuông**
`Mã rung chuông (RC1 · RC2 · RC3 · SBO1) · Tổng đơn thành công · Check` | Chi tiết (từ TRANS RC JM): `DATE · JM US RECEIPT N# · Customer · Sale · Số tiền (cột V) · Mã RC · Lọc trùng (cột S,T)`
Lọc: Tháng. Đầu ra: Web · Excel.

**12.4 Thống kê RC thiếu thông tin nguồn**
`Stt · DATE · DECRIPTION · Cust. Name/ Check No · EXPENSE/ Purchase/ Trade In · RECEIPT · DEPOSIT · JM US RECEIPT N# · SOURCE 1 · Giải thích lý do không chọn Source · Chọn nguồn JM (checkbox)`
Lọc: Tháng, Trạng thái. Đầu ra: Web · Excel.

## 13. Quy tắc nghiệp vụ (BR)
| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Receipt = SUM(tiền A/R) khi Type ∈ {Receipt, Pick up, Repair}; Deposit khi {Deposit, Extra deposit}; Return/PO khi {Return, Exchange}. | Công thức L,M,N |
| BR-02 | Tổng cộng đơn (dòng) = Receipt + Deposit − PO. | Sales Daily |
| BR-03 | Source rỗng/"Không có source" → vào danh sách RC thiếu nguồn. | File thiếu nguồn |
| BR-04 | Đơn pickup phải tham chiếu Old Receipt# của đơn cọc cùng khách. | TRANS RC JM |
| BR-05 | **Mã JM theo loại đơn:** `9000…` = đặt cọc; `1000…` = bán hàng / pickup. Số RC JM duy nhất. | NV xác nhận |
| BR-06 | 1 đơn nhiều đợt thanh toán: **đợt đầu ghi chính thức**, các đợt sau ghi vào **cột chú thích**; cộng dồn; tổng đã thu ≤ tổng đơn; đủ tiền mới pickup. | NV xác nhận |
| BR-07 | **1 RC nhiều dòng sản phẩm:** nhập riêng, khi lưu gộp & tự tính tổng. | NV xác nhận |
| BR-08 | Đơn ≥ ngưỡng X → gắn cờ rung chuông (RC1/RC2/RC3 quầy, SBO1 online). `[X cần chốt]` | BC Rung chuông |
| BR-09 | Khuyến mãi (refer-a-friend/OFF) ghi như dòng giảm trừ. | Ví dụ Travis |
| BR-10 | **Trạng thái & lọc theo ngày:** đơn đổi trạng thái (vd Cancel) **không biến mất** — vẫn hiển thị ở ngày giao dịch gốc với trạng thái hiện tại. VD: đặt 20/06, cancel 23/06 → lọc 20/06 vẫn thấy đơn ở trạng thái "Cancel". | NV xác nhận |

## 14. Sơ đồ trạng thái (workflow)
**14.1 Vòng đời đơn hàng**
```
[Mới] → [Đặt cọc — đang thu] → [Đủ tiền / Đang order] → [Có hàng — chờ giao] → [Pickup — Hoàn tất]
   bất kỳ bước nào ↘ [Cancel]   ·   sau bán ↘ [Return / Exchange]
* Đơn Cancel/Return KHÔNG xoá — giữ ở ngày gốc, hiển thị trạng thái khi lọc (BR-10).
```
**14.2 Vòng đời RC thiếu nguồn**
```
[Thiếu nguồn] → (KT gửi) [Đã gửi US] → (US điền) [US đã bổ sung] → (KT vào JM) [Đã cập nhật JM — Hoàn tất]
```
`[cần chốt]` Danh sách trạng thái chuẩn & ai được chuyển từng bước.

## 15. Quy tắc kiểm tra & xử lý lỗi (Validation)
- Trường bắt buộc: Ngày, Công ty, Type, Khách, Số tiền — thiếu → chặn lưu, báo rõ trường.
- Số tiền ≥ 0; ngày hợp lệ, không tương lai (trừ pickup hẹn).
- Số RC JM trùng → cảnh báo & chặn (BR-05).
- Pickup nhưng Old Receipt# không tồn tại → cảnh báo.
- Tổng thanh toán > tổng đơn → cảnh báo lệch.
- Chuyển trạng thái "Hoàn tất" khi còn thiếu Source → nhắc bổ sung.

## 16. Từ điển dữ liệu (Data Dictionary)

### 16.1 Bảng Giao dịch / RC
| Trường | Kiểu | Bắt buộc | Nhập/Tự tính | Ghi chú |
|---|---|---|---|---|
| id | PK | ✔ | auto | khóa chính |
| ngay | date | ✔ | nhập | ngày giao dịch |
| cong_ty | enum | ✔ | nhập | PC49/Trans/HPLLC/3NVY/Other/TDW |
| type | enum | ✔ | nhập | Receipt/Deposit/Pick up/Extra deposit/PO/Return/Exchange/Transfer/Repair |
| ma_sku | text | | nhập | vd 24KRI |
| dien_giai | text | | nhập | mô tả |
| khach_id | FK | ✔ | nhập/chọn | → Khách hàng |
| return_po / receipt / deposit | number | | **tự tính** | CONDITION theo BR-01 |
| ar_cash / ar_bankwire / ar_zelle / ar_check | number | | nhập | tiền A/R theo hình thức |
| rc_jm_no | text (unique) | | nhập (bước 2) | số RC trên JM (9000=cọc/1000=bán·pickup) |
| so_no / appt_id / gia_no | text | | nhập | các mã định danh |
| source_1 / source_2 | enum | | nhập (bước 2) | nguồn khách |
| old_receipt_no | text | | nhập | cho đơn pickup → đơn cọc |
| deposit_date | date | | tự tính | lấy từ đơn cọc liên kết |
| bell_code | enum | | tự/nhập | RC1/RC2/RC3/SBO1 |
| trang_thai | enum | ✔ | tự/nhập | xem mục 14 (gồm Cancel) |
| note | text | | nhập | ghi chú |

**Ánh xạ tên trường ↔ cột Excel:**
`type=TYPE · dien_giai=DECRIPTION · ma_sku=MÃ SKU · khach=Cust. Name/Check No · return_po/receipt/deposit=CONDITION(Return-PO/Receipt/Deposit) · expense=EXPENSE/Purchase/Trade In · rc_jm_no=JM US RECEIPT N# (PC49: RECEIPT #) · source_1/2=SOURCE 1/2 · sale=Sale #1/#2/#3 (PC49: Sale US 1/2) · ty_le=Tỷ lệ (%) · sale_online=Sale Online #1/#2/#3 (Team VN) · transaction_value=TRANSACTION VALUE · pct_support=% SUPPORT · old_receipt_no=OLD RECEIPT NUMBER · deposit_date=DEPOSIT DATE · rung_chuong=RUNG CHUÔNG`

### 16.2 Bảng Dòng hàng
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id / rc_id | PK / FK | thuộc 1 RC |
| mo_ta | text | vd "Lab Diamond 3.04ct Radiant" |
| sku / gia_no | text | mã sản phẩm / giám định |
| so_luong / don_gia / thanh_tien | number | thành tiền = SL×ĐG (hệ thống tự tính & gộp khi lưu) |

### 16.3 Thanh toán (đợt đầu + cột chú thích)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| tt_dau_ngay / tt_dau_so_tien / tt_dau_hinh_thuc | date / number / enum | **Đợt thanh toán đầu** — ghi chính thức trên đơn |
| chu_thich_thanh_toan | text (nhiều dòng) | **Các đợt sau:** mỗi dòng "ngày – số tiền – hình thức (– xác nhận)" |
| tong_da_thu | number (tự tính) | = đợt đầu + tổng các dòng chú thích |
| con_thieu | number (tự tính) | = tổng đơn − tổng đã thu |

> Backend nên tách bảng `ThanhToan (1-nhiều)` để cộng dồn/đối chiếu chính xác; **giao diện thể hiện đúng thói quen "đợt đầu + chú thích"** như Excel.

### 16.4 Khách hàng / Danh mục
| Bảng | Trường chính |
|---|---|
| Khách hàng | id, ten, sdt, nguon, ghi_chu |
| Sales | id, ten, loai (quầy/online), trang_thai |
| RC ↔ Sales | rc_id, sale_id, ty_le_% (nhiều–nhiều) |
| Danh mục | nhom (Type/Source/Account/Bell/Company), gia_tri, hieu_luc |

## 17. Tích hợp hệ thống
| Hệ thống | Điểm chạm | Giai đoạn 1 |
|---|---|---|
| JM / VVS | Số RC, nguồn, sales | Nhập tay (đánh giá API/export sau) `[JM có export?]` |
| QuickBooks | Bút toán hạch toán | Ngoài phạm vi GĐ1 `[Online/Desktop?]` |
| Ngân hàng | Sao kê đối chiếu | Nhập/đối chiếu thủ công; import file là tuỳ chọn sau |
| Google Sheets | Dữ liệu cũ | Dùng để di trú (mục 18) |

## 18. Di trú dữ liệu (Data Migration)
- Phạm vi: dữ liệu năm hiện hành (và lịch sử nếu cần) từ USBC101 / RC JM.
- Cần bản gốc (Google Sheets) + ánh xạ cột → trường (theo Data Dictionary).
- Làm sạch: khách trùng/thiếu SĐT, RC thiếu nguồn, lệch tiền giữa chứng từ.
- Đối chiếu sau di trú: tổng doanh thu/đơn theo kỳ khớp với file cũ.
- `[cần chốt]` Di trú mấy năm; bắt đầu từ kỳ nào.

## 19. Yêu cầu phi chức năng (NFR)
- Đa người dùng (sẵn sàng mở rộng) — GĐ1 1 người, không ghi đè.
- Quy mô: ___ RC/ngày; lưu ___ năm `[cần chốt]`.
- Ngôn ngữ VN/EN `[cần chốt]`; tiền tệ USD.
- Bảo mật: đăng nhập, sao lưu định kỳ; nhật ký đầy đủ.
- Trình duyệt Chrome/Edge; máy tính (mobile nếu cần `[cần chốt]`).
- Triển khai cloud hay nội bộ `[cần chốt]`.

## 20. Giả định & phụ thuộc
- GĐ1 chưa tích hợp tự động JM/QuickBooks; chưa đính kèm file scan.
- Có quyền truy cập file Google Sheets gốc để di trú.
- Có 1 đầu mối nghiệp vụ giải đáp xuyên suốt.
- Mẫu báo cáo bắt buộc (nếu có) được cung cấp.

## 21. Rủi ro & giảm thiểu
| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| JM không cho API/export | Vẫn phải nhập tay số RC/nguồn | Thiết kế nhập nhanh 2 bước; đánh giá export CSV; OCR sau |
| Dữ liệu cũ lộn xộn | Di trú khó, sai số | Bước làm sạch + đối chiếu; cho phép gộp khách |
| Người dùng quen Excel | Chậm áp dụng | Chạy song song; giao diện giống thói quen; đào tạo |
| Lệch tiền chứng từ vs JM | Sai báo cáo | Tự cảnh báo lệch; quy định nguồn chuẩn |
| Phạm vi phình to | Trễ tiến độ | Khoá MVP theo MoSCoW |

## 22. Câu hỏi mở cần chốt
✅ **Đã chốt:** nhập 2 bước (scan US→JM) cùng 1 đơn · 1 RC nhiều dòng/sales/pickup · gộp & tự tính khi lưu · mã 9000=cọc/1000=bán·pickup · thanh toán đợt đầu + chú thích · Cancel giữ ở ngày gốc · 1 người dùng · chưa đính kèm scan · báo cáo/cột giống Excel.

**Còn cần chốt:**
1. Số RC JM **tự sinh trong JM** hay KT tự đánh? JM có **API/export** không?
2. **Ngưỡng & điều kiện rung chuông**; phân biệt RC1/RC2/RC3/SBO1.
3. **Danh sách trạng thái đơn** đầy đủ (gồm Cancel/Return/Exchange) — tên chuẩn.
4. **Cách chia % cho nhiều sales**; quy tắc khuyến mãi.
5. Khối lượng RC/ngày, số năm lưu & **di trú từ kỳ nào**, ngôn ngữ, hosting.
6. QuickBooks Online/Desktop; **mẫu báo cáo bắt buộc** xuất ra.

## 23. Nghiệm thu & bước tiếp theo
**Tiêu chí nghiệm thu (UAT):**
- Nhập 1 RC → đúng ở Sổ RC JM & Sales Daily; CONDITION tự đúng.
- Đơn cọc→pickup nối đúng; thanh toán nhiều đợt cộng đúng.
- Rung chuông + cảnh báo trùng + thiếu nguồn chạy đúng trạng thái.
- Đơn Cancel vẫn hiển thị đúng ngày gốc.
- Chạy song song 1 kỳ vs Excel → số liệu khớp.

**Bước tiếp theo:**
1. Chốt câu hỏi mở (mục 22).
2. Hoàn thiện ERD chi tiết + wireframe (đã có mockup).
3. Lập backlog User Stories theo MoSCoW; kế hoạch MVP.
4. Thu thập file gốc, RC mẫu, thông tin JM/QuickBooks để di trú.
5. Nâng tài liệu lên v1.0 & ký duyệt phạm vi.
