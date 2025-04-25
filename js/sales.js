import { inventoryData } from './inventory.js';

let cartItems = [];
let salesData = [];

function initializeSalesData() {
    try {
        const storedData = localStorage.getItem('salesData');
        
        // Clear existing sales data first
        salesData.length = 0;
        
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            
            // Convert dates back to Date objects
            salesData.push(...parsedData.map(sale => ({
                ...sale,
                date: new Date(sale.date)
            })));
        }
        
        // Sort sales data by date
        salesData.sort((a, b) => a.date - b.date);
    } catch (error) {
        console.error('Error initializing sales data:', error);
        salesData = [];
    }
}

function saveSalesData() {
    try {
        // Save sales data with refund information
        const dataToSave = salesData.map(sale => ({
            ...sale,
            date: sale.date.toISOString(),
            refunded: sale.refunded || false,
            refundDate: sale.refundDate || null
        }));
        
        localStorage.setItem('salesData', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error saving sales data:', error);
    }
}

function initializeTableKeyboardNav() {
    ['salesInventoryTable', 'cartTable'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;

        let focusedCell = { row: 0, col: 0 };
        
        table.addEventListener('keydown', (e) => {
            const rows = table.querySelectorAll('tbody tr');
            const cells = rows[focusedCell.row]?.querySelectorAll('td');
            
            switch (e.key) {
                case 'ArrowUp':
                    if (focusedCell.row > 0) focusedCell.row--;
                    break;
                case 'ArrowDown':
                    if (focusedCell.row < rows.length - 1) focusedCell.row++;
                    break;
                case 'ArrowLeft':
                    if (focusedCell.col > 0) focusedCell.col--;
                    break;
                case 'ArrowRight':
                    if (cells && focusedCell.col < cells.length - 1) focusedCell.col++;
                    break;
                case 'Enter':
                case ' ':
                    const actionButton = cells?.[focusedCell.col]?.querySelector('button');
                    if (actionButton) {
                        actionButton.click();
                        e.preventDefault();
                    }
                    break;
            }

            const targetCell = rows[focusedCell.row]?.querySelectorAll('td')[focusedCell.col];
            if (targetCell) {
                targetCell.focus();
                e.preventDefault();
            }
        });
    });
}

function updateLiveRegion(message) {
    const liveRegion = document.getElementById('salesUpdateRegion') || createLiveRegion();
    liveRegion.textContent = message;
}

function createLiveRegion() {
    const region = document.createElement('div');
    region.id = 'salesUpdateRegion';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('role', 'status');
    region.style.position = 'absolute';
    region.style.clip = 'rect(0 0 0 0)';
    document.body.appendChild(region);
    return region;
}

function renderSalesInventory() {
    const tableBody = document.querySelector('#salesInventoryTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!inventoryData || inventoryData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No items available</td></tr>';
        return;
    }
    
    inventoryData.forEach((item, index) => {
        if (item.quantity > 0) {  // Only show items with available quantity
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name} ${item.variant ? `(${item.variant})` : ''}<br>
                    <small class="text-muted">ID: ${item.id || '-'}</small>
                </td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>
                    <input type="number" class="form-control form-control-sm w-75" 
                        id="qty-${index}" value="1" min="1" max="${item.quantity}">
                </td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="addToCart(${index})">
                        Add to Cart
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        }
    });
}

function addToCart(index) {
    const qtyInput = document.getElementById(`qty-${index}`);
    const quantity = parseInt(qtyInput.value);
    
    if (quantity > 0 && quantity <= inventoryData[index].quantity) {
        const existingItem = cartItems.find(item => item.id === inventoryData[index].id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cartItems.push({
                id: inventoryData[index].id,
                index: index,
                name: inventoryData[index].name,
                price: inventoryData[index].price,
                quantity: quantity
            });
        }
        
        renderCart();
    }
}

function renderCart() {
    const tableBody = document.querySelector('#cartTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    let total = 0;
    
    cartItems.forEach((item, i) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${itemTotal.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removeFromCart(${i})">
                    Remove
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    const totalElement = document.getElementById('cartTotal');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    renderCart();
}

function finalizeSale() {
    if (cartItems.length === 0) {
        updateLiveRegion('Cart is empty');
        return;
    }
    
    // Create sale date in UTC, preserving the current time
    const now = new Date();
    const saleDate = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
    ));
    
    const saleItems = cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
    }));
    const totalAmount = saleItems.reduce((sum, item) => sum + item.total, 0);
    
    // Create new sale with UTC date
    const newSale = {
        date: saleDate,
        items: saleItems,
        total: totalAmount
    };
    
    // Add to sales data
    salesData.push(newSale);
    
    // Save to localStorage
    saveSalesData();
    
    generateReceipt(saleDate, saleItems, totalAmount);
    updateLiveRegion(`Sale finalized. Total amount: $${totalAmount.toFixed(2)}`);
    
    // Update inventory
    cartItems.forEach(item => {
        if (inventoryData[item.index]) {
            inventoryData[item.index].quantity -= item.quantity;
        }
    });
    
    // Clear cart and refresh displays
    cartItems = [];
    renderCart();
    renderSalesInventory();
}

