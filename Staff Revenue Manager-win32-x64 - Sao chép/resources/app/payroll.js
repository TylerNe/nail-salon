// ==================== PAYROLL & SHIFTS MODULE ====================

let isPayrollUnlocked = false;
let currentPayrollTab = 'shifts';
let currentShiftsDate = null;
let shiftsData = [];
let ratesData = [];
let incomeData = [];
let rentSettings = { amount: 40000, period: 'daily' };

// Password Unlock Handler
document.getElementById('unlockPayrollForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const password = document.getElementById('payrollPassword').value;
    
    const isValid = await window.api.payrollCheckPassword(password);
    
    if (isValid) {
        isPayrollUnlocked = true;
        document.getElementById('payrollLockScreen').style.display = 'none';
        document.getElementById('payrollContent').style.display = 'block';
        document.getElementById('payrollPassword').value = '';
        showAlert('Mở khóa thành công!', 'success');
        
        // Load initial data
        await loadPayrollData();
    } else {
        showAlert('Mật khẩu không đúng!', 'error');
        document.getElementById('payrollPassword').value = '';
    }
});

// Lock Payroll Handler
document.getElementById('lockPayrollBtn')?.addEventListener('click', function() {
    isPayrollUnlocked = false;
    document.getElementById('payrollLockScreen').style.display = 'flex';
    document.getElementById('payrollContent').style.display = 'none';
    showAlert('Đã khóa Payroll & Shifts', 'info');
});

// Change Password Form Handler
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
        showAlert('Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('Mật khẩu mới phải có ít nhất 6 ký tự!', 'warning');
        return;
    }
    
    const result = await window.api.payrollChangePassword(oldPassword, newPassword);
    
    if (result.success) {
        showAlert('Đổi mật khẩu thành công!', 'success');
        // Clear form
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } else {
        showAlert(result.error || 'Đổi mật khẩu thất bại!', 'error');
    }
});

// Quick Change Password Button (Header)
document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
    // Switch to Settings tab
    switchPayrollTab('settings-payroll');
    // Focus on old password field
    setTimeout(() => {
        document.getElementById('oldPassword')?.focus();
    }, 100);
});

// Payroll Sub-tab Navigation
document.querySelectorAll('.payroll-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tab = this.dataset.payrollTab;
        switchPayrollTab(tab);
    });
});

