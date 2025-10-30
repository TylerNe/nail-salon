# 🚀 Quick Test - Payroll & Shifts

## Chạy Ứng Dụng Ngay

```bash
npm start
```

---

## ✅ Test Nhanh (5 phút)

### 1. Mở Tab Payroll & Shifts
- Nhấn vào tab **"Payroll & Shifts"** (biểu tượng khóa 🔒)
- Nhập mật khẩu: `admin123`
- Nhấn **"Mở Khóa"**

**✅ Expected:** Thấy 4 sub-tabs: Shifts, Rates, Income Reports, Settings

---

### 2. Test Rates (Lương Mặc Định)
- Chuyển sang tab **"Rates"**
- Nhấn vào ô lương của nhân viên bất kỳ
- Bàn phím số ảo hiện ra
- Nhập số: `150.00`
- Nhấn **✓ OK**

**✅ Expected:** Lương được lưu và hiển thị $150.00

---

### 3. Test Shifts (Ca Làm Việc)
- Chuyển sang tab **"Shifts"**
- Chọn ngày hôm nay
- **Đánh dấu checkbox** cho 2-3 nhân viên
- Nhấn vào ô lương để chỉnh sửa nếu muốn

**✅ Expected:** Ca làm việc được tạo với lương mặc định

---

### 4. Thêm Entries (Doanh Thu)
- Quay lại tab **"Dashboard"**
- Thêm vài entries cho các nhân viên đã đánh dấu shifts
  - Staff A: $500
  - Staff B: $300
  - Staff C: $400

**✅ Expected:** Entries được thêm thành công

---

### 5. Test Income Reports (Báo Cáo)
- Quay lại tab **"Payroll & Shifts"**
- Chuyển sang tab **"Income Reports"**
- Chọn ngày: **Hôm nay → Hôm nay**
- Nhấn **"Tải Báo Cáo"**

**✅ Expected:** 
- Bảng hiển thị 1 dòng cho hôm nay
- 4 thẻ tổng hợp hiển thị:
  - **Total Gross:** $1,200 (hoặc tổng bạn nhập)
  - **Total Wages:** $300 (hoặc tổng lương shifts)
  - **Total Rent:** $400
  - **Net Profit:** Gross - Wages - Rent (màu xanh nếu > 0)

---

### 6. Test Settings (Cài Đặt)
- Chuyển sang tab **"Settings"**
- Nhấn vào ô **"Tiền thuê"**
- Bàn phím số ảo hiện ra
- Thử thay đổi thành `500.00`
- Nhấn **✓ OK**
- Nhấn **"Lưu Cài Đặt"**

**✅ Expected:** Tiền thuê được cập nhật

---

### 7. Test Export CSV
- Quay lại tab **"Income Reports"**
- Nhấn **"Export CSV"**

**✅ Expected:** File CSV được tải về với tên `income-report-YYYY-MM-DD.csv`

---

### 8. Test Lock/Unlock
- Nhấn nút **"Khóa Lại"** ở góc trên
- **✅ Expected:** Màn hình khóa xuất hiện
- Nhập lại mật khẩu `admin123`
- **✅ Expected:** Mở khóa lại thành công

---

### 9. Test Change Password
- Trong Settings, nhập:
  - **Mật khẩu cũ:** `admin123`
  - **Mật khẩu mới:** `test123`
  - **Xác nhận:** `test123`
- Nhấn **"Đổi Mật Khẩu"**
- **✅ Expected:** Đổi mật khẩu thành công

- Khóa lại và thử mở khóa với mật khẩu mới `test123`
- **✅ Expected:** Mở khóa thành công

---

## ❌ Nếu Có Lỗi

### Keypad không hiện?
```bash
# Check console (F12)
# Đảm bảo file keypad.js được load
```

### Database error?
```bash
# Xóa file data/staff.db cũ và restart
rm data/staff.db
npm start
```

### Password không đúng?
- Kiểm tra kỹ: `admin123` (không có khoảng trắng)
- Nếu quên mật khẩu đã đổi, xóa database và restart

---

## 🎯 Kết Quả Mong Đợi

Sau khi test xong, bạn nên có:
- ✅ 2-3 nhân viên có lương mặc định
- ✅ 2-3 shifts cho hôm nay
- ✅ 3+ entries doanh thu
- ✅ 1 báo cáo Income với Net Profit được tính đúng
- ✅ 1 file CSV export
- ✅ Mật khẩu đã đổi (nếu test bước 9)

---

## 📊 Công Thức Kiểm Tra

```
Net Profit = (Tổng Entries) - (Tổng Lương Shifts) - (Tiền Thuê)
```

**Ví dụ:**
- Entries: $500 + $300 + $400 = $1,200
- Wages: $150 + $150 = $300
- Rent: $400
- **Net = $1,200 - $300 - $400 = $500** ✅

---

## 🐛 Known Issues

### None! 🎉

Nếu phát hiện bug, vui lòng report với:
1. Bước tái hiện
2. Screenshot (nếu có)
3. Console errors (F12)

---

## 📚 Tài Liệu Khác

- **PAYROLL_GUIDE.md** - Hướng dẫn chi tiết
- **CHANGELOG_PAYROLL.md** - Danh sách thay đổi
- **README.md** - Tổng quan ứng dụng

---

**Happy Testing!** 🚀

