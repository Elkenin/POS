// Load saved inventory data
let inventoryData = JSON.parse(localStorage.getItem('inventoryData')) || [];

function saveInventoryData() {
    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
}

function addProduct() {
    const name = document.getElementById('productName').value;
    const variant = document.getElementById('productVariant').value;
    const costPrice = parseFloat(document.getElementById('productCostPrice').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);

    if (name && variant && !isNaN(costPrice) && !isNaN(price) && !isNaN(quantity)) {
        inventoryData.push({
            name: name,
            variant: variant,
            costPrice: costPrice,
            price: price,
            quantity: quantity
        });

        saveInventoryData();
        clearProductForm();
        renderInventoryTable();
    }
}

function clearProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productVariant').value = '';
    document.getElementById('productCostPrice').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productQuantity').value = '';
}

function removeItem(index) {
    inventoryData.splice(index, 1);
    saveInventoryData();
    renderInventoryTable();
}

function renderInventoryTable() {
    const tableBody = document.querySelector('#inventoryTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    inventoryData.forEach((item, index) => {
        const row = document.createElement('tr');
        const cells = [
            { text: item.name, label: 'Product name' },
            { text: item.variant, label: 'Variant' },
            { text: `$${item.costPrice.toFixed(2)}`, label: 'Cost price' },
            { text: `$${item.price.toFixed(2)}`, label: 'Price' },
            { text: item.quantity.toString(), label: 'Quantity' }
        ];

        cells.forEach(({ text, label }) => {
            const cell = document.createElement('td');
            cell.textContent = text;
            cell.setAttribute('tabindex', '0');
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', `${label}: ${text}`);
            row.appendChild(cell);
        });

        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        actionsCell.innerHTML = `
            <button onclick="removeItem(${index})" aria-label="Remove ${item.name}">Remove</button>
            <button onclick="openEditProductPopup(${index})" aria-label="Edit ${item.name}">Edit</button>
        `;
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });

    // Initialize keyboard navigation
    initializeTableKeyboardNav();

    // Update live region
    const liveRegion = document.getElementById('inventoryUpdateRegion');
    if (liveRegion) {
        liveRegion.textContent = `Inventory table updated with ${inventoryData.length} items`;
    }
}

function makeInventoryEditable() {
    addLiveRegion();
    const table = document.getElementById('inventoryTable');
    if (!table) return;

    table.addEventListener('click', function (event) {
        const cell = event.target;
        if (cell.tagName === 'TD' && !cell.classList.contains('actions-cell')) {
            const originalValue = cell.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalValue;
            input.style.width = '100%';
            cell.textContent = '';
            cell.appendChild(input);
            input.focus();

            input.addEventListener('blur', function () {
                cell.textContent = input.value;
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        }
    });
}

function searchInventory() {
    const searchInput = document.getElementById('searchInventory').value.toLowerCase();
    const tableRows = document.querySelectorAll('#inventoryTable tbody tr');

    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
        row.style.display = rowText.includes(searchInput) ? '' : 'none';
    });
}

function openEditProductPopup(index) {
    const product = inventoryData[index];
    document.getElementById('productName').value = product.name;
    document.getElementById('productVariant').value = product.variant;
    document.getElementById('productCostPrice').value = product.costPrice;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productQuantity').value = product.quantity;

    const addButton = document.querySelector('.add-product-form button');
    addButton.textContent = 'Save';
    addButton.onclick = () => saveProduct(index);
}

function saveProduct(index) {
    const name = document.getElementById('productName').value;
    const variant = document.getElementById('productVariant').value;
    const costPrice = parseFloat(document.getElementById('productCostPrice').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);

    if (name && variant && !isNaN(costPrice) && !isNaN(price) && !isNaN(quantity)) {
        inventoryData[index] = {
            name: name,
            variant: variant,
            costPrice: costPrice,
            price: price,
            quantity: quantity
        };

        saveInventoryData();
        clearProductForm();
        renderInventoryTable();
        
        const addButton = document.querySelector('.add-product-form button');
        addButton.textContent = 'Add';
        addButton.onclick = addProduct;
    }
}

function initializeTableKeyboardNav() {
    const table = document.getElementById('inventoryTable');
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
        }

        const targetCell = rows[focusedCell.row]?.querySelectorAll('td')[focusedCell.col];
        if (targetCell) {
            targetCell.focus();
            e.preventDefault();
        }
    });
}

// Add live region for inventory updates
function addLiveRegion() {
    if (!document.getElementById('inventoryUpdateRegion')) {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'inventoryUpdateRegion';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('role', 'status');
        liveRegion.style.position = 'absolute';
        liveRegion.style.clip = 'rect(0 0 0 0)';
        document.body.appendChild(liveRegion);
    }
}

export { 
    inventoryData,
    addProduct,
    removeItem,
    renderInventoryTable,
    makeInventoryEditable,
    searchInventory,
    openEditProductPopup,
    saveProduct,
    initializeTableKeyboardNav
};