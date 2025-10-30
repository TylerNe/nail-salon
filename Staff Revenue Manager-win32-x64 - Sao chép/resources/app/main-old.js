const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Tạo thư mục data nếu chưa có (trong thư mục project)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Đường dẫn database
const dbPath = path.join(dataDir, 'staff.db');

// Khởi tạo database
let db;

function initDatabase() {
  try {
    console.log('Initializing database at:', dbPath);
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Tạo bảng staff
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tạo bảng entries (hỗ trợ nhiều đơn cho một staff trong một ngày)
    db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        amount_cents INTEGER NOT NULL,
        note TEXT,
        work_date DATE NOT NULL,
        order_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff (id)
      )
    `);
    
    // Tạo bảng staff_rates (lương mặc định)
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_rates (
        staff_id INTEGER PRIMARY KEY,
        default_daily_wage_cents INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff (id)
      )
    `);
    
    // Tạo bảng shifts (ca làm việc)
    db.exec(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        work_date TEXT NOT NULL,
        daily_wage_cents INTEGER DEFAULT 0,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff (id),
        UNIQUE(staff_id, work_date)
      )
    `);
    
    // Tạo bảng work_schedule (lịch làm việc)
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        work_date TEXT NOT NULL,
        is_working INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff (id),
        UNIQUE(staff_id, work_date)
      )
    `);
    
    // Tạo bảng settings
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    // Seed default settings
    try {
      const checkPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('payroll_password');
      if (!checkPassword) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('payroll_password', 'admin123');
      }
      
      const checkRent = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_amount_cents');
      if (!checkRent) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('rent_amount_cents', '40000');
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('rent_period', 'daily');
      }
    } catch (error) {
      console.log('Settings already initialized');
    }
    
    // Migration: Thêm cột order_number nếu chưa có
    try {
      db.exec(`ALTER TABLE entries ADD COLUMN order_number TEXT`);
      console.log('Added order_number column to entries table');
    } catch (error) {
      // Cột đã tồn tại, bỏ qua lỗi
      if (!error.message.includes('duplicate column name')) {
        console.error('Error adding order_number column:', error);
      }
    }
    
    // Tạo index để tối ưu query
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entries_staff_date 
      ON entries (staff_id, work_date, order_number)
    `);
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

// Kiểm tra database có sẵn sàng không
function isDatabaseReady() {
  return db && typeof db.prepare === 'function';
}

// Tạo cửa sổ chính
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'good-icon.webp'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile('index.html');
  
  // Hiển thị cửa sổ khi đã sẵn sàng
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Mở DevTools trong development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC Handlers cho Staff Management
ipcMain.handle('get-staff', () => {
  try {
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return [];
    }
    const stmt = db.prepare('SELECT * FROM staff WHERE active = 1 ORDER BY name');
    return stmt.all();
  } catch (error) {
    console.error('Error getting staff:', error);
    return [];
  }
});

ipcMain.handle('add-staff', (event, name) => {
  try {
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare('INSERT INTO staff (name) VALUES (?)');
    const result = stmt.run(name);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding staff:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-staff', (event, id, name) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare('UPDATE staff SET name = ? WHERE id = ?');
    stmt.run(name, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating staff:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-staff', (event, id) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    // Kiểm tra xem staff có entries không
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM entries WHERE staff_id = ?');
    const count = checkStmt.get(id).count;
    
    if (count > 0) {
      // Nếu có entries, chỉ deactivate
      const stmt = db.prepare('UPDATE staff SET active = 0 WHERE id = ?');
      stmt.run(id);
      return { success: true, message: 'Staff deactivated (has existing entries)' };
    } else {
      // Nếu không có entries, xóa hoàn toàn
      const stmt = db.prepare('DELETE FROM staff WHERE id = ?');
      stmt.run(id);
      return { success: true, message: 'Staff deleted' };
    }
  } catch (error) {
    console.error('Error deleting staff:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handlers cho Entries Management
ipcMain.handle('get-entries', (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) {
      return [];
    }
    const stmt = db.prepare(`
      SELECT e.*, s.name as staff_name 
      FROM entries e 
      JOIN staff s ON e.staff_id = s.id 
      WHERE e.work_date BETWEEN ? AND ? 
      ORDER BY e.work_date DESC, s.name
    `);
    return stmt.all(startDate, endDate);
  } catch (error) {
    console.error('Error getting entries:', error);
    return [];
  }
});

ipcMain.handle('add-entry', (event, staffId, amountCents, note, workDate) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare(`
      INSERT INTO entries (staff_id, amount_cents, note, work_date) 
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(staffId, amountCents, note, workDate);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding entry:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-entry', (event, id, amountCents, note) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare('UPDATE entries SET amount_cents = ?, note = ? WHERE id = ?');
    stmt.run(amountCents, note, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating entry:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-entry', (event, id) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare('DELETE FROM entries WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting entry:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler cho Statistics - Tổng gộp (không chia theo staff)
ipcMain.handle('get-statistics', (event, period, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) {
      console.error('Database not ready for statistics');
      return [];
    }
    
    console.log('Getting statistics:', { period, startDate, endDate });
    
    let query;
    if (period === 'daily') {
      query = `
        SELECT 
          work_date as period,
          SUM(amount_cents) as total_cents
        FROM entries
        WHERE work_date BETWEEN ? AND ?
        GROUP BY work_date
        ORDER BY work_date DESC
      `;
    } else if (period === 'weekly') {
      query = `
        SELECT 
          strftime('%Y', work_date) || '-W' || printf('%02d', CAST(strftime('%W', work_date) AS INTEGER) + 1) as period,
          SUM(amount_cents) as total_cents
        FROM entries
        WHERE work_date BETWEEN ? AND ?
        GROUP BY strftime('%Y-%W', work_date)
        ORDER BY period DESC
      `;
    } else {
      // monthly
      query = `
        SELECT 
          strftime('%Y-%m', work_date) as period,
          SUM(amount_cents) as total_cents
        FROM entries
        WHERE work_date BETWEEN ? AND ?
        GROUP BY strftime('%Y-%m', work_date)
        ORDER BY period DESC
      `;
    }
    
    const stmt = db.prepare(query);
    const result = stmt.all(startDate, endDate);
    
    console.log('Statistics query result:', result);
    return result;
  } catch (error) {
    console.error('Error getting statistics:', error);
    return [];
  }
});

