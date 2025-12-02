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


