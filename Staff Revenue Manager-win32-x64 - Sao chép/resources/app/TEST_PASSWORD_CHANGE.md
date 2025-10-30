# 🔑 Test Đổi Mật Khẩu - Đã Fix!

## ✅ Các Thay Đổi

### 1. Thêm Form Đổi Mật Khẩu trong Settings
- ✅ Thêm 3 input fields: Mật khẩu cũ, Mật khẩu mới, Xác nhận
- ✅ Button "Đổi Mật Khẩu" trong form
- ✅ Validation đầy đủ

### 2. Button "Đổi Mật Khẩu" ở Header
- ✅ Nhấn button → chuyển sang tab Settings
- ✅ Tự động focus vào ô "Mật khẩu cũ"

---

## 🧪 Cách Test

### Bước 1: Chạy App
```bash
npm start
```

### Bước 2: Mở Payroll & Shifts
1. Nhấn tab **"Payroll & Shifts"** (biểu tượng khóa)
2. Nhập mật khẩu: `admin123`
3. Nhấn **"Mở Khóa"**

### Bước 3: Test Đổi Mật Khẩu (Cách 1)
1. Nhấn nút **"Đổi Mật Khẩu"** ở góc trên
2. ✅ **Expected:** Tự động chuyển sang tab **Settings**
3. ✅ **Expected:** Cursor tự động focus vào ô "Mật khẩu cũ"
4. Điền form:
   - **Mật khẩu cũ:** `admin123`
   - **Mật khẩu mới:** `test123`
   - **Xác nhận:** `test123`
5. Nhấn **"Đổi Mật Khẩu"**
6. ✅ **Expected:** Thông báo "Đổi mật khẩu thành công!"
7. ✅ **Expected:** Form được clear (tất cả ô trống)

### Bước 4: Test Đổi Mật Khẩu (Cách 2)
1. Chuyển sang tab **Settings** (bằng cách nhấn sub-tab)
2. Kéo xuống phần **"Đổi Mật Khẩu"**
3. Điền form như bước 3
4. ✅ **Expected:** Tương tự bước 3

### Bước 5: Kiểm Tra Mật Khẩu Mới
1. Nhấn nút **"Khóa Lại"** ở góc trên
2. ✅ **Expected:** Màn hình khóa xuất hiện
3. Thử mật khẩu cũ `admin123`
4. ❌ **Expected:** Báo lỗi "Mật khẩu không đúng!"
5. Thử mật khẩu mới `test123`
6. ✅ **Expected:** Mở khóa thành công!

---

## 🛡️ Test Validation

### Test 1: Mật khẩu xác nhận không khớp
- **Mật khẩu cũ:** `test123`
- **Mật khẩu mới:** `newpass123`
- **Xác nhận:** `wrongpass`
- ❌ **Expected:** "Mật khẩu xác nhận không khớp!"

### Test 2: Mật khẩu cũ sai
- **Mật khẩu cũ:** `wrongpass`
- **Mật khẩu mới:** `newpass123`
- **Xác nhận:** `newpass123`
- ❌ **Expected:** "Mật khẩu cũ không đúng"

### Test 3: Mật khẩu mới quá ngắn
- **Mật khẩu cũ:** `test123`
- **Mật khẩu mới:** `123` (< 6 ký tự)
- **Xác nhận:** `123`
- ❌ **Expected:** "Mật khẩu mới phải có ít nhất 6 ký tự!"

### Test 4: Để trống
- Để trống bất kỳ ô nào
- ❌ **Expected:** "Vui lòng điền đầy đủ thông tin!"

---

## 🎯 Kết Quả Mong Đợi

Sau khi test xong:
- ✅ Form đổi mật khẩu hiển thị trong Settings tab
- ✅ Button "Đổi Mật Khẩu" ở header chuyển đến Settings tab
- ✅ Validation hoạt động đúng (6 ký tự, khớp nhau, mật khẩu cũ đúng)
- ✅ Đổi mật khẩu thành công
- ✅ Mật khẩu mới hoạt động khi unlock

---

## 🐛 Các Lỗi Đã Fix

### ❌ Lỗi Cũ:
- Không có form đổi mật khẩu trong UI
- Chỉ dùng `prompt()` (UX kém)
- Không có validation đầy đủ

### ✅ Đã Fix:
- ✅ Thêm form đầy đủ với 3 input fields
- ✅ Validation: min 6 ký tự, xác nhận khớp, mật khẩu cũ đúng
- ✅ UX tốt hơn: auto-focus, clear form sau khi đổi
- ✅ Button ở header giờ chuyển đến Settings tab

---

## 📝 Code Changes Summary

### `index.html`
```html
<!-- Thêm form mới trong Settings tab -->
<div class="settings-section">
    <h3><i class="fas fa-key"></i> Đổi Mật Khẩu</h3>
    <form id="changePasswordForm" class="settings-form">
        <div class="form-group">
            <label for="oldPassword">Mật khẩu cũ:</label>
            <input type="password" id="oldPassword" class="form-control" required>
        </div>
        <div class="form-group">
            <label for="newPassword">Mật khẩu mới:</label>
            <input type="password" id="newPassword" class="form-control" required>
        </div>
        <div class="form-group">
            <label for="confirmPassword">Xác nhận mật khẩu:</label>
            <input type="password" id="confirmPassword" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-warning">
            <i class="fas fa-key"></i> Đổi Mật Khẩu
        </button>
    </form>
</div>
```

### `renderer.js`
```javascript
// Form submit handler với validation
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    // ... validation logic ...
    const result = await window.api.payrollChangePassword(oldPassword, newPassword);
    // ... success/error handling ...
});

// Button ở header chuyển đến Settings tab
document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
    switchPayrollTab('settings-payroll');
    setTimeout(() => {
        document.getElementById('oldPassword')?.focus();
    }, 100);
});
```

---

## 🎊 Done!

Chức năng đổi mật khẩu giờ đã hoạt động hoàn hảo!

**Test ngay:** `npm start`