// IPC Handler cho Statistics by Day
ipcMain.handle('stats:sumByDay', (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) {
      return [];
    }
    const stmt = db.prepare(`
      SELECT work_date AS date, SUM(amount_cents) AS total_cents
      FROM entries
      WHERE work_date BETWEEN ? AND ?
      GROUP BY work_date
      ORDER BY work_date
    `);
    return stmt.all(startDate, endDate);
  } catch (error) {
    console.error('Error getting sum by day:', error);
    return [];
  }
});

// IPC Handler cho Statistics by Month
ipcMain.handle('stats:sumByMonth', (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) {
      return [];
    }
    const stmt = db.prepare(`
      SELECT strftime('%Y-%m', work_date) AS month, SUM(amount_cents) AS total_cents
      FROM entries
      WHERE work_date BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', work_date)
      ORDER BY month
    `);
    return stmt.all(startDate, endDate);
  } catch (error) {
    console.error('Error getting sum by month:', error);
    return [];
  }
});

// IPC Handler cho Statistics by Week
ipcMain.handle('stats:sumByWeek', (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) {
      return [];
    }
    const stmt = db.prepare(`
      SELECT 
        strftime('%Y', work_date) || '-W' || printf('%02d', CAST(strftime('%W', work_date) AS INTEGER) + 1) AS week,
        SUM(amount_cents) AS total_cents
      FROM entries
      WHERE work_date BETWEEN ? AND ?
      GROUP BY strftime('%Y-%W', work_date)
      ORDER BY week
    `);
    return stmt.all(startDate, endDate);
  } catch (error) {
    console.error('Error getting sum by week:', error);
    return [];
  }
});

// IPC Handler cho Export
ipcMain.handle('export-data', async (event, data, filename) => {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Export Data',
      defaultPath: filename,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });
    
    if (!result.canceled) {
      return { success: true, filePath: result.filePath };
    } else {
      return { success: false, message: 'Export cancelled' };
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    return { success: false, error: error.message };
  }
});

// ==================== PAYROLL & SHIFTS IPC HANDLERS ====================

// Password Management
ipcMain.handle('payroll:checkPassword', (event, password) => {
  try {
    if (!isDatabaseReady()) return false;
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get('payroll_password');
    return result && result.value === password;
  } catch (error) {
    console.error('Error checking password:', error);
    return false;
  }
});

ipcMain.handle('payroll:changePassword', (event, oldPassword, newPassword) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Verify old password
    const checkStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const current = checkStmt.get('payroll_password');
    
    if (!current || current.value !== oldPassword) {
      return { success: false, error: 'Mật khẩu cũ không đúng' };
    }
    
    // Update password
    const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
    updateStmt.run(newPassword, 'payroll_password');
    
    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
});

// Staff Rates Management
ipcMain.handle('rates:getAll', () => {
  try {
    if (!isDatabaseReady()) return [];
    const stmt = db.prepare(`
      SELECT sr.*, s.name as staff_name
      FROM staff_rates sr
      JOIN staff s ON sr.staff_id = s.id
      WHERE s.active = 1
      ORDER BY s.name
    `);
    return stmt.all();
  } catch (error) {
    console.error('Error getting rates:', error);
    return [];
  }
});

ipcMain.handle('rates:upsert', (event, staffId, wageCents) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    const stmt = db.prepare(`
      INSERT INTO staff_rates (staff_id, default_daily_wage_cents)
      VALUES (?, ?)
      ON CONFLICT(staff_id) DO UPDATE SET default_daily_wage_cents = ?
    `);
    
    stmt.run(staffId, wageCents, wageCents);
    return { success: true };
  } catch (error) {
    console.error('Error upserting rate:', error);
    return { success: false, error: error.message };
  }
});

