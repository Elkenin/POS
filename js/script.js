import * as Home from './home.js';
import * as Inventory from './inventory.js';
import * as Sales from './sales.js';

// Main script initialization
document.addEventListener('DOMContentLoaded', async () => {
    // First check if we should show the initial import overlay
    if (!localStorage.getItem('systemInitialized')) {
        setupInitialImport();
    } else {
        showMainDashboard();
    }
});

function setupInitialImport() {
    const initialExcelFile = document.getElementById('initialExcelFile');
    const startFreshButton = document.getElementById('startFreshButton');
    
    if (initialExcelFile) {
        initialExcelFile.addEventListener('change', async (event) => {
            event.preventDefault();
            const file = event.target.files[0];
            if (file) {
                try {
                    await importInitialData(file);
                    localStorage.setItem('systemInitialized', 'true');
                    hideImportOverlay();
                    await showMainDashboard();
                    showNotification('Data imported successfully!', 'success');
                } catch (error) {
                    console.error('Import error:', error);
                    showNotification('Failed to import data: ' + error.message, 'error');
                }
            }
        });
    }

    if (startFreshButton) {
        startFreshButton.addEventListener('click', async () => {
            localStorage.clear();
            localStorage.setItem('systemInitialized', 'true');
            localStorage.setItem('salesData', '[]');
            localStorage.setItem('inventoryData', '[]');
            hideImportOverlay();
            await showMainDashboard();
            showNotification('System initialized with empty data', 'success');
        });
    }
}

function hideImportOverlay() {
    const overlay = document.getElementById('importOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showMainDashboard() {
    // Show navbar and content
    document.querySelector('.navbar').style.display = 'flex';
    document.querySelector('.content').style.display = 'block';
    
    // Initialize navigation
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = e.currentTarget.dataset.section;
            await showSection(section);
            updateActiveNavLink(section);
            
            if (section === 'home') {
                Sales.initializeSalesData();
                await loadHomeSection();
            }
        });
    });

    // Initialize export/import functionality for subsequent imports
    initializeFileHandling();

    // Load initial home section
    showSection('home');
}

async function importInitialData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                // Clear existing data
                localStorage.clear();
                
                // Import sales data if available
                if (workbook.SheetNames.includes('Sales')) {
                    const salesSheet = workbook.Sheets['Sales'];
                    const salesData = XLSX.utils.sheet_to_json(salesSheet);
                    
                    const formattedSalesData = salesData.map(sale => ({
                        date: new Date(sale.Date),
                        items: sale.Items.split(', ').map(item => {
                            const match = item.match(/(.*) \((\d+)\)/);
                            return {
                                name: match[1],
                                quantity: parseInt(match[2]),
                                price: sale.Total / parseInt(match[2]),
                                total: sale.Total
                            };
                        }),
                        total: sale.Total,
                        refunded: sale.Status === 'Refunded',
                        refundDate: sale.Status === 'Refunded' ? new Date(sale.RefundDate) : null
                    }));
                    
                    localStorage.setItem('salesData', JSON.stringify(formattedSalesData.map(sale => ({
                        ...sale,
                        date: sale.date.toISOString(),
                        refundDate: sale.refundDate ? sale.refundDate.toISOString() : null
                    }))));
                }
                
                // Import inventory data if available
                if (workbook.SheetNames.includes('Inventory')) {
                    const inventorySheet = workbook.Sheets['Inventory'];
                    const inventoryData = XLSX.utils.sheet_to_json(inventorySheet);
                    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
                }
                
                showNotification('Data imported successfully!', 'success');
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read the file'));
        reader.readAsArrayBuffer(file);
    });
}

function updateActiveNavLink(sectionId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });
}

