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
        
        if (currentPin.length === 6) {
            // Auto-submit when PIN is complete
            setTimeout(handleExpensesPinSubmit, 200);
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

// Handle PIN submit
async function handleExpensesPinSubmit() {
    try {
        const result = await window.api.expensesCheckPin(currentPin);
        if (result.success) {
            // Hide PIN modal
            document.getElementById('expensesPinModal').style.display = 'none';
            // Load expenses data
            await loadExpensesData();
        } else {
            // Show error
            const pinError = document.getElementById('expensesPinError');
            pinError.textContent = result.error || 'Mã PIN không đúng';
            pinError.style.display = 'block';
            
            // Animate dots
            for (let i = 1; i <= 6; i++) {
                const dot = document.getElementById(`pinDot${i}`);
                dot.classList.add('error');
            }
            
            // Reset PIN after delay
            setTimeout(() => {
                currentPin = '';
                updatePinDisplay();
            }, 800);
        }
    } catch (error) {
        console.error('Error checking PIN:', error);
        showAlert('Lỗi kiểm tra PIN: ' + error.message, 'error');
    }
}

// Handle PIN cancel
function handleExpensesPinCancel() {
    document.getElementById('expensesPinModal').style.display = 'none';
    currentPin = '';
    updatePinDisplay();
}


