// Load saved inventory data
let inventoryData = [];
let renderAttempts = 0;
const MAX_RENDER_ATTEMPTS = 5;

// Initialize data when the module loads
let initialized = false;

function initializeInventoryData() {
    if (initialized) return;
    
    return new Promise((resolve) => {
        const checkDom = () => {
            const tableBody = document.getElementById('inventoryTableBody');
            if (tableBody) {
                try {
                    const storedData = localStorage.getItem('inventoryData');
                    inventoryData = storedData ? JSON.parse(storedData) : [];
                    renderInventoryTable();
                    initialized = true;
                    resolve();
                } catch (error) {
                    console.error('Error initializing inventory data:', error);
                    inventoryData = [];
                    resolve();
                }
            } else {
                requestAnimationFrame(checkDom);
            }
        };
        
        checkDom();
    });
}

function saveInventoryData() {
    try {
        localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
        console.log('Inventory data saved successfully');
    } catch (error) {
        console.error('Error saving inventory data:', error);
    }
}

function updateInventoryData(newData) {
    inventoryData = newData;
    saveInventoryData();
    renderInventoryTable();
}

function addProduct(event) {
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
            alert('Please fill in all required fields correctly');
            return;
        }

        // Generate a unique ID using timestamp and random number
        const productId = `PRD${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Create new product object
        const newProduct = {
            id: productId,
            name: name,
            variant: variant,
            costPrice: costPrice,
            price: price,
            quantity: quantity
        };

        // Add to inventory data
        inventoryData.push(newProduct);
        
        // Save to localStorage
        saveInventoryData();
        
        // Clear form
        clearProductForm();
        
        // Update table
        renderInventoryTable();
        
        // Show success message
        showNotification('Product added successfully', 'success');
        
        return false; // Prevent form submission
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Error adding product', 'error');
        return false;
    }
}

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
    
    renderAttempts = 0; // Reset counter on successful render
    tableBody.innerHTML = '';
    
    if (inventoryData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center text-muted py-4">No inventory items found</td>';
        tableBody.appendChild(emptyRow);
        return;
    }

    inventoryData.forEach((item, index) => {
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
                    <button class="btn btn-outline-primary" onclick="openEditProductPopup(${index})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-outline-danger" onclick="removeItem(${index})">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function removeItem(index) {
    if (confirm('Are you sure you want to remove this item?')) {
        inventoryData.splice(index, 1);
        saveInventoryData();
        renderInventoryTable();
        showNotification('Product removed successfully', 'success');
    }
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

    // Show no results message if needed
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
    addButton.onclick = () => saveProduct(index);

    // Scroll form into view
    document.querySelector('.add-product-form').scrollIntoView({ behavior: 'smooth' });
}

function saveProduct(index) {
    try {
        const name = document.getElementById('productName').value.trim();
        const variant = document.getElementById('productVariant').value.trim();
        const costPrice = parseFloat(document.getElementById('productCostPrice').value);
        const price = parseFloat(document.getElementById('productPrice').value);
        const quantity = parseInt(document.getElementById('productQuantity').value);

        if (!name || isNaN(costPrice) || isNaN(price) || isNaN(quantity)) {
            alert('Please fill in all required fields correctly');
            return;
        }

        // Preserve existing ID or generate new one
        const existingProduct = inventoryData[index];
        const productId = existingProduct?.id || `PRD${Date.now()}${Math.floor(Math.random() * 1000)}`;

        inventoryData[index] = {
            id: productId,
            name: name,
            variant: variant,
            costPrice: costPrice,
            price: price,
            quantity: quantity
        };

        saveInventoryData();
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

// Wait for DOM content and inventory section to be ready before initializing
function tryInitialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeInventoryData);
        return;
    }
    initializeInventoryData();
}

// Reset initialization flag when the module is reloaded
document.addEventListener('DOMContentLoaded', tryInitialize);

// Also initialize when the inventory section becomes active
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active') && mutation.target.id === 'inventory' && !initialized) {
            renderAttempts = 0;
            tryInitialize();
        }
    });
});

// Start observing the inventory section for visibility changes
document.addEventListener('DOMContentLoaded', () => {
    const inventorySection = document.getElementById('inventory');
    if (inventorySection) {
        observer.observe(inventorySection, { 
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Make functions available globally
window.addProduct = addProduct;
window.removeItem = removeItem;
window.searchInventory = searchInventory;
window.openEditProductPopup = openEditProductPopup;

// Export functions for use in other modules
export { 
    inventoryData,
    renderInventoryTable,
    saveInventoryData,
    updateInventoryData,
    addProduct,
    removeItem,
    searchInventory,
    openEditProductPopup,
    initializeInventoryData
};