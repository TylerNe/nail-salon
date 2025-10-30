# Changelog - Tích Hợp Payroll & Shifts

## 📅 Ngày: 13/10/2025

## ✨ Tính Năng Mới

### 🔐 Module Payroll & Shifts (Bảo Mật)

Đã tích hợp hoàn toàn module **Payroll & Shifts** vào ứng dụng Revenue Manager chính, cho phép:

1. **Quản lý ca làm việc (Shifts)**
   - Đánh dấu nhân viên làm việc theo ngày
   - Nhập lương cho từng ca làm việc
   - Tự động áp dụng lương mặc định

2. **Quản lý lương mặc định (Rates)**
   - Thiết lập lương mặc định cho từng nhân viên
   - Tự động điền lương khi tạo ca mới

3. **Báo cáo thu nhập ròng (Income Reports)**
   - Xem tổng hợp: Gross - Wages - Rent = Net
   - Biểu đồ 4 thẻ tổng hợp
   - Bảng chi tiết theo ngày
   - Xuất CSV

4. **Cài đặt (Settings)**
   - Cấu hình tiền thuê (mặc định $400/ngày)
   - Đổi mật khẩu bảo mật

5. **Bảo mật**
   - Yêu cầu mật khẩu để truy cập module
   - Mật khẩu mặc định: `admin123`
   - Chức năng khóa/mở khóa
   - Đổi mật khẩu

---

## 🗂️ Files Đã Thay Đổi

### 1. **main.js** ✅
**Thay đổi:**
- Thêm tables mới: `staff_rates`, `shifts`, `settings`
- Seed default settings: `payroll_password='admin123'`, `rent_amount_cents=40000`
- Thêm IPC handlers:
  - `payroll:checkPassword` / `payroll:changePassword`
  - `rates:getAll` / `rates:upsert`
  - `shifts:listByDate` / `shifts:upsert` / `shifts:delete`
  - `settings:getRent` / `settings:updateRent`
  - `income:getSummary`

**Dòng code thêm vào:** ~220 dòng

---

### 2. **preload.js** ✅
**Thay đổi:**
- Expose các API mới:
  - `payrollCheckPassword`, `payrollChangePassword`
  - `ratesGetAll`, `ratesUpsert`
  - `shiftsListByDate`, `shiftsUpsert`, `shiftsDelete`
  - `settingsGetRent`, `settingsUpdateRent`
  - `incomeGetSummary`

**Dòng code thêm vào:** ~30 dòng

---

### 3. **index.html** ⚠️ (Đã có sẵn)
**Trạng thái:**
- UI đã được tạo sẵn bởi user hoặc phiên làm việc trước
- Bao gồm:
  - Tab "Payroll & Shifts" với biểu tượng khóa
  - Lock screen với form nhập mật khẩu
  - Sub-tabs: Shifts, Rates, Income Reports, Settings
  - Các form, table, và input elements

**Không cần thay đổi gì thêm**

---

### 4. **renderer.js** ✅
**Thay đổi:**
- Thêm module Payroll & Shifts (525 dòng code mới)
- **Password Management:**
  - Unlock form handler
  - Lock button handler
  - Change password handler

- **Shifts Management:**
  - `loadShiftsForDate()` - Load danh sách ca làm việc
  - `renderShiftsList()` - Render UI shifts với checkbox + wage input
  - `handleShiftToggle()` - Thêm/xóa ca làm việc
  - `openShiftWageKeypad()` - Mở bàn phím số để nhập lương

- **Rates Management:**
  - `loadRatesData()` - Load lương mặc định
  - `renderRatesTable()` - Render bảng rates
  - `openRateWageKeypad()` - Mở bàn phím số để thiết lập lương

- **Income Reports:**
  - `loadIncomeReport()` - Tải báo cáo thu nhập
  - `renderIncomeTable()` - Render bảng chi tiết
  - `updateIncomeTotals()` - Cập nhật 4 thẻ tổng hợp
  - `exportIncomeReport()` - Xuất CSV

- **Settings:**
  - `loadRentSettings()` - Load cài đặt tiền thuê
  - `openRentAmountKeypad()` - Mở bàn phím số để nhập tiền thuê
  - `saveRentSettings()` - Lưu cài đặt

- **Tab Navigation:**
  - `switchPayrollTab()` - Chuyển đổi giữa các sub-tabs
  - `loadPayrollData()` - Load dữ liệu ban đầu

**Dòng code thêm vào:** ~525 dòng

---

### 5. **styles.css** ⚠️ (Đã có sẵn)
**Trạng thái:**
- CSS cho Payroll module đã được tạo sẵn
- Bao gồm styles cho:
  - Lock screen
  - Payroll content
  - Shift items
  - Summary cards
  - Income tables
  - Settings forms

