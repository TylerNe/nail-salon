const { contextBridge, ipcRenderer } = require('electron');

// Expose API an toàn cho renderer process
contextBridge.exposeInMainWorld('api', {
  // Network Info
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
  
  // Staff Management
  getStaff: () => ipcRenderer.invoke('get-staff'),
  addStaff: (name) => ipcRenderer.invoke('add-staff', name),
  updateStaff: (id, name) => ipcRenderer.invoke('update-staff', id, name),
  deleteStaff: (id) => ipcRenderer.invoke('delete-staff', id),
  
  // Entries Management
  getEntries: (startDate, endDate) => ipcRenderer.invoke('get-entries', startDate, endDate),
  addEntry: (staffId, amountCents, note, workDate, paymentMethod) => 
    ipcRenderer.invoke('add-entry', staffId, amountCents, note, workDate, paymentMethod),
  updateEntry: (id, amountCents, note, paymentMethod) => 
    ipcRenderer.invoke('update-entry', id, amountCents, note, paymentMethod),
  deleteEntry: (id) => ipcRenderer.invoke('delete-entry', id),
  
  // Statistics
  getStatistics: (period, startDate, endDate) => 
    ipcRenderer.invoke('get-statistics', period, startDate, endDate),
  
  // Export
  exportData: (data, filename) => ipcRenderer.invoke('export-data', data, filename),
  
  // Payroll & Shifts - Password
  payrollCheckPassword: (password) => ipcRenderer.invoke('payroll:checkPassword', password),
  payrollChangePassword: (oldPassword, newPassword) => 
    ipcRenderer.invoke('payroll:changePassword', oldPassword, newPassword),
  
  // Payroll & Shifts - Rates
  ratesGetAll: () => ipcRenderer.invoke('rates:getAll'),
  ratesUpsert: (staffId, wageCents) => ipcRenderer.invoke('rates:upsert', staffId, wageCents),
  
  // Payroll & Shifts - Shifts
  shiftsListByDate: (workDate) => ipcRenderer.invoke('shifts:listByDate', workDate),
  shiftsUpsert: (staffId, workDate, wageCents, note) => 
    ipcRenderer.invoke('shifts:upsert', staffId, workDate, wageCents, note),
  shiftsDelete: (staffId, workDate) => ipcRenderer.invoke('shifts:delete', staffId, workDate),
  
  // Payroll & Shifts - Settings
  settingsGetRent: () => ipcRenderer.invoke('settings:getRent'),
  settingsUpdateRent: (amountCents, period) => 
    ipcRenderer.invoke('settings:updateRent', amountCents, period),
  
  // Payroll & Shifts - Income
  incomeGetSummary: (startDate, endDate) => ipcRenderer.invoke('income:getSummary', startDate, endDate),
  
  // Daily Expenses
  expensesGetAll: (date, startDate, endDate) => ipcRenderer.invoke('expenses:getAll', date, startDate, endDate),
  expensesAdd: (expenseData) => ipcRenderer.invoke('expenses:add', expenseData),
  expensesUpdate: (id, expenseData) => ipcRenderer.invoke('expenses:update', id, expenseData),
  expensesDelete: (id) => ipcRenderer.invoke('expenses:delete', id),
  expensesGetSummary: (startDate, endDate) => ipcRenderer.invoke('expenses:getSummary', startDate, endDate),
  expensesDebug: () => ipcRenderer.invoke('expenses:debug'),
  expensesCheckPin: (pin) => ipcRenderer.invoke('expenses:checkPin', pin),
  expensesChangePin: (oldPin, newPin) => ipcRenderer.invoke('expenses:changePin', oldPin, newPin),
  
  // Work Schedule Management
  getWorkSchedule: (workDate) => ipcRenderer.invoke('get-work-schedule', workDate),
  updateWorkSchedule: (staffId, workDate, isWorking) => 
    ipcRenderer.invoke('update-work-schedule', staffId, workDate, isWorking),
  
  // Transactions Management
  getTransactions: (startDate, endDate, staffId, paymentMethod, limit, offset) => 
    ipcRenderer.invoke('get-transactions', startDate, endDate, staffId, paymentMethod, limit, offset),
  getTransactionsSummary: (startDate, endDate) => 
    ipcRenderer.invoke('get-transactions-summary', startDate, endDate),
  
  // Gift Cards Management
  giftCardsGetAll: (status, search) => ipcRenderer.invoke('gift-cards:getAll', status, search),
  giftCardsCreate: (giftCardData) => ipcRenderer.invoke('gift-cards:create', giftCardData),
  giftCardsGetById: (id) => ipcRenderer.invoke('gift-cards:getById', id),
  giftCardsUpdate: (id, updateData) => ipcRenderer.invoke('gift-cards:update', id, updateData),
  giftCardsUse: (id, usageData) => ipcRenderer.invoke('gift-cards:use', id, usageData),
  giftCardsDelete: (id) => ipcRenderer.invoke('gift-cards:delete', id),
  giftCardsSearch: (query) => ipcRenderer.invoke('gift-cards:search', query),
  
  // Utility functions
  formatCurrency: (cents) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(cents / 100);
  },
  
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  },
  
  parseCurrency: (value) => {
    // Chuyển đổi string thành số cents (nhân với 100 vì AUD thường không dùng cents)
    if (typeof value === 'string') {
      // Loại bỏ ký tự không phải số và dấu thập phân
      const cleanValue = value.replace(/[^\d.]/g, '');
      const numValue = parseFloat(cleanValue) || 0;
      return Math.round(numValue * 100); // Chuyển thành cents
    }
    return value || 0;
  },
  
  // Validation helpers
  validateAmount: (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },
  
  validateDate: (date) => {
    return !isNaN(Date.parse(date));
  }
});

// Expose version info
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
});
