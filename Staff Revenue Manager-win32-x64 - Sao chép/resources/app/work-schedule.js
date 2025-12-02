// ==================== WORK SCHEDULE MODULE ====================

// Auto-create work schedule for existing entries (for legacy data compatibility)
async function autoCreateWorkScheduleForDate(date, entries) {
    try {
        // Lấy danh sách staff có entries cho ngày này
        const staffIdsWithEntries = [...new Set(entries.map(entry => entry.staff_id))];
        
        console.log('Auto-creating work schedule for staff:', staffIdsWithEntries);
        
        // Tạo work schedule cho từng staff có entries
        for (const staffId of staffIdsWithEntries) {
            await window.api.updateWorkSchedule(staffId, date, 1); // 1 = is_working
            console.log(`Created work schedule for staff ${staffId} on ${date}`);
        }
        
        console.log('Auto-creation completed for date:', date);
    } catch (error) {
        console.error('Error auto-creating work schedule:', error);
        // Không throw error để không làm gián đoạn quá trình load
    }
}

// Load work schedule data
async function loadWorkScheduleData() {
    try {
        if (!currentScheduleDate) {
            currentScheduleDate = getTodayDate();
            document.getElementById('scheduleDateFilter').value = currentScheduleDate;
        }
        
        console.log('Loading work schedule for date:', currentScheduleDate);
        // Load work schedule data from API
        workScheduleData = await window.api.getWorkSchedule(currentScheduleDate);
        console.log('Work schedule data loaded:', workScheduleData);
        
        // Nếu không có dữ liệu work_schedule và có entries cho ngày này, tự động tạo
        if ((!workScheduleData || workScheduleData.length === 0) && entriesList.length > 0) {
            const entriesForDate = entriesList.filter(entry => entry.work_date === currentScheduleDate);
            if (entriesForDate.length > 0) {
                console.log('Auto-creating work schedule for existing entries');
                await autoCreateWorkScheduleForDate(currentScheduleDate, entriesForDate);
                workScheduleData = await window.api.getWorkSchedule(currentScheduleDate);
            }
        }
        
        renderWorkScheduleList();
    } catch (error) {
        console.error('Error loading work schedule:', error);
        showAlert('Lỗi tải lịch làm việc: ' + error.message, 'error');
    }
}

