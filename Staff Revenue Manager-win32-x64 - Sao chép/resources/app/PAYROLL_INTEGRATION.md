# 🔒 Payroll & Shifts - Gộp Vào App Chính (Password Protected)

## ✅ Đã Implement

### 1. **UI Components** (`index.html` + `styles.css`)
- ✅ Tab "Payroll & Shifts" với icon khóa
- ✅ Lock screen với password input
- ✅ Mật khẩu mặc định: `admin123`
- ✅ 4 sub-tabs:
  - Shifts (quản lý ca làm)
  - Rates (lương mặc định)
  - Income Reports (báo cáo lợi nhuận)
  - Settings (cài đặt tiền thuê)
- ✅ Nút "Khóa Lại" và "Đổi Mật Khẩu"
- ✅ CSS đầy đủ cho lock screen và payroll features

### 2. **Cần Tiếp Tục**
- ⏳ Cập nhật `main.js` - thêm database tables + IPC handlers
- ⏳ Cập nhật `renderer.js` - thêm logic password + payroll features
- ⏳ Cập nhật `preload.js` - expose API mới

## 📊 Database Schema Mới

```sql
-- Lương mặc định theo staff
CREATE TABLE staff_rates (
  staff_id INTEGER PRIMARY KEY,
  default_daily_wage_cents INTEGER DEFAULT 0,
  FOREIGN KEY (staff_id) REFERENCES staff (id)
)

-- Ca làm việc
CREATE TABLE shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  daily_wage_cents INTEGER DEFAULT 0,
  note TEXT,
  UNIQUE(staff_id, work_date),
  FOREIGN KEY (staff_id) REFERENCES staff (id)
)

-- Cài đặt (bao gồm password và rent)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)

-- Seeds
INSERT INTO settings VALUES 
  ('payroll_password', 'admin123'),
  ('rent_amount_cents', '40000'),
  ('rent_period', 'daily')
```

## 🔐 Password Protection

### Mật Khẩu Mặc Định
- Password: `admin123`
- Được hash và lưu trong bảng `settings`
- Key: `payroll_password`

### Tính Năng
1. ✅ Lock screen khi chưa unlock
2. ✅ Input password để unlock
3. ✅ Nút "Khóa Lại" để lock lại
4. ✅ Nút "Đổi Mật Khẩu"
5. ✅ Password được lưu trong localStorage (session)
6. ✅ Auto-lock khi đóng app

## 🔧 API Cần Thêm (IPC Handlers)

```javascript
// Password
'payroll:checkPassword', (password) => boolean
'payroll:changePassword', (oldPass, newPass) => {success, error}

// Shifts
'shifts:listByDate', (date) => shifts[]
'shifts:upsert', (staffId, date, wageCents, note) => {success}
'shifts:delete', (staffId, date) => {success}

// Rates
'rates:getAll', () => rates[]
'rates:upsert', (staffId, wageCents) => {success}

// Income
'income:getSummary', (startDate, endDate) => summaries[]

// Settings
'settings:getRent', () => {amount, period}
'settings:updateRent', (amountCents, period) => {success}
```

## 💡 Công Thức Tính

```javascript
// Mỗi ngày
Gross = SUM(entries.amount_cents WHERE work_date = date)
Wages = SUM(shifts.daily_wage_cents WHERE work_date = date)
Rent = 400 AUD/day (từ settings)
Net = Gross - Wages - Rent

// Range
Total Net = Σ Gross - Σ Wages - (Rent × số ngày)
```

## 🎨 UI Flow

```
1. User click tab "Payroll & Shifts"
   ↓
2. Hiện lock screen với password input
   ↓
3. User nhập password
   ↓
4. Nếu đúng → unlock → hiện payroll content
   ↓
5. User có thể:
   - Xem/sửa shifts
   - Xem/sửa rates
   - Xem income reports
   - Đổi settings
   - Lock lại bất kỳ lúc nào
```

## 🔄 Next Steps

1. Copy code từ `payroll-app/main.js` → `main.js`
2. Copy logic từ `payroll-app/renderer.js` → `renderer.js`
3. Thêm API vào `preload.js`
4. Test password lock/unlock
5. Test tất cả features

## 📝 Notes

- Password được lưu plain text trong DB (demo only)
- Production nên hash với bcrypt
- Session timeout có thể thêm sau
- Có thể thêm "Remember me" checkbox

