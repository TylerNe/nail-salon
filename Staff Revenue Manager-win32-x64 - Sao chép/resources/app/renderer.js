// Global variables
let staffList = [];
let entriesList = [];
let revenueTable;
let entriesDetailTable;
let staffTable;
let statsTable;
let statsChart;
let workScheduleData = [];
let currentScheduleDate = null;

// Get today's date in YYYY-MM-DD format (local timezone)
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let currentDate = getTodayDate();

// Check if running in web browser
// In Electron, window.require might not be available, but window.api should be
const isWebBrowser = typeof window !== 'undefined' && !window.api;

// Expenses variables
let expensesData = [];
let expensesTable = null;
let currentExpenseId = null;

// Transactions variables
let transactionsData = [];
let transactionsTable = null;

// Gift Cards variables
let giftCardsData = [];
let giftCardsTable = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await initializeApp();
        setupEventListeners();
        await loadData();
        
        // Only load network info in Electron app
        console.log('Checking if should load network info...');
        console.log('isWebBrowser:', isWebBrowser);
        console.log('typeof window.require:', typeof window.require);
        console.log('typeof window.api:', typeof window.api);
        
        if (!isWebBrowser) {
            console.log('Loading network info...');
            await loadNetworkInfo();
        } else {
            console.log('Skipping network info (web browser mode)');
        }
        
        hideLoading();
        
        // Fallback: Force load network info after a delay if still loading
        setTimeout(() => {
            const networkUrlElement = document.getElementById('networkUrl');
            if (networkUrlElement && networkUrlElement.textContent === 'Loading...') {
                console.log('Network info still loading, trying fallback...');
                loadNetworkInfo();
            }
        }, 3000);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
        hideLoading();
    }
});

// Initialize app
async function initializeApp() {
    // Always get today's date fresh
    currentDate = getTodayDate();
    
    // Set current date
    document.getElementById('dateFilter').value = currentDate;
    document.getElementById('scheduleDateFilter').value = currentDate;
    document.getElementById('expenseDateFilter').value = currentDate;
    
    // Set default date range for statistics (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('statsStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('statsEndDate').value = endDate.toISOString().split('T')[0];
    
    // Initialize tables
    initializeRevenueTable();
    initializeEntriesDetailTable();
    initializeStaffTable();
    initializeStatsTable();
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Date filter
    document.getElementById('dateFilter').addEventListener('change', function() {
        currentDate = document.getElementById('dateFilter').value;
        loadData();
    });
    
    // Staff search
    document.getElementById('staffSearch').addEventListener('input', filterStaff);
    
    
    
    // Add staff form
    document.getElementById('addStaffForm').addEventListener('submit', handleAddStaff);
    
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    
    // Statistics controls
    document.getElementById('loadStatsBtn').addEventListener('click', loadStatistics);
    
    // Expenses controls
    document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('closeExpenseModal').addEventListener('click', closeExpenseModal);
    document.getElementById('cancelExpenseBtn').addEventListener('click', closeExpenseModal);
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('expenseDateFilter').addEventListener('change', loadExpensesData);
    document.getElementById('expenseSearch').addEventListener('input', filterExpenses);
    document.getElementById('expenseCategoryFilter').addEventListener('change', filterExpenses);
    
    // Transactions controls
    document.getElementById('loadTransactionsBtn').addEventListener('click', loadTransactions);
    document.getElementById('exportTransactionsBtn').addEventListener('click', exportTransactions);
    
    // Gift Cards controls
    const createGiftCardBtn = document.getElementById('createGiftCardBtn');
    if (createGiftCardBtn) {
        // Remove any existing listeners first
        createGiftCardBtn.removeEventListener('click', openCreateGiftCardDialog);
        createGiftCardBtn.addEventListener('click', () => {
            console.log('Create Gift Card button clicked');
            openCreateGiftCardDialog();
        });
    } else {
        console.error('createGiftCardBtn not found');
    }
    
    const giftCardSearch = document.getElementById('giftCardSearch');
    if (giftCardSearch) {
        giftCardSearch.addEventListener('input', debounce(loadGiftCards, 300));
    }
    
    const giftCardStatusFilter = document.getElementById('giftCardStatusFilter');
    if (giftCardStatusFilter) {
        giftCardStatusFilter.addEventListener('change', loadGiftCards);
    }
    
    // PIN controls
    document.getElementById('expensesPinCancel').addEventListener('click', handleExpensesPinCancel);
    
    // PIN keypad event listeners
    document.querySelectorAll('.pin-key[data-number]').forEach(key => {
        key.addEventListener('click', function() {
            const number = this.dataset.number;
            addPinNumber(number);
        });
    });
    
    // Backspace button
    document.getElementById('pinBackspace').addEventListener('click', removePinNumber);
    
    // Keyboard support
    document.addEventListener('keydown', function(e) {
        const pinModal = document.getElementById('expensesPinModal');
        if (pinModal.style.display === 'block') {
            if (e.key >= '0' && e.key <= '9') {
                addPinNumber(e.key);
            } else if (e.key === 'Backspace') {
                removePinNumber();
            } else if (e.key === 'Enter') {
                handleExpensesPinSubmit();
            }
        }
    });
    
    // Work schedule controls
    document.getElementById('scheduleDateFilter').addEventListener('change', function() {
        currentScheduleDate = this.value;
        loadWorkScheduleData();
    });
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'dashboard') {
        // Reload data and update revenue table when switching back to dashboard
        loadData();
        // Force redraw the revenue table to fix rendering issues
        setTimeout(() => {
            if (revenueTable) {
                revenueTable.redraw(true);
                // Force recalculation of column widths
                revenueTable.redraw(true);
            }
        }, 100);
    } else if (tabName === 'statistics') {
        loadStatistics();
    } else if (tabName === 'expenses') {
        // Check PIN before loading expenses
        checkExpensesPin();
    } else if (tabName === 'staff') {
        loadStaffData();
    } else if (tabName === 'work-schedule') {
        loadWorkScheduleData();
    } else if (tabName === 'transactions') {
        loadTransactions();
    } else if (tabName === 'gift-cards') {
        loadGiftCards();
        // Re-attach event listeners for gift cards tab
        setTimeout(() => {
            const createGiftCardBtn = document.getElementById('createGiftCardBtn');
            if (createGiftCardBtn && !createGiftCardBtn.hasAttribute('data-listener-attached')) {
                // Remove any existing listeners first
                createGiftCardBtn.removeEventListener('click', openCreateGiftCardDialog);
                createGiftCardBtn.addEventListener('click', () => {
                    console.log('Create Gift Card button clicked (re-attached)');
                    openCreateGiftCardDialog();
                });
                createGiftCardBtn.setAttribute('data-listener-attached', 'true');
            }
        }, 100);
    }
}

// Load all data
async function loadData() {
    try {
        showLoading();
        await Promise.all([
            loadStaffData(),
            loadEntriesData(),
            loadWorkScheduleData()
        ]);
        updateRevenueTable();
        updateEntriesDetailTable();
        hideLoading();
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Lỗi tải dữ liệu: ' + error.message, 'error');
        hideLoading();
    }
}

// Load staff data
async function loadStaffData() {
    try {
        staffList = await window.api.getStaff();
        updateStaffSelect();
        updateStaffTable();
    } catch (error) {
        console.error('Error loading staff:', error);
        throw error;
    }
}

// Load entries data
async function loadEntriesData() {
    try {
        const selectedDate = document.getElementById('dateFilter').value;
        const startDate = selectedDate;
        const endDate = selectedDate;
        
        entriesList = await window.api.getEntries(startDate, endDate);
    } catch (error) {
        console.error('Error loading entries:', error);
        throw error;
    }
}

// Update staff select dropdown (no longer needed, but keeping for compatibility)
function updateStaffSelect() {
    // Update staff dropdown for transactions filter
    const transactionsStaffFilter = document.getElementById('transactionsStaffFilter');
    if (transactionsStaffFilter) {
        // Clear existing options except first one
        transactionsStaffFilter.innerHTML = '<option value="">Tất cả nhân viên</option>';
        
        // Add staff options
        staffList.forEach(staff => {
            if (staff.active) {
                const option = document.createElement('option');
                option.value = staff.id;
                option.textContent = staff.name;
                transactionsStaffFilter.appendChild(option);
            }
        });
    }
}

// Initialize revenue table - hiển thị theo format bảng với staff ở trên
function initializeRevenueTable() {
    revenueTable = new Tabulator('#revenueTable', {
        data: [],
        layout: 'fitColumns',
        responsiveLayout: 'hide',
        pagination: false,
        movableColumns: false,
        resizableColumns: false,
        selectable: true,
        height: 400,
        autoColumns: false,
        headerSort: false, // Tắt hoàn toàn tính năng sắp xếp khi click header
        footerElement: '<div class="tabulator-footer"></div>', // Thêm footer element
        // Không cần initialSort vì đã sắp xếp dữ liệu trước khi đưa vào bảng
        rowFormatter: function(row) {
            // Thêm class cho hàng tổng
            const data = row.getData();
            if (data.date === 'TỔNG') {
                row.getElement().classList.add('total-row');
            }
        },
        columns: [
            {
                title: 'Ngày',
                field: 'date',
                width: 120,
                frozen: true,
                headerFilter: 'input',
                headerSort: false // Tắt sort cho cột Ngày
            }
        ],
        cellEdited: function(cell) {
            handleCellEdit(cell);
        }
    });
    
    // Add right-click event listener to document
    document.addEventListener('contextmenu', function(e) {
        // Check if right-click is on revenue table
        if (e.target.closest('#revenueTable')) {
            console.log('Right-click detected on revenue table');
            e.preventDefault();
            
            // Find the cell that was right-clicked
            const cellElement = e.target.closest('.tabulator-cell');
            if (!cellElement) return;
            
            // Get cell data from Tabulator
            const rowElement = cellElement.closest('.tabulator-row');
            if (!rowElement) return;
            
            const rowIndex = Array.from(rowElement.parentNode.children).indexOf(rowElement);
            const cellIndex = Array.from(cellElement.parentNode.children).indexOf(cellElement);
            
            const row = revenueTable.getRowFromPosition(rowIndex);
            if (!row) return;
            
            const cell = row.getCells()[cellIndex];
            if (!cell) return;
            
            const field = cell.getField();
            console.log('Field:', field);
            if (field.startsWith('staff_')) {
                console.log('Showing context menu for staff field:', field);
                showContextMenu(e, cell);
            }
        }
    });
}