// Render work schedule list
function renderWorkScheduleList() {
    const container = document.getElementById('workScheduleListContainer');
    if (!container) {
        console.error('Work schedule container not found');
        return;
    }
    
    console.log('Rendering work schedule list for', staffList.length, 'staff members');
    console.log('Work schedule data:', workScheduleData);
    
    container.innerHTML = '';
    
    staffList.forEach(staff => {
        const schedule = workScheduleData.find(s => s.staff_id === staff.id);
        const isWorking = schedule ? schedule.is_working : false;
        
        console.log(`Staff ${staff.name} (ID: ${staff.id}): isWorking = ${isWorking}`);
        
        const scheduleItem = document.createElement('div');
        scheduleItem.className = `work-schedule-item ${isWorking ? 'working' : 'not-working'}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `schedule-${staff.id}`;
        checkbox.checked = isWorking;
        checkbox.className = 'work-schedule-checkbox';
        checkbox.addEventListener('change', () => {
            console.log(`Checkbox changed for staff ${staff.name}: ${checkbox.checked}`);
            handleWorkScheduleToggle(staff.id, checkbox.checked);
        });
        
        const label = document.createElement('label');
        label.htmlFor = `schedule-${staff.id}`;
        label.textContent = staff.name;
        label.className = 'work-schedule-staff-name';
        
        const status = document.createElement('div');
        status.className = `work-schedule-status ${isWorking ? 'working' : 'not-working'}`;
        status.textContent = isWorking ? 'Có làm việc' : 'Không làm việc';
        
        scheduleItem.appendChild(checkbox);
        scheduleItem.appendChild(label);
        scheduleItem.appendChild(status);
        
        container.appendChild(scheduleItem);
    });
}

// Handle work schedule toggle
async function handleWorkScheduleToggle(staffId, isWorking) {
    try {
        const result = await window.api.updateWorkSchedule(staffId, currentScheduleDate, isWorking);
        if (result.success) {
            // Update local data
            const existingIndex = workScheduleData.findIndex(s => s.staff_id === staffId);
            if (existingIndex >= 0) {
                workScheduleData[existingIndex].is_working = isWorking;
            } else {
                workScheduleData.push({
                    staff_id: staffId,
                    work_date: currentScheduleDate,
                    is_working: isWorking
                });
            }
            
            // Liên kết với payroll - tự động tạo/xóa ca làm việc
            try {
                if (isWorking) {
                    console.log('Đang tạo ca làm việc cho staff:', staffId, 'ngày:', currentScheduleDate);
                    // Tạo ca làm việc trong payroll với lương mặc định
                    const ratesData = await window.api.ratesGetAll();
                    console.log('Rates data:', ratesData);
                    const rate = ratesData.find(r => r.staff_id === staffId);
                    const defaultWage = rate ? rate.default_daily_wage_cents : 0;
                    console.log('Default wage for staff', staffId, ':', defaultWage);
                    
                    const shiftResult = await window.api.shiftsUpsert(staffId, currentScheduleDate, defaultWage, '');
                    console.log('Shift result:', shiftResult);
                    if (shiftResult.success) {
                        console.log('Đã tự động tạo ca làm việc trong payroll');
                    } else {
                        console.warn('Không thể tạo ca làm việc trong payroll:', shiftResult.error);
                        showAlert('Lỗi tạo ca làm việc: ' + shiftResult.error, 'warning');
                    }
                } else {
                    console.log('Đang xóa ca làm việc cho staff:', staffId, 'ngày:', currentScheduleDate);
                    // Xóa ca làm việc trong payroll
                    const shiftResult = await window.api.shiftsDelete(staffId, currentScheduleDate);
                    console.log('Delete shift result:', shiftResult);
                    if (shiftResult.success) {
                        console.log('Đã tự động xóa ca làm việc trong payroll');
                    } else {
                        console.warn('Không thể xóa ca làm việc trong payroll:', shiftResult.error);
                        showAlert('Lỗi xóa ca làm việc: ' + shiftResult.error, 'warning');
                    }
                }
            } catch (error) {
                console.error('Lỗi khi liên kết với payroll:', error);
                showAlert('Lỗi liên kết với payroll: ' + error.message, 'error');
            }
            
            // Re-render the list
            renderWorkScheduleList();
            
            // Update revenue table and staff select to reflect changes
            updateRevenueTable();
            updateStaffSelect();
            
            const message = isWorking ? 
                'Đã thêm ngày làm việc và tự động tạo ca làm việc trong payroll' : 
                'Đã xóa ngày làm việc và tự động xóa ca làm việc trong payroll';
            showAlert(message, 'success');
        } else {
            showAlert('Lỗi: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating work schedule:', error);
        showAlert('Lỗi cập nhật lịch làm việc: ' + error.message, 'error');
    }
}

// Get staff who are working on a specific date
function getWorkingStaff(date) {
    // Nếu không có dữ liệu work_schedule, trả về tất cả staff (để tương thích với dữ liệu cũ)
    if (!workScheduleData || workScheduleData.length === 0) {
        return staffList;
    }
    
    return staffList.filter(staff => {
        const schedule = workScheduleData.find(s => s.staff_id === staff.id && s.work_date === date);
        return schedule ? schedule.is_working : false;
    });
}

// Open add entry dialog
function openAddEntryDialog(staffId, staffName, workDate) {
    // Create modal dialog
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
    `;
    
    dialog.innerHTML = `
        <h3 style="color: #007bff; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-plus"></i> Thêm Entry cho ${staffName}
        </h3>
        
        <form id="addEntryDialogForm">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                    Số tiền (AUD):
                </label>
                <input type="text" id="dialogEntryAmount" placeholder="Nhập số tiền..." 
                       class="form-control" required style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                    Phương thức thanh toán:
                </label>
                <select id="dialogPaymentMethod" class="form-control" required style="width: 100%;" onchange="handlePaymentMethodChange()">
                    <option value="cash">Tiền mặt</option>
                    <option value="card" selected>Thẻ</option>
                    <option value="gift_card">Gift Card</option>
                </select>
            </div>
            
            <div id="giftCardSelection" style="margin-bottom: 1rem; display: none;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                    Tìm kiếm Gift Card:
                </label>
                <input type="text" id="giftCardSearchInput" class="form-control" placeholder="Nhập số thẻ, tên khách hàng hoặc số điện thoại..." 
                       style="width: 100%; margin-bottom: 0.5rem;" oninput="searchGiftCards()">
                <select id="dialogGiftCardId" class="form-control" style="width: 100%;">
                    <option value="">Chọn Gift Card...</option>
                </select>
                <div id="giftCardInfo" style="margin-top: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; display: none;">
                    <small id="giftCardBalance"></small>
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                    Ghi chú:
                </label>
                <textarea id="dialogEntryNote" class="form-control" rows="3" placeholder="Nhập ghi chú (không bắt buộc)"></textarea>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="cancelAddEntryDialog" class="btn btn-secondary">
                    Hủy
                </button>
                <button type="submit" class="btn btn-primary">
                    Lưu
                </button>
            </div>
        </form>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Focus amount input and open numeric keypad on click
    const amountInput = dialog.querySelector('#dialogEntryAmount');
    if (amountInput) {
        amountInput.focus();
        amountInput.addEventListener('click', (e) => {
            e.preventDefault();
            amountInput.blur();
            if (typeof openNumericKeypadForInput === 'function') {
                openNumericKeypadForInput(amountInput);
            }
        });
    }
    
    // Handle form submit
    const form = dialog.querySelector('#addEntryDialogForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const amountInput = document.getElementById('dialogEntryAmount');
            const paymentMethodSelect = document.getElementById('dialogPaymentMethod');
            const noteInput = document.getElementById('dialogEntryNote');
            const giftCardSelect = document.getElementById('dialogGiftCardId');
            
            const amountStr = amountInput.value.trim();
            if (!amountStr) {
                showAlert('Vui lòng nhập số tiền', 'warning');
                amountInput.focus();
                return;
            }
            
            const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
            if (isNaN(amount) || amount <= 0) {
                showAlert('Số tiền không hợp lệ', 'warning');
                amountInput.focus();
                return;
            }
            
            const amountCents = Math.round(amount * 100);
            const paymentMethod = paymentMethodSelect.value;
            const note = noteInput.value.trim();
            
            // If using gift card, ensure a card is selected
            let selectedGiftCardId = null;
            if (paymentMethod === 'gift_card') {
                selectedGiftCardId = giftCardSelect.value;
                if (!selectedGiftCardId) {
                    showAlert('Vui lòng chọn một Gift Card', 'warning');
                    giftCardSelect.focus();
                    return;
                }
            }
            
            // Call API to add entry
            const result = await window.api.addEntry(staffId, amountCents, note, workDate, paymentMethod);
            
            if (result.success) {
                // If using gift card, record usage
                if (paymentMethod === 'gift_card' && selectedGiftCardId) {
                    try {
                        const usageResult = await window.api.giftCardsUse(
                            parseInt(selectedGiftCardId, 10),
                            {
                                amountCents,
                                entryId: result.id,
                                staffId,
                                notes: `Used for entry on ${workDate}`
                            }
                        );
                        
                        if (!usageResult.success) {
                            showAlert('Lỗi khi sử dụng Gift Card: ' + usageResult.error, 'warning');
                        }
                    } catch (error) {
                        console.error('Error using gift card:', error);
                        showAlert('Lỗi khi sử dụng Gift Card: ' + error.message, 'warning');
                    }
                }
                
                showAlert('Thêm entry thành công!', 'success');
                // Reload data
                await loadData();
                // Close modal
                modal.remove();
            } else {
                showAlert('Lỗi thêm entry: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error adding entry from dialog:', error);
            showAlert('Lỗi thêm entry: ' + error.message, 'error');
        }
    });
    
    // Handle cancel button
    dialog.querySelector('#cancelAddEntryDialog').addEventListener('click', () => {
        modal.remove();
    });
    
    // Close dialog when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}


