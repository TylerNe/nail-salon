// Web API wrapper for web interface
// This file provides the same API interface as the Electron app for web access

class WebAPI {
  constructor() {
    this.baseURL = window.location.origin;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Staff Management
  async getStaff() {
    return await this.request('/api/staff');
  }

  async addStaff(name) {
    return await this.request('/api/staff', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async updateStaff(id, name) {
    return await this.request(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  }

  async deleteStaff(id) {
    return await this.request(`/api/staff/${id}`, {
      method: 'DELETE'
    });
  }

  // Entries Management
  async getEntries(startDate, endDate) {
    return await this.request(`/api/entries?startDate=${startDate}&endDate=${endDate}`);
  }

  async addEntry(staffId, amountCents, note, workDate, paymentMethod) {
    return await this.request('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ staffId, amountCents, note, workDate, paymentMethod })
    });
  }

  async updateEntry(id, amountCents, note, paymentMethod) {
    return await this.request(`/api/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ amountCents, note, paymentMethod })
    });
  }

  async deleteEntry(id) {
    return await this.request(`/api/entries/${id}`, {
      method: 'DELETE'
    });
  }

  // Statistics
  async getStatistics(period, startDate, endDate) {
    return await this.request(`/api/statistics?period=${period}&startDate=${startDate}&endDate=${endDate}`);
  }

  // Work Schedule
  async getWorkSchedule(workDate) {
    return await this.request(`/api/work-schedule?workDate=${workDate}`);
  }

  async updateWorkSchedule(staffId, workDate, isWorking) {
    return await this.request('/api/work-schedule', {
      method: 'POST',
      body: JSON.stringify({ staffId, workDate, isWorking })
    });
  }

  // Payroll & Shifts - Password
  async payrollCheckPassword(password) {
    console.log('WebAPI: payrollCheckPassword called with:', password);
    const result = await this.request('/api/payroll/check-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    console.log('WebAPI: payrollCheckPassword result:', result);
    return result.valid;
  }

  async payrollChangePassword(oldPassword, newPassword) {
    return await this.request('/api/payroll/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  // Staff Rates Management
  async ratesGetAll() {
    return await this.request('/api/rates');
  }

  async ratesUpsert(staffId, wageCents) {
    return await this.request('/api/rates', {
      method: 'POST',
      body: JSON.stringify({ staffId, wageCents })
    });
  }

  // Shifts Management
  async shiftsListByDate(workDate) {
    return await this.request(`/api/shifts?workDate=${workDate}`);
  }

  async shiftsUpsert(staffId, workDate, wageCents, note) {
    return await this.request('/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ staffId, workDate, wageCents, note })
    });
  }

  async shiftsDelete(staffId, workDate) {
    return await this.request(`/api/shifts?staffId=${staffId}&workDate=${workDate}`, {
      method: 'DELETE'
    });
  }

  // Settings Management
  async settingsGetRent() {
    return await this.request('/api/settings/rent');
  }

  async settingsUpdateRent(amount, period) {
    return await this.request('/api/settings/rent', {
      method: 'POST',
      body: JSON.stringify({ amount, period })
    });
  }

  // Income Summary
  async incomeGetSummary(startDate, endDate) {
    return await this.request(`/api/income/summary?startDate=${startDate}&endDate=${endDate}`);
  }
  
  // Daily Expenses
  async expensesGetAll(date, startDate, endDate) {
    let url = '/api/expenses';
    const params = new URLSearchParams();
    
    if (date) {
      params.append('date', date);
    } else if (startDate && endDate) {
      params.append('start_date', startDate);
      params.append('end_date', endDate);
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    const result = await this.request(url);
    return { success: true, data: result };
  }
  
  async expensesAdd(expenseData) {
    const result = await this.request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
    return result;
  }
  
  async expensesUpdate(id, expenseData) {
    const result = await this.request(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData)
    });
    return result;
  }
  
  async expensesDelete(id) {
    const result = await this.request(`/api/expenses/${id}`, {
      method: 'DELETE'
    });
    return result;
  }
  
  async expensesGetSummary(startDate, endDate) {
    const result = await this.request(`/api/expenses/summary?start_date=${startDate}&end_date=${endDate}`);
    return { success: true, data: result };
  }

  // Expenses PIN Management
  async expensesCheckPin(pin) {
    const result = await this.request('/api/expenses/check-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
    return result;
  }

  async expensesChangePin(oldPin, newPin) {
    const result = await this.request('/api/expenses/change-pin', {
      method: 'POST',
      body: JSON.stringify({ oldPin, newPin })
    });
    return result;
  }

  async expensesDebug() {
    const result = await this.request('/api/expenses/debug');
    return result;
  }

  // Transactions Management
  async getTransactions(startDate, endDate, staffId, paymentMethod, limit, offset) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (staffId) params.append('staffId', staffId);
    if (paymentMethod) params.append('paymentMethod', paymentMethod);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    
    return await this.request(`/api/transactions?${params.toString()}`);
  }

  async getTransactionsSummary(startDate, endDate) {
    return await this.request(`/api/transactions/summary?startDate=${startDate}&endDate=${endDate}`);
  }

  // Gift Cards Management
  async giftCardsGetAll(status, search) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return await this.request(`/api/gift-cards?${params.toString()}`);
  }

  async giftCardsCreate(giftCardData) {
    return await this.request('/api/gift-cards', {
      method: 'POST',
      body: JSON.stringify(giftCardData)
    });
  }

  async giftCardsGetById(id) {
    return await this.request(`/api/gift-cards/${id}`);
  }

  async giftCardsUpdate(id, updateData) {
    return await this.request(`/api/gift-cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async giftCardsUse(id, usageData) {
    return await this.request(`/api/gift-cards/${id}/use`, {
      method: 'POST',
      body: JSON.stringify(usageData)
    });
  }

  async giftCardsSearch(query) {
    return await this.request(`/api/gift-cards/search/${encodeURIComponent(query)}`);
  }

  async giftCardsDelete(id) {
    return await this.request(`/api/gift-cards/${id}`, {
      method: 'DELETE'
    });
  }

  // Utility functions
  formatCurrency(cents) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(cents / 100);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }

  validateAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0;
  }

  parseCurrency(amountString) {
    const num = parseFloat(amountString);
    return Math.round(num * 100);
  }
}

// Create global API instance
window.api = new WebAPI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebAPI;
}