// Update revenue table - hiển thị theo format bảng với staff ở trên
function updateRevenueTable() {
    if (!revenueTable) return;
    
    const selectedDate = document.getElementById('dateFilter').value;
    const filteredEntries = entriesList.filter(entry => entry.work_date === selectedDate);
    
    // Tạo cột cho mỗi staff
    const columns = [
        {
            title: 'Ngày',
            field: 'date',
            width: 120,
            frozen: true,
            headerFilter: 'input',
            headerSort: false // Tắt sort cho cột Ngày
        }
    ];
    
    // Thêm cột cho mỗi staff (chỉ những staff có ngày làm việc)
    const workingStaff = getWorkingStaff(selectedDate);
    const staffColumnWidth = workingStaff.length > 0 ? Math.floor((100 - 15) / workingStaff.length) : 0; // Trừ 15% cho cột Tổng, chia đều cho staff
    
    workingStaff.forEach(staff => {
        columns.push({
            title: staff.name,
            field: `staff_${staff.id}`,
            width: `${staffColumnWidth}%`, // Sử dụng phần trăm để tự động scale
            headerSort: false, // Tắt sort cho cột nhân viên
            headerClick: function(e, column) {
                // Click vào tên nhân viên để thêm entry mới
                openAddEntryDialog(staff.id, staff.name, selectedDate);
            },
            cellClick: function(e, cell) {
                // Open numeric keypad for inline edit
                openNumericKeypadForRevenueCell(cell);
            },
            formatter: function(cell, formatterParams) {
                const value = cell.getValue();
                return value ? formatCurrency(value) : '';
            }
        });
    });
    
    // Thêm cột tổng doanh thu của tất cả nhân viên - chỉ hiển thị ở hàng TỔNG
    columns.push({
        title: 'Tổng doanh thu (All Staff)',
        field: 'total_all_staff',
        width: 120,
        frozen: true,
        headerSort: false,
        cssClass: 'total-all-staff-column',
        formatter: function(cell, formatterParams) {
            const rowData = cell.getRow().getData();
            // Chỉ hiển thị tổng ở hàng TỔNG
            if (rowData.date === 'TỔNG') {
                const value = cell.getValue();
                return value ? formatCurrency(value) : '$0.00';
            }
            // Các hàng khác để trống
            return '';
        }
    });
    
    revenueTable.setColumns(columns);
    
    // Tạo dữ liệu cho bảng
    const tableData = [];
    
    // Sắp xếp entries theo ID (cũ đến mới) trước khi xử lý
    const sortedEntries = filteredEntries.sort((a, b) => a.id - b.id);
    
    // Nhóm entries theo staff và tạo các hàng
    const staffEntries = {};
    sortedEntries.forEach(entry => {
        if (!staffEntries[entry.staff_id]) {
            staffEntries[entry.staff_id] = [];
        }
        staffEntries[entry.staff_id].push(entry);
    });
    
    // Sort entries within each staff group by ID (oldest to newest)
    Object.keys(staffEntries).forEach(staffId => {
        staffEntries[staffId].sort((a, b) => a.id - b.id);
    });
    
    // Tìm số hàng tối đa cho mỗi staff
    let maxRows = 0;
    Object.values(staffEntries).forEach(entries => {
        maxRows = Math.max(maxRows, entries.length);
    });
    
    // Tính tổng doanh thu từ dữ liệu thực tế hiển thị trong bảng
    let grandTotal = 0;
    workingStaff.forEach(staff => {
        const staffEntriesForStaff = staffEntries[staff.id] || [];
        const staffTotal = staffEntriesForStaff.reduce((sum, entry) => sum + entry.amount_cents, 0);
        grandTotal += staffTotal;
        console.log(`Staff ${staff.name}: ${staffTotal} cents`);
    });
    console.log(`Grand total: ${grandTotal} cents`);
    
    // Tạo hàng riêng biệt cho từng entry (kiểu Excel)
    if (filteredEntries.length > 0) {
        // Sắp xếp tất cả entries theo ID để hiển thị theo thứ tự
        const allEntries = filteredEntries.sort((a, b) => a.id - b.id);
        
        // Tìm số hàng tối đa cần thiết
        let maxRows = 0;
        Object.values(staffEntries).forEach(entries => {
            maxRows = Math.max(maxRows, entries.length);
        });
        
        // Tạo hàng cho từng vị trí
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row = { 
                date: rowIndex === 0 ? window.api.formatDate(selectedDate) : '', // Chỉ hiển thị ngày ở hàng đầu tiên
                id: `row_${selectedDate}_${rowIndex}` // ID dựa trên ngày và vị trí
            };
            
            // Điền dữ liệu cho từng staff ở vị trí này
            workingStaff.forEach(staff => {
                const staffEntriesForStaff = staffEntries[staff.id] || [];
                if (rowIndex < staffEntriesForStaff.length) {
                    // Có entry ở vị trí này
                    const entry = staffEntriesForStaff[rowIndex];
                    row[`staff_${staff.id}`] = entry.amount_cents;
                    row[`staff_${staff.id}_entry_id`] = entry.id;
                } else {
                    // Không có entry ở vị trí này
                    row[`staff_${staff.id}`] = 0;
                }
            });
            
            tableData.push(row);
        }
    }
    
    // Tính tổng cho từng nhân viên và thêm vào hàng cuối
    if (tableData.length > 0) {
        const totalsRow = {
            date: 'TỔNG',
            _cssClass: 'total-row' // Thêm class để tạo màu vàng
        };
        
        // Tính tổng cho từng nhân viên (chỉ hiển thị trong cột nhân viên)
        workingStaff.forEach(staff => {
            const staffEntriesForStaff = staffEntries[staff.id] || [];
            const staffTotal = staffEntriesForStaff.reduce((sum, entry) => sum + entry.amount_cents, 0);
            totalsRow[`staff_${staff.id}`] = staffTotal;
        });
        
        // Tính tổng doanh thu của tất cả nhân viên cho hàng TỔNG
        totalsRow.total_all_staff = grandTotal;
        
        // Thêm hàng tổng vào cuối bảng
        tableData.push(totalsRow);
    }
    
    // Nếu không có dữ liệu, tạo hàng tổng với giá trị 0
    if (tableData.length === 0) {
        const totalsRow = { 
            date: 'TỔNG',
            _cssClass: 'total-row' // Thêm class để tạo màu vàng
        };
        
        workingStaff.forEach(staff => {
            totalsRow[`staff_${staff.id}`] = 0;
        });
        // Tính tổng doanh thu của tất cả nhân viên cho hàng TỔNG (khi không có dữ liệu)
        totalsRow.total_all_staff = 0;
        tableData.push(totalsRow);
    }
    
    revenueTable.setData(tableData);
    
    // Thêm class cho hàng tổng sau khi set data
    setTimeout(() => {
        const rows = revenueTable.getRows();
        rows.forEach(row => {
            const data = row.getData();
            if (data.date === 'TỔNG') {
                const rowElement = row.getElement();
                rowElement.classList.add('total-row');
                
                // Đảm bảo tất cả cell trong hàng TỔNG có styling đúng
                const cells = rowElement.querySelectorAll('.tabulator-cell');
                cells.forEach(cell => {
                    cell.style.textAlign = 'center';
                    cell.style.fontWeight = 'bold';
                    cell.style.fontSize = '0.9rem';
                });
            }
        });
        
        // Cập nhật tổng sau khi set data
        updateRowTotal();
        
        // Force redraw to fix any rendering issues
        revenueTable.redraw(true);
    }, 100);
    
    // Dữ liệu đã được sắp xếp theo ID (cũ đến mới) trước khi đưa vào bảng
}

