import * as db from './database/index.js';

let inventoryData = [];
let initialized = false;

async function initializeInventoryData() {
    if (initialized) return;
    
    try {
        inventoryData = await db.getProducts();
        renderInventoryTable();
        initialized = true;
    } catch (error) {
        console.error('Error initializing inventory data:', error);
        inventoryData = [];
    }
}

async function addProduct(event) {
    if (event) {
        event.preventDefault();
    }

    try {
        const name = document.getElementById('productName').value.trim();
        const variant = document.getElementById('productVariant').value.trim();
        const costPrice = parseFloat(document.getElementById('productCostPrice').value);
        const price = parseFloat(document.getElementById('productPrice').value);
        const quantity = parseInt(document.getElementById('productQuantity').value);

        if (!name || isNaN(costPrice) || isNaN(price) || isNaN(quantity)) {
            showNotification('Please fill in all required fields correctly', 'error');
            return false;
        }

        const newProduct = await db.createProduct({
            name,
            variant,
            costPrice,
            price,
            quantity
        });

        // Add to local cache
        inventoryData.push(newProduct);
        
        // Clear form
        clearProductForm();
        
        // Update table
        renderInventoryTable();
        
        showNotification('Product added successfully', 'success');
        return false;
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Error adding product', 'error');
        return false;
    }
}

async function removeItem(id) {
    if (confirm('Are you sure you want to remove this item?')) {
        try {
            await db.deleteProduct(id);
            inventoryData = inventoryData.filter(item => item.id !== id);
            renderInventoryTable();
            showNotification('Product removed successfully', 'success');
        } catch (error) {
            console.error('Error removing product:', error);
            showNotification('Error removing product', 'error');
        }
    }
}

async function saveProduct(id) {
    try {
        const name = document.getElementById('productName').value.trim();
        const variant = document.getElementById('productVariant').value.trim();
        const costPrice = parseFloat(document.getElementById('productCostPrice').value);
        const price = parseFloat(document.getElementById('productPrice').value);
        const quantity = parseInt(document.getElementById('productQuantity').value);

        if (!name || isNaN(costPrice) || isNaN(price) || isNaN(quantity)) {
            showNotification('Please fill in all required fields correctly', 'error');
            return;
        }

        const updatedProduct = await db.updateProduct(id, {
            name,
            variant,
            costPrice,
            price,
            quantity
        });

        if (updatedProduct) {
            // Update local cache
            const index = inventoryData.findIndex(item => item.id === id);
            if (index !== -1) {
                inventoryData[index] = updatedProduct;
            }
        }

        clearProductForm();
        
        const addButton = document.querySelector('.add-product-form button');
        addButton.textContent = 'Add Product';
        addButton.className = 'btn btn-success w-100';
        addButton.onclick = addProduct;
        
        renderInventoryTable();
        showNotification('Product updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Error updating product', 'error');
    }
}

// Helper functions remain the same
function clearProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productVariant').value = '';
    document.getElementById('productCostPrice').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productQuantity').value = '';
}

function showNotification(message, type = 'info') {
    const event = new CustomEvent('show-notification', {
        detail: { message, type }
    });
    window.dispatchEvent(event);
}

function renderInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) {
        console.log('Table body not found, waiting for DOM...');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (inventoryData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center text-muted py-4">No inventory items found</td>';
        tableBody.appendChild(emptyRow);
        return;
    }

    inventoryData.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-3 px-3">${item.id || '-'}</td>
            <td class="py-3 px-3">${item.name}</td>
            <td>${item.variant || '-'}</td>
            <td class="text-end">$${item.costPrice.toFixed(2)}</td>
            <td class="text-end">$${item.price.toFixed(2)}</td>
            <td class="text-center ${item.quantity <= 5 ? 'text-danger' : ''}">${item.quantity}</td>
            <td class="text-end px-3">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="openEditProductPopup(${inventoryData.indexOf(item)})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-outline-danger" onclick="removeItem('${item.id}')">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function searchInventory() {
    const searchInput = document.getElementById('searchInventory').value.toLowerCase();
    const tableRows = document.querySelectorAll('#inventoryTable tbody tr');

    let foundItems = 0;
    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
        
        if (rowText.includes(searchInput)) {
            row.style.display = '';
            foundItems++;
        } else {
            row.style.display = 'none';
        }
    });

    const tbody = document.querySelector('#inventoryTable tbody');
    const noResultsRow = tbody.querySelector('.no-results');
    if (foundItems === 0) {
        if (!noResultsRow) {
            const row = document.createElement('tr');
            row.className = 'no-results';
            row.innerHTML = '<td colspan="6" class="text-center text-muted">No matching items found</td>';
            tbody.appendChild(row);
        }
    } else if (noResultsRow) {
        noResultsRow.remove();
    }
}

function openEditProductPopup(index) {
    const product = inventoryData[index];
    
    document.getElementById('productName').value = product.name;
    document.getElementById('productVariant').value = product.variant || '';
    document.getElementById('productCostPrice').value = product.costPrice;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productQuantity').value = product.quantity;

    const addButton = document.querySelector('.add-product-form button');
    addButton.textContent = 'Save Changes';
    addButton.className = 'btn btn-primary w-100';
    addButton.onclick = () => saveProduct(product.id);

    document.querySelector('.add-product-form').scrollIntoView({ behavior: 'smooth' });
}

// Event listeners
document.addEventListener('DOMContentLoaded', initializeInventoryData);

// Make functions available globally
window.addProduct = addProduct;
window.removeItem = removeItem;
window.searchInventory = searchInventory;
window.openEditProductPopup = openEditProductPopup;

// Export functions for use in other modules
export { 
    inventoryData,
    renderInventoryTable,
    addProduct,
    removeItem,
    searchInventory,
    openEditProductPopup,
    initializeInventoryData
};