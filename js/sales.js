import * as db from './database/index.js';

let cartItems = [];
let salesData = [];

async function initializeSalesData() {
    try {
        // Get today's sales
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        salesData = await db.getSales(startOfDay, endOfDay);
    } catch (error) {
        console.error('Error initializing sales data:', error);
        salesData = [];
    }
}

async function renderSalesInventory() {
    const tableBody = document.querySelector('#salesInventoryTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    try {
        const inventoryData = await db.getProducts();
        
        if (!inventoryData || inventoryData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No items available</td></tr>';
            return;
        }
        
        inventoryData.forEach((item, index) => {
            if (item.quantity > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name} ${item.variant ? `(${item.variant})` : ''}<br>
                        <small class="text-muted">ID: ${item.id || '-'}</small>
                    </td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm w-75" 
                            id="qty-${item.id}" value="1" min="1" max="${item.quantity}">
                    </td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="addToCart('${item.id}')">
                            Add to Cart
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            }
        });
    } catch (error) {
        console.error('Error rendering sales inventory:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading inventory</td></tr>';
    }
}

async function addToCart(productId) {
    try {
        const qtyInput = document.getElementById(`qty-${productId}`);
        const quantity = parseInt(qtyInput.value);
        
        const product = await db.getProducts().then(products => 
            products.find(p => p.id === productId)
        );
        
        if (product && quantity > 0 && quantity <= product.quantity) {
            const existingItem = cartItems.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cartItems.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: quantity
                });
            }
            
            renderCart();
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart', 'error');
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

async function finalizeSale() {
    if (cartItems.length === 0) {
        showNotification('Cart is empty', 'error');
        return;
    }
    
    try {
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create the sale in database
        const sale = await db.createSale({
            date: new Date(),
            total: totalAmount
        }, cartItems);
        
        generateReceipt(sale.date, cartItems, totalAmount);
        showNotification(`Sale finalized. Total amount: $${totalAmount.toFixed(2)}`, 'success');
        
        // Clear cart and refresh displays
        cartItems = [];
        renderCart();
        renderSalesInventory();
        
    } catch (error) {
        console.error('Error finalizing sale:', error);
        showNotification('Error finalizing sale', 'error');
    }
}

async function processRefund(saleId) {
    try {
        const success = await db.refundSale(saleId);
        if (success) {
            showNotification('Refund processed successfully', 'success');
            // Refresh the view
            await initializeSalesData();
            return true;
        } else {
            showNotification('Unable to process refund', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error processing refund:', error);
        showNotification('Error processing refund', 'error');
        return false;
    }
}

function generateReceipt(saleDate, items, totalAmount, isRefunded = false, refundDate = null) {
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
    
    items.forEach(item => {
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

// Make necessary functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.finalizeSale = finalizeSale;
window.printReceipt = printReceipt;
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