// Initialize entries detail table
function initializeEntriesDetailTable() {
    entriesDetailTable = new Tabulator('#entriesDetailTable', {
        data: [],
        layout: 'fitColumns',
        responsiveLayout: 'hide',
        pagination: false,
        movableColumns: true,
        resizableColumns: true,
        selectable: true,
        height: 300,
        columns: [
            {
                title: 'ID',
                field: 'id',
                width: 60,
                frozen: true
            },
            {
                title: 'Staff',
                field: 'staff_name',
                width: 150,
                frozen: true
            },
            {
                title: 'Số tiền',
                field: 'amount_cents',
                width: 150,
                cellClick: function(e, cell) {
                    // Open numeric keypad instead of default editor
                    openNumericKeypadForCell(cell);
                },
                formatter: function(cell, formatterParams) {
                    const value = cell.getValue();
                    return value ? formatCurrency(value) : '';
                }
            },
            {
                title: 'Ghi chú',
                field: 'note',
                width: 250,
                editor: 'input',
                formatter: function(cell, formatterParams) {
                    return cell.getValue() || '';
                }
            },
            {
                title: 'Ngày làm việc',
                field: 'work_date',
                width: 120,
                formatter: function(cell, formatterParams) {
                    return window.api.formatDate(cell.getValue());
                }
            },
            {
                title: 'Thao tác',
                field: 'actions',
                width: 100,
                frozen: true,
                formatter: function(cell, formatterParams) {
                    const row = cell.getRow().getData();
                    return `
                        <button class="btn btn-danger btn-sm" onclick="deleteEntry(${row.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        cellEdited: function(cell) {
            handleEntriesDetailEdit(cell);
        }
    });
}

// Update entries detail table
function updateEntriesDetailTable() {
    if (!entriesDetailTable) return;
    
    const selectedDate = document.getElementById('dateFilter').value;
    const filteredEntries = entriesList.filter(entry => entry.work_date === selectedDate);
    
    // Sort entries by ID (oldest to newest) - assuming higher ID means newer entry
    const sortedEntries = filteredEntries.sort((a, b) => a.id - b.id);
    
    entriesDetailTable.setData(sortedEntries);
}

// Handle entries detail edit
async function handleEntriesDetailEdit(cell) {
    try {
        const field = cell.getField();
        const value = cell.getValue();
        const row = cell.getRow().getData();
        
        if (field === 'amount_cents') {
            const amountCents = parseInt(value) || 0;
            
            if (amountCents < 0) {
                showAlert('Số tiền không thể âm!', 'warning');
                cell.restoreOldValue();
                return;
            }
            
            const result = await window.api.updateEntry(row.id, amountCents, row.note, row.payment_method || 'card');
            if (result.success) {
                // Update in entriesList
                const entry = entriesList.find(e => e.id === row.id);
                if (entry) {
                    entry.amount_cents = amountCents;
                }
                updateRevenueTable();
                showAlert('Cập nhật số tiền thành công!', 'success');
            } else {
                showAlert('Lỗi cập nhật: ' + result.error, 'error');
                cell.restoreOldValue();
            }
        } else if (field === 'note') {
            const result = await window.api.updateEntry(row.id, row.amount_cents, value, row.payment_method || 'cash');
            if (result.success) {
                // Update in entriesList
                const entry = entriesList.find(e => e.id === row.id);
                if (entry) {
                    entry.note = value;
                }
                showAlert('Cập nhật ghi chú thành công!', 'success');
            } else {
                showAlert('Lỗi cập nhật: ' + result.error, 'error');
                cell.restoreOldValue();
            }
        }
    } catch (error) {
        console.error('Error handling entries detail edit:', error);
        showAlert('Lỗi cập nhật: ' + error.message, 'error');
        cell.restoreOldValue();
    }
}

// Handle cell edit in revenue table
// Show context menu for right-click
function showContextMenu(e, cell) {
    console.log('showContextMenu called with cell:', cell);
    const field = cell.getField();
    const row = cell.getRow().getData();
    const entryIdField = `${field}_entry_id`;
    const existingEntryId = row[entryIdField];
    
    console.log('Field:', field, 'Row:', row, 'Entry ID:', existingEntryId);
    
    if (!existingEntryId) {
        console.log('No entry to delete, showing message');
        showAlert('Không có đơn hàng để xóa trong cell này', 'warning');
        return; // No entry to delete
    }
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.cssText = `
        position: fixed;
        top: ${e.clientY}px;
        left: ${e.clientX}px;
        background: #2c3e50;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 8px 0;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        min-width: 150px;
    `;
    
    // Delete option
    const deleteOption = document.createElement('div');
    deleteOption.className = 'context-menu-item';
    deleteOption.style.cssText = `
        padding: 8px 16px;
        color: #e74c3c;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    deleteOption.innerHTML = '<i class="fas fa-trash"></i> Xóa đơn hàng';
    deleteOption.onclick = async () => {
        await deleteEntryFromCell(cell, existingEntryId);
        contextMenu.remove();
    };
    
    // Cancel option
    const cancelOption = document.createElement('div');
    cancelOption.className = 'context-menu-item';
    cancelOption.style.cssText = `
        padding: 8px 16px;
        color: #bdc3c7;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    cancelOption.innerHTML = '<i class="fas fa-times"></i> Hủy';
    cancelOption.onclick = () => contextMenu.remove();
    
    contextMenu.appendChild(deleteOption);
    contextMenu.appendChild(cancelOption);
    
    // Add hover effects
    [deleteOption, cancelOption].forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#34495e';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'transparent';
        });
    });
    
    // Add to document
    document.body.appendChild(contextMenu);
    
    // Remove menu when clicking outside
    const removeMenu = (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.remove();
            document.removeEventListener('click', removeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', removeMenu);
    }, 100);
}

// Delete entry from cell
async function deleteEntryFromCell(cell, entryId) {
    try {
        const result = await window.api.deleteEntry(entryId);
        if (result.success) {
            // Remove from entriesList
            entriesList = entriesList.filter(e => e.id !== entryId);
            
            // Update tables
            updateRevenueTable();
            updateEntriesDetailTable();
            
            showAlert('Xóa đơn hàng thành công!', 'success');
        } else {
            showAlert('Lỗi xóa đơn hàng: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        showAlert('Lỗi xóa đơn hàng: ' + error.message, 'error');
    }
}

async function handleCellEdit(cell) {
    try {
        const field = cell.getField();
        const value = cell.getValue();
        const row = cell.getRow().getData();
        const selectedDate = document.getElementById('dateFilter').value;
        
        if (field.startsWith('staff_')) {
            const staffId = parseInt(field.replace('staff_', ''));
            const amountCents = value || 0;
            const entryIdField = `${field}_entry_id`;
            const existingEntryId = row[entryIdField];
            
            if (existingEntryId) {
                // Cập nhật entry hiện có
                if (amountCents > 0) {
                    const result = await window.api.updateEntry(existingEntryId, amountCents, '', 'cash');
                    if (result.success) {
                        // Cập nhật trong entriesList
                        const entry = entriesList.find(e => e.id === existingEntryId);
                        if (entry) {
                            entry.amount_cents = amountCents;
                        }
                        // Reload data to ensure consistency
                        await loadEntriesData();
                        // Thêm delay nhỏ để đảm bảo data được load xong
                        setTimeout(() => {
                            updateRevenueTable();
                            updateEntriesDetailTable();
                        }, 100);
                        showAlert('Cập nhật thành công!', 'success');
                    } else {
                        showAlert('Lỗi cập nhật: ' + result.error, 'error');
                        cell.restoreOldValue();
                    }
                } else {
                    // Xóa entry
                    const result = await window.api.deleteEntry(existingEntryId);
                    if (result.success) {
                        entriesList = entriesList.filter(e => e.id !== existingEntryId);
                        // Reload data to ensure consistency
                        await loadEntriesData();
                        // Thêm delay nhỏ để đảm bảo data được load xong
                        setTimeout(() => {
                            updateRevenueTable();
                            updateEntriesDetailTable();
                        }, 100);
                        showAlert('Xóa đơn thành công!', 'success');
                    } else {
                        showAlert('Lỗi xóa: ' + result.error, 'error');
                        cell.restoreOldValue();
                    }
                }
            } else if (amountCents > 0) {
                // Tạo entry mới
                const result = await window.api.addEntry(staffId, amountCents, '', selectedDate, 'card');
                if (result.success) {
                    // Tìm staff name
                    const staff = staffList.find(s => s.id === staffId);
                    entriesList.push({
                        id: result.id,
                        staff_id: staffId,
                        staff_name: staff ? staff.name : 'Unknown',
                        amount_cents: amountCents,
                        note: '',
                        work_date: selectedDate
                    });
                    // Reload data to ensure consistency
                    await loadEntriesData();
                    // Thêm delay nhỏ để đảm bảo data được load xong
                    setTimeout(() => {
                        updateRevenueTable();
                        updateEntriesDetailTable();
                    }, 100);
                    showAlert('Thêm đơn thành công!', 'success');
                } else {
                    showAlert('Lỗi thêm: ' + result.error, 'error');
                    cell.restoreOldValue();
                }
            }
            
            // Cập nhật tổng
            updateRowTotal(cell.getRow());
        }
    } catch (error) {
        console.error('Error handling cell edit:', error);
        showAlert('Lỗi cập nhật: ' + error.message, 'error');
        cell.restoreOldValue();
    }
}

// Update row total - Tabulator sẽ tự tính tổng thông qua bottomCalc
function updateRowTotal(row) {
    // Không cần làm gì vì Tabulator tự động tính tổng
    // Function này được giữ lại để tương thích với code hiện tại
}



// Initialize staff table
function initializeStaffTable() {
    staffTable = new Tabulator('#staffTable', {
        data: [],
        layout: 'fitColumns',
        responsiveLayout: 'hide',
        pagination: false,
        movableColumns: true,
        resizableColumns: true,
        selectable: true,
        height: 300,
        columns: [
            {
                title: 'ID',
                field: 'id',
                width: 80,
                frozen: true
            },
            {
                title: 'Tên Staff',
                field: 'name',
                width: 200,
                editor: 'input',
                validator: 'required'
            },
            {
                title: 'Trạng thái',
                field: 'active',
                width: 120,
                formatter: function(cell, formatterParams) {
                    return cell.getValue() ? 
                        '<span class="text-success">Hoạt động</span>' : 
                        '<span class="text-danger">Không hoạt động</span>';
                }
            },
            {
                title: 'Ngày tạo',
                field: 'created_at',
                width: 150,
                formatter: function(cell, formatterParams) {
                    return new Date(cell.getValue()).toLocaleDateString('vi-VN');
                }
            },
            {
                title: 'Thao tác',
                field: 'actions',
                width: 150,
                frozen: true,
                formatter: function(cell, formatterParams) {
                    const row = cell.getRow().getData();
                    return `
                        <button class="btn btn-warning btn-sm" onclick="editStaff(${row.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStaff(${row.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        cellEdited: function(cell) {
            handleStaffEdit(cell);
        }
    });
}

// Update staff table
function updateStaffTable() {
    if (!staffTable) return;
    staffTable.setData(staffList);
}

// Handle staff edit
async function handleStaffEdit(cell) {
    try {
        const field = cell.getField();
        const value = cell.getValue();
        const row = cell.getRow().getData();
        
        if (field === 'name') {
            const result = await window.api.updateStaff(row.id, value);
            if (result.success) {
                row.name = value;
                showAlert('Cập nhật staff thành công!', 'success');
                updateStaffSelect();
                updateRevenueTable();
            } else {
                showAlert('Lỗi cập nhật: ' + result.error, 'error');
                cell.restoreOldValue();
            }
        }
    } catch (error) {
        console.error('Error editing staff:', error);
        showAlert('Lỗi cập nhật: ' + error.message, 'error');
        cell.restoreOldValue();
    }
}

// Handle add staff form
async function handleAddStaff(e) {
    e.preventDefault();
    
    try {
        const name = document.getElementById('staffName').value.trim();
        
        if (!name) {
            showAlert('Vui lòng nhập tên staff!', 'warning');
            return;
        }
        
        const result = await window.api.addStaff(name);
        
        if (result.success) {
            staffList.push({
                id: result.id,
                name: name,
                active: 1,
                created_at: new Date().toISOString()
            });
            
            // Reset form
            document.getElementById('addStaffForm').reset();
            
            // Update tables
            updateStaffTable();
            updateStaffSelect();
            updateRevenueTable();
            
            showAlert('Thêm staff thành công!', 'success');
        } else {
            showAlert('Lỗi thêm staff: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error adding staff:', error);
        showAlert('Lỗi thêm staff: ' + error.message, 'error');
    }
}

// Delete staff
async function deleteStaff(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa staff này?')) {
        return;
    }
    
    try {
        const result = await window.api.deleteStaff(id);
        
        if (result.success) {
            staffList = staffList.filter(s => s.id !== id);
            updateStaffTable();
            updateStaffSelect();
            updateRevenueTable();
            showAlert(result.message || 'Xóa staff thành công!', 'success');
        } else {
            showAlert('Lỗi xóa staff: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting staff:', error);
        showAlert('Lỗi xóa staff: ' + error.message, 'error');
    }
}

// Filter staff
function filterStaff() {
    const searchTerm = document.getElementById('staffSearch').value.toLowerCase();
    
    if (revenueTable) {
        if (searchTerm) {
            // Tìm staff có tên chứa searchTerm và có ngày làm việc
            const selectedDate = document.getElementById('dateFilter').value;
            const workingStaff = getWorkingStaff(selectedDate);
            const matchingStaffIds = workingStaff
                .filter(staff => staff.name.toLowerCase().includes(searchTerm))
                .map(staff => staff.id);
            
            if (matchingStaffIds.length > 0) {
                // Hiển thị chỉ các cột staff phù hợp
                const columns = revenueTable.getColumns();
                columns.forEach(column => {
                    const field = column.getField();
                    if (field.startsWith('staff_')) {
                        const staffId = parseInt(field.replace('staff_', ''));
                        if (matchingStaffIds.includes(staffId)) {
                            column.show();
                        } else {
                            column.hide();
                        }
                    }
                });
            } else {
                // Không tìm thấy staff nào, ẩn tất cả cột staff
                const columns = revenueTable.getColumns();
                columns.forEach(column => {
                    const field = column.getField();
                    if (field.startsWith('staff_')) {
                        column.hide();
                    }
                });
            }
        } else {
            // Hiển thị tất cả cột
            const columns = revenueTable.getColumns();
            columns.forEach(column => {
                column.show();
            });
        }
    }
}

// Initialize statistics table
function initializeStatsTable() {
    statsTable = new Tabulator('#statsTable', {
        data: [],
        layout: 'fitColumns',
        responsiveLayout: 'hide',
        pagination: false,
        movableColumns: true,
        resizableColumns: true,
        height: 300,
        columns: [
            {
                title: 'Chu kỳ',
                field: 'period',
                width: 200,
                frozen: true,
                formatter: function(cell, formatterParams) {
                    const value = cell.getValue();
                    // Format date if it looks like a date (YYYY-MM-DD)
                    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        return window.api.formatDate(value);
                    }
                    return value;
                }
            },
            {
                title: 'Tổng doanh thu (Tất cả staff)',
                field: 'total_cents',
                width: 250,
                formatter: function(cell, formatterParams) {
                    return formatCurrency(cell.getValue());
                }
            }
        ]
    });
}

// Load statistics
async function loadStatistics() {
    try {
        showLoading();
        
        const period = document.getElementById('statsPeriod').value;
        const startDate = document.getElementById('statsStartDate').value;
        const endDate = document.getElementById('statsEndDate').value;
        
        console.log('Loading statistics:', { period, startDate, endDate });
        
        if (!startDate || !endDate) {
            showAlert('Vui lòng chọn khoảng thời gian!', 'warning');
            hideLoading();
            return;
        }
        
        const stats = await window.api.getStatistics(period, startDate, endDate);
        console.log('Statistics data received:', stats);
        
        // Update table
        if (statsTable) {
            statsTable.setData(stats);
        }
        
        // Update chart
        updateStatsChart(stats, period);
        
        if (stats.length === 0) {
            showAlert('Không có dữ liệu trong khoảng thời gian này!', 'info');
        } else {
            showAlert(`Đã tải ${stats.length} bản ghi thống kê!`, 'success');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading statistics:', error);
        showAlert('Lỗi tải thống kê: ' + error.message, 'error');
        hideLoading();
    }
}

// Update statistics chart
function updateStatsChart(stats, period) {
    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            showAlert('Chart.js chưa được load. Vui lòng kiểm tra kết nối internet.', 'error');
            return;
        }
        
        const canvas = document.getElementById('statsChart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (statsChart) {
            statsChart.destroy();
        }
        
        // Check if we have data
        if (!stats || stats.length === 0) {
            console.log('No statistics data available');
            // Show empty chart with message
            statsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Không có dữ liệu'],
                    datasets: [{
                        label: 'Không có dữ liệu',
                        data: [0],
                        backgroundColor: '#007bff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Không có dữ liệu thống kê',
                            color: '#495057'
                        }
                    }
                }
            });
            return;
        }
        
        // Extract periods and totals (tổng gộp)
        const periods = stats.map(s => {
            // Format period for display
            if (s.period && s.period.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return window.api.formatDate(s.period);
            }
            return s.period;
        });
        const totals = stats.map(s => s.total_cents);
        
        if (periods.length === 0) {
            console.log('No periods found');
            return;
        }
        
        // Create single dataset for total revenue
        const dataset = {
            label: 'Tổng doanh thu',
            data: totals,
            backgroundColor: '#007bff80',
            borderColor: '#007bff',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
        };
        
        const periodLabel = period === 'daily' ? 'ngày' : (period === 'weekly' ? 'tuần' : 'tháng');
        
        statsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: periods,
                datasets: [dataset]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Thống kê tổng doanh thu theo ${periodLabel}`,
                        color: '#495057',
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#495057',
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#007bff',
                        borderWidth: 2,
                        callbacks: {
                            label: function(context) {
                                return 'Tổng: ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
                            color: '#495057',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: '#495057',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: '#dee2e6',
                            drawBorder: false
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Doanh thu (AUD)',
                            color: '#495057',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        ticks: {
                            color: '#495057',
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        },
                        grid: {
                            color: '#dee2e6',
                            drawBorder: false
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeInOutQuart',
                    delay: (context) => context.dataIndex * 50
                }
            }
        });
        
        console.log('Chart updated successfully with total revenue dataset');
    } catch (error) {
        console.error('Error updating chart:', error);
        showAlert('Lỗi tạo biểu đồ: ' + error.message, 'error');
    }
}

// Handle export
async function handleExport() {
    try {
        showLoading();
        
        const selectedDate = document.getElementById('dateFilter').value;
        const data = [];
        
        // Get current table data
        if (revenueTable) {
            const tableData = revenueTable.getData();
            
            // Create headers
            const headers = ['Ngày'];
            const workingStaff = getWorkingStaff(selectedDate);
            workingStaff.forEach(staff => {
                headers.push(staff.name);
            });
            headers.push('Tổng');
            
            data.push(headers);
            
            // Add data rows
            tableData.forEach(row => {
                const dataRow = [row.date];
                workingStaff.forEach(staff => {
                    dataRow.push(row[`staff_${staff.id}`] || 0);
                });
                dataRow.push(row.total || 0);
                data.push(dataRow);
            });
        }
        
        // Create filename
        const filename = `report-${selectedDate}.xlsx`;
        
        // Export
        const result = await window.api.exportData(data, filename);
        
        if (result.success) {
            // Create and download Excel file
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu');
            XLSX.writeFile(wb, result.filePath);
            
            showAlert('Xuất file thành công!', 'success');
        } else {
            showAlert('Lỗi xuất file: ' + result.message, 'error');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error exporting:', error);
        showAlert('Lỗi xuất file: ' + error.message, 'error');
        hideLoading();
    }
}

// Load network information (Electron only)
async function loadNetworkInfo() {
    console.log('loadNetworkInfo called, isWebBrowser:', isWebBrowser);
    console.log('window.require exists:', typeof window.require !== 'undefined');
    console.log('window.api exists:', typeof window.api !== 'undefined');
    
    if (isWebBrowser) {
        console.log('Running in web browser, hiding network info');
        // Hide network info in web browser
        const networkInfoElement = document.getElementById('networkInfo');
        if (networkInfoElement) {
            networkInfoElement.style.display = 'none';
        }
        return;
    }

    const networkInfoElement = document.getElementById('networkInfo');
    const networkUrlElement = document.getElementById('networkUrl');
    
    if (!networkInfoElement || !networkUrlElement) {
        console.log('Network info elements not found');
        return;
    }

    try {
        console.log('Starting network info request...');
        
        // Set timeout for network info request
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Network info timeout')), 5000)
        );
        
        console.log('Calling window.api.getNetworkInfo()...');
        
        // Check if window.api.getNetworkInfo exists
        if (typeof window.api.getNetworkInfo !== 'function') {
            throw new Error('window.api.getNetworkInfo is not a function');
        }
        
        const networkInfoPromise = window.api.getNetworkInfo();
        console.log('Network info promise created, waiting for response...');
        
        const networkInfo = await Promise.race([networkInfoPromise, timeoutPromise]);
        console.log('Network info received:', networkInfo);
        
        if (networkInfo && networkInfo.localIP && networkInfo.port) {
            const networkUrl = `http://${networkInfo.localIP}:${networkInfo.port}`;
            networkUrlElement.textContent = networkUrl;
            networkInfoElement.style.display = 'flex';
            
            // Make URL clickable
            networkUrlElement.addEventListener('click', () => {
                navigator.clipboard.writeText(networkUrl).then(() => {
                    showAlert('Đã copy URL vào clipboard!', 'success');
                }).catch(() => {
                    showAlert('Không thể copy URL', 'warning');
                });
            });
            
            networkUrlElement.title = 'Click để copy URL';
            console.log('Network info loaded:', networkUrl);
        } else {
            throw new Error('Invalid network info received');
        }
    } catch (error) {
        console.log('Network info not available:', error);
        // Show fallback localhost instead of error
        const fallbackUrl = 'http://localhost:3000';
        networkUrlElement.textContent = fallbackUrl;
        networkInfoElement.style.display = 'flex';
        networkInfoElement.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
        
        // Make URL clickable
        networkUrlElement.addEventListener('click', () => {
            navigator.clipboard.writeText(fallbackUrl).then(() => {
                showAlert('Đã copy URL vào clipboard!', 'success');
            }).catch(() => {
                showAlert('Không thể copy URL', 'warning');
            });
        });
        
        networkUrlElement.title = 'Click để copy URL (Fallback)';
    }
}