function switchPayrollTab(tab) {
    currentPayrollTab = tab;
    
    // Update button states
    document.querySelectorAll('.payroll-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.payrollTab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Update content visibility
    document.querySelectorAll('.payroll-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(tab);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Load data for the selected tab
    if (tab === 'shifts') {
        loadShiftsForDate(currentShiftsDate || getTodayDate());
    } else if (tab === 'rates') {
        loadRatesData();
    } else if (tab === 'income') {
        // Don't auto-load, wait for user to click
    } else if (tab === 'settings-payroll') {
        loadRentSettings();
    }
}

// Load initial payroll data
async function loadPayrollData() {
    currentShiftsDate = getTodayDate();
    document.getElementById('shiftsDateFilter').value = currentShiftsDate;
    
    // Set default date range for income (last 30 days)
    const endDate = getTodayDate();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    document.getElementById('incomeStartDate').value = startDateStr;
    document.getElementById('incomeEndDate').value = endDate;
    
    // Load data for current tab
    if (currentPayrollTab === 'shifts') {
        await loadShiftsForDate(currentShiftsDate);
    } else if (currentPayrollTab === 'rates') {
        await loadRatesData();
    } else if (currentPayrollTab === 'settings-payroll') {
        await loadRentSettings();
    }
}

// ==================== SHIFTS TAB ====================

// Shifts date change handler
document.getElementById('shiftsDateFilter')?.addEventListener('change', async function() {
    currentShiftsDate = this.value;
    await loadShiftsForDate(currentShiftsDate);
});

async function loadShiftsForDate(date) {
    if (!isPayrollUnlocked) return;
    
    shiftsData = await window.api.shiftsListByDate(date);
    
    // Also load staff rates to get default wages
    ratesData = await window.api.ratesGetAll();
    
    renderShiftsList();
}

function renderShiftsList() {
    const container = document.getElementById('shiftsListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    staffList.forEach(staff => {
        const shift = shiftsData.find(s => s.staff_id === staff.id);
        const rate = ratesData.find(r => r.staff_id === staff.id);
        const defaultWage = rate ? rate.default_daily_wage_cents : 0;
        
        const shiftItem = document.createElement('div');
        shiftItem.className = 'shift-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `shift-${staff.id}`;
        checkbox.checked = !!shift;
        checkbox.className = 'shift-checkbox';
        checkbox.addEventListener('change', () => handleShiftToggle(staff.id, checkbox.checked, defaultWage));
        
        const label = document.createElement('label');
        label.htmlFor = `shift-${staff.id}`;
        label.textContent = staff.name;
        label.className = 'shift-label';
        
        const wageInput = document.createElement('input');
        wageInput.type = 'text';
        wageInput.className = 'form-control shift-wage-input';
        wageInput.placeholder = 'Lương...';
        wageInput.readOnly = true;
        wageInput.value = shift ? formatCurrency(shift.daily_wage_cents) : 
                                  (defaultWage > 0 ? formatCurrency(defaultWage) : '');
        wageInput.disabled = !shift;
        wageInput.addEventListener('click', (e) => {
            if (shift || checkbox.checked) {
                openShiftWageKeypad(staff.id, shift ? shift.daily_wage_cents : defaultWage, e);
            }
        });
        
        shiftItem.appendChild(checkbox);
        shiftItem.appendChild(label);
        shiftItem.appendChild(wageInput);
        
        container.appendChild(shiftItem);
    });
}

async function handleShiftToggle(staffId, isChecked, defaultWage) {
    if (isChecked) {
        // Create shift with default wage
        const result = await window.api.shiftsUpsert(staffId, currentShiftsDate, defaultWage, '');
        if (result.success) {
            // Liên kết với work schedule - tự động thêm ngày làm việc
            try {
                console.log('Đang thêm ngày làm việc cho staff:', staffId, 'ngày:', currentShiftsDate);
                const scheduleResult = await window.api.updateWorkSchedule(staffId, currentShiftsDate, true);
                console.log('Schedule result:', scheduleResult);
                if (scheduleResult.success) {
                    console.log('Đã tự động thêm ngày làm việc');
                    // Update work schedule data if we're on the same date
                    if (currentScheduleDate === currentShiftsDate) {
                        const existingIndex = workScheduleData.findIndex(s => s.staff_id === staffId);
                        if (existingIndex >= 0) {
                            workScheduleData[existingIndex].is_working = true;
                        } else {
                            workScheduleData.push({
                                staff_id: staffId,
                                work_date: currentShiftsDate,
                                is_working: true
                            });
                        }
                    }
                } else {
                    console.warn('Không thể thêm ngày làm việc:', scheduleResult.error);
                    showAlert('Lỗi thêm ngày làm việc: ' + scheduleResult.error, 'warning');
                }
            } catch (error) {
                console.error('Lỗi khi liên kết với work schedule:', error);
                showAlert('Lỗi liên kết với work schedule: ' + error.message, 'error');
            }
            
            await loadShiftsForDate(currentShiftsDate);
            showAlert('Đã thêm ca làm việc và tự động thêm ngày làm việc', 'success');
        } else {
            showAlert('Lỗi: ' + result.error, 'error');
        }
    } else {
        // Delete shift
        const result = await window.api.shiftsDelete(staffId, currentShiftsDate);
        if (result.success) {
            // Liên kết với work schedule - tự động xóa ngày làm việc
            try {
                console.log('Đang xóa ngày làm việc cho staff:', staffId, 'ngày:', currentShiftsDate);
                const scheduleResult = await window.api.updateWorkSchedule(staffId, currentShiftsDate, false);
                console.log('Delete schedule result:', scheduleResult);
                if (scheduleResult.success) {
                    console.log('Đã tự động xóa ngày làm việc');
                    // Update work schedule data if we're on the same date
                    if (currentScheduleDate === currentShiftsDate) {
                        const existingIndex = workScheduleData.findIndex(s => s.staff_id === staffId);
                        if (existingIndex >= 0) {
                            workScheduleData[existingIndex].is_working = false;
                        }
                    }
                } else {
                    console.warn('Không thể xóa ngày làm việc:', scheduleResult.error);
                    showAlert('Lỗi xóa ngày làm việc: ' + scheduleResult.error, 'warning');
                }
            } catch (error) {
                console.error('Lỗi khi liên kết với work schedule:', error);
                showAlert('Lỗi liên kết với work schedule: ' + error.message, 'error');
            }
            
            await loadShiftsForDate(currentShiftsDate);
            showAlert('Đã xóa ca làm việc và tự động xóa ngày làm việc', 'info');
        } else {
            showAlert('Lỗi: ' + result.error, 'error');
        }
    }
}

function openShiftWageKeypad(staffId, currentWageCents, event) {
    const displayValue = (currentWageCents / 100).toFixed(2);
    
    window.openNumericKeypad({
        anchorEl: event.target,
        initialValue: displayValue,
        max: 1000000,
        onConfirm: async function(valueString) {
            const numValue = parseFloat(valueString);
            const wageCents = Math.round(numValue * 100);
            
            if (isNaN(wageCents) || wageCents < 0) {
                showAlert('Giá trị không hợp lệ!', 'warning');
                return;
            }
            
            const result = await window.api.shiftsUpsert(staffId, currentShiftsDate, wageCents, '');
            if (result.success) {
                await loadShiftsForDate(currentShiftsDate);
                showAlert('Cập nhật lương thành công!', 'success');
            } else {
                showAlert('Lỗi: ' + result.error, 'error');
            }
        },
        onCancel: function() {
            // Do nothing
        }
    });
}

// ==================== RATES TAB ====================

async function loadRatesData() {
    if (!isPayrollUnlocked) return;
    
    ratesData = await window.api.ratesGetAll();
    renderRatesTable();
}

function renderRatesTable() {
    const tbody = document.getElementById('ratesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    staffList.forEach(staff => {
        const rate = ratesData.find(r => r.staff_id === staff.id);
        const wageCents = rate ? rate.default_daily_wage_cents : 0;
        
        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = staff.name;
        
        const tdWage = document.createElement('td');
        const wageInput = document.createElement('input');
        wageInput.type = 'text';
        wageInput.className = 'form-control';
        wageInput.readOnly = true;
        wageInput.value = wageCents > 0 ? formatCurrency(wageCents) : '$0.00';
        wageInput.addEventListener('click', (e) => {
            openRateWageKeypad(staff.id, wageCents, e);
        });
        
        tdWage.appendChild(wageInput);
        
        tr.appendChild(tdName);
        tr.appendChild(tdWage);
        tbody.appendChild(tr);
    });
}

