const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const express = require('express');
const os = require('os');

// Tạo thư mục data nếu chưa có (trong thư mục project)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Đường dẫn database
const dbPath = path.join(dataDir, 'staff.db');

// Khởi tạo database
let db;

// Web server variables
let webServer = null;
let serverPort = 3000;
let localIP = null;

// Function to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Function to start web server
function startWebServer() {
  try {
    const expressApp = express();
    
    // Serve static files from the app directory
    expressApp.use(express.static(__dirname));
    
    // Parse JSON bodies
    expressApp.use(express.json());
    
    // API routes for database operations
    expressApp.get('/api/staff', (req, res) => {
      try {
        const staff = db.prepare('SELECT * FROM staff ORDER BY name').all();
        res.json(staff);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Add staff endpoint
    expressApp.post('/api/staff', (req, res) => {
      try {
        const { name } = req.body;
        const result = db.prepare('INSERT INTO staff (name) VALUES (?)').run(name);
        const newStaffId = result.lastInsertRowid;
        
        // Tự động tạo rate mặc định cho staff mới
        db.prepare('INSERT OR IGNORE INTO staff_rates (staff_id, default_daily_wage_cents) VALUES (?, ?)')
          .run(newStaffId, 0); // $0.00 mặc định
        
        // Không tạo shifts mẫu - để staff tự tạo khi cần
        
        res.json({ success: true, id: newStaffId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update staff endpoint
    expressApp.put('/api/staff/:id', (req, res) => {
      try {
        const { id } = req.params;
        const { name } = req.body;
        db.prepare('UPDATE staff SET name = ? WHERE id = ?').run(name, id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Delete staff endpoint
    expressApp.delete('/api/staff/:id', (req, res) => {
      try {
        const { id } = req.params;
        
        // Kiểm tra xem staff có dữ liệu liên quan không
        const entriesCount = db.prepare('SELECT COUNT(*) as count FROM entries WHERE staff_id = ?').get(id).count;
        const shiftsCount = db.prepare('SELECT COUNT(*) as count FROM shifts WHERE staff_id = ?').get(id).count;
        const workScheduleCount = db.prepare('SELECT COUNT(*) as count FROM work_schedule WHERE staff_id = ?').get(id).count;
        
        const totalRelatedData = entriesCount + shiftsCount + workScheduleCount;
        
        if (totalRelatedData > 0) {
          // Nếu có dữ liệu liên quan, chỉ deactivate
          const stmt = db.prepare('UPDATE staff SET active = 0 WHERE id = ?');
          stmt.run(id);
          res.json({ success: true, message: 'Staff deactivated (has existing data)' });
        } else {
          // Nếu không có dữ liệu liên quan, xóa hoàn toàn
          // Xóa staff_rates trước (vì có foreign key constraint)
          db.prepare('DELETE FROM staff_rates WHERE staff_id = ?').run(id);
          
          // Sau đó xóa staff
          const stmt = db.prepare('DELETE FROM staff WHERE id = ?');
          stmt.run(id);
          res.json({ success: true, message: 'Staff deleted' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/entries', (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const entries = db.prepare(`
          SELECT e.*, s.name as staff_name 
          FROM entries e 
          JOIN staff s ON e.staff_id = s.id 
          WHERE e.work_date BETWEEN ? AND ? 
          ORDER BY e.work_date DESC, e.created_at DESC
        `).all(startDate, endDate);
        res.json(entries);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Add entry endpoint
    expressApp.post('/api/entries', (req, res) => {
      try {
        const { staffId, amountCents, note, workDate, paymentMethod } = req.body;
        const result = db.prepare(`
          INSERT INTO entries (staff_id, amount_cents, note, work_date, payment_method, created_at) 
          VALUES (?, ?, ?, ?, ?, datetime('now', 'utc'))
        `).run(staffId, amountCents, note, workDate, paymentMethod || 'card');
        res.json({ success: true, id: result.lastInsertRowid });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update entry endpoint
    expressApp.put('/api/entries/:id', (req, res) => {
      try {
        const { id } = req.params;
        const { amountCents, note, paymentMethod } = req.body;
        db.prepare('UPDATE entries SET amount_cents = ?, note = ?, payment_method = ? WHERE id = ?')
          .run(amountCents, note, paymentMethod || 'card', id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Delete entry endpoint
    expressApp.delete('/api/entries/:id', (req, res) => {
      try {
        const { id } = req.params;
        db.prepare('DELETE FROM entries WHERE id = ?').run(id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/statistics', (req, res) => {
      try {
        const { period, startDate, endDate } = req.query;
        let query = '';
        
        if (period === 'daily') {
          query = `
            SELECT work_date as period, SUM(amount_cents) as total_cents
            FROM entries 
            WHERE work_date BETWEEN ? AND ?
            GROUP BY work_date 
            ORDER BY work_date DESC
          `;
        } else if (period === 'weekly') {
          query = `
            SELECT strftime('%Y-W%W', work_date) as period, SUM(amount_cents) as total_cents
            FROM entries 
            WHERE work_date BETWEEN ? AND ?
            GROUP BY strftime('%Y-W%W', work_date)
            ORDER BY period DESC
          `;
        } else { // monthly
          query = `
            SELECT strftime('%Y-%m', work_date) as period, SUM(amount_cents) as total_cents
            FROM entries 
            WHERE work_date BETWEEN ? AND ?
            GROUP BY strftime('%Y-%m', work_date)
            ORDER BY period DESC
          `;
        }
        
        const stats = db.prepare(query).all(startDate, endDate);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Work schedule endpoints
    expressApp.get('/api/work-schedule', (req, res) => {
      try {
        const { workDate } = req.query;
        const schedule = db.prepare(`
          SELECT ws.*, s.name as staff_name 
          FROM work_schedule ws 
          JOIN staff s ON ws.staff_id = s.id 
          WHERE ws.work_date = ?
          ORDER BY s.name
        `).all(workDate);
        res.json(schedule);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/work-schedule', (req, res) => {
      try {
        const { staffId, workDate, isWorking } = req.body;
        const result = db.prepare(`
          INSERT OR REPLACE INTO work_schedule (staff_id, work_date, is_working) 
          VALUES (?, ?, ?)
        `).run(staffId, workDate, isWorking);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Payroll endpoints
    expressApp.post('/api/payroll/check-password', (req, res) => {
      try {
        const { password } = req.body;
        const storedPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('payroll_password');
        const isValid = storedPassword && storedPassword.value === password;
        res.json({ success: true, valid: isValid });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/payroll/change-password', (req, res) => {
      try {
        const { oldPassword, newPassword } = req.body;
        const storedPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('payroll_password');
        
        if (!storedPassword || storedPassword.value !== oldPassword) {
          return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
        }
        
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .run('payroll_password', newPassword);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Staff rates endpoints
    expressApp.get('/api/rates', (req, res) => {
      try {
        const rates = db.prepare('SELECT * FROM staff_rates ORDER BY staff_id').all();
        res.json(rates);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/rates', (req, res) => {
      try {
        const { staffId, wageCents } = req.body;
        db.prepare('INSERT OR REPLACE INTO staff_rates (staff_id, default_daily_wage_cents) VALUES (?, ?)')
          .run(staffId, wageCents);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Shifts endpoints
    expressApp.get('/api/shifts', (req, res) => {
      try {
        const { workDate } = req.query;
        const shifts = db.prepare(`
          SELECT s.*, st.name as staff_name 
          FROM shifts s 
          JOIN staff st ON s.staff_id = st.id 
          WHERE s.work_date = ?
          ORDER BY st.name
        `).all(workDate);
        res.json(shifts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/shifts', (req, res) => {
      try {
        const { staffId, workDate, wageCents, note } = req.body;
        db.prepare('INSERT OR REPLACE INTO shifts (staff_id, work_date, daily_wage_cents, note) VALUES (?, ?, ?, ?)')
          .run(staffId, workDate, wageCents, note);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.delete('/api/shifts', (req, res) => {
      try {
        const { staffId, workDate } = req.query;
        db.prepare('DELETE FROM shifts WHERE staff_id = ? AND work_date = ?')
          .run(staffId, workDate);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Settings endpoints
    expressApp.get('/api/settings/rent', (req, res) => {
      try {
        const rentAmount = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_amount_cents');
        const rentPeriod = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_period');
        res.json({
          amount: rentAmount ? parseInt(rentAmount.value) : 40000,
          period: rentPeriod ? rentPeriod.value : 'daily'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/settings/rent', (req, res) => {
      try {
        const { amount, period } = req.body;
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .run('rent_amount_cents', amount.toString());
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .run('rent_period', period);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Income summary endpoint - sử dụng logic giống Electron
    expressApp.get('/api/income/summary', (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        
        // Get all dates with entries, shifts, or expenses (giống Electron)
        const dates = db.prepare(`
          SELECT DISTINCT work_date
          FROM (
            SELECT work_date FROM entries WHERE work_date BETWEEN ? AND ?
            UNION
            SELECT work_date FROM shifts WHERE work_date BETWEEN ? AND ?
            UNION
            SELECT expense_date as work_date FROM daily_expenses WHERE expense_date BETWEEN ? AND ?
          )
          ORDER BY work_date
        `).all(startDate, endDate, startDate, endDate, startDate, endDate);
        
        // Get rent per day (giống Electron)
        const rentRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_amount_cents');
        const rentPerDay = rentRow ? parseInt(rentRow.value) : 40000;
        
        const summaries = dates.map(({ work_date }) => {
          // Get gross for this date (giống Electron)
          const grossRow = db.prepare(`
            SELECT COALESCE(SUM(amount_cents), 0) as total
            FROM entries
            WHERE work_date = ?
          `).get(work_date);
          
          // Get wages for this date (giống Electron)
          const wagesRow = db.prepare(`
            SELECT COALESCE(SUM(daily_wage_cents), 0) as total
            FROM shifts
            WHERE work_date = ?
          `).get(work_date);
          
          // Get expenses for this date
          const expensesRow = db.prepare(`
            SELECT COALESCE(SUM(amount_cents), 0) as total
            FROM daily_expenses
            WHERE expense_date = ?
          `).get(work_date);
          
          const grossCents = grossRow.total;
          const wagesCents = wagesRow.total;
          const expensesCents = expensesRow.total;
          // 10% GST on gross
          const gstCents = Math.round(grossCents * 0.10);
          const netCents = grossCents - gstCents - wagesCents - rentPerDay - expensesCents;
          
          return {
            date: work_date,
            gross_cents: grossCents,
            wages_cents: wagesCents,
            rent_allocated_cents: rentPerDay,
            expenses_cents: expensesCents,
            gst_cents: gstCents,
            net_cents: netCents
          };
        });
        
        res.json(summaries);
      } catch (error) {
        console.error('Income summary error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Daily Expenses API endpoints
    expressApp.get('/api/expenses', (req, res) => {
      try {
        const { date, start_date, end_date } = req.query;
        let query, params;
        
        if (date) {
          query = 'SELECT * FROM daily_expenses WHERE expense_date = ? ORDER BY created_at DESC';
          params = [date];
        } else if (start_date && end_date) {
          query = 'SELECT * FROM daily_expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, created_at DESC';
          params = [start_date, end_date];
        } else {
          query = 'SELECT * FROM daily_expenses ORDER BY expense_date DESC, created_at DESC LIMIT 100';
          params = [];
        }
        
        const expenses = db.prepare(query).all(...params);
        res.json(expenses);
      } catch (error) {
        console.error('Error getting expenses:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/expenses', (req, res) => {
      try {
        const { expense_date, category, description, amount_cents, notes } = req.body;
        
        if (!expense_date || !category || !description || !amount_cents) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (amount_cents <= 0) {
          return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        
        const result = db.prepare(`
          INSERT INTO daily_expenses (expense_date, category, description, amount_cents, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(expense_date, category, description, amount_cents, notes || '');
        
        res.json({ success: true, id: result.lastInsertRowid });
      } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.put('/api/expenses/:id', (req, res) => {
      try {
        const { id } = req.params;
        const { expense_date, category, description, amount_cents, notes } = req.body;
        
        console.log('Express PUT /api/expenses/:id called with:', { id, body: req.body });
        
        if (!expense_date || !category || !description || !amount_cents) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (amount_cents <= 0) {
          return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        
        // Validate ID
        if (!id || isNaN(parseInt(id))) {
          return res.status(400).json({ error: 'Invalid expense ID' });
        }
        
        const expenseId = parseInt(id);
        const params = [expense_date, category, description, amount_cents, notes ? notes : '', expenseId];
        console.log('Express UPDATE parameters:', params);
        
        const result = db.prepare(`
          UPDATE daily_expenses 
          SET expense_date = ?, category = ?, description = ?, amount_cents = ?, notes = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(...params);
        
        console.log('Express UPDATE result:', result);
        
        if (result.changes === 0) {
          return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.delete('/api/expenses/:id', (req, res) => {
      try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM daily_expenses WHERE id = ?').run(id);
        
        if (result.changes === 0) {
          return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/expenses/summary', (req, res) => {
      try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
          return res.status(400).json({ error: 'Start date and end date are required' });
        }
        
        const summary = db.prepare(`
          SELECT 
            expense_date,
            category,
            SUM(amount_cents) as total_cents,
            COUNT(*) as count
          FROM daily_expenses 
          WHERE expense_date BETWEEN ? AND ?
          GROUP BY expense_date, category
          ORDER BY expense_date DESC, total_cents DESC
        `).all(start_date, end_date);
        
        res.json(summary);
      } catch (error) {
        console.error('Error getting expenses summary:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Expenses PIN endpoints
    expressApp.post('/api/expenses/check-pin', (req, res) => {
      try {
        const { pin } = req.body;
        
        const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
        const result = stmt.get('expenses_pin');
        
        if (result && result.value === pin) {
          res.json({ success: true });
        } else {
          res.json({ success: false, error: 'Invalid PIN' });
        }
      } catch (error) {
        console.error('Error checking expenses PIN:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/expenses/change-pin', (req, res) => {
      try {
        const { oldPin, newPin } = req.body;
        
        // Verify old PIN
        const checkStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
        const currentPin = checkStmt.get('expenses_pin');
        
        if (!currentPin || currentPin.value !== oldPin) {
          return res.status(400).json({ success: false, error: 'Current PIN is incorrect' });
        }
        
        // Update PIN
        const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
        updateStmt.run(newPin, 'expenses_pin');
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error changing expenses PIN:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/expenses/debug', (req, res) => {
      try {
        // Check if database is ready
        const databaseReady = db && typeof db.prepare === 'function';
        
        // Check if table exists
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_expenses'").get();
        
        // Count total expenses
        const countResult = db.prepare('SELECT COUNT(*) as count FROM daily_expenses').get();
        
        // Get all expenses
        const allExpenses = db.prepare('SELECT * FROM daily_expenses ORDER BY created_at DESC').all();
        
        res.json({ 
          success: true, 
          databaseReady,
          tableExists: !!tableCheck,
          totalCount: countResult.count,
          allExpenses: allExpenses
        });
      } catch (error) {
        console.error('Error in expenses debug:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Gift Cards API endpoints
    expressApp.get('/api/gift-cards', (req, res) => {
      try {
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        const { status, search } = req.query;
        let query = `
          SELECT gc.*, 
                 (SELECT COUNT(*) FROM gift_card_transactions gct WHERE gct.gift_card_id = gc.id) as transaction_count
          FROM gift_cards gc
          WHERE 1=1
        `;
        const params = [];
        
        if (status) {
          query += ' AND gc.status = ?';
          params.push(status);
        }
        
        if (search) {
          query += ' AND (gc.card_number LIKE ? OR gc.customer_name LIKE ? OR gc.customer_phone LIKE ?)';
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY gc.created_at DESC';
        
        const giftCards = db.prepare(query).all(...params);
        res.json(giftCards);
      } catch (error) {
        console.error('Error fetching gift cards:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/gift-cards', (req, res) => {
      try {
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        const { cardNumber, customerName, customerPhone, customerEmail, amountCents, expiresAt, notes } = req.body;
        
        // Generate card number if not provided
        const finalCardNumber = cardNumber || `GC${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        const result = db.prepare(`
          INSERT INTO gift_cards (card_number, customer_name, customer_phone, customer_email, 
                                 initial_amount_cents, remaining_amount_cents, expires_at, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(finalCardNumber, customerName, customerPhone, customerEmail, 
                amountCents, amountCents, expiresAt, notes);
        
        // Create initial transaction record
        db.prepare(`
          INSERT INTO gift_card_transactions (gift_card_id, transaction_type, amount_cents, notes)
          VALUES (?, 'purchase', ?, ?)
        `).run(result.lastInsertRowid, amountCents, 'Gift card created');
        
        res.json({ success: true, id: result.lastInsertRowid, cardNumber: finalCardNumber });
      } catch (error) {
        console.error('Error creating gift card:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/gift-cards/:id', (req, res) => {
      try {
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        const { id } = req.params;
        const giftCard = db.prepare(`
          SELECT gc.*, 
                 (SELECT COUNT(*) FROM gift_card_transactions gct WHERE gct.gift_card_id = gc.id) as transaction_count
          FROM gift_cards gc 
          WHERE gc.id = ?
        `).get(id);
        
        if (!giftCard) {
          return res.status(404).json({ error: 'Gift card not found' });
        }
        
        // Get transaction history
        const transactions = db.prepare(`
          SELECT gct.*, s.name as staff_name, e.work_date
          FROM gift_card_transactions gct
          LEFT JOIN staff s ON gct.staff_id = s.id
          LEFT JOIN entries e ON gct.entry_id = e.id
          WHERE gct.gift_card_id = ?
          ORDER BY gct.created_at DESC
        `).all(id);
        
        res.json({ ...giftCard, transactions });
      } catch (error) {
        console.error('Error fetching gift card:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.put('/api/gift-cards/:id', (req, res) => {
      try {
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        const { id } = req.params;
        const { customerName, customerPhone, customerEmail, status, expiresAt, notes } = req.body;
        
        db.prepare(`
          UPDATE gift_cards 
          SET customer_name = ?, customer_phone = ?, customer_email = ?, 
              status = ?, expires_at = ?, notes = ?, updated_at = datetime('now', 'utc')
          WHERE id = ?
        `).run(customerName, customerPhone, customerEmail, status, expiresAt, notes, id);
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error updating gift card:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.post('/api/gift-cards/:id/use', (req, res) => {
      try {
        const { id } = req.params;
        const { amountCents, entryId, staffId, notes } = req.body;
        
        console.log('API gift-cards use called with id:', id, 'body:', req.body);
        
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        // Get current gift card
        console.log('Querying gift card with id:', id);
        let giftCard;
        try {
          // First try with status column
          giftCard = db.prepare('SELECT * FROM gift_cards WHERE id = ? AND status = "active"').get(id);
          console.log('Found gift card with status:', giftCard);
        } catch (error) {
          console.log('Status column query failed, trying without status filter:', error.message);
          try {
            // Fallback: query without status filter if status column doesn't exist
            giftCard = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id);
            console.log('Found gift card without status filter:', giftCard);
          } catch (fallbackError) {
            console.error('Error querying gift card:', fallbackError);
            return res.status(500).json({ error: 'Database error: ' + fallbackError.message });
          }
        }
        
        if (!giftCard) {
          return res.status(404).json({ error: 'Gift card not found' });
        }
        
        // Check if gift card is active (either by status column or remaining amount)
        if (giftCard.status && giftCard.status !== 'active') {
          return res.status(404).json({ error: 'Gift card is not active' });
        }
        
        if (giftCard.remaining_amount_cents < amountCents) {
          return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        // Update remaining amount
        const newRemainingAmount = giftCard.remaining_amount_cents - amountCents;
        const newStatus = newRemainingAmount <= 0 ? 'used' : 'active';
        
        console.log('Updating gift card:', { id, newRemainingAmount, newStatus });
        try {
          if (newRemainingAmount <= 0) {
            // Auto-delete gift card when balance reaches 0
            console.log('Gift card balance is 0, auto-deleting...');
            
            // Delete all related transactions first
            db.prepare('DELETE FROM gift_card_transactions WHERE gift_card_id = ?').run(id);
            
            // Delete the gift card
            db.prepare('DELETE FROM gift_cards WHERE id = ?').run(id);
            
            console.log(`✅ Gift card ${giftCard.card_number} auto-deleted (balance = 0)`);
          } else {
            // Update remaining amount and status
            db.prepare(`
              UPDATE gift_cards 
              SET remaining_amount_cents = ?, status = ?, updated_at = datetime('now', 'utc')
              WHERE id = ?
            `).run(newRemainingAmount, newStatus, id);
            console.log('✅ Gift card updated successfully');
          }
        } catch (error) {
          console.error('Error updating gift card:', error);
          return res.status(500).json({ error: 'Database error updating gift card: ' + error.message });
        }
        
        // Create transaction record (only if gift card wasn't deleted)
        if (newRemainingAmount > 0) {
          db.prepare(`
            INSERT INTO gift_card_transactions (gift_card_id, transaction_type, amount_cents, entry_id, staff_id, notes)
            VALUES (?, 'usage', ?, ?, ?, ?)
          `).run(id, amountCents, entryId, staffId, notes || 'Gift card used for payment');
        }
        
        res.json({ 
          success: true, 
          remainingAmount: newRemainingAmount,
          status: newStatus,
          deleted: newRemainingAmount <= 0
        });
      } catch (error) {
        console.error('Error using gift card:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/gift-cards/search/:query', (req, res) => {
      try {
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        const { query } = req.params;
        let giftCards;
        try {
          // First try with status column
          giftCards = db.prepare(`
            SELECT id, card_number, customer_name, remaining_amount_cents, status
            FROM gift_cards 
            WHERE status = 'active' 
              AND (card_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)
            ORDER BY customer_name
          `).all(`%${query}%`, `%${query}%`, `%${query}%`);
        } catch (error) {
          console.log('Status column query failed, trying without status filter:', error.message);
          // Fallback: query without status filter if status column doesn't exist
          giftCards = db.prepare(`
            SELECT id, card_number, customer_name, remaining_amount_cents, status
            FROM gift_cards 
            WHERE (card_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)
            ORDER BY customer_name
          `).all(`%${query}%`, `%${query}%`, `%${query}%`);
        }
        
        res.json(giftCards);
      } catch (error) {
        console.error('Error searching gift cards:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.delete('/api/gift-cards/:id', (req, res) => {
      try {
        // Ensure gift card tables exist
        if (!ensureGiftCardTables()) {
          return res.status(500).json({ error: 'Failed to create gift card tables' });
        }
        
        const { id } = req.params;
        
        // Check if gift card exists
        const giftCard = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id);
        if (!giftCard) {
          return res.status(404).json({ error: 'Gift card not found' });
        }
        
        // Delete all related transactions first (due to foreign key constraints)
        db.prepare('DELETE FROM gift_card_transactions WHERE gift_card_id = ?').run(id);
        
        // Delete the gift card
        db.prepare('DELETE FROM gift_cards WHERE id = ?').run(id);
        
        console.log(`✅ Gift card ${giftCard.card_number} deleted successfully`);
        res.json({ success: true, message: 'Gift card deleted successfully' });
      } catch (error) {
        console.error('Error deleting gift card:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Transactions API endpoints
    expressApp.get('/api/transactions', (req, res) => {
      try {
        const { startDate, endDate, staffId, paymentMethod, limit = 100, offset = 0 } = req.query;
        
        let query = `
          SELECT e.*, s.name as staff_name 
          FROM entries e 
          JOIN staff s ON e.staff_id = s.id 
          WHERE 1=1
        `;
        let params = [];
        
        if (startDate) {
          query += ' AND e.work_date >= ?';
          params.push(startDate);
        }
        if (endDate) {
          query += ' AND e.work_date <= ?';
          params.push(endDate);
        }
        if (staffId) {
          query += ' AND e.staff_id = ?';
          params.push(staffId);
        }
        if (paymentMethod) {
          query += ' AND e.payment_method = ?';
          params.push(paymentMethod);
        }
        
        query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const transactions = db.prepare(query).all(...params);
        res.json(transactions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    expressApp.get('/api/transactions/summary', (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const summary = db.prepare(`
          SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(amount_cents) as total_cents,
            AVG(amount_cents) as avg_cents
          FROM entries 
          WHERE work_date BETWEEN ? AND ?
          GROUP BY payment_method
        `).all(startDate, endDate);
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Start server
    webServer = expressApp.listen(serverPort, '0.0.0.0', () => {
      localIP = getLocalIP();
      console.log(`🌐 Web server started!`);
      console.log(`📱 Local access: http://localhost:${serverPort}`);
      console.log(`🌍 Network access: http://${localIP}:${serverPort}`);
      console.log(`📋 Share this URL with other devices on the same WiFi network`);
    });
    
    return true;
  } catch (error) {
    console.error('Failed to start web server:', error);
    return false;
  }
}

// Function to stop web server
function stopWebServer() {
  if (webServer) {
    webServer.close();
    webServer = null;
    console.log('Web server stopped');
  }
}

function initDatabase() {
  try {
    console.log('Initializing database at:', dbPath);
    db = new Database(dbPath);
    
    // Test database connection
    db.prepare('SELECT 1').get();
    console.log('Database connection successful');
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Tạo bảng staff
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (datetime('now', 'utc'))
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
        created_at DATETIME DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (staff_id) REFERENCES staff (id)
      )
    `);
    
    // Tạo bảng staff_rates (lương mặc định)
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_rates (
        staff_id INTEGER PRIMARY KEY,
        default_daily_wage_cents INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now', 'utc')),
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
        created_at DATETIME DEFAULT (datetime('now', 'utc')),
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
        created_at DATETIME DEFAULT (datetime('now', 'utc')),
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
    
    // Tạo bảng daily_expenses
    try {
      console.log('Creating daily_expenses table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS daily_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          expense_date DATE NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT (datetime('now', 'utc')),
          updated_at DATETIME DEFAULT (datetime('now', 'utc'))
        )
      `);
      console.log('daily_expenses table created successfully');
    
    // Không tự động tạo test data nữa
    console.log('Daily expenses table ready');
    
    // Không xóa data nữa - để giữ lại data của user
    console.log('Daily expenses table initialized successfully');
    } catch (error) {
      console.error('Error creating daily_expenses table:', error);
    }
    
    // Tạo bảng gift_cards
    try {
      console.log('Creating gift_cards table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS gift_cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_number TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          customer_email TEXT,
          initial_amount_cents INTEGER NOT NULL,
          remaining_amount_cents INTEGER NOT NULL,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
          created_at DATETIME DEFAULT (datetime('now', 'utc')),
          updated_at DATETIME DEFAULT (datetime('now', 'utc')),
          expires_at DATETIME,
          notes TEXT
        )
      `);
      console.log('Gift cards table created successfully');
    } catch (error) {
      console.error('Error creating gift_cards table:', error);
    }
    
    // Migration: Đảm bảo table gift_cards tồn tại (cho database cũ)
    try {
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_cards'").get();
      if (!tableExists) {
        console.log('Gift cards table does not exist, creating...');
        db.exec(`
          CREATE TABLE gift_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_email TEXT,
            initial_amount_cents INTEGER NOT NULL,
            remaining_amount_cents INTEGER NOT NULL,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
            created_at DATETIME DEFAULT (datetime('now', 'utc')),
            updated_at DATETIME DEFAULT (datetime('now', 'utc')),
            expires_at DATETIME,
            notes TEXT
          )
        `);
        console.log('Gift cards table created via migration');
      }
    } catch (error) {
      console.error('Error in gift_cards migration:', error);
    }
    
    // Tạo bảng gift_card_transactions để theo dõi lịch sử sử dụng
    try {
      console.log('Creating gift_card_transactions table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS gift_card_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gift_card_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'adjustment')),
          amount_cents INTEGER NOT NULL,
          entry_id INTEGER,
          staff_id INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT (datetime('now', 'utc')),
          FOREIGN KEY (gift_card_id) REFERENCES gift_cards (id),
          FOREIGN KEY (entry_id) REFERENCES entries (id),
          FOREIGN KEY (staff_id) REFERENCES staff (id)
        )
      `);
      console.log('Gift card transactions table created successfully');
    } catch (error) {
      console.error('Error creating gift_card_transactions table:', error);
    }
    
    // Migration: Đảm bảo table gift_card_transactions tồn tại (cho database cũ)
    try {
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_card_transactions'").get();
      if (!tableExists) {
        console.log('Gift card transactions table does not exist, creating...');
        db.exec(`
          CREATE TABLE gift_card_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gift_card_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'adjustment')),
            amount_cents INTEGER NOT NULL,
            entry_id INTEGER,
            staff_id INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT (datetime('now', 'utc')),
            FOREIGN KEY (gift_card_id) REFERENCES gift_cards (id),
            FOREIGN KEY (entry_id) REFERENCES entries (id),
            FOREIGN KEY (staff_id) REFERENCES staff (id)
          )
        `);
        console.log('Gift card transactions table created via migration');
      }
    } catch (error) {
      console.error('Error in gift_card_transactions migration:', error);
    }
    
    // Final check: Ensure both gift card tables exist
    try {
      const giftCardsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_cards'").get();
      const giftCardTransactionsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_card_transactions'").get();
      
      if (!giftCardsTableExists) {
        console.error('CRITICAL: gift_cards table does not exist after initialization');
        // Force create the table
        console.log('Force creating gift_cards table...');
        db.exec(`
          CREATE TABLE gift_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_email TEXT,
            initial_amount_cents INTEGER NOT NULL,
            remaining_amount_cents INTEGER NOT NULL,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
            created_at DATETIME DEFAULT (datetime('now', 'utc')),
            updated_at DATETIME DEFAULT (datetime('now', 'utc')),
            expires_at DATETIME,
            notes TEXT
          )
        `);
        console.log('✅ gift_cards table force created');
      }
      
      if (!giftCardTransactionsTableExists) {
        console.error('CRITICAL: gift_card_transactions table does not exist after initialization');
        // Force create the table
        console.log('Force creating gift_card_transactions table...');
        db.exec(`
          CREATE TABLE gift_card_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gift_card_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'adjustment')),
            amount_cents INTEGER NOT NULL,
            entry_id INTEGER,
            staff_id INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT (datetime('now', 'utc')),
            FOREIGN KEY (gift_card_id) REFERENCES gift_cards (id),
            FOREIGN KEY (entry_id) REFERENCES entries (id),
            FOREIGN KEY (staff_id) REFERENCES staff (id)
          )
        `);
        console.log('✅ gift_card_transactions table force created');
      }
      
      if (giftCardsTableExists && giftCardTransactionsTableExists) {
        console.log('✅ Gift card tables verified successfully');
      }
    } catch (error) {
      console.error('Error verifying gift card tables:', error);
    }
    
      // Migration: Add status column if it doesn't exist
      try {
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_cards'").get();
        
        if (tableExists) {
          const columns = db.prepare("PRAGMA table_info(gift_cards)").all();
          console.log('gift_cards table columns:', columns.map(col => col.name));
          const hasStatusColumn = columns.some(col => col.name === 'status');
          
          if (!hasStatusColumn) {
            console.log('Adding status column to gift_cards table...');
            db.exec(`ALTER TABLE gift_cards ADD COLUMN status TEXT DEFAULT 'active'`);
            console.log('✅ status column added to gift_cards table');
            
            // Update existing records to have 'active' status
            db.exec(`UPDATE gift_cards SET status = 'active' WHERE status IS NULL`);
            console.log('✅ Updated existing gift cards with active status');
          } else {
            console.log('✅ status column already exists in gift_cards table');
          }
        }
      } catch (error) {
      console.error('Error adding status column:', error);
    }
    
    // Khởi tạo mật khẩu mặc định cho Payroll
    try {
      const existingPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('payroll_password');
      if (!existingPassword) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('payroll_password', 'admin123');
        console.log('Initialized default payroll password: admin123');
      }
    } catch (error) {
      console.error('Error initializing payroll password:', error);
    }
    
    // Khởi tạo mã PIN mặc định cho Expenses
    try {
      const existingPin = db.prepare('SELECT value FROM settings WHERE key = ?').get('expenses_pin');
      if (!existingPin) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('expenses_pin', '100910');
        console.log('Initialized default expenses PIN: 123456');
      }
    } catch (error) {
      console.error('Error initializing expenses PIN:', error);
    }
    
    // Seed default settings
    try {
      const checkPassword = db.prepare('SELECT value FROM settings WHERE key = ?').get('payroll_password');
      if (!checkPassword) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('payroll_password', 'admin123');
      }
      
      const checkRent = db.prepare('SELECT value FROM settings WHERE key = ?').get('rent_amount_cents');
      if (!checkRent) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('rent_amount_cents', '40000'); // $400.00
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('rent_period', 'daily');
      } else {
        // Cập nhật giá trị cũ nếu khác với giá trị mong muốn
        const currentRent = parseInt(checkRent.value);
        if (currentRent !== 40000) {
          console.log(`Updating rent from ${currentRent} to 40000 cents`);
          db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('40000', 'rent_amount_cents');
        }
      }
    } catch (error) {
      console.log('Settings already initialized');
    }
    
    // Đảm bảo tất cả staff đều có rate mặc định
    try {
      const staffIds = db.prepare('SELECT id FROM staff').all();
      staffIds.forEach(staff => {
        const existingRate = db.prepare('SELECT id FROM staff_rates WHERE staff_id = ?').get(staff.id);
        if (!existingRate) {
          console.log(`Creating default rate for staff ${staff.id}`);
          db.prepare('INSERT OR IGNORE INTO staff_rates (staff_id, default_daily_wage_cents) VALUES (?, ?)')
            .run(staff.id, 0); // $0.00 mặc định
        }
      });
      console.log('Ensured default rates for all staff');
    } catch (error) {
      console.log('Error ensuring default rates:', error.message);
    }
    
    // Không tạo dữ liệu mẫu - để user tự tạo khi cần
    
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
    
    // Migration: Thêm cột payment_method nếu chưa có
    try {
      db.exec(`ALTER TABLE entries ADD COLUMN payment_method TEXT DEFAULT 'card'`);
      console.log('Added payment_method column to entries table');
    } catch (error) {
      // Cột đã tồn tại, bỏ qua lỗi
      if (!error.message.includes('duplicate column name')) {
        console.error('Error adding payment_method column:', error);
      }
    }
    
    // Migration: Cập nhật created_at để sử dụng UTC cho các bảng đã tồn tại
    try {
      // Lưu ý: SQLite không hỗ trợ ALTER COLUMN DEFAULT, nên chúng ta sẽ tạo trigger
      // để đảm bảo thời gian mới được tạo với UTC
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS entries_created_at_utc 
        AFTER INSERT ON entries 
        WHEN NEW.created_at IS NULL
        BEGIN
          UPDATE entries SET created_at = datetime('now', 'utc') WHERE id = NEW.id;
        END
      `);
      console.log('Added UTC trigger for entries table');
    } catch (error) {
      console.error('Error adding UTC trigger:', error);
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

// Helper function to ensure gift card tables exist
function ensureGiftCardTables() {
  try {
    const giftCardsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_cards'").get();
    const giftCardTransactionsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_card_transactions'").get();
    
    if (!giftCardsTableExists) {
      console.log('Creating gift_cards table on demand...');
      db.exec(`
        CREATE TABLE gift_cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_number TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          customer_email TEXT,
          initial_amount_cents INTEGER NOT NULL,
          remaining_amount_cents INTEGER NOT NULL,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
          created_at DATETIME DEFAULT (datetime('now', 'utc')),
          updated_at DATETIME DEFAULT (datetime('now', 'utc')),
          expires_at DATETIME,
          notes TEXT
        )
      `);
      console.log('✅ gift_cards table created on demand');
    }
    
    if (!giftCardTransactionsTableExists) {
      console.log('Creating gift_card_transactions table on demand...');
      db.exec(`
        CREATE TABLE gift_card_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gift_card_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'adjustment')),
          amount_cents INTEGER NOT NULL,
          entry_id INTEGER,
          staff_id INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT (datetime('now', 'utc')),
          FOREIGN KEY (gift_card_id) REFERENCES gift_cards (id),
          FOREIGN KEY (entry_id) REFERENCES entries (id),
          FOREIGN KEY (staff_id) REFERENCES staff (id)
        )
      `);
      console.log('✅ gift_card_transactions table created on demand');
    }
    
    // Check if status column exists in gift_cards table
    if (giftCardsTableExists) {
      const columns = db.prepare("PRAGMA table_info(gift_cards)").all();
      console.log('gift_cards table columns:', columns.map(col => col.name));
      const hasStatusColumn = columns.some(col => col.name === 'status');
      
      if (!hasStatusColumn) {
        console.log('Adding status column to existing gift_cards table...');
        db.exec(`ALTER TABLE gift_cards ADD COLUMN status TEXT DEFAULT 'active'`);
        console.log('✅ status column added to gift_cards table');
        
        // Update existing records to have 'active' status
        db.exec(`UPDATE gift_cards SET status = 'active' WHERE status IS NULL`);
        console.log('✅ Updated existing gift cards with active status');
      } else {
        console.log('✅ status column already exists in gift_cards table');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring gift card tables:', error);
    return false;
  }
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

// IPC handlers for network info
ipcMain.handle('get-network-info', async () => {
  // Ensure localIP is set
  if (!localIP) {
    localIP = getLocalIP();
  }
  
  return {
    success: true,
    localIP: localIP,
    port: serverPort,
    url: localIP ? `http://${localIP}:${serverPort}` : null
  };
});

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
    const newStaffId = result.lastInsertRowid;
    
    // Tự động tạo rate mặc định cho staff mới
    db.prepare('INSERT OR IGNORE INTO staff_rates (staff_id, default_daily_wage_cents) VALUES (?, ?)')
      .run(newStaffId, 0); // $0.00 mặc định
    
    // Không tạo shifts mẫu - để staff tự tạo khi cần
    
    return { success: true, id: newStaffId };
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
    
    // Kiểm tra xem staff có dữ liệu liên quan không
    const entriesCount = db.prepare('SELECT COUNT(*) as count FROM entries WHERE staff_id = ?').get(id).count;
    const shiftsCount = db.prepare('SELECT COUNT(*) as count FROM shifts WHERE staff_id = ?').get(id).count;
    const workScheduleCount = db.prepare('SELECT COUNT(*) as count FROM work_schedule WHERE staff_id = ?').get(id).count;
    
    const totalRelatedData = entriesCount + shiftsCount + workScheduleCount;
    
    if (totalRelatedData > 0) {
      // Nếu có dữ liệu liên quan, chỉ deactivate
      const stmt = db.prepare('UPDATE staff SET active = 0 WHERE id = ?');
      stmt.run(id);
      return { success: true, message: 'Staff deactivated (has existing data)' };
    } else {
      // Nếu không có dữ liệu liên quan, xóa hoàn toàn
      // Xóa staff_rates trước (vì có foreign key constraint)
      db.prepare('DELETE FROM staff_rates WHERE staff_id = ?').run(id);
      
      // Sau đó xóa staff
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

ipcMain.handle('add-entry', (event, staffId, amountCents, note, workDate, paymentMethod) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare(`
      INSERT INTO entries (staff_id, amount_cents, note, work_date, payment_method, created_at) 
      VALUES (?, ?, ?, ?, ?, datetime('now', 'utc'))
    `);
    const result = stmt.run(staffId, amountCents, note, workDate, paymentMethod || 'card');
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding entry:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-entry', (event, id, amountCents, note, paymentMethod) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    const stmt = db.prepare('UPDATE entries SET amount_cents = ?, note = ?, payment_method = ? WHERE id = ?');
    stmt.run(amountCents, note, paymentMethod || 'card', id);
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
    
    // Get all dates with entries, shifts, or expenses
    const dates = db.prepare(`
      SELECT DISTINCT work_date
      FROM (
        SELECT work_date FROM entries WHERE work_date BETWEEN ? AND ?
        UNION
        SELECT work_date FROM shifts WHERE work_date BETWEEN ? AND ?
        UNION
        SELECT expense_date as work_date FROM daily_expenses WHERE expense_date BETWEEN ? AND ?
      )
      ORDER BY work_date
    `).all(startDate, endDate, startDate, endDate, startDate, endDate);
    
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
      
      // Get expenses for this date
      const expensesRow = db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) as total
        FROM daily_expenses
        WHERE expense_date = ?
      `).get(work_date);
      
      const grossCents = grossRow.total;
      const wagesCents = wagesRow.total;
      const expensesCents = expensesRow.total;
      // 10% GST on gross
      const gstCents = Math.round(grossCents * 0.10);
      const netCents = grossCents - gstCents - wagesCents - rentPerDay - expensesCents;
      
      return {
        date: work_date,
        gross_cents: grossCents,
        wages_cents: wagesCents,
        rent_allocated_cents: rentPerDay,
        expenses_cents: expensesCents,
        gst_cents: gstCents,
        net_cents: netCents
      };
    });
    
    return summaries;
  } catch (error) {
    console.error('Error getting income summary:', error);
    return [];
  }
});

// IPC Handlers cho Daily Expenses
ipcMain.handle('expenses:getAll', async (event, date, startDate, endDate) => {
  try {
    console.log('expenses:getAll called with:', { date, startDate, endDate });
    
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    
    let query, params;
    
    if (date) {
      query = 'SELECT * FROM daily_expenses WHERE expense_date = ? ORDER BY created_at DESC';
      params = [date];
      console.log('Using date filter query:', query, 'with params:', params);
    } else if (startDate && endDate) {
      query = 'SELECT * FROM daily_expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, created_at DESC';
      params = [startDate, endDate];
      console.log('Using date range filter query:', query, 'with params:', params);
    } else {
      query = 'SELECT * FROM daily_expenses ORDER BY expense_date DESC, created_at DESC LIMIT 100';
      params = [];
      console.log('Using default query:', query, 'with params:', params);
    }
    
    const expenses = db.prepare(query).all(...params);
    console.log('Found expenses:', expenses.length);
    console.log('Expenses data sample:', expenses.slice(0, 2));
    return { success: true, data: expenses };
  } catch (error) {
    console.error('Error getting expenses:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:add', async (event, expenseData) => {
  try {
    console.log('expenses:add called with data:', expenseData);
    
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    
    const { expense_date, category, description, amount_cents, notes } = expenseData;
    console.log('Parsed fields:', { expense_date, category, description, amount_cents, notes });
    
    if (!expense_date || !category || !description || !amount_cents) {
      console.error('Missing required fields:', { expense_date, category, description, amount_cents });
      return { success: false, error: 'Missing required fields' };
    }
    
    if (amount_cents <= 0) {
      console.error('Invalid amount:', amount_cents);
      return { success: false, error: 'Amount must be greater than 0' };
    }
    
    console.log('Inserting expense into database...');
    console.log('SQL parameters:', [expense_date, category, description, amount_cents, notes || '']);
    
    const result = db.prepare(`
      INSERT INTO daily_expenses (expense_date, category, description, amount_cents, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(expense_date, category, description, amount_cents, notes || '');
    
    console.log('Expense inserted with ID:', result.lastInsertRowid);
    console.log('Changes made:', result.changes);
    
    // Verify the insert by querying the database
    const verifyQuery = db.prepare('SELECT * FROM daily_expenses WHERE id = ?').get(result.lastInsertRowid);
    console.log('Verification query result:', verifyQuery);
    
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { success: false, error: error.message };
  }
});

// Debug function to check database
ipcMain.handle('expenses:debug', async (event) => {
  try {
    console.log('=== EXPENSES DEBUG ===');
    
    // Check if database is ready
    console.log('Database ready:', isDatabaseReady());
    
    // Check if table exists
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='daily_expenses'").get();
    console.log('Table exists:', tableCheck);
    
    // Count total expenses
    const countResult = db.prepare('SELECT COUNT(*) as count FROM daily_expenses').get();
    console.log('Total expenses in database:', countResult.count);
    
    // Get all expenses
    const allExpenses = db.prepare('SELECT * FROM daily_expenses ORDER BY created_at DESC').all();
    console.log('All expenses:', allExpenses);
    
    return { 
      success: true, 
      databaseReady: isDatabaseReady(),
      tableExists: !!tableCheck,
      totalCount: countResult.count,
      allExpenses: allExpenses
    };
  } catch (error) {
    console.error('Error in debug:', error);
    return { success: false, error: error.message };
  }
});

// PIN Management for Expenses
ipcMain.handle('expenses:checkPin', async (event, pin) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get('expenses_pin');
    
    if (result && result.value === pin) {
      return { success: true };
    } else {
      return { success: false, error: 'Invalid PIN' };
    }
  } catch (error) {
    console.error('Error checking expenses PIN:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:changePin', async (event, oldPin, newPin) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Verify old PIN
    const checkStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const currentPin = checkStmt.get('expenses_pin');
    
    if (!currentPin || currentPin.value !== oldPin) {
      return { success: false, error: 'Current PIN is incorrect' };
    }
    
    // Update PIN
    const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
    updateStmt.run(newPin, 'expenses_pin');
    
    return { success: true };
  } catch (error) {
    console.error('Error changing expenses PIN:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:update', async (event, id, expenseData) => {
  try {
    console.log('expenses:update called with:', { id, expenseData });
    
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    
    const { expense_date, category, description, amount_cents, notes } = expenseData;
    
    if (!expense_date || !category || !description || !amount_cents) {
      return { success: false, error: 'Missing required fields' };
    }
    
    if (amount_cents <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return { success: false, error: 'Invalid expense ID' };
    }
    
    const expenseId = parseInt(id);
    const params = [expense_date, category, description, amount_cents, notes ? notes : '', expenseId];
    console.log('UPDATE parameters:', params);
    
    const result = db.prepare(`
      UPDATE daily_expenses 
      SET expense_date = ?, category = ?, description = ?, amount_cents = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(...params);
    
    console.log('UPDATE result:', result);
    
    if (result.changes === 0) {
      return { success: false, error: 'Expense not found' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:delete', async (event, id) => {
  try {
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    
    const result = db.prepare('DELETE FROM daily_expenses WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return { success: false, error: 'Expense not found' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getSummary', async (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) {
      console.error('Database not ready');
      return { success: false, error: 'Database not ready' };
    }
    
    if (!startDate || !endDate) {
      return { success: false, error: 'Start date and end date are required' };
    }
    
    const summary = db.prepare(`
      SELECT 
        expense_date,
        category,
        SUM(amount_cents) as total_cents,
        COUNT(*) as count
      FROM daily_expenses 
      WHERE expense_date BETWEEN ? AND ?
      GROUP BY expense_date, category
      ORDER BY expense_date DESC, total_cents DESC
    `).all(startDate, endDate);
    
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting expenses summary:', error);
    return { success: false, error: error.message };
  }
});

// Gift Cards IPC handlers
ipcMain.handle('gift-cards:getAll', async (event, status, search) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    let query = `
      SELECT gc.*, 
             (SELECT COUNT(*) FROM gift_card_transactions gct WHERE gct.gift_card_id = gc.id) as transaction_count
      FROM gift_cards gc
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND gc.status = ?';
      params.push(status);
    }
    
    if (search) {
      query += ' AND (gc.card_number LIKE ? OR gc.customer_name LIKE ? OR gc.customer_phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY gc.created_at DESC';
    
    const giftCards = db.prepare(query).all(...params);
    return { success: true, data: giftCards };
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gift-cards:create', async (event, giftCardData) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    const { cardNumber, customerName, customerPhone, customerEmail, amountCents, expiresAt, notes } = giftCardData;
    
    // Generate card number if not provided
    const finalCardNumber = cardNumber || `GC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const result = db.prepare(`
      INSERT INTO gift_cards (card_number, customer_name, customer_phone, customer_email, 
                             initial_amount_cents, remaining_amount_cents, expires_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(finalCardNumber, customerName, customerPhone, customerEmail, 
            amountCents, amountCents, expiresAt, notes);
    
    // Create initial transaction record
    db.prepare(`
      INSERT INTO gift_card_transactions (gift_card_id, transaction_type, amount_cents, notes)
      VALUES (?, 'purchase', ?, ?)
    `).run(result.lastInsertRowid, amountCents, 'Gift card created');
    
    return { success: true, id: result.lastInsertRowid, cardNumber: finalCardNumber };
  } catch (error) {
    console.error('Error creating gift card:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gift-cards:getById', async (event, id) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    const giftCard = db.prepare(`
      SELECT gc.*, 
             (SELECT COUNT(*) FROM gift_card_transactions gct WHERE gct.gift_card_id = gc.id) as transaction_count
      FROM gift_cards gc 
      WHERE gc.id = ?
    `).get(id);
    
    if (!giftCard) {
      return { success: false, error: 'Gift card not found' };
    }
    
    // Get transaction history
    const transactions = db.prepare(`
      SELECT gct.*, s.name as staff_name, e.work_date
      FROM gift_card_transactions gct
      LEFT JOIN staff s ON gct.staff_id = s.id
      LEFT JOIN entries e ON gct.entry_id = e.id
      WHERE gct.gift_card_id = ?
      ORDER BY gct.created_at DESC
    `).all(id);
    
    return { success: true, data: { ...giftCard, transactions } };
  } catch (error) {
    console.error('Error fetching gift card:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gift-cards:update', async (event, id, updateData) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    const { customerName, customerPhone, customerEmail, status, expiresAt, notes } = updateData;
    
    db.prepare(`
      UPDATE gift_cards 
      SET customer_name = ?, customer_phone = ?, customer_email = ?, 
          status = ?, expires_at = ?, notes = ?, updated_at = datetime('now', 'utc')
      WHERE id = ?
    `).run(customerName, customerPhone, customerEmail, status, expiresAt, notes, id);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating gift card:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gift-cards:use', async (event, id, usageData) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    console.log('gift-cards:use called with id:', id, 'usageData:', usageData);
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    const { amountCents, entryId, staffId, notes } = usageData;
    
    // Get current gift card
    console.log('Querying gift card with id:', id);
    let giftCard;
    try {
      // First try with status column
      giftCard = db.prepare('SELECT * FROM gift_cards WHERE id = ? AND status = "active"').get(id);
      console.log('Found gift card with status:', giftCard);
    } catch (error) {
      console.log('Status column query failed, trying without status filter:', error.message);
      try {
        // Fallback: query without status filter if status column doesn't exist
        giftCard = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id);
        console.log('Found gift card without status filter:', giftCard);
      } catch (fallbackError) {
        console.error('Error querying gift card:', fallbackError);
        return { success: false, error: 'Database error: ' + fallbackError.message };
      }
    }
    
    if (!giftCard) {
      return { success: false, error: 'Gift card not found' };
    }
    
    // Check if gift card is active (either by status column or remaining amount)
    if (giftCard.status && giftCard.status !== 'active') {
      return { success: false, error: 'Gift card is not active' };
    }
    
    if (giftCard.remaining_amount_cents < amountCents) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    // Update remaining amount
    const newRemainingAmount = giftCard.remaining_amount_cents - amountCents;
    const newStatus = newRemainingAmount <= 0 ? 'used' : 'active';
    
    console.log('Updating gift card:', { id, newRemainingAmount, newStatus });
    try {
      db.prepare(`
        UPDATE gift_cards 
        SET remaining_amount_cents = ?, status = ?, updated_at = datetime('now', 'utc')
        WHERE id = ?
      `).run(newRemainingAmount, newStatus, id);
      console.log('✅ Gift card updated successfully');
    } catch (error) {
      console.error('Error updating gift card:', error);
      return { success: false, error: 'Database error updating gift card: ' + error.message };
    }
    
    // Create transaction record
    db.prepare(`
      INSERT INTO gift_card_transactions (gift_card_id, transaction_type, amount_cents, entry_id, staff_id, notes)
      VALUES (?, 'usage', ?, ?, ?, ?)
    `).run(id, amountCents, entryId, staffId, notes || 'Gift card used for payment');
    
    return { 
      success: true, 
      remainingAmount: newRemainingAmount,
      status: newStatus
    };
  } catch (error) {
    console.error('Error using gift card:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gift-cards:search', async (event, query) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    let giftCards;
    try {
      // First try with status column
      giftCards = db.prepare(`
        SELECT id, card_number, customer_name, remaining_amount_cents, status
        FROM gift_cards 
        WHERE status = 'active' 
          AND (card_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)
        ORDER BY customer_name
      `).all(`%${query}%`, `%${query}%`, `%${query}%`);
    } catch (error) {
      console.log('Status column query failed, trying without status filter:', error.message);
      // Fallback: query without status filter if status column doesn't exist
      giftCards = db.prepare(`
        SELECT id, card_number, customer_name, remaining_amount_cents, status
        FROM gift_cards 
        WHERE (card_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)
        ORDER BY customer_name
      `).all(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    return { success: true, data: giftCards };
  } catch (error) {
    console.error('Error searching gift cards:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('gift-cards:delete', async (event, id) => {
  try {
    if (!isDatabaseReady()) {
      return { success: false, error: 'Database not ready' };
    }
    
    // Ensure gift card tables exist
    if (!ensureGiftCardTables()) {
      return { success: false, error: 'Failed to create gift card tables' };
    }
    
    // Check if gift card exists
    const giftCard = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id);
    if (!giftCard) {
      return { success: false, error: 'Gift card not found' };
    }
    
    // Delete all related transactions first (due to foreign key constraints)
    db.prepare('DELETE FROM gift_card_transactions WHERE gift_card_id = ?').run(id);
    
    // Delete the gift card
    db.prepare('DELETE FROM gift_cards WHERE id = ?').run(id);
    
    console.log(`✅ Gift card ${giftCard.card_number} deleted successfully`);
    return { success: true, message: 'Gift card deleted successfully' };
  } catch (error) {
    console.error('Error in gift-cards:delete:', error);
    return { success: false, error: error.message };
  }
});

// Transactions IPC handlers
ipcMain.handle('get-transactions', (event, startDate, endDate, staffId, paymentMethod, limit, offset) => {
  try {
    if (!isDatabaseReady()) return [];
    
    let query = `
      SELECT e.*, s.name as staff_name 
      FROM entries e 
      JOIN staff s ON e.staff_id = s.id 
      WHERE 1=1
    `;
    let params = [];
    
    if (startDate) {
      query += ' AND e.work_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND e.work_date <= ?';
      params.push(endDate);
    }
    if (staffId) {
      query += ' AND e.staff_id = ?';
      params.push(staffId);
    }
    if (paymentMethod) {
      query += ' AND e.payment_method = ?';
      params.push(paymentMethod);
    }
    
    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit || 100, offset || 0);
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
});

ipcMain.handle('get-transactions-summary', (event, startDate, endDate) => {
  try {
    if (!isDatabaseReady()) return [];
    
    const summary = db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount_cents) as total_cents,
        AVG(amount_cents) as avg_cents
      FROM entries 
      WHERE work_date BETWEEN ? AND ?
      GROUP BY payment_method
    `).all(startDate, endDate);
    
    return summary;
  } catch (error) {
    console.error('Error getting transactions summary:', error);
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
    
    // Start web server for network access
    console.log('Starting web server for network access...');
    const serverStarted = startWebServer();
    if (serverStarted) {
      console.log('✅ Web server is running!');
      console.log(`📱 Local: http://localhost:${serverPort}`);
      console.log(`🌍 Network: http://${localIP}:${serverPort}`);
    } else {
      console.log('⚠️ Failed to start web server, but app will continue');
    }
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
    stopWebServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopWebServer();
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
