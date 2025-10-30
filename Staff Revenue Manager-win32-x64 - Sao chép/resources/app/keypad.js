/**
 * Numeric Keypad Component for Touch-friendly Input
 * Supports decimal input (2 decimal places), backspace, clear, confirm, cancel
 */

class NumericKeypad {
    constructor() {
        this.currentValue = '';
        this.maxValue = 1000000;
        this.decimalPlaces = 2;
        this.onConfirm = null;
        this.onCancel = null;
        this.keypadElement = null;
        this.previewElement = null;
        this.inputElement = null;
    }

    /**
     * Open the numeric keypad
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.anchorEl - Element to anchor the keypad near
     * @param {string} options.initialValue - Initial value to display
     * @param {number} options.max - Maximum allowed value
     * @param {Function} options.onConfirm - Callback when user confirms
     * @param {Function} options.onCancel - Callback when user cancels
     */
    open(options) {
        this.inputElement = options.anchorEl;
        this.currentValue = options.initialValue || '0';
        this.maxValue = options.max || 1000000;
        this.onConfirm = options.onConfirm || (() => {});
        this.onCancel = options.onCancel || (() => {});

        // Remove any existing keypad
        this.close();

        // Create keypad overlay
        this.createKeypad();
        
        // Add to document
        document.body.appendChild(this.keypadElement);

        // Set up event listeners
        this.setupEventListeners();

        // Focus trap
        setTimeout(() => {
            this.keypadElement.focus();
        }, 100);
    }

    createKeypad() {
        // Create main container
        this.keypadElement = document.createElement('div');
        this.keypadElement.className = 'numeric-keypad-overlay';
        this.keypadElement.tabIndex = -1;

        // Create keypad modal
        const modal = document.createElement('div');
        modal.className = 'numeric-keypad-modal';

        // Create preview display
        const previewContainer = document.createElement('div');
        previewContainer.className = 'keypad-preview-container';

        this.previewElement = document.createElement('input');
        this.previewElement.className = 'keypad-preview';
        this.previewElement.type = 'text';
        this.previewElement.value = this.formatDisplay(this.currentValue);
        this.previewElement.readOnly = true;

        previewContainer.appendChild(this.previewElement);

        // Create buttons grid
        const buttonsGrid = document.createElement('div');
        buttonsGrid.className = 'keypad-buttons-grid';

        // Number buttons layout
        const buttons = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['0', '.', '⌫']
        ];

        buttons.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keypad-row';

            row.forEach(label => {
                const btn = document.createElement('button');
                btn.className = 'keypad-btn';
                btn.textContent = label;
                btn.dataset.value = label;
                
                if (label === '⌫') {
                    btn.className += ' keypad-btn-backspace';
                } else if (label === '.') {
                    btn.className += ' keypad-btn-decimal';
                }

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleInput(label);
                });

                rowDiv.appendChild(btn);
            });

            buttonsGrid.appendChild(rowDiv);
        });

        // Create action buttons row
        const actionsRow = document.createElement('div');
        actionsRow.className = 'keypad-actions-row';

        const clearBtn = document.createElement('button');
        clearBtn.className = 'keypad-btn keypad-btn-clear';
        clearBtn.textContent = 'C';
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClear();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'keypad-btn keypad-btn-cancel';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Hủy';
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCancel();
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'keypad-btn keypad-btn-confirm';
        confirmBtn.innerHTML = '<i class="fas fa-check"></i> OK';
        confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleConfirm();
        });

        actionsRow.appendChild(clearBtn);
        actionsRow.appendChild(cancelBtn);
        actionsRow.appendChild(confirmBtn);

        // Warning message
        const warningDiv = document.createElement('div');
        warningDiv.className = 'keypad-warning';
        warningDiv.id = 'keypad-warning';
        warningDiv.style.display = 'none';

        // Assemble modal
        modal.appendChild(previewContainer);
        modal.appendChild(buttonsGrid);
        modal.appendChild(actionsRow);
        modal.appendChild(warningDiv);

        this.keypadElement.appendChild(modal);
    }

    setupEventListeners() {
        // ESC to cancel
        this.keypadElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.handleCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.handleConfirm();
            }
        });

        // Click outside to cancel
        this.keypadElement.addEventListener('click', (e) => {
            if (e.target === this.keypadElement) {
                this.handleCancel();
            }
        });
    }

    handleInput(value) {
        if (value === '⌫') {
            // Backspace
            if (this.currentValue.length > 0) {
                this.currentValue = this.currentValue.slice(0, -1);
                if (this.currentValue === '' || this.currentValue === '-') {
                    this.currentValue = '0';
                }
            }
        } else if (value === '.') {
            // Decimal point - only allow one
            if (!this.currentValue.includes('.')) {
                if (this.currentValue === '0' || this.currentValue === '') {
                    this.currentValue = '0.';
                } else {
                    this.currentValue += '.';
                }
            }
        } else {
            // Number
            if (this.currentValue === '0' && value !== '.') {
                this.currentValue = value;
            } else {
                const newValue = this.currentValue + value;
                
                // Check decimal places
                if (newValue.includes('.')) {
                    const parts = newValue.split('.');
                    if (parts[1].length > this.decimalPlaces) {
                        this.showWarning(`Chỉ cho phép ${this.decimalPlaces} chữ số sau dấu thập phân`);
                        return;
                    }
                }
                
                this.currentValue = newValue;
            }
        }

        this.updatePreview();
        this.validateValue();
    }

    handleClear() {
        this.currentValue = '0';
        this.updatePreview();
        this.hideWarning();
    }

    handleCancel() {
        if (this.onCancel) {
            this.onCancel();
        }
        this.close();
    }

    handleConfirm() {
        const numValue = parseFloat(this.currentValue);
        
        if (isNaN(numValue) || numValue < 0) {
            this.showWarning('Giá trị không hợp lệ');
            return;
        }

        if (numValue > this.maxValue) {
            this.showWarning(`Giá trị không được vượt quá ${this.formatDisplay(this.maxValue.toString())}`);
            return;
        }

        if (this.onConfirm) {
            this.onConfirm(this.currentValue);
        }
        this.close();
    }

    updatePreview() {
        if (this.previewElement) {
            this.previewElement.value = this.formatDisplay(this.currentValue);
        }
    }

    validateValue() {
        const numValue = parseFloat(this.currentValue);
        
        if (!isNaN(numValue) && numValue > this.maxValue) {
            this.showWarning(`Tối đa: ${this.formatDisplay(this.maxValue.toString())}`);
        } else {
            this.hideWarning();
        }
    }

    formatDisplay(value) {
        // Format for display with thousand separators
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '0.00';
        
        return new Intl.NumberFormat('en-AU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(numValue);
    }

    showWarning(message) {
        const warningEl = document.getElementById('keypad-warning');
        if (warningEl) {
            warningEl.textContent = message;
            warningEl.style.display = 'block';
        }
    }

    hideWarning() {
        const warningEl = document.getElementById('keypad-warning');
        if (warningEl) {
            warningEl.style.display = 'none';
        }
    }

    close() {
        if (this.keypadElement && this.keypadElement.parentNode) {
            this.keypadElement.parentNode.removeChild(this.keypadElement);
        }
        this.keypadElement = null;
        this.previewElement = null;
    }
}

// Create global instance
const numericKeypad = new NumericKeypad();

// Export for use in renderer
window.numericKeypad = numericKeypad;

// Helper function to open keypad
window.openNumericKeypad = function(options) {
    numericKeypad.open(options);
};