function openRateWageKeypad(staffId, currentWageCents, event) {
    const displayValue = (currentWageCents / 100).toFixed(2);
    
    window.openNumericKeypad({
        anchorEl: event.target,
        initialValue: displayValue,
        max: 1000000,
        onConfirm: async function(valueString) {
            const numValue = parseFloat(valueString);
            const wageCents = Math.round(numValue * 100);
            
            if (isNaN(wageCents) || wageCents < 0) {
                showAlert('Giá trị không hợp lệ!', 'warning');
                return;
            }
            
            const result = await window.api.ratesUpsert(staffId, wageCents);
            if (result.success) {
                await loadRatesData();
                showAlert('Cập nhật lương mặc định thành công!', 'success');
            } else {
                showAlert('Lỗi: ' + result.error, 'error');
            }
        },
        onCancel: function() {
            // Do nothing
        }
    });
}

// ==================== INCOME REPORTS TAB ====================

document.getElementById('loadIncomeBtn')?.addEventListener('click', loadIncomeReport);
document.getElementById('exportIncomeBtn')?.addEventListener('click', exportIncomeReport);

async function loadIncomeReport() {
    if (!isPayrollUnlocked) return;
    
    const startDate = document.getElementById('incomeStartDate').value;
    const endDate = document.getElementById('incomeEndDate').value;
    
    if (!startDate || !endDate) {
        showAlert('Vui lòng chọn ngày bắt đầu và kết thúc!', 'warning');
        return;
    }
    
    incomeData = await window.api.incomeGetSummary(startDate, endDate);
    renderIncomeTable();
    updateIncomeTotals();
}

