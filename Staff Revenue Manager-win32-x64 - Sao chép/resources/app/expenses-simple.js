// Simple Expenses System - Test Version
// This is a simplified version to test the basic functionality

// Test function to add a simple expense
async function testAddExpense() {
    try {
        const testExpense = {
            expense_date: new Date().toISOString().split('T')[0],
            category: 'materials',
            description: 'Test expense',
            amount_cents: 1000,
            notes: 'Test notes'
        };
        
        console.log('Testing expense add with data:', testExpense);
        const result = await window.api.expensesAdd(testExpense);
        console.log('Add result:', result);
        
        if (result.success) {
            console.log('Expense added successfully with ID:', result.id);
            return result.id;
        } else {
            console.error('Failed to add expense:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Error in testAddExpense:', error);
        return null;
    }
}

// Test function to get expenses
async function testGetExpenses() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Testing get expenses for date:', today);
        const result = await window.api.expensesGetAll(today, null, null);
        console.log('Get expenses result:', result);
        
        if (result.success) {
            console.log('Found expenses:', result.data.length);
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
            return result.data;
        } else {
            console.error('Failed to get expenses:', result.error);
            return [];
        }
    } catch (error) {
        console.error('Error in testGetExpenses:', error);
        return [];
    }
}

// Test function to update an expense
async function testUpdateExpense(expenseId) {
    try {
        const updateData = {
            expense_date: new Date().toISOString().split('T')[0],
            category: 'utilities',
            description: 'Updated test expense',
            amount_cents: 2000,
            notes: 'Updated test notes'
        };
        
        console.log('Testing expense update with ID:', expenseId, 'data:', updateData);
        const result = await window.api.expensesUpdate(expenseId, updateData);
        console.log('Update result:', result);
        
        return result.success;
    } catch (error) {
        console.error('Error in testUpdateExpense:', error);
        return false;
    }
}

// Main test function
async function runExpensesTest() {
    console.log('=== Starting Expenses Test ===');
    
    // Step 1: Add an expense
    console.log('Step 1: Adding expense...');
    const expenseId = await testAddExpense();
    if (!expenseId) {
        console.error('Failed to add expense, stopping test');
        return;
    }
    
    // Step 2: Get expenses
    console.log('Step 2: Getting expenses...');
    const expenses = await testGetExpenses();
    if (expenses.length === 0) {
        console.error('No expenses found, stopping test');
        return;
    }
    
    // Step 3: Update the expense
    console.log('Step 3: Updating expense...');
    const updateSuccess = await testUpdateExpense(expenseId);
    if (!updateSuccess) {
        console.error('Failed to update expense');
        return;
    }
    
    console.log('=== Expenses Test Completed Successfully ===');
}

// Export for use in console
window.runExpensesTest = runExpensesTest;
window.testAddExpense = testAddExpense;
window.testGetExpenses = testGetExpenses;
window.testUpdateExpense = testUpdateExpense;
