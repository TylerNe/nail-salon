# Staff Revenue Manager

Ứng dụng desktop quản lý doanh thu nhân viên được xây dựng bằng Electron + SQLite với giao diện dark mode hiện đại.

## 🚀 Tính năng chính

- **Dashboard chính**: Bảng dạng Excel để quản lý doanh thu theo ngày và nhân viên
- **Quản lý Staff**: Thêm, sửa, xóa nhân viên
- **Thống kê**: Biểu đồ và báo cáo theo tuần/tháng
- **Export Excel**: Xuất dữ liệu ra file Excel/CSV
- **Tìm kiếm**: Tìm kiếm staff theo tên
- **Validation**: Kiểm tra dữ liệu đầu vào
- **Dark Mode**: Giao diện tối hiện đại

## 📋 Yêu cầu hệ thống

- Node.js 16+ 
- npm hoặc yarn
- Windows 10+ (chính), macOS, Linux (cross-platform)

## 🛠️ Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Chạy ứng dụng (Development)

```bash
npm start
```

### 3. Build ứng dụng

#### Cách 1: Sử dụng script tự động (Khuyến nghị)

**Windows:**
```bash
build.bat
```

**Linux/Mac:**
```bash
chmod +x build.sh
./build.sh
```

#### Cách 2: Build thủ công

```bash
# Build cho Windows (Installer + Portable)
npm run build-win

# Build cho tất cả platform
npm run build

# Build cho macOS
npm run build -- --mac

# Build cho Linux
npm run build -- --linux
```

### 4. Kết quả build

File sẽ được tạo trong thư mục `dist/`:
- **Windows**: `Staff Revenue Manager Setup 1.0.0.exe` (Installer) + `Staff Revenue Manager-1.0.0-portable.exe` (Portable)
- **macOS**: `Staff Revenue Manager-1.0.0.dmg`
- **Linux**: `Staff Revenue Manager-1.0.0.AppImage` + `.deb` package

> **Lưu ý**: Icon `assets/good-icon.webp` sẽ được sử dụng làm icon cho ứng dụng

## 📁 Cấu trúc dự án

```
app-staff/
├── main.js              # Main process của Electron
├── preload.js           # Preload script (API bridge)
├── index.html           # Giao diện chính
├── renderer.js          # Logic frontend
├── styles.css           # Styling dark mode
├── package.json         # Dependencies và scripts
├── assets/              # Icons và assets
└── README.md           # Hướng dẫn này
```

## 🗄️ Cấu trúc Database

### Bảng `staff`
- `id`: Primary key
- `name`: Tên nhân viên (unique)
- `active`: Trạng thái hoạt động (1/0)
- `created_at`: Ngày tạo

### Bảng `entries`
- `id`: Primary key
- `staff_id`: Foreign key đến bảng staff
- `amount_cents`: Số tiền (lưu bằng cents)
- `note`: Ghi chú
- `work_date`: Ngày làm việc
- `created_at`: Ngày tạo

## 🎯 Cách sử dụng

### Dashboard
1. Chọn ngày để xem dữ liệu
2. Nhập doanh thu trực tiếp vào bảng (double-click để edit)
3. Sử dụng form "Thêm Entry Mới" để thêm dữ liệu mới
4. Click "Export Excel" để xuất báo cáo

### Quản lý Staff
1. Chuyển sang tab "Quản lý Staff"
2. Thêm staff mới bằng form
3. Click vào tên staff để sửa
4. Click nút xóa để xóa staff

### Thống kê
1. Chuyển sang tab "Thống kê"
2. Chọn chu kỳ (tuần/tháng)
3. Chọn khoảng thời gian
4. Click "Tải thống kê" để xem biểu đồ

## 🔧 Cấu hình

### Thay đổi đơn vị tiền tệ
Sửa function `formatCurrency` trong `preload.js`:

```javascript
formatCurrency: (cents) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'  // Thay đổi thành USD, EUR, etc.
  }).format(cents);
}
```

### Thay đổi vị trí lưu database
Sửa trong `main.js`:

```javascript
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data'); // Thay đổi đường dẫn
```

## 🐛 Troubleshooting

### Lỗi "better-sqlite3" không build được
```bash
# Cách 1: Rebuild cho Electron
npm run rebuild

# Cách 2: Cài đặt lại với build từ source
npm install better-sqlite3 --build-from-source

# Cách 3: Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
npm run rebuild
```

### Lỗi "electron" không tìm thấy
```bash
npm install electron --save-dev
```

### Lỗi NODE_MODULE_VERSION không khớp
```bash
# Rebuild native modules cho Electron
npx electron-rebuild

# Hoặc sử dụng script
npm run rebuild
```

### Database bị lock
- Đóng ứng dụng hoàn toàn
- Xóa file `staff.db` trong thư mục data
- Khởi động lại ứng dụng

### Lỗi "table has no column named"
```bash
# Xóa database cũ để tạo lại với schema mới
del data\staff.db  # Windows
rm data/staff.db   # Linux/Mac

# Hoặc xóa toàn bộ thư mục data
rmdir /s data      # Windows
rm -rf data        # Linux/Mac

# Khởi động lại ứng dụng
npm start
```

## 📦 Dependencies chính

- **electron**: Framework desktop app
- **better-sqlite3**: Database SQLite
- **tabulator-tables**: Bảng dạng Excel
- **chart.js**: Biểu đồ thống kê
- **xlsx**: Export Excel
- **electron-builder**: Build app

## 🔒 Bảo mật

- Sử dụng `contextIsolation: true`
- Không bật `nodeIntegration` trong renderer
- Tất cả API được expose qua `contextBridge`
- Validation dữ liệu đầu vào

## 📝 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email.

---

**Lưu ý**: Ứng dụng này được thiết kế để chạy offline hoàn toàn. Dữ liệu được lưu local trong SQLite database.