// Shifts Management
ipcMain.handle('shifts:listByDate', (event, workDate) => {
  try {
    if (!isDatabaseReady()) return [];
    const stmt = db.prepare(`
      SELECT sh.*, s.name as staff_name
      FROM shifts sh
      JOIN staff s ON sh.staff_id = s.id
      WHERE sh.work_date = ?
      ORDER BY s.name
    `);
    return stmt.all(workDate);
  } catch (error) {
    console.error('Error getting shifts:', error);
    return [];
  }
});

ipcMain.handle('shifts:upsert', (event, staffId, workDate, wageCents, note) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    const stmt = db.prepare(`
      INSERT INTO shifts (staff_id, work_date, daily_wage_cents, note)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(staff_id, work_date) DO UPDATE SET 
        daily_wage_cents = ?,
        note = ?
    `);
    
    stmt.run(staffId, workDate, wageCents, note || '', wageCents, note || '');
    return { success: true };
  } catch (error) {
    console.error('Error upserting shift:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('shifts:delete', (event, staffId, workDate) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    const stmt = db.prepare('DELETE FROM shifts WHERE staff_id = ? AND work_date = ?');
    stmt.run(staffId, workDate);
    return { success: true };
  } catch (error) {
    console.error('Error deleting shift:', error);
    return { success: false, error: error.message };
  }
});

// Settings Management
ipcMain.handle('settings:getRent', () => {
  try {
    if (!isDatabaseReady()) return { amount: 40000, period: 'daily' };
    
    const amountRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_amount_cents');
    const periodRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_period');
    
    return {
      amount: amountRow ? parseInt(amountRow.value) : 40000,
      period: periodRow ? periodRow.value : 'daily'
    };
  } catch (error) {
    console.error('Error getting rent settings:', error);
    return { amount: 40000, period: 'daily' };
  }
});

ipcMain.handle('settings:updateRent', (event, amountCents, period) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run('rent_amount_cents', amountCents.toString());
    stmt.run('rent_period', period);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating rent settings:', error);
    return { success: false, error: error.message };
  }
});

// Income Summary
ipcMain.handle('income:getSummary', (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) return [];
    
    // Get all dates with entries or shifts
    const dates = db.prepare(`
      SELECT DISTINCT work_date
      FROM (
        SELECT work_date FROM entries WHERE work_date BETWEEN ? AND ?
        UNION
        SELECT work_date FROM shifts WHERE work_date BETWEEN ? AND ?
      )
      ORDER BY work_date
    `).all(startDate, endDate, startDate, endDate);
    
    // Get rent per day
    const rentRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_amount_cents');
    const rentPerDay = rentRow ? parseInt(rentRow.value) : 40000;
    
    const summaries = dates.map(({ work_date }) => {
      // Get gross for this date
      const grossRow = db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) as total
        FROM entries
        WHERE work_date = ?
      `).get(work_date);
      
      // Get wages for this date
      const wagesRow = db.prepare(`
        SELECT COALESCE(SUM(daily_wage_cents), 0) as total
        FROM shifts
        WHERE work_date = ?
      `).get(work_date);
      
      const grossCents = grossRow.total;
      const wagesCents = wagesRow.total;
      const netCents = grossCents - wagesCents - rentPerDay;
      
      return {
        date: work_date,
        gross_cents: grossCents,
        wages_cents: wagesCents,
        rent_allocated_cents: rentPerDay,
        net_cents: netCents
      };
    });
    
    return summaries;
  } catch (error) {
    console.error('Error getting income summary:', error);
    return [];
  }
});

// ==================== WORK SCHEDULE API ====================

// Get work schedule for a specific date
ipcMain.handle('get-work-schedule', (event, workDate) => {
  try {
    if (!isDatabaseReady()) return [];
    
    const stmt = db.prepare(`
      SELECT staff_id, work_date, is_working 
      FROM work_schedule 
      WHERE work_date = ?
    `);
    
    const schedules = stmt.all(workDate);
    return schedules;
  } catch (error) {
    console.error('Error getting work schedule:', error);
    return [];
  }
});

// Update work schedule for a staff member
ipcMain.handle('update-work-schedule', (event, staffId, workDate, isWorking) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    const upsertStmt = db.prepare(`
      INSERT INTO work_schedule (staff_id, work_date, is_working)
      VALUES (?, ?, ?)
      ON CONFLICT(staff_id, work_date) 
      DO UPDATE SET is_working = excluded.is_working
    `);
    
    upsertStmt.run(staffId, workDate, isWorking ? 1 : 0);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating work schedule:', error);
    return { success: false, error: error.message };
  }
});

// App Events
app.whenReady().then(() => {
  console.log('App is ready, initializing database...');
  const dbInitialized = initDatabase();
  
  if (dbInitialized) {
    console.log('Database initialized successfully, creating window...');
    createWindow();
  } else {
    console.error('Failed to initialize database, app cannot start');
    app.quit();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});

// Xử lý lỗi không bắt được
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