function renderIncomeTable() {
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (incomeData.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.textContent = 'Không có dữ liệu';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    
    incomeData.forEach(item => {
        const tr = document.createElement('tr');
        
        const tdDate = document.createElement('td');
        tdDate.textContent = window.api.formatDate(item.date);
        
        const tdGross = document.createElement('td');
        tdGross.textContent = formatCurrency(item.gross_cents);
        tdGross.className = item.gross_cents >= 0 ? 'positive' : 'negative';
        
        const tdWages = document.createElement('td');
        tdWages.textContent = formatCurrency(item.wages_cents);
        
        const tdRent = document.createElement('td');
        tdRent.textContent = formatCurrency(item.rent_allocated_cents);
        
        const tdExpenses = document.createElement('td');
        tdExpenses.textContent = formatCurrency(item.expenses_cents || 0);
        tdExpenses.className = 'negative';
        
        const tdNet = document.createElement('td');
        tdNet.textContent = formatCurrency(item.net_cents);
        tdNet.className = item.net_cents >= 0 ? 'positive' : 'negative';
        tdNet.style.fontWeight = 'bold';
        
        tr.appendChild(tdDate);
        tr.appendChild(tdGross);
        tr.appendChild(tdWages);
        tr.appendChild(tdRent);
        tr.appendChild(tdExpenses);
        tr.appendChild(tdNet);
        
        tbody.appendChild(tr);
    });
}

function updateIncomeTotals() {
    let totalGross = 0;
    let totalWages = 0;
    let totalRent = 0;
    let totalExpenses = 0;
    let totalNet = 0;
    
    incomeData.forEach(item => {
        totalGross += item.gross_cents;
        totalWages += item.wages_cents;
        totalRent += item.rent_allocated_cents;
        totalExpenses += (item.expenses_cents || 0);
        totalNet += item.net_cents;
    });
    
    document.getElementById('totalGross').textContent = formatCurrency(totalGross);
    document.getElementById('totalWages').textContent = formatCurrency(totalWages);
    document.getElementById('totalRent').textContent = formatCurrency(totalRent);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('totalNet').textContent = formatCurrency(totalNet);
    
    // Color coding for net profit
    const netEl = document.getElementById('totalNet');
    if (totalNet >= 0) {
        netEl.style.color = '#28a745';
    } else {
        netEl.style.color = '#dc3545';
    }
}

function exportIncomeReport() {
    if (incomeData.length === 0) {
        showAlert('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    
    // Create CSV content
    let csv = 'Date,Gross,Wages,Rent,Net\n';
    
    incomeData.forEach(item => {
        csv += `${item.date},`;
        csv += `${(item.gross_cents / 100).toFixed(2)},`;
        csv += `${(item.wages_cents / 100).toFixed(2)},`;
        csv += `${(item.rent_allocated_cents / 100).toFixed(2)},`;
        csv += `${(item.net_cents / 100).toFixed(2)}\n`;
    });
    
    // Calculate totals
    const totalGross = incomeData.reduce((sum, item) => sum + item.gross_cents, 0);
    const totalWages = incomeData.reduce((sum, item) => sum + item.wages_cents, 0);
    const totalRent = incomeData.reduce((sum, item) => sum + item.rent_allocated_cents, 0);
    const totalNet = incomeData.reduce((sum, item) => sum + item.net_cents, 0);
    
    csv += '\nTOTALS,';
    csv += `${(totalGross / 100).toFixed(2)},`;
    csv += `${(totalWages / 100).toFixed(2)},`;
    csv += `${(totalRent / 100).toFixed(2)},`;
    csv += `${(totalNet / 100).toFixed(2)}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('Đã xuất báo cáo!', 'success');
}

// ==================== SETTINGS TAB ====================

document.getElementById('rentSettingsForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    await saveRentSettings();
});

// Open keypad when clicking rent amount input
document.getElementById('rentAmount')?.addEventListener('click', function() {
    if (isPayrollUnlocked) {
        openRentAmountKeypad();
    }
});

async function loadRentSettings() {
    if (!isPayrollUnlocked) return;
    
    rentSettings = await window.api.settingsGetRent();
    
    const rentInput = document.getElementById('rentAmount');
    if (rentInput) {
        rentInput.value = formatCurrency(rentSettings.amount);
    }
    
    const periodSelect = document.getElementById('rentPeriod');
    if (periodSelect) {
        periodSelect.value = rentSettings.period;
    }
}

function openRentAmountKeypad() {
    const displayValue = (rentSettings.amount / 100).toFixed(2);
    
    window.openNumericKeypad({
        anchorEl: document.getElementById('rentAmount'),
        initialValue: displayValue,
        max: 1000000,
        onConfirm: async function(valueString) {
            const numValue = parseFloat(valueString);
            const amountCents = Math.round(numValue * 100);
            
            if (isNaN(amountCents) || amountCents < 0) {
                showAlert('Giá trị không hợp lệ!', 'warning');
                return;
            }
            
            rentSettings.amount = amountCents;
            document.getElementById('rentAmount').value = formatCurrency(amountCents);
        },
        onCancel: function() {
            // Do nothing
        }
    });
}

async function saveRentSettings() {
    if (!isPayrollUnlocked) return;
    
    const period = document.getElementById('rentPeriod').value;
    
    const result = await window.api.settingsUpdateRent(rentSettings.amount, period);
    
    if (result.success) {
        showAlert('Lưu cài đặt thành công!', 'success');
    } else {
        showAlert('Lỗi: ' + result.error, 'error');
    }
}