function generateReceipt(saleDate, saleItems, totalAmount, isRefunded = false, refundDate = null) {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) return;

    let receiptHTML = `
        <div class="receipt-container" role="region" aria-label="Sale Receipt">
            <div class="text-center mb-3">
                <h4 class="mb-2">Sale Receipt${isRefunded ? ' <span class="badge bg-danger">REFUNDED</span>' : ''}</h4>
                <p class="text-muted mb-1">Date: ${saleDate.toLocaleString()}</p>
                ${isRefunded ? `<p class="text-danger mb-3">Refunded on: ${new Date(refundDate).toLocaleString()}</p>` : ''}
            </div>
            
            <table class="table table-sm" role="table">
                <thead class="table-light">
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col" class="text-end">Price</th>
                        <th scope="col" class="text-center">Qty</th>
                        <th scope="col" class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    saleItems.forEach(item => {
        receiptHTML += `
            <tr>
                <td>${item.name}</td>
                <td class="text-end">$${item.price.toFixed(2)}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">$${item.total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    receiptHTML += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-end"><strong>Total:</strong></td>
                        <td class="text-end"><strong>$${totalAmount.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            ${isRefunded ? '<div class="refund-stamp position-absolute top-50 start-50 translate-middle">REFUNDED</div>' : ''}
        </div>
    `;
    
    receiptContent.innerHTML = receiptHTML;
    
    const receiptElement = document.getElementById('receipt');
    if (receiptElement) {
        receiptElement.classList.remove('d-none');
    }
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) return;

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .refund-info { 
                    color: #d32f2f;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .refund-stamp {
                    position: relative;
                    color: #d32f2f;
                    border: 2px solid #d32f2f;
                    padding: 10px;
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    transform: rotate(-15deg);
                    margin: 20px auto;
                    width: fit-content;
                }
                @media print {
                    .refund-stamp {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-15deg);
                        opacity: 0.3;
                        font-size: 48px;
                        border-width: 3px;
                    }
                }
            </style>
        </head>
        <body>
            ${receiptContent.innerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function processRefund(saleDate, saleIndex) {
    // Find the sale in the salesData array
    const saleToRefund = salesData.find(sale => {
        const currentSaleDate = new Date(sale.date);
        return isDateEqual(new Date(saleDate), currentSaleDate) && !sale.refunded;
    });

    if (saleToRefund) {
        // Mark the sale as refunded
        saleToRefund.refunded = true;
        saleToRefund.refundDate = new Date().toISOString();

        // Return items to inventory
        saleToRefund.items.forEach(item => {
            const inventoryItem = inventoryData.find(invItem => invItem.name === item.name);
            if (inventoryItem) {
                inventoryItem.quantity += item.quantity;
            }
        });

        // Save updated data
        saveSalesData();
        localStorage.setItem('inventoryData', JSON.stringify(inventoryData));

        // Update the UI
        const salesList = document.getElementById('dailySalesList');
        if (salesList) {
            const saleElements = salesList.getElementsByClassName('sale-item');
            if (saleElements[saleIndex]) {
                saleElements[saleIndex].classList.add('refunded-sale');
                const refundButton = saleElements[saleIndex].querySelector('.refund-button');
                if (refundButton) {
                    refundButton.remove();
                }
                const saleHeader = saleElements[saleIndex].querySelector('.sale-header');
                if (saleHeader) {
                    saleHeader.innerHTML += '<span class="refunded-tag">Refunded</span>';
                }

                // Update daily total by subtracting the refunded amount
                const dailyTotalDiv = salesList.querySelector('.daily-total h4');
                if (dailyTotalDiv) {
                    const currentTotal = parseFloat(dailyTotalDiv.textContent.replace(/[^0-9.-]+/g, ""));
                    const newTotal = currentTotal - saleToRefund.total;
                    dailyTotalDiv.textContent = `Daily Total: $${newTotal.toFixed(2)}`;
                }
            }
        }

        // Update monthly total
        const monthlyTotalElement = document.getElementById('monthlyTotal');
        if (monthlyTotalElement) {
            const currentMonthlyTotal = parseFloat(monthlyTotalElement.textContent.replace(/[^0-9.-]+/g, ""));
            const newMonthlyTotal = currentMonthlyTotal - saleToRefund.total;
            monthlyTotalElement.textContent = `$${newMonthlyTotal.toFixed(2)}`;
        }

        // Show notification
        const notification = document.createElement('div');
        notification.className = 'notification success show';
        notification.textContent = 'Refund processed successfully';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        return true;
    }
    return false;
}

// Helper function to check if two dates are equal (ignoring time)
function isDateEqual(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
}

// Make processRefund available globally
window.processRefund = processRefund;

// Update initialization code at the beginning of the file
document.addEventListener('DOMContentLoaded', () => {
    initializeSalesData();
    const saleSection = document.getElementById('sale');
    
    // Create an observer to watch for when the sales section becomes active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('active')) {
                renderSalesInventory();
            }
        });
    });

    // Start observing the sales section
    if (saleSection) {
        observer.observe(saleSection, { 
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Initial render if the section is already active
        if (saleSection.classList.contains('active')) {
            renderSalesInventory();
        }
    }
});

export { 
    salesData,
    renderSalesInventory,
    addToCart,
    removeFromCart,
    finalizeSale,
    printReceipt,
    initializeTableKeyboardNav,
    initializeSalesData,
    processRefund
};