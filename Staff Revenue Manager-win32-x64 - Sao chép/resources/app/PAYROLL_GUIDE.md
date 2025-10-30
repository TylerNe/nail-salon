# Hướng Dẫn Sử Dụng Payroll & Shifts

## Tính Năng Mới

Ứng dụng hiện đã được tích hợp **Payroll & Shifts** - một module quản lý lương và ca làm việc với bảo mật bằng mật khẩu.

---

## 1. Truy Cập Payroll & Shifts

### Bước 1: Mở Tab Payroll & Shifts
- Nhấn vào tab **"Payroll & Shifts"** (biểu tượng khóa) trên thanh điều hướng
- Bạn sẽ thấy màn hình khóa yêu cầu mật khẩu

### Bước 2: Nhập Mật Khẩu
- **Mật khẩu mặc định:** `admin123`
- Nhập mật khẩu và nhấn **"Mở Khóa"**
- Sau khi mở khóa thành công, bạn sẽ truy cập được vào các chức năng

---

## 2. Các Chức Năng

### 📅 **Shifts (Ca Làm Việc)**

**Mục đích:** Quản lý ca làm việc hàng ngày của từng nhân viên

**Cách sử dụng:**
1. Chọn ngày muốn quản lý ca làm việc
2. Danh sách tất cả nhân viên sẽ hiển thị
3. **Đánh dấu checkbox** để thêm ca làm việc cho nhân viên
4. **Nhấn vào ô lương** để nhập/chỉnh sửa lương cho ca đó (sử dụng bàn phím số ảo)
5. **Bỏ checkbox** để xóa ca làm việc

**Lưu ý:**
- Khi đánh dấu ca làm việc, hệ thống tự động sử dụng lương mặc định (nếu đã thiết lập)
- Bạn có thể thay đổi lương cho từng ca cụ thể

---

### 💰 **Rates (Lương Mặc Định)**

**Mục đích:** Thiết lập lương mặc định cho từng nhân viên

**Cách sử dụng:**
1. Danh sách tất cả nhân viên hiển thị trong bảng
2. **Nhấn vào ô lương** của nhân viên muốn thiết lập
3. Sử dụng bàn phím số ảo để nhập lương mặc định
4. Lương này sẽ được sử dụng tự động khi tạo ca làm việc mới

**Lợi ích:**
- Tiết kiệm thời gian: không cần nhập lương mỗi lần tạo ca
- Đồng nhất: đảm bảo lương không bị nhầm lẫn

---

### 📊 **Income Reports (Báo Cáo Thu Nhập)**

**Mục đích:** Xem báo cáo lợi nhuận ròng sau khi trừ lương và tiền thuê

**Công thức tính:**
```
Net Profit = Gross Revenue - Wages - Rent
```

**Cách sử dụng:**
1. Chọn **Từ ngày** và **Đến ngày**
2. Nhấn **"Tải Báo Cáo"**
3. Xem bảng chi tiết theo từng ngày:
   - **Gross (Doanh thu):** Precison Nail từ entries
   - **Wages (Lương):** Tổng lương đã trả trong ngày
   - **Rent (Thuê):** Tiền thuê cố định mỗi ngày (mặc định $400/ngày)
   - **Net (Lợi nhuận ròng):** Gross - Wages - Rent

4. Xem tổng hợp ở phía trên:
   - 4 thẻ tổng hợp hiển thị tổng cộng của từng cột
   - **Net Profit** hiển thị màu xanh (lãi) hoặc đỏ (lỗ)

5. **Xuất CSV:** Nhấn nút "Export CSV" để tải báo cáo về máy

---

### ⚙️ **Settings (Cài Đặt)**

**Mục đích:** Cấu hình tiền thuê và đổi mật khẩu

#### Cài Đặt Tiền Thuê:
1. **Nhấn vào ô tiền thuê** để mở bàn phím số ảo
2. Nhập số tiền thuê mỗi ngày (đơn vị: AUD)
3. Nhấn **"Lưu Cài Đặt"**

**Mặc định:** $400/ngày

#### Đổi Mật Khẩu:
1. Nhập **Mật khẩu cũ**
2. Nhập **Mật khẩu mới**
3. **Xác nhận mật khẩu** mới
4. Nhấn **"Đổi Mật Khẩu"**

**Quan trọng:** Hãy nhớ mật khẩu mới! Không có chức năng khôi phục mật khẩu.