// ==================== DAILY EXPENSES FUNCTIONS ====================

// Load expenses data
async function loadExpensesData() {
    try {
        showLoading();
        
        const selectedDate = document.getElementById('expenseDateFilter').value || getTodayDate();
        console.log('Loading expenses for date:', selectedDate);
        
        const result = await window.api.expensesGetAll(selectedDate, null, null);
        console.log('API result:', result);
        
        if (result && result.success) {
            expensesData = result.data || [];
            console.log('Loaded expenses data:', expensesData);
            
            // Simple table update without Tabulator for now
            updateSimpleExpensesTable();
            updateExpensesSummary(selectedDate);
        } else {
            const errorMsg = result ? result.error : 'Unknown error';
            console.error('Failed to load expenses:', errorMsg);
            showAlert('Lỗi tải dữ liệu chi tiêu: ' + errorMsg, 'error');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading expenses:', error);
        showAlert('Lỗi tải dữ liệu chi tiêu: ' + error.message, 'error');
        hideLoading();
    }
}

// Update expenses table with Tabulator
function updateSimpleExpensesTable() {
    if (!expensesTable) {
        initializeExpensesTable();
    } else {
        expensesTable.setData(expensesData);
    }
}

function getCategoryName(category) {
    const names = {
        'materials': 'Vật liệu',
        'utilities': 'Điện nước',
        'rent': 'Thuê mặt bằng',
        'other': 'Khác'
    };
    return names[category] || category;
}

// Simple edit function
function editExpenseSimple(id) {
    console.log('Edit expense simple:', id);
    openExpenseModal(id);
}

// Simple delete function
async function deleteExpenseSimple(id) {
    console.log('Delete expense simple:', id);
    if (confirm('Bạn có chắc chắn muốn xóa chi tiêu này?')) {
        try {
            const result = await window.api.expensesDelete(id);
            if (result.success) {
                showAlert('Xóa chi tiêu thành công!', 'success');
                await loadExpensesData();
            } else {
                showAlert('Lỗi: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            showAlert('Lỗi xóa chi tiêu: ' + error.message, 'error');
        }
    }
}

// Test function to add expense manually
async function testAddExpense() {
    try {
        const testData = {
            expense_date: new Date().toISOString().split('T')[0],
            category: 'materials',
            description: 'Test expense from console',
            amount_cents: 2000,
            notes: 'Added via test function'
        };
        
        console.log('Testing add expense with data:', testData);
        const result = await window.api.expensesAdd(testData);
        console.log('Add result:', result);
        
        if (result.success) {
            showAlert('Test expense added successfully!', 'success');
            await loadExpensesData();
        } else {
            showAlert('Failed to add test expense: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error in testAddExpense:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// Make test function available globally
window.testAddExpense = testAddExpense;

// Test function to debug expenses system
async function debugExpensesSystem() {
    console.log('=== DEBUGGING EXPENSES SYSTEM ===');
    
    // 1. Test load expenses
    console.log('1. Testing load expenses...');
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await window.api.expensesGetAll(today, null, null);
        console.log('Load result:', result);
        
        if (result.success) {
            console.log('Expenses loaded successfully:', result.data.length, 'items');
            result.data.forEach((expense, index) => {
                console.log(`Expense ${index + 1}:`, {
                    id: expense.id,
                    type: typeof expense.id,
                    date: expense.expense_date,
                    category: expense.category,
                    description: expense.description,
                    amount: expense.amount_cents
                });
            });
        } else {
            console.error('Failed to load expenses:', result.error);
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
    
    // 2. Test add expense
    console.log('2. Testing add expense...');
    try {
        const testData = {
            expense_date: new Date().toISOString().split('T')[0],
            category: 'materials',
            description: 'Debug test expense',
            amount_cents: 3000,
            notes: 'Added via debug function'
        };
        
        const result = await window.api.expensesAdd(testData);
        console.log('Add result:', result);
        
        if (result.success) {
            console.log('Expense added successfully with ID:', result.id);
            
            // 3. Test edit expense
            console.log('3. Testing edit expense...');
            const updateData = {
                expense_date: new Date().toISOString().split('T')[0],
                category: 'utilities',
                description: 'Updated debug test expense',
                amount_cents: 4000,
                notes: 'Updated via debug function'
            };
            
            const updateResult = await window.api.expensesUpdate(result.id, updateData);
            console.log('Update result:', updateResult);
            
            if (updateResult.success) {
                console.log('Expense updated successfully');
            } else {
                console.error('Failed to update expense:', updateResult.error);
            }
        } else {
            console.error('Failed to add expense:', result.error);
        }
    } catch (error) {
        console.error('Error in debug test:', error);
    }
    
    console.log('=== DEBUG COMPLETED ===');
}

// Make debug function available globally
window.debugExpensesSystem = debugExpensesSystem;

// Debug database function
async function debugExpensesDatabase() {
    console.log('=== DEBUGGING EXPENSES DATABASE ===');
    try {
        const result = await window.api.expensesDebug();
        console.log('Debug result:', result);
        
        if (result.success) {
            console.log('Database ready:', result.databaseReady);
            console.log('Table exists:', result.tableExists);
            console.log('Total expenses:', result.totalCount);
            console.log('All expenses:', result.allExpenses);
            
            if (result.totalCount > 0) {
                showAlert(`Database có ${result.totalCount} chi tiêu`, 'success');
            } else {
                showAlert('Database trống - không có chi tiêu nào', 'warning');
            }
        } else {
            console.error('Debug failed:', result.error);
            showAlert('Debug failed: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error in debug:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// Make debug database function available globally
window.debugExpensesDatabase = debugExpensesDatabase;

// ==================== EXPENSES PIN FUNCTIONS ====================

// Check expenses PIN
async function checkExpensesPin() {
    const pinModal = document.getElementById('expensesPinModal');
    const pinError = document.getElementById('expensesPinError');
    
    // Reset PIN state
    currentPin = '';
    updatePinDisplay();
    
    // Show PIN modal
    pinModal.style.display = 'block';
    pinError.style.display = 'none';
}

// Global variable to store current PIN
let currentPin = '';

// Update PIN display dots
function updatePinDisplay() {
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`pinDot${i}`);
        if (i <= currentPin.length) {
            dot.classList.add('filled');
            dot.classList.remove('error');
        } else {
            dot.classList.remove('filled', 'error');
        }
    }
}

// Add number to PIN
function addPinNumber(number) {
    if (currentPin.length < 6) {
        currentPin += number;
        updatePinDisplay();
        
        // Auto-submit when PIN is complete
        if (currentPin.length === 6) {
            setTimeout(() => {
                handleExpensesPinSubmit();
            }, 300);
        }
    }
}

// Remove last number from PIN
function removePinNumber() {
    if (currentPin.length > 0) {
        currentPin = currentPin.slice(0, -1);
        updatePinDisplay();
    }
}

// Show PIN error
function showPinError(message) {
    const pinError = document.getElementById('expensesPinError');
    pinError.textContent = message;
    pinError.style.display = 'block';
    
    // Add error animation to dots
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`pinDot${i}`);
        dot.classList.add('error');
    }
    
    // Reset after animation
    setTimeout(() => {
        currentPin = '';
        updatePinDisplay();
        pinError.style.display = 'none';
    }, 2000);
}

// Handle PIN submission
async function handleExpensesPinSubmit() {
    if (currentPin.length !== 6) {
        showPinError('Vui lòng nhập đủ 6 chữ số');
        return;
    }
    
    try {
        const result = await window.api.expensesCheckPin(currentPin);
        
        if (result.success) {
            // PIN correct, hide modal and load expenses
            document.getElementById('expensesPinModal').style.display = 'none';
            loadExpensesData();
        } else {
            // PIN incorrect
            showPinError('Mã PIN không đúng');
        }
    } catch (error) {
        console.error('Error checking PIN:', error);
        showPinError('Lỗi xác thực PIN');
    }
}

// Handle PIN cancel
function handleExpensesPinCancel() {
    document.getElementById('expensesPinModal').style.display = 'none';
    // Switch back to previous tab or default tab
    switchTab('statistics');
}

// Change expenses PIN
async function changeExpensesPin() {
    const oldPin = prompt('Nhập mã PIN hiện tại:');
    if (!oldPin) return;
    
    const newPin = prompt('Nhập mã PIN mới (6 chữ số):');
    if (!newPin || newPin.length !== 6) {
        showAlert('Mã PIN phải có 6 chữ số', 'error');
        return;
    }
    
    const confirmPin = prompt('Xác nhận mã PIN mới:');
    if (newPin !== confirmPin) {
        showAlert('Mã PIN xác nhận không khớp', 'error');
        return;
    }
    
    try {
        const result = await window.api.expensesChangePin(oldPin, newPin);
        
        if (result.success) {
            showAlert('Đổi mã PIN thành công!', 'success');
        } else {
            showAlert('Lỗi: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error changing PIN:', error);
        showAlert('Lỗi đổi mã PIN: ' + error.message, 'error');
    }
}

// Make PIN functions available globally
window.changeExpensesPin = changeExpensesPin;

// Update expenses table (Tabulator version - kept for compatibility)
function updateExpensesTable() {
    if (!expensesTable) {
        initializeExpensesTable();
    } else {
        expensesTable.setData(expensesData);
    }
}

// Initialize expenses table
function initializeExpensesTable() {
    const tableElement = document.getElementById('expensesTable');
    if (!tableElement) {
        console.error('expensesTable element not found');
        return;
    }
    
    if (expensesTable) {
        console.log('Expenses table already initialized');
        return;
    }
    
    const columns = [
        {
            title: 'Ngày',
            field: 'expense_date',
            width: 120,
            sorter: 'date',
            headerSort: true,
            formatter: function(cell) {
                const date = new Date(cell.getValue());
                return date.toLocaleDateString('vi-VN');
            }
        },
        {
            title: 'Loại',
            field: 'category',
            width: 120,
            headerSort: true,
            formatter: function(cell) {
                const category = cell.getValue();
                const categoryNames = {
                    'materials': 'Vật liệu',
                    'utilities': 'Điện nước',
                    'rent': 'Thuê mặt bằng',
                    'other': 'Khác'
                };
                return categoryNames[category] || category;
            }
        },
        {
            title: 'Mô tả',
            field: 'description',
            width: 200,
            headerSort: true
        },
        {
            title: 'Số tiền',
            field: 'amount_cents',
            width: 120,
            sorter: 'number',
            headerSort: true,
            formatter: function(cell) {
                return '$' + (cell.getValue() / 100).toFixed(2);
            }
        },
        {
            title: 'Ghi chú',
            field: 'notes',
            width: 150,
            headerSort: true,
            formatter: function(cell) {
                const notes = cell.getValue();
                return notes ? (notes.length > 50 ? notes.substring(0, 50) + '...' : notes) : '';
            }
        },
        {
            title: 'Thao tác',
            field: 'actions',
            width: 120,
            headerSort: false,
            formatter: function(cell, formatterParams, onRendered) {
                const rowData = cell.getRow().getData();
                if (!rowData.id) {
                    return 'No ID';
                }
                return `
                    <button class="btn btn-sm btn-warning edit-expense" data-id="${rowData.id}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-expense" data-id="${rowData.id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
        }
    ];
    
    expensesTable = new Tabulator('#expensesTable', {
        data: expensesData || [],
        columns: columns,
        layout: 'fitColumns',
        pagination: 'local',
        paginationSize: 10,
        paginationSizeSelector: [10, 25, 50, 100],
        height: 400,
        responsiveLayout: 'hide',
        placeholder: 'Không có dữ liệu chi tiêu',
        headerSortTristate: true,
        rowFormatter: function(row) {
            const data = row.getData();
            if (data.category === 'materials') {
                row.getElement().style.borderLeft = '4px solid #28a745';
            } else if (data.category === 'utilities') {
                row.getElement().style.borderLeft = '4px solid #17a2b8';
            } else if (data.category === 'rent') {
                row.getElement().style.borderLeft = '4px solid #ffc107';
            } else {
                row.getElement().style.borderLeft = '4px solid #6c757d';
            }
        }
    });
    
    // Add event listeners for action buttons
    expensesTable.on('cellClick', function(e, cell) {
        const element = e.target.closest('.edit-expense, .delete-expense');
        if (element) {
            const rawId = element.dataset.id;
            console.log('Expense action clicked:', { element, rawId, dataset: element.dataset });
            
            if (!rawId || rawId === 'undefined' || rawId === 'null') {
                console.error('Invalid expense ID from dataset:', rawId);
                showAlert('Lỗi: Không tìm thấy ID chi tiêu', 'error');
                return;
            }
            
            const id = parseInt(rawId);
            if (isNaN(id)) {
                console.error('Cannot parse expense ID:', rawId);
                showAlert('Lỗi: ID chi tiêu không hợp lệ', 'error');
                return;
            }
            
            if (element.classList.contains('edit-expense')) {
                editExpense(id);
            } else if (element.classList.contains('delete-expense')) {
                deleteExpense(id);
            }
        }
    });
}

// Update expenses summary
async function updateExpensesSummary(date) {
    try {
        const result = await window.api.expensesGetAll(date, null, null);
        if (result.success) {
            const totalCents = result.data.reduce((sum, expense) => sum + expense.amount_cents, 0);
            document.getElementById('todayExpensesTotal').textContent = formatCurrency(totalCents);
        }
    } catch (error) {
        console.error('Error updating expenses summary:', error);
    }
}

// Open expense modal
function openExpenseModal(expenseId = null) {
    console.log('openExpenseModal called with expenseId:', expenseId, 'type:', typeof expenseId);
    console.log('Current expensesData:', expensesData);
    
    currentExpenseId = expenseId;
    const modal = document.getElementById('expenseModal');
    const title = document.getElementById('expenseModalTitle');
    const form = document.getElementById('expenseForm');
    
    if (expenseId) {
        title.textContent = 'Sửa Chi Tiêu';
        console.log('Looking for expense with ID:', expenseId);
        
        // Ensure expensesData is loaded
        if (!expensesData || expensesData.length === 0) {
            console.log('Expenses data not loaded, loading now...');
            loadExpensesData().then(() => {
                const expense = expensesData.find(e => e.id === expenseId);
                if (expense) {
                    document.getElementById('expenseDate').value = expense.expense_date;
                    document.getElementById('expenseCategory').value = expense.category;
                    document.getElementById('expenseDescription').value = expense.description;
                    document.getElementById('expenseAmount').value = (expense.amount_cents / 100).toFixed(2);
                    document.getElementById('expenseNotes').value = expense.notes || '';
                } else {
                    console.error('Expense not found in expensesData');
                    showAlert('Không tìm thấy chi tiêu để sửa', 'error');
                    return;
                }
            });
        } else {
            const expense = expensesData.find(e => e.id === expenseId);
            console.log('Found expense:', expense);
            
            if (expense) {
                document.getElementById('expenseDate').value = expense.expense_date;
                document.getElementById('expenseCategory').value = expense.category;
                document.getElementById('expenseDescription').value = expense.description;
                document.getElementById('expenseAmount').value = (expense.amount_cents / 100).toFixed(2);
                document.getElementById('expenseNotes').value = expense.notes || '';
            } else {
                console.error('Expense not found in expensesData');
                showAlert('Không tìm thấy chi tiêu để sửa', 'error');
                return;
            }
        }
    } else {
        title.textContent = 'Thêm Chi Tiêu';
        form.reset();
        document.getElementById('expenseDate').value = document.getElementById('expenseDateFilter').value || getTodayDate();
    }
    
    modal.classList.add('show');
}

// Close expense modal
function closeExpenseModal() {
    document.getElementById('expenseModal').classList.remove('show');
    currentExpenseId = null;
}

// Handle expense form submit
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = {
            expense_date: document.getElementById('expenseDate').value,
            category: document.getElementById('expenseCategory').value,
            description: document.getElementById('expenseDescription').value,
            amount_cents: Math.round(parseFloat(document.getElementById('expenseAmount').value) * 100),
            notes: document.getElementById('expenseNotes').value
        };
        
        console.log('Form data:', formData);
        console.log('Amount input value:', document.getElementById('expenseAmount').value);
        console.log('Parsed amount:', parseFloat(document.getElementById('expenseAmount').value));
        console.log('Amount cents:', formData.amount_cents);
        
        // Validation
        if (!formData.expense_date) {
            showAlert('Vui lòng chọn ngày', 'error');
            return;
        }
        if (!formData.category) {
            showAlert('Vui lòng chọn loại chi tiêu', 'error');
            return;
        }
        if (!formData.description.trim()) {
            showAlert('Vui lòng nhập mô tả', 'error');
            return;
        }
        if (!formData.amount_cents || formData.amount_cents <= 0) {
            showAlert('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }
        
        let result;
        console.log('handleExpenseSubmit - currentExpenseId:', currentExpenseId, 'type:', typeof currentExpenseId);
        if (currentExpenseId) {
            console.log('Updating expense with ID:', currentExpenseId);
            result = await window.api.expensesUpdate(currentExpenseId, formData);
        } else {
            console.log('Adding new expense');
            result = await window.api.expensesAdd(formData);
        }
        
        console.log('API result:', result);
        
        if (result.success) {
            showAlert(currentExpenseId ? 'Cập nhật chi tiêu thành công!' : 'Thêm chi tiêu thành công!', 'success');
            closeExpenseModal();
            await loadExpensesData();
        } else {
            showAlert('Lỗi: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving expense:', error);
        showAlert('Lỗi lưu chi tiêu: ' + error.message, 'error');
    }
}

// Edit expense
function editExpense(id) {
    console.log('editExpense called with id:', id, 'type:', typeof id);
    openExpenseModal(id);
}

// Delete expense
async function deleteExpense(id) {
    if (confirm('Bạn có chắc chắn muốn xóa chi tiêu này?')) {
        try {
            const result = await window.api.expensesDelete(id);
            if (result.success) {
                showAlert('Xóa chi tiêu thành công!', 'success');
                await loadExpensesData();
            } else {
                showAlert('Lỗi: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            showAlert('Lỗi xóa chi tiêu: ' + error.message, 'error');
        }
    }
}

// Filter expenses
function filterExpenses() {
    if (!expensesTable) return;
    
    const searchTerm = document.getElementById('expenseSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('expenseCategoryFilter').value;
    
    expensesTable.setFilter([
        {field: 'description', type: 'like', value: searchTerm},
        {field: 'category', type: '=', value: categoryFilter}
    ]);
}

// Utility functions
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

// Delete entry function
async function deleteEntry(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn này?')) {
        return;
    }
    
    try {
        const result = await window.api.deleteEntry(id);
        
        if (result.success) {
            entriesList = entriesList.filter(e => e.id !== id);
            updateRevenueTable();
            updateEntriesDetailTable();
            showAlert('Xóa đơn thành công!', 'success');
        } else {
            showAlert('Lỗi xóa đơn: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        showAlert('Lỗi xóa đơn: ' + error.message, 'error');
    }
}

// Helper function to open numeric keypad for input field
function openNumericKeypadForInput(inputElement) {
    const currentValue = inputElement.value || '0';
    
    window.openNumericKeypad({
        anchorEl: inputElement,
        initialValue: currentValue,
        max: 1000000,
        onConfirm: function(valueString) {
            inputElement.value = valueString;
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            inputElement.dispatchEvent(event);
        },
        onCancel: function() {
            // Do nothing, keep old value
        }
    });
}

// Helper function to open numeric keypad for Tabulator cell (entries detail table)
function openNumericKeypadForCell(cell) {
    const field = cell.getField();
    const row = cell.getRow().getData();
    const currentValue = cell.getValue();
    
    // Convert cents to dollars for display
    const displayValue = (currentValue / 100).toFixed(2);
    
    window.openNumericKeypad({
        anchorEl: cell.getElement(),
        initialValue: displayValue,
        max: 1000000,
        onConfirm: async function(valueString) {
            const numValue = parseFloat(valueString);
            const amountCents = Math.round(numValue * 100);
            
            if (isNaN(amountCents) || amountCents < 0) {
                showAlert('Giá trị không hợp lệ!', 'warning');
                return;
            }
            
            // Update via API
            const result = await window.api.updateEntry(row.id, amountCents, row.note, row.payment_method || 'card');
            if (result.success) {
                // Update in entriesList
                const entry = entriesList.find(e => e.id === row.id);
                if (entry) {
                    entry.amount_cents = amountCents;
                }
                // Update cell
                cell.setValue(amountCents);
                updateRevenueTable();
                updateEntriesDetailTable();
                showAlert('Cập nhật số tiền thành công!', 'success');
            } else {
                showAlert('Lỗi cập nhật: ' + result.error, 'error');
            }
        },
        onCancel: function() {
            // Do nothing
        }
    });
}

// Helper function to open numeric keypad for revenue table cell
function openNumericKeypadForRevenueCell(cell) {
    const field = cell.getField();
    const row = cell.getRow().getData();
    const currentValue = cell.getValue();
    const selectedDate = document.getElementById('dateFilter').value;
    
    // Convert cents to dollars for display
    const displayValue = (currentValue / 100).toFixed(2);
    
    window.openNumericKeypad({
        anchorEl: cell.getElement(),
        initialValue: displayValue,
        max: 1000000,
        onConfirm: async function(valueString) {
            const numValue = parseFloat(valueString);
            const amountCents = Math.round(numValue * 100);
            
            if (isNaN(amountCents) || amountCents < 0) {
                showAlert('Giá trị không hợp lệ!', 'warning');
                return;
            }
            
            // Extract staff ID from field name
            if (field.startsWith('staff_')) {
                const staffId = parseInt(field.replace('staff_', ''));
                const entryIdField = `${field}_entry_id`;
                const existingEntryId = row[entryIdField];
                
                if (existingEntryId) {
                    // Update existing entry
                    if (amountCents > 0) {
                        const result = await window.api.updateEntry(existingEntryId, amountCents, '', 'cash');
                        if (result.success) {
                            // Update in entriesList
                            const entry = entriesList.find(e => e.id === existingEntryId);
                            if (entry) {
                                entry.amount_cents = amountCents;
                            }
                            // Update cell
                            cell.setValue(amountCents);
                            // Reload data to ensure consistency
                            await loadEntriesData();
                            // Thêm delay nhỏ để đảm bảo data được load xong
                            setTimeout(() => {
                                updateRevenueTable();
                                updateEntriesDetailTable();
                            }, 100);
                            showAlert('Cập nhật thành công!', 'success');
                        } else {
                            showAlert('Lỗi cập nhật: ' + result.error, 'error');
                        }
                    } else {
                        // Delete entry if amount is 0
                        const result = await window.api.deleteEntry(existingEntryId);
                        if (result.success) {
                            entriesList = entriesList.filter(e => e.id !== existingEntryId);
                            updateRevenueTable();
                            updateEntriesDetailTable();
                            showAlert('Xóa đơn thành công!', 'success');
                        } else {
                            showAlert('Lỗi xóa: ' + result.error, 'error');
                        }
                    }
                } else if (amountCents > 0) {
                    // Create new entry
                    const result = await window.api.addEntry(staffId, amountCents, '', selectedDate, 'card');
                    if (result.success) {
                        // Find staff name
                        const staff = staffList.find(s => s.id === staffId);
                        entriesList.push({
                            id: result.id,
                            staff_id: staffId,
                            staff_name: staff ? staff.name : 'Unknown',
                            amount_cents: amountCents,
                            note: '',
                            work_date: selectedDate
                        });
                        updateRevenueTable();
                        updateEntriesDetailTable();
                        showAlert('Thêm đơn thành công!', 'success');
                    } else {
                        showAlert('Lỗi thêm: ' + result.error, 'error');
                    }
                }
            }
        },
        onCancel: function() {
            // Do nothing
        }
    });
}

// Global functions for inline event handlers
window.editStaff = function(id) {
    const row = staffTable.getRowFromPosition(staffTable.getRows().findIndex(r => r.getData().id === id));
    if (row) {
        row.getCell('name').edit();
    }
};

window.deleteStaff = deleteStaff;
window.deleteEntry = deleteEntry;
window.openNumericKeypadForInput = openNumericKeypadForInput;
window.openNumericKeypadForCell = openNumericKeypadForCell;
window.openNumericKeypadForRevenueCell = openNumericKeypadForRevenueCell;

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
                    Ngày làm việc:
                </label>
                <input type="date" id="dialogEntryDate" class="form-control" required 
                       value="${workDate}" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                    Ghi chú (tùy chọn):
                </label>
                <input type="text" id="dialogEntryNote" placeholder="Ghi chú..." 
                       class="form-control" style="width: 100%;">
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" id="cancelEntryBtn" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Hủy
                </button>
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-plus"></i> Thêm Entry
                </button>
            </div>
        </form>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Focus on amount input
    const amountInput = dialog.querySelector('#dialogEntryAmount');
    amountInput.focus();
    
    // Open numeric keypad when clicking amount input
    amountInput.addEventListener('click', function(e) {
        e.preventDefault();
        this.blur();
        openNumericKeypadForInput(this);
    });
    
    // Handle form submission
    dialog.querySelector('#addEntryDialogForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = document.getElementById('dialogEntryAmount').value;
        const paymentMethod = document.getElementById('dialogPaymentMethod').value;
        const note = document.getElementById('dialogEntryNote').value;
        const date = document.getElementById('dialogEntryDate').value;
        const giftCardId = document.getElementById('dialogGiftCardId').value;
        
        if (!window.api.validateAmount(amount)) {
            showAlert('Số tiền không hợp lệ!', 'warning');
            return;
        }
        
        if (paymentMethod === 'gift_card' && !giftCardId) {
            showAlert('Vui lòng chọn Gift Card!', 'warning');
            return;
        }
        
        const amountCents = window.api.parseCurrency(amount);
        
        try {
            let result;
            
            if (paymentMethod === 'gift_card') {
                // First create the entry
                result = await window.api.addEntry(staffId, amountCents, note, date, paymentMethod);
                
                if (result.success) {
                    // Then use the gift card
                    const giftCardResult = await window.api.giftCardsUse(giftCardId, {
                        amountCents: amountCents,
                        entryId: result.id,
                        staffId: staffId,
                        notes: `Thanh toán cho entry #${result.id}`
                    });
                    
                    if (!giftCardResult.success) {
                        showAlert('Lỗi sử dụng Gift Card: ' + giftCardResult.error, 'error');
                        return;
                    }
                    
                    // Show message if gift card was auto-deleted
                    if (giftCardResult.deleted) {
                        showAlert('Gift Card đã được sử dụng hết và tự động xóa!', 'info');
                    }
                }
            } else {
                result = await window.api.addEntry(staffId, amountCents, note, date, paymentMethod);
            }
            
            if (result.success) {
                // Find staff name to display
                const staff = staffList.find(s => s.id === staffId);
                entriesList.push({
                    id: result.id,
                    staff_id: staffId,
                    staff_name: staff ? staff.name : 'Unknown',
                    amount_cents: amountCents,
                    note: note,
                    work_date: date,
                    payment_method: paymentMethod
                });
                
                // Update tables if same date
                if (date === document.getElementById('dateFilter').value) {
                    updateRevenueTable();
                    updateEntriesDetailTable();
                }
                
                showAlert('Thêm entry thành công!', 'success');
                modal.remove();
            } else {
                showAlert('Lỗi thêm entry: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error adding entry:', error);
            showAlert('Lỗi thêm entry: ' + error.message, 'error');
        }
    });
    
    // Handle cancel button
    dialog.querySelector('#cancelEntryBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

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

// ==================== TRANSACTIONS FUNCTIONS ====================

function initializeTransactionsTable() {
    transactionsTable = new Tabulator('#transactionsTable', {
        data: [],
        layout: 'fitColumns',
        pagination: true,
        paginationSize: 50,
        movableColumns: true,
        resizableColumns: true,
        columns: [
            { title: 'ID', field: 'id', width: 80 },
            { title: 'Ngày giờ', field: 'created_at', width: 150, formatter: formatDateTime },
            { title: 'Ngày làm việc', field: 'work_date', width: 120 },
            { title: 'Nhân viên', field: 'staff_name', width: 150 },
            { title: 'Số tiền', field: 'amount_cents', width: 120, formatter: currencyFormatter },
            { title: 'Phương thức', field: 'payment_method', width: 100, formatter: paymentMethodFormatter },
            { title: 'Ghi chú', field: 'note', width: 200 },
            { title: 'Thao tác', width: 100, formatter: actionButtonsFormatter, headerSort: false }
        ]
    });
}

async function loadTransactions() {
    try {
        showLoading();
        
        const startDate = document.getElementById('transactionsStartDate').value;
        const endDate = document.getElementById('transactionsEndDate').value;
        const staffId = document.getElementById('transactionsStaffFilter').value;
        const paymentMethod = document.getElementById('transactionsPaymentFilter').value;
        
        // Set default date range if not provided
        if (!startDate || !endDate) {
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            document.getElementById('transactionsStartDate').value = lastWeek.toISOString().split('T')[0];
            document.getElementById('transactionsEndDate').value = today.toISOString().split('T')[0];
        }
        
        const finalStartDate = document.getElementById('transactionsStartDate').value;
        const finalEndDate = document.getElementById('transactionsEndDate').value;
        
        transactionsData = await window.api.getTransactions(
            finalStartDate, 
            finalEndDate, 
            staffId, 
            paymentMethod
        );
        
        if (!transactionsTable) {
            initializeTransactionsTable();
        }
        
        transactionsTable.setData(transactionsData);
        updateTransactionsSummary(finalStartDate, finalEndDate);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading transactions:', error);
        showAlert('Lỗi tải lịch sử giao dịch: ' + error.message, 'error');
        hideLoading();
    }
}

async function updateTransactionsSummary(startDate, endDate) {
    try {
        const summary = await window.api.getTransactionsSummary(startDate, endDate);
        
        let totalCash = 0;
        let totalCard = 0;
        let totalGiftCard = 0;
        let totalCount = 0;
        
        summary.forEach(item => {
            totalCount += item.count;
            if (item.payment_method === 'cash') {
                totalCash = item.total_cents;
            } else if (item.payment_method === 'card') {
                totalCard = item.total_cents;
            } else if (item.payment_method === 'gift_card') {
                totalGiftCard = item.total_cents;
            }
        });
        
        document.getElementById('totalCash').textContent = formatCurrency(totalCash);
        document.getElementById('totalCard').textContent = formatCurrency(totalCard);
        document.getElementById('totalGiftCard').textContent = formatCurrency(totalGiftCard);
        document.getElementById('totalTransactions').textContent = totalCount;
    } catch (error) {
        console.error('Error updating transactions summary:', error);
    }
}

// Helper functions for transactions
function formatDateTime(cell) {
    // Đảm bảo thời gian được hiểu đúng là UTC bằng cách thêm 'Z'
    const dateString = cell.getValue();
    const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    return date.toLocaleString('vi-VN', {
        timeZone: 'Australia/Adelaide',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatCurrency(cents) {
    if (typeof cents !== 'number') return '$0.00';
    return '$' + (cents / 100).toFixed(2);
}

function currencyFormatter(cell) {
    return formatCurrency(cell.getValue());
}

function paymentMethodFormatter(cell) {
    const method = cell.getValue();
    if (method === 'cash') {
        return '<span class="badge badge-cash">Tiền mặt</span>';
    } else if (method === 'card') {
        return '<span class="badge badge-card">Thẻ</span>';
    } else if (method === 'gift_card') {
        return '<span class="badge badge-gift">Gift Card</span>';
    }
    return '<span class="badge">' + method + '</span>';
}

function actionButtonsFormatter(cell) {
    const row = cell.getRow().getData();
    return `
        <button class="btn btn-sm btn-edit" onclick="editTransaction(${row.id})">
            <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-delete" onclick="deleteTransaction(${row.id})">
            <i class="fas fa-trash"></i>
        </button>
    `;
}

async function editTransaction(id) {
    const transaction = transactionsData.find(t => t.id === id);
    if (!transaction) return;
    
    const newAmount = prompt('Nhập số tiền mới:', formatCurrency(transaction.amount_cents));
    const newNote = prompt('Nhập ghi chú mới:', transaction.note);
    const newPaymentMethod = prompt('Nhập phương thức thanh toán (cash/card):', transaction.payment_method);
    
    if (newAmount && newPaymentMethod) {
        try {
            const amountCents = window.api.parseCurrency(newAmount);
            const result = await window.api.updateEntry(id, amountCents, newNote, newPaymentMethod);
            
            if (result.success) {
                showAlert('Cập nhật giao dịch thành công!', 'success');
                loadTransactions();
            } else {
                showAlert('Lỗi cập nhật: ' + result.error, 'error');
            }
        } catch (error) {
            showAlert('Lỗi cập nhật: ' + error.message, 'error');
        }
    }
}

async function deleteTransaction(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    
    try {
        const result = await window.api.deleteEntry(id);
        if (result.success) {
            showAlert('Xóa giao dịch thành công!', 'success');
            loadTransactions();
        } else {
            showAlert('Lỗi xóa: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Lỗi xóa: ' + error.message, 'error');
    }
}

async function exportTransactions() {
    try {
        const startDate = document.getElementById('transactionsStartDate').value;
        const endDate = document.getElementById('transactionsEndDate').value;
        
        if (!startDate || !endDate) {
            showAlert('Vui lòng chọn khoảng thời gian', 'warning');
            return;
        }
        
        const transactions = await window.api.getTransactions(startDate, endDate);
        
        const exportData = transactions.map(t => ({
            'ID': t.id,
            'Ngày giờ': new Date(t.created_at.endsWith('Z') ? t.created_at : t.created_at + 'Z').toLocaleString('vi-VN', {
                timeZone: 'Australia/Adelaide',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            'Ngày làm việc': t.work_date,
            'Nhân viên': t.staff_name,
            'Số tiền': formatCurrency(t.amount_cents),
            'Phương thức': t.payment_method === 'cash' ? 'Tiền mặt' : 
                          t.payment_method === 'card' ? 'Thẻ' : 
                          t.payment_method === 'gift_card' ? 'Gift Card' : t.payment_method,
            'Ghi chú': t.note
        }));
        
        const result = await window.api.exportData(exportData, `transactions_${startDate}_${endDate}.xlsx`);
        if (result.success) {
            showAlert('Xuất file thành công!', 'success');
        } else {
            showAlert('Lỗi xuất file: ' + result.error, 'error');
        }
    } catch (error) {
        showAlert('Lỗi xuất file: ' + error.message, 'error');
    }
}

// ==================== GIFT CARDS FUNCTIONS ====================

function initializeGiftCardsTable() {
    giftCardsTable = new Tabulator('#giftCardsTable', {
        data: [],
        layout: 'fitColumns',
        pagination: true,
        paginationSize: 20,
        movableColumns: true,
        resizableColumns: true,
        columns: [
            { title: 'ID', field: 'id', width: 80 },
            { title: 'Số thẻ', field: 'card_number', width: 150 },
            { title: 'Tên khách hàng', field: 'customer_name', width: 200 },
            { title: 'SĐT', field: 'customer_phone', width: 120 },
            { title: 'Giá trị ban đầu', field: 'initial_amount_cents', width: 150, formatter: currencyFormatter },
            { title: 'Số dư còn lại', field: 'remaining_amount_cents', width: 150, formatter: currencyFormatter },
            { title: 'Trạng thái', field: 'status', width: 120, formatter: giftCardStatusFormatter },
            { title: 'Ngày tạo', field: 'created_at', width: 150, formatter: formatDateTime },
            { title: 'Hết hạn', field: 'expires_at', width: 120, formatter: formatDate },
            { title: 'Thao tác', width: 200, formatter: giftCardActionButtonsFormatter, headerSort: false }
        ]
    });
}

async function loadGiftCards() {
    try {
        console.log('loadGiftCards called');
        showLoading();
        
        const status = document.getElementById('giftCardStatusFilter').value;
        const search = document.getElementById('giftCardSearch').value;
        
        console.log('Calling window.api.giftCardsGetAll with:', { status, search });
        const result = await window.api.giftCardsGetAll(status, search);
        console.log('giftCardsGetAll result:', result);
        
        // Check if result is array or has success property
        if (Array.isArray(result)) {
            giftCardsData = result;
        } else if (result.success) {
            giftCardsData = result.data;
        } else {
            showAlert('Lỗi tải Gift Cards: ' + result.error, 'error');
            hideLoading();
            return;
        }
        
        if (!giftCardsTable) {
            initializeGiftCardsTable();
        }
        
        giftCardsTable.setData(giftCardsData);
        updateGiftCardsSummary();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading gift cards:', error);
        showAlert('Lỗi tải Gift Cards: ' + error.message, 'error');
        hideLoading();
    }
}

function updateGiftCardsSummary() {
    const totalCards = giftCardsData.length;
    let totalValue = 0;
    let totalBalance = 0;
    let totalUsed = 0;
    
    giftCardsData.forEach(card => {
        totalValue += card.initial_amount_cents;
        totalBalance += card.remaining_amount_cents;
        totalUsed += (card.initial_amount_cents - card.remaining_amount_cents);
    });
    
    document.getElementById('totalGiftCards').textContent = totalCards;
    document.getElementById('totalGiftCardValue').textContent = formatCurrency(totalValue);
    document.getElementById('totalGiftCardBalance').textContent = formatCurrency(totalBalance);
    document.getElementById('totalGiftCardUsed').textContent = formatCurrency(totalUsed);
}

function giftCardStatusFormatter(cell) {
    const status = cell.getValue();
    const statusMap = {
        'active': { text: 'Hoạt động', class: 'badge-success' },
        'used': { text: 'Đã sử dụng', class: 'badge-warning' },
        'expired': { text: 'Hết hạn', class: 'badge-danger' },
        'cancelled': { text: 'Đã hủy', class: 'badge-secondary' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'badge-secondary' };
    return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function giftCardActionButtonsFormatter(cell) {
    const row = cell.getRow().getData();
    return `
        <button class="btn btn-sm btn-info" onclick="viewGiftCardDetails(${row.id})" title="Xem chi tiết">
            <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-warning" onclick="editGiftCard(${row.id})" title="Chỉnh sửa">
            <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-success" onclick="useGiftCard(${row.id})" title="Sử dụng" ${row.status !== 'active' ? 'disabled' : ''}>
            <i class="fas fa-credit-card"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteGiftCard(${row.id})" title="Xóa Gift Card">
            <i class="fas fa-trash"></i>
        </button>
    `;
}

// Global variable to track if modal is already open
let isGiftCardModalOpen = false;

function openCreateGiftCardDialog() {
    console.log('openCreateGiftCardDialog called');
    
    // Prevent multiple modals
    if (isGiftCardModalOpen) {
        console.log('Modal already open, ignoring click');
        return;
    }
    
    isGiftCardModalOpen = true;
    
    try {
        // Remove any existing modal first
        const existingModal = document.querySelector('#createGiftCardModal');
        if (existingModal) {
            existingModal.remove();
        }
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'createGiftCardModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Tạo Gift Card mới</h3>
                <span class="close" onclick="this.closest('.modal').remove(); isGiftCardModalOpen = false;">&times;</span>
            </div>
            <form id="createGiftCardForm">
                <div class="modal-body">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Số thẻ (để trống để tự động tạo):
                        </label>
                        <input type="text" id="giftCardNumber" class="form-control" placeholder="GC123456789">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Tên khách hàng: <span style="color: red;">*</span>
                        </label>
                        <input type="text" id="giftCardCustomerName" class="form-control" required>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Số điện thoại:
                        </label>
                        <input type="tel" id="giftCardCustomerPhone" class="form-control">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Email:
                        </label>
                        <input type="email" id="giftCardCustomerEmail" class="form-control">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Giá trị ($): <span style="color: red;">*</span>
                        </label>
                        <input type="number" id="giftCardAmount" class="form-control" step="0.01" min="0" required>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Ngày hết hạn:
                        </label>
                        <input type="date" id="giftCardExpiresAt" class="form-control">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057;">
                            Ghi chú:
                        </label>
                        <textarea id="giftCardNotes" class="form-control" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                    <button type="submit" class="btn btn-primary">Tạo Gift Card</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Modal appended to body');
    
    // Show the modal
    modal.classList.add('show');
    console.log('Modal should be visible now');
    
    // Test if modal is actually visible
    setTimeout(() => {
        const modalElement = document.getElementById('createGiftCardModal');
        if (modalElement) {
            console.log('Modal element found:', modalElement);
            console.log('Modal classes:', modalElement.className);
            console.log('Modal display style:', window.getComputedStyle(modalElement).display);
        } else {
            console.error('Modal element not found');
        }
    }, 100);
    
    // Wait a bit for DOM to be ready
    setTimeout(() => {
        const form = document.getElementById('createGiftCardForm');
        if (form) {
            console.log('Form found, adding event listener');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Gift card form submitted');
                
                // Test alert first
                alert('Form submitted! Check console for details.');
        
        const customerName = document.getElementById('giftCardCustomerName').value;
        const amount = document.getElementById('giftCardAmount').value;
        console.log('Form values:', { customerName, amount });
        
        if (!customerName.trim()) {
            showAlert('Vui lòng nhập tên khách hàng!', 'warning');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            showAlert('Vui lòng nhập giá trị hợp lệ!', 'warning');
            return;
        }
        
        const giftCardData = {
            cardNumber: document.getElementById('giftCardNumber').value || null,
            customerName: customerName,
            customerPhone: document.getElementById('giftCardCustomerPhone').value || null,
            customerEmail: document.getElementById('giftCardCustomerEmail').value || null,
            amountCents: Math.round(parseFloat(amount) * 100),
            expiresAt: document.getElementById('giftCardExpiresAt').value || null,
            notes: document.getElementById('giftCardNotes').value || null
        };
        
        try {
            console.log('Creating gift card with data:', giftCardData);
            const result = await window.api.giftCardsCreate(giftCardData);
            console.log('giftCardsCreate result:', result);
            if (result.success) {
                showAlert(`Tạo Gift Card thành công! Số thẻ: ${result.cardNumber}`, 'success');
                modal.remove();
                isGiftCardModalOpen = false;
                loadGiftCards();
            } else {
                showAlert('Lỗi tạo Gift Card: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error creating gift card:', error);
            showAlert('Lỗi tạo Gift Card: ' + error.message, 'error');
        }
    });
        } else {
            console.error('Form not found');
        }
    }, 100);
    
    } catch (error) {
        console.error('Error opening create gift card dialog:', error);
        showAlert('Lỗi mở dialog tạo Gift Card: ' + error.message, 'error');
    }
}

async function viewGiftCardDetails(id) {
    try {
        const result = await window.api.giftCardsGetById(id);
        if (result.success) {
            const card = result.data;
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Chi tiết Gift Card - ${card.card_number}</h3>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                            <div>
                                <h4>Thông tin khách hàng</h4>
                                <p><strong>Tên:</strong> ${card.customer_name}</p>
                                <p><strong>SĐT:</strong> ${card.customer_phone || 'N/A'}</p>
                                <p><strong>Email:</strong> ${card.customer_email || 'N/A'}</p>
                            </div>
                            <div>
                                <h4>Thông tin thẻ</h4>
                                <p><strong>Số thẻ:</strong> ${card.card_number}</p>
                                <p><strong>Giá trị ban đầu:</strong> ${formatCurrency(card.initial_amount_cents)}</p>
                                <p><strong>Số dư còn lại:</strong> ${formatCurrency(card.remaining_amount_cents)}</p>
                                <p><strong>Trạng thái:</strong> ${giftCardStatusFormatter({getValue: () => card.status})}</p>
                                <p><strong>Ngày tạo:</strong> ${formatDateTime({getValue: () => card.created_at})}</p>
                                <p><strong>Hết hạn:</strong> ${card.expires_at ? formatDate({getValue: () => card.expires_at}) : 'Không giới hạn'}</p>
                            </div>
                        </div>
                        
                        <h4>Lịch sử giao dịch</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Loại</th>
                                        <th>Số tiền</th>
                                        <th>Nhân viên</th>
                                        <th>Ngày</th>
                                        <th>Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${card.transactions.map(t => `
                                        <tr>
                                            <td>${t.transaction_type === 'purchase' ? 'Mua thẻ' : 
                                                 t.transaction_type === 'usage' ? 'Sử dụng' : 
                                                 t.transaction_type === 'refund' ? 'Hoàn tiền' : 'Điều chỉnh'}</td>
                                            <td>${formatCurrency(t.amount_cents)}</td>
                                            <td>${t.staff_name || 'N/A'}</td>
                                            <td>${formatDateTime({getValue: () => t.created_at})}</td>
                                            <td>${t.notes || ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } else {
            showAlert('Lỗi tải chi tiết Gift Card: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error viewing gift card details:', error);
        showAlert('Lỗi tải chi tiết Gift Card: ' + error.message, 'error');
    }
}

async function editGiftCard(id) {
    try {
        const result = await window.api.giftCardsGetById(id);
        if (result.success) {
            const card = result.data;
            
            const newCustomerName = prompt('Tên khách hàng mới:', card.customer_name);
            if (newCustomerName === null) return;
            
            const newCustomerPhone = prompt('Số điện thoại mới:', card.customer_phone || '');
            if (newCustomerPhone === null) return;
            
            const newCustomerEmail = prompt('Email mới:', card.customer_email || '');
            if (newCustomerEmail === null) return;
            
            const newStatus = prompt('Trạng thái mới (active/used/expired/cancelled):', card.status);
            if (newStatus === null) return;
            
            const newExpiresAt = prompt('Ngày hết hạn mới (YYYY-MM-DD):', card.expires_at ? card.expires_at.split('T')[0] : '');
            if (newExpiresAt === null) return;
            
            const newNotes = prompt('Ghi chú mới:', card.notes || '');
            if (newNotes === null) return;
            
            const updateResult = await window.api.giftCardsUpdate(id, {
                customer_name: newCustomerName,
                customer_phone: newCustomerPhone,
                customer_email: newCustomerEmail,
                status: newStatus,
                expires_at: newExpiresAt || null,
                notes: newNotes
            });
            
            if (updateResult.success) {
                showAlert('Cập nhật Gift Card thành công!', 'success');
                loadGiftCards();
            } else {
                showAlert('Lỗi cập nhật: ' + updateResult.error, 'error');
            }
        } else {
            showAlert('Lỗi tải thông tin Gift Card: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error editing gift card:', error);
        showAlert('Lỗi chỉnh sửa Gift Card: ' + error.message, 'error');
    }
}

async function useGiftCard(id) {
    const card = giftCardsData.find(c => c.id === id);
    if (!card) return;
    
    const amount = prompt(`Nhập số tiền muốn sử dụng từ Gift Card ${card.card_number}:\nSố dư hiện tại: ${formatCurrency(card.remaining_amount_cents)}`);
    if (!amount) return;
    
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents > card.remaining_amount_cents) {
        showAlert('Số tiền vượt quá số dư!', 'error');
        return;
    }
    
    const notes = prompt('Ghi chú (tùy chọn):');
    
    try {
        const result = await window.api.giftCardsUse(id, {
            amountCents: amountCents,
            notes: notes || null
        });
        
        if (result.success) {
            if (result.deleted) {
                showAlert(`Gift Card đã được sử dụng hết và tự động xóa!`, 'success');
            } else {
                showAlert(`Sử dụng Gift Card thành công! Số dư còn lại: ${formatCurrency(result.remainingAmount)}`, 'success');
            }
            loadGiftCards();
        } else {
            showAlert('Lỗi sử dụng Gift Card: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error using gift card:', error);
        showAlert('Lỗi sử dụng Gift Card: ' + error.message, 'error');
    }
}

function formatDate(cell) {
    const dateString = cell.getValue();
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Gift Card integration with payment
async function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('dialogPaymentMethod').value;
    const giftCardSelection = document.getElementById('giftCardSelection');
    const giftCardInfo = document.getElementById('giftCardInfo');
    
    if (paymentMethod === 'gift_card') {
        giftCardSelection.style.display = 'block';
        await loadActiveGiftCards();
    } else {
        giftCardSelection.style.display = 'none';
        giftCardInfo.style.display = 'none';
    }
}

async function loadActiveGiftCards() {
    try {
        const result = await window.api.giftCardsGetAll('active', '');
        console.log('loadActiveGiftCards result:', result);
        
        const select = document.getElementById('dialogGiftCardId');
        select.innerHTML = '<option value="">Chọn Gift Card...</option>';
        
        // Check if result is array or has success property
        const giftCards = Array.isArray(result) ? result : (result.success ? result.data : []);
        
        if (giftCards && giftCards.length > 0) {
            giftCards.forEach(card => {
                const option = document.createElement('option');
                option.value = card.id;
                option.textContent = `${card.card_number} - ${card.customer_name} (${formatCurrency(card.remaining_amount_cents)})`;
                select.appendChild(option);
            });
            
            // Add event listener for gift card selection
            select.addEventListener('change', handleGiftCardSelection);
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Không có Gift Card nào khả dụng';
            select.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading active gift cards:', error);
        const select = document.getElementById('dialogGiftCardId');
        select.innerHTML = '<option value="">Lỗi tải Gift Card</option>';
    }
}

// Search gift cards function
async function searchGiftCards() {
    const searchInput = document.getElementById('giftCardSearchInput');
    const select = document.getElementById('dialogGiftCardId');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length < 2) {
        // If search term is too short, load all active gift cards
        await loadActiveGiftCards();
        return;
    }
    
    try {
        const result = await window.api.giftCardsGetAll('active', searchTerm);
        console.log('searchGiftCards result:', result);
        
        select.innerHTML = '<option value="">Chọn Gift Card...</option>';
        
        // Check if result is array or has success property
        const giftCards = Array.isArray(result) ? result : (result.success ? result.data : []);
        
        if (giftCards && giftCards.length > 0) {
            giftCards.forEach(card => {
                const option = document.createElement('option');
                option.value = card.id;
                option.textContent = `${card.card_number} - ${card.customer_name} (${formatCurrency(card.remaining_amount_cents)})`;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Không tìm thấy Gift Card nào';
            select.appendChild(option);
        }
    } catch (error) {
        console.error('Error searching gift cards:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Lỗi tìm kiếm Gift Card';
        select.appendChild(option);
    }
}

async function handleGiftCardSelection() {
    const select = document.getElementById('dialogGiftCardId');
    const giftCardInfo = document.getElementById('giftCardInfo');
    const giftCardBalance = document.getElementById('giftCardBalance');
    
    if (select.value) {
        try {
            // Find the selected gift card
            const result = await window.api.giftCardsGetAll('active', '');
            console.log('handleGiftCardSelection result:', result);
            
            // Check if result is array or has success property
            const giftCards = Array.isArray(result) ? result : (result.success ? result.data : []);
            const card = giftCards.find(c => c.id == select.value);
            
            if (card) {
                giftCardBalance.textContent = `Số dư: ${formatCurrency(card.remaining_amount_cents)}`;
                giftCardInfo.style.display = 'block';
            }
        } catch (error) {
            console.error('Error getting gift card details:', error);
            giftCardInfo.style.display = 'none';
        }
    } else {
        giftCardInfo.style.display = 'none';
    }
}

async function deleteGiftCard(id) {
    try {
        // Find the gift card to get details for confirmation
        const card = giftCardsData.find(c => c.id === id);
        if (!card) {
            showAlert('Không tìm thấy Gift Card!', 'error');
            return;
        }
        
        // Show confirmation dialog
        const confirmMessage = `Bạn có chắc chắn muốn xóa Gift Card này?\n\n` +
            `Số thẻ: ${card.card_number}\n` +
            `Khách hàng: ${card.customer_name}\n` +
            `Số dư còn lại: ${formatCurrency(card.remaining_amount_cents)}\n\n` +
            `Hành động này không thể hoàn tác!`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Call API to delete gift card
        const result = await window.api.giftCardsDelete(id);
        
        if (result.success) {
            showAlert('Xóa Gift Card thành công!', 'success');
            loadGiftCards(); // Reload the table
        } else {
            showAlert('Lỗi xóa Gift Card: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting gift card:', error);
        showAlert('Lỗi xóa Gift Card: ' + error.message, 'error');
    }
}
