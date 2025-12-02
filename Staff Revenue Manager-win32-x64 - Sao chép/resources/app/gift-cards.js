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
    
    // Wait a bit for DOM to be ready
    setTimeout(() => {
        const form = document.getElementById('createGiftCardForm');
        if (form) {
            console.log('Form found, adding event listener');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Gift card form submitted');
                
                const customerName = document.getElementById('giftCardCustomerName').value;
                const amount = document.getElementById('giftCardAmount').value;
                
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
                    const result = await window.api.giftCardsCreate(giftCardData);
                    if (result.success) {
                        showAlert('Tạo Gift Card thành công!', 'success');
                        modal.remove();
                        isGiftCardModalOpen = false;
                        await loadGiftCards();
                    } else {
                        showAlert('Lỗi tạo Gift Card: ' + result.error, 'error');
                    }
                } catch (error) {
                    console.error('Error creating gift card:', error);
                    showAlert('Lỗi tạo Gift Card: ' + error.message, 'error');
                }
            });
        }
    }, 100);
    } catch (error) {
        console.error('Error opening create gift card dialog:', error);
        isGiftCardModalOpen = false;
        showAlert('Lỗi hiển thị form tạo Gift Card: ' + error.message, 'error');
    }
}

// Other gift card related functions (viewGiftCardDetails, editGiftCard, useGiftCard, deleteGiftCard, etc.)
// remain the same structure as in the original renderer.js and can be added here as needed.