---

## 3. Bảo Mật

### Khóa Module
- Nhấn nút **"Khóa Lại"** ở góc trên để khóa module
- Cần nhập lại mật khẩu để truy cập

### Đổi Mật Khẩu Mặc Định
- **Rất khuyến nghị** đổi mật khẩu mặc định ngay sau lần đầu sử dụng
- Vào tab **Settings** → phần **Đổi Mật Khẩu**

---

## 4. Workflow Khuyến Nghị

### Thiết Lập Ban Đầu:
1. **Đổi mật khẩu** từ `admin123` sang mật khẩu riêng
2. Vào tab **Rates** và thiết lập **lương mặc định** cho tất cả nhân viên
3. Vào tab **Settings** và kiểm tra/cập nhật **tiền thuê**

### Sử Dụng Hàng Ngày:
1. Vào tab **Shifts**
2. Chọn ngày hôm nay
3. Đánh dấu ca làm việc cho các nhân viên
4. Điều chỉnh lương nếu cần (overtime, bonus, v.v.)

### Cuối Tháng/Tuần:
1. Vào tab **Income Reports**
2. Chọn khoảng thời gian (tuần/tháng)
3. Xem báo cáo và xuất CSV để lưu trữ

---

## 5. Lưu Ý Quan Trọng

✅ **Database:** Payroll & Shifts dùng chung database với Revenue Manager (file `staff.db`)

✅ **Dữ liệu Entries:** Doanh thu (Gross) trong Income Reports được lấy từ entries bạn đã nhập trong Dashboard

✅ **Tự động lưu:** Mọi thay đổi về shifts và rates đều được lưu tự động

✅ **Virtual Keypad:** Tất cả ô nhập số tiền đều sử dụng bàn phím số ảo để nhập chính xác

❗ **Mật khẩu:** Không có chức năng quên mật khẩu! Hãy nhớ kỹ mật khẩu của bạn.
   - Nếu quên mật khẩu, bạn cần truy cập trực tiếp vào database để reset

---

## 6. Troubleshooting

### Không thể mở khóa?
- Kiểm tra lại mật khẩu (mặc định: `admin123`)
- Đảm bảo không có khoảng trắng thừa

### Không thấy nhân viên trong Shifts/Rates?
- Đảm bảo bạn đã thêm nhân viên trong tab **"Quản lý Staff"**
- Chỉ nhân viên **active** mới hiển thị

### Dữ liệu Income Reports không đúng?
- Kiểm tra xem bạn đã nhập entries chưa (tab Dashboard)
- Kiểm tra xem đã đánh dấu shifts chưa
- Kiểm tra tiền thuê trong Settings

### Virtual Keypad không hiện?
- Refresh trang (Ctrl+R hoặc F5)
- Kiểm tra file `keypad.js` có tồn tại không

---

## 7. Ví Dụ Thực Tế

**Tình huống:** Bạn có 3 nhân viên, muốn tính lợi nhuận ngày 13/10/2025

1. **Nhập entries** (Dashboard):
   - Staff A: $1,200
   - Staff B: $800
   - Staff C: $1,000
   - **Tổng Gross: $3,000**

2. **Đánh dấu shifts** (Payroll > Shifts):
   - Staff A: làm việc, lương $150
   - Staff B: làm việc, lương $150
   - Staff C: nghỉ
   - **Tổng Wages: $300**

3. **Tiền thuê** (Settings): $400/ngày

4. **Kết quả** (Income Reports):
   ```
   Gross:  $3,000
   Wages:  $  300
   Rent:   $  400
   ───────────────
   Net:    $2,300 ✅ (Lãi)
   ```

---

## 8. Tóm Tắt Nhanh

| Tab | Chức năng | Thao tác |
|-----|-----------|----------|
| **Shifts** | Quản lý ca làm việc hàng ngày | Checkbox + nhập lương |
| **Rates** | Thiết lập lương mặc định | Nhập lương cho từng staff |
| **Income Reports** | Xem báo cáo lợi nhuận | Chọn ngày + tải báo cáo |
| **Settings** | Cấu hình tiền thuê & mật khẩu | Nhập giá trị + lưu |

---

**Phiên bản:** 1.0  
**Ngày cập nhật:** 13/10/2025  
**Hỗ trợ:** Liên hệ quản trị viên nếu cần hỗ trợ