**Không cần thay đổi gì thêm**

---

## 🗄️ Database Schema

### Bảng Mới:

#### 1. `staff_rates`
```sql
CREATE TABLE staff_rates (
  staff_id INTEGER PRIMARY KEY,
  default_daily_wage_cents INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff (id)
)
```

#### 2. `shifts`
```sql
CREATE TABLE shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  daily_wage_cents INTEGER DEFAULT 0,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff (id),
  UNIQUE(staff_id, work_date)
)
```

#### 3. `settings`
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

### Dữ Liệu Mặc Định:
```sql
INSERT INTO settings (key, value) VALUES
  ('payroll_password', 'admin123'),
  ('rent_amount_cents', '40000'),
  ('rent_period', 'daily');
```

---

## 📊 Luồng Dữ Liệu

### Income Report Calculation:

```
Cho mỗi ngày trong khoảng [startDate, endDate]:

1. Gross Revenue (gross_cents):
   = SUM(entries.amount_cents) WHERE work_date = date

2. Total Wages (wages_cents):
   = SUM(shifts.daily_wage_cents) WHERE work_date = date

3. Rent Allocated (rent_allocated_cents):
   = settings.rent_amount_cents (fixed per day)

4. Net Profit (net_cents):
   = gross_cents - wages_cents - rent_allocated_cents
```

---

## 🎨 UI/UX Enhancements

### Virtual Numeric Keypad Integration:
- ✅ Shifts wage input → opens keypad
- ✅ Rates wage input → opens keypad
- ✅ Settings rent input → opens keypad
- ✅ Consistent behavior across all modules

### User Experience:
- 🔒 Password-protected access
- 💾 Auto-save on all changes
- ✨ Smooth animations (fade-in, slide-in)
- 🎨 Color-coded profit/loss (green/red)
- 📱 Responsive design
- ⚡ Real-time updates

---

## ✅ Testing Checklist

### Password & Security:
- [x] Lock screen appears on first access
- [x] Default password (`admin123`) works
- [x] Wrong password shows error
- [x] Lock button hides content
- [x] Change password works
- [x] Password validation works

### Shifts:
- [x] Date selector updates shifts list
- [x] Checkbox adds/removes shifts
- [x] Default wage auto-fills
- [x] Wage input opens keypad
- [x] Wage update saves correctly
- [x] Only active staff shown

### Rates:
- [x] All active staff shown in table
- [x] Wage input opens keypad
- [x] Wage update saves correctly
- [x] Default wage used in shifts

### Income Reports:
- [x] Date range selector works
- [x] "Tải Báo Cáo" button loads data
- [x] Table shows correct calculations
- [x] Summary cards update correctly
- [x] Green/red color for profit/loss
- [x] CSV export works

### Settings:
- [x] Rent amount displays correctly
- [x] Rent input opens keypad
- [x] Save button works
- [x] Change password works

---

## 🐛 Bug Fixes

### Fixed during development:
1. ✅ `event.target` undefined in keypad functions
   - **Solution:** Pass `event` parameter explicitly

2. ✅ Wage input disabled when shift not checked
   - **Solution:** Enable input when checkbox is checked

3. ✅ Virtual keypad not appearing
   - **Solution:** Ensure `keypad.js` loaded and event handlers correct

---

## 📝 Documentation

### New Files Created:
1. **PAYROLL_GUIDE.md** - Hướng dẫn sử dụng chi tiết (Vietnamese)
2. **CHANGELOG_PAYROLL.md** - File này (Change log)

### Updated Files:
- `main.js` - Backend logic
- `preload.js` - API exposure
- `renderer.js` - Frontend logic

---

## 🚀 Deployment

### Để chạy ứng dụng:
```bash
npm start
```

### Để build exe:
```bash
npm run build
```

---

## 🔜 Tính Năng Tương Lai (Optional)

### Có thể thêm sau:
- [ ] Forgot password recovery
- [ ] Export Income Report to Excel (not just CSV)
- [ ] Charts/graphs for income trends
- [ ] Multiple rent periods (weekly, monthly)
- [ ] Shift notes/comments
- [ ] Email notifications
- [ ] Backup/restore database
- [ ] Multi-user support with roles

---

## 📞 Support

Nếu có vấn đề hoặc câu hỏi:
1. Đọc file **PAYROLL_GUIDE.md**
2. Check **Troubleshooting** section
3. Liên hệ quản trị viên

---

**Phát triển bởi:** AI Assistant  
**Ngày hoàn thành:** 13/10/2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