// Add notification system
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function showSection(sectionId) {
    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent) return;
    
    try {
        // Remove active class from all sections
        dashboardContent.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        switch(sectionId) {
            case 'home':
                const templateContent = await fetchTemplate('../pages/home-dashboard.html');
                dashboardContent.innerHTML = templateContent;
                break;
                
            case 'inventory':
                dashboardContent.innerHTML = `
                    <div id="inventory" class="dashboard-section active">
                        <h2>Inventory Dashboard</h2>
                        <div class="inventory-container" style="display: flex;">
                            <div class="add-product-column" style="flex: 0.8; padding-right: 20px; border-right: 1px solid #ddd;">
                                <div class="add-product-form">
                                    <h3>Add New Product</h3>
                                    <label for="productName">Product Name</label>
                                    <input type="text" id="productName" placeholder="Enter product name" class="modern-input">
                                    <label for="productVariant">Variant</label>
                                    <input type="text" id="productVariant" placeholder="Enter variant" class="modern-input">
                                    <label for="productCostPrice">Cost Price</label>
                                    <input type="number" id="productCostPrice" placeholder="Enter cost price" step="0.01" class="modern-input">
                                    <label for="productPrice">Price</label>
                                    <input type="number" id="productPrice" placeholder="Enter price" step="0.01" class="modern-input">
                                    <label for="productQuantity">Quantity</label>
                                    <input type="number" id="productQuantity" placeholder="Enter quantity" class="modern-input">
                                    <div>
                                        <button class="modern-button" onclick="addProduct()">Add</button>
                                    </div>
                                </div>
                            </div>
                            <div class="inventory-table" style="flex: 2;">
                                <div style="margin-bottom: 10px;">
                                    <input type="text" id="searchInventory" placeholder="Search inventory..." class="modern-input" onkeyup="searchInventory()">
                                </div>
                                <table id="inventoryTable">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Variant</th>
                                            <th>Cost Price</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>`;
                break;
                
            case 'sale':
                dashboardContent.innerHTML = `
                    <div id="sale" class="dashboard-section active">
                        <h2>Sales Dashboard</h2>
                        <div class="sales-container">
                            <div class="inventory-list">
                                <h3>Available Items</h3>
                                <table id="salesInventoryTable">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Price</th>
                                            <th>Available</th>
                                            <th>Qty</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <div class="cart">
                                <h3>Shopping Cart</h3>
                                <table id="cartTable">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Price</th>
                                            <th>Qty</th>
                                            <th>Total</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                                <div>
                                    <h4>Total: $<span id="cartTotal">0.00</span></h4>
                                    <button onclick="finalizeSale()">Finalize Sale</button>
                                </div>
                                <div id="receipt" style="display: none;">
                                    <h3>Receipt</h3>
                                    <div id="receiptContent"></div>
                                    <button onclick="printReceipt()">Print Receipt</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                break;
        }

        // Initialize section-specific functionality
        await initializeSection(sectionId);
    } catch (error) {
        console.error('Error loading dashboard section:', error);
        dashboardContent.innerHTML = `<div class="alert alert-danger">Error loading ${sectionId} dashboard. Please try again.</div>`;
    }
}

async function initializeSection(sectionId) {
    try {
        switch (sectionId) {
            case 'home':
                // Initialize sales data first
                Sales.initializeSalesData();
                Home.renderCalendar();
                Home.initializeCalendarKeyboardNavigation();
                break;
            case 'inventory':
                await Promise.all([
                    Inventory.renderInventoryTable(),
                    Inventory.makeInventoryEditable()
                ]);
                Inventory.initializeTableKeyboardNav();
                break;
            case 'sale':
                await Sales.renderSalesInventory();
                Sales.initializeTableKeyboardNav();
                break;
        }
    } catch (error) {
        console.error('Error initializing section:', error);
        showNotification('Error initializing section', 'error');
    }
}

async function loadHomeSection() {
    // Clear any existing content
    const homeSection = document.getElementById('home');
    if (homeSection) {
        const templateContent = await fetchTemplate('../pages/home-dashboard.html');
        homeSection.innerHTML = templateContent;
        
        // Initialize calendar and stats after content is loaded
        Home.renderCalendar();
        Home.initializeCalendarKeyboardNavigation();
    }
}

// Helper function to fetch HTML templates
async function fetchTemplate(path) {
    try {
        const response = await fetch(path);
        return await response.text();
    } catch (error) {
        console.error('Error loading template:', error);
        return '';
    }
}

// Excel import/export functionality
function exportToExcel() {
    try {
        // Create inventory sheet
        const inventoryWs = XLSX.utils.json_to_sheet(Inventory.inventoryData);
        
        // Create sales sheet with refund information
        const salesData = JSON.parse(localStorage.getItem('salesData')) || [];
        const salesForExport = salesData.map(sale => {
            const saleDate = new Date(sale.date);
            return {
                Date: saleDate.toLocaleString(),
                Items: sale.items.map(item => `${item.name} (${item.quantity})`).join(', '),
                Total: sale.total,
                Status: sale.refunded ? 'Refunded' : 'Completed',
                RefundDate: sale.refunded && sale.refundDate ? new Date(sale.refundDate).toLocaleString() : ''
            };
        });
        
        const salesWs = XLSX.utils.json_to_sheet(salesForExport);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, inventoryWs, "Inventory");
        XLSX.utils.book_append_sheet(wb, salesWs, "Sales");
        XLSX.writeFile(wb, "dashboard_data.xlsx");
        
        showNotification('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export data', 'error');
    }
}

function importFromExcel() {
    const file = document.getElementById('excelFile').files[0];
    if (!file) {
        showNotification('Please select a file to import', 'info');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Clear existing data
            localStorage.clear();
            
            // Import sales data if available
            if (workbook.SheetNames.includes('Sales')) {
                const salesSheet = workbook.Sheets['Sales'];
                const salesData = XLSX.utils.sheet_to_json(salesSheet);
                
                // Convert date strings to proper UTC Date objects and handle refund information
                const formattedSalesData = salesData.map(sale => ({
                    date: new Date(sale.Date),
                    items: sale.Items.split(', ').map(item => {
                        const match = item.match(/(.*) \((\d+)\)/);
                        return {
                            name: match[1],
                            quantity: parseInt(match[2]),
                            price: sale.Total / parseInt(match[2]), // Approximate price
                            total: sale.Total
                        };
                    }),
                    total: sale.Total,
                    refunded: sale.Status === 'Refunded',
                    refundDate: sale.Status === 'Refunded' ? new Date(sale.RefundDate) : null
                }));
                
                // Save to localStorage with refund information
                localStorage.setItem('salesData', JSON.stringify(formattedSalesData.map(sale => ({
                    ...sale,
                    date: sale.date.toISOString(),
                    refundDate: sale.refundDate ? sale.refundDate.toISOString() : null
                }))));
            }
            
            // Import inventory data if available
            if (workbook.SheetNames.includes('Inventory')) {
                const inventorySheet = workbook.Sheets['Inventory'];
                const inventoryData = XLSX.utils.sheet_to_json(inventorySheet);
                localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
            }
            
            // Refresh all displays
            Sales.initializeSalesData();
            if (document.getElementById('salesCalendar')) {
                Home.renderCalendar();
            }
            if (document.getElementById('inventoryTable')) {
                Inventory.renderInventoryTable();
            }
            if (document.getElementById('salesInventoryTable')) {
                Sales.renderSalesInventory();
            }
            
            showNotification('Data imported successfully!', 'success');
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Failed to import data: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('Failed to read the file', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

// Initialize export/import functionality
function initializeFileHandling() {
    const exportButton = document.getElementById('exportButton');
    const excelFileInput = document.getElementById('excelFile');
    
    if (exportButton) {
        exportButton.addEventListener('click', exportToExcel);
    }
    
    if (excelFileInput) {
        excelFileInput.addEventListener('change', () => {
            // Clear existing data before import
            localStorage.clear();
            importFromExcel();
            // Reset the input to allow importing the same file again
            excelFileInput.value = '';
        });
    }
}

// Make function available globally
window.initializeFileHandling = initializeFileHandling;

// Make necessary functions available to HTML
window.addProduct = Inventory.addProduct;
window.removeItem = Inventory.removeItem;
window.searchInventory = Inventory.searchInventory;
window.openEditProductPopup = Inventory.openEditProductPopup;
window.addToCart = Sales.addToCart;
window.removeFromCart = Sales.removeFromCart;
window.finalizeSale = Sales.finalizeSale;
window.printReceipt = Sales.printReceipt;
window.navigateCalendar = Home.navigateCalendar;
