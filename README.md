# 💅 Luxury Nails & Beauty Salon Website

Website một trang sang trọng cho tiệm nail & spa với thiết kế cao cấp.

## 📁 Cấu trúc thư mục / Project Structure

```
web/
├── index.html              # Trang HTML chính
├── css/
│   └── style.css          # Tất cả CSS styling
├── js/
│   └── script.js          # JavaScript cho tương tác
├── assets/
│   └── images/            # Thư mục chứa hình ảnh
│       └── .gitkeep
└── README.md              # File hướng dẫn này
```

## 🎨 Bảng màu / Color Palette

- **Beige**: `#F5F5DC` - Màu nền chính
- **Pale Gold**: `#F0E2A2` - Màu nhấn vàng nhạt
- **White**: `#FFFFFF` - Màu trắng
- **Gold Accent**: `#D4AF37` - Màu vàng đậm cho các điểm nhấn
- **Text Dark**: `#3C3C3C` - Màu chữ

## ✨ Tính năng / Features

1. **Header cố định** - Navigation menu đẹp mắt
2. **Hero Section** - Banner lớn với nút "Book Now"
3. **Services Section** - Cards có thể mở/đóng cho từng dịch vụ
4. **Gallery** - Lưới ảnh với hiệu ứng hover
5. **About & Contact** - Thông tin liên hệ + Google Maps
6. **Booking Modal** - Form đặt lịch với iframe GoCheckIn
7. **Responsive Design** - Tương thích mobile, tablet, desktop

## 🚀 Cách sử dụng / How to Use

1. **Mở website**: Double click vào file `index.html`
2. **Chỉnh sửa nội dung**: Mở `index.html` bằng text editor
3. **Chỉnh sửa màu sắc/style**: Mở file `css/style.css`
4. **Chỉnh sửa chức năng**: Mở file `js/script.js`
5. **Thêm hình ảnh**: Đặt ảnh vào folder `assets/images/`

## 📝 Hướng dẫn chỉnh sửa / Edit Guide

### Thay đổi màu sắc / Change Colors
Mở `css/style.css` và tìm phần `:root` ở đầu file:
```css
:root {
    --beige: #F5F5DC;
    --pale-gold: #F0E2A2;
    --white: #FFFFFF;
    --gold-accent: #D4AF37;
}
```

### Thay đổi hình ảnh Hero / Change Hero Image
1. Đặt ảnh mới vào `assets/images/hero-background.jpg`
2. Hoặc mở `css/style.css` và tìm `.hero` để thay đổi đường dẫn

### Thêm/Sửa dịch vụ / Add/Edit Services
Mở `index.html` và tìm phần `<!-- SERVICES SECTION -->`

### Thay đổi thông tin liên hệ / Change Contact Info
Mở `index.html` và tìm phần `<!-- ABOUT & CONTACT SECTION -->`

## 🔧 Tùy chỉnh nâng cao / Advanced Customization

### Thay đổi fonts
Thêm Google Fonts vào `<head>` trong `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap" rel="stylesheet">
```

Sau đó cập nhật trong `css/style.css`:
```css
body {
    font-family: 'Playfair Display', serif;
}
```

### Tắt/Bật smooth scrolling
Trong `css/style.css`, tìm:
```css
html {
    scroll-behavior: smooth; /* Xóa dòng này để tắt */
}
```

## 📱 Responsive Breakpoints

- **Desktop**: > 768px
- **Tablet**: 481px - 768px
- **Mobile**: < 480px

## 🌐 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

## 📞 Support

Nếu cần hỗ trợ, vui lòng tạo issue hoặc liên hệ developer.

---

**Made with ❤️ for Luxury Nails & Beauty Salon**

