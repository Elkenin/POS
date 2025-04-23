import { inventoryData } from './inventory.js';

let cartItems = [];
let salesData = [];

function initializeSalesData() {
    try {
        const storedData = localStorage.getItem('salesData');
        console.log('Loading sales data from localStorage:', storedData);
        
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log('Parsed stored data:', parsedData);
            
            // Clear existing sales data first
            salesData.length = 0;
            
            // Convert dates back to Date objects
            salesData.push(...parsedData.map(sale => ({
                ...sale,
                date: new Date(sale.date)
            })));
        } else {
            console.log('No existing sales data, initializing with test data');
            // Initialize with test data in UTC for multiple dates in April
            salesData = [
                {
                    date: new Date(Date.UTC(2025, 3, 5, 10, 0, 0)),
                    items: [{
                        name: "Early Month Product",
                        price: 79.99,
                        quantity: 1,
                        total: 79.99
                    }],
                    total: 79.99
                },
                {
                    date: new Date(Date.UTC(2025, 3, 15, 14, 30, 0)),
                    items: [{
                        name: "Mid Month Product",
                        price: 129.99,
                        quantity: 2,
                        total: 259.98
                    }],
                    total: 259.98
                },
                {
                    date: new Date(Date.UTC(2025, 3, 20, 12, 0, 0)),
                    items: [{
                        name: "Test Product 1",
                        price: 99.99,
                        quantity: 1,
                        total: 99.99
                    }],
                    total: 99.99
                },
                {
                    date: new Date(Date.UTC(2025, 3, 21, 14, 0, 0)),
                    items: [{
                        name: "Test Product 2",
                        price: 149.99,
                        quantity: 1,
                        total: 149.99
                    }],
                    total: 149.99
                },
                {
                    date: new Date(Date.UTC(2025, 3, 22, 15, 30, 0)),
                    items: [{
                        name: "Additional Product",
                        price: 89.99,
                        quantity: 2,
                        total: 179.98
                    }],
                    total: 179.98
                },
                {
                    date: new Date(Date.UTC(2025, 3, 25, 16, 45, 0)),
                    items: [{
                        name: "Late Month Product",
                        price: 199.99,
                        quantity: 1,
                        total: 199.99
                    }],
                    total: 199.99
                }
            ];
            
            // Save initial test data
            saveSalesData();
        }
        
        // Sort sales data by date
        salesData.sort((a, b) => a.date - b.date);
        console.log('Final initialized sales data:', salesData);
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

// Initialize sales data when module loads
initializeSalesData();

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
    inventoryData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name} ${item.variant ? `(${item.variant})` : ''}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td><input type="number" id="qty-${index}" value="1" min="1" max="${item.quantity}" style="width: 50px;"></td>
            <td><button onclick="addToCart(${index})">Add to Cart</button></td>
        `;
        tableBody.appendChild(row);
    });
}

function addToCart(index) {
    const qtyInput = document.getElementById(`qty-${index}`);
    const quantity = parseInt(qtyInput.value);
    
    if (quantity > 0 && quantity <= inventoryData[index].quantity) {
        const existingItem = cartItems.find(item => item.index === index);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cartItems.push({
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
            <td><button onclick="removeFromCart(${i})">Remove</button></td>
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
        <div role="region" aria-label="Sale Receipt">
            <h4>Sale Receipt${isRefunded ? ' (REFUNDED)' : ''}</h4>
            <p>Date: ${saleDate.toLocaleString()}</p>
            ${isRefunded ? `<p class="refund-info">Refunded on: ${new Date(refundDate).toLocaleString()}</p>` : ''}
            <table style="width: 100%; border-collapse: collapse;" role="table">
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Price</th>
                        <th scope="col">Qty</th>
                        <th scope="col">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    saleItems.forEach(item => {
        receiptHTML += `
            <tr>
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>$${item.total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    receiptHTML += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Total:</strong></td>
                        <td><strong>$${totalAmount.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            ${isRefunded ? '<div class="refund-stamp">REFUNDED</div>' : ''}
        </div>
    `;
    
    receiptContent.innerHTML = receiptHTML;
    
    const receiptElement = document.getElementById('receipt');
    if (receiptElement) {
        receiptElement.style.display = 'block';
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