import * as Home from './home.js';
import * as Inventory from './inventory.js';
import * as Sales from './sales.js';

// Check for XLSX initialization
function checkXLSX() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 10;
        let attempts = 0;
        
        function check() {
            if (window.XLSX_INITIALIZED) {
                console.log('XLSX is ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('XLSX initialization timeout'));
            } else {
                attempts++;
                setTimeout(check, 500);
            }
        }
        
        check();
    });
}

// Main script initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Application starting...');
        
        // Add global notification listener
        window.addEventListener('show-notification', (event) => {
            showNotification(event.detail.message, event.detail.type);
        });
        
        // Wait for XLSX to initialize first
        await checkXLSX();
        console.log('XLSX initialized');
        
        // Check if we need first-time setup
        if (!localStorage.getItem('systemInitialized')) {
            console.log('First time setup - showing import overlay');
            setupInitialImport();
        } else {
            console.log('System already initialized - loading application');
            await initializeApplication();
        }
    } catch (error) {
        console.error('Critical initialization error:', error);
        showNotification('Failed to initialize application: ' + error.message, 'error', 5000);
    }
});

function setupInitialImport() {
    console.log('Setting up initial import handlers');
    const initialExcelFile = document.getElementById('initialExcelFile');
    const startFreshButton = document.getElementById('startFreshButton');
    
    if (initialExcelFile) {
        initialExcelFile.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    await importInitialData(file);
                    localStorage.setItem('systemInitialized', 'true');
                    hideImportOverlay();
                    await initializeApplication();
                    showNotification('Data imported successfully!', 'success');
                } catch (error) {
                    console.error('Import error:', error);
                    showNotification('Failed to import data: ' + error.message, 'error');
                }
            }
        });
    }

    if (startFreshButton) {
        console.log('Adding click handler to start fresh button');
        startFreshButton.addEventListener('click', async () => {
            try {
                console.log('Start Fresh clicked - initializing empty system');
                
                // Only initialize required data without clearing everything
                if (!localStorage.getItem('salesData')) {
                    localStorage.setItem('salesData', JSON.stringify([]));
                }
                if (!localStorage.getItem('inventoryData')) {
                    localStorage.setItem('inventoryData', JSON.stringify([]));
                }
                
                // Set system as initialized
                localStorage.setItem('systemInitialized', 'true');
                
                // Hide overlay and show main content
                hideImportOverlay();
                
                // Initialize the application
                await initializeApplication();
                
                console.log('Fresh start complete');
                showNotification('System initialized successfully', 'success');
            } catch (error) {
                console.error('Fresh start initialization error:', error);
                showNotification('Failed to initialize system: ' + error.message, 'error');
            }
        });
    }
}

async function initializeApplication() {
    try {
        // Initialize sales data
        await Sales.initializeSalesData();
        
        // Show main dashboard
        showMainDashboard();
        
        // Load initial home section
        const dashboardContent = document.getElementById('dashboard-content');
        if (dashboardContent) {
            await showSection('home');
            Home.renderCalendar();
            Home.initializeCalendarKeyboardNavigation();
        }
        
        // Initialize file handling
        initializeFileHandling();
        
        return true;
    } catch (error) {
        console.error('Application initialization error:', error);
        showNotification('Failed to initialize application', 'error');
        throw error;
    }
}

function hideImportOverlay() {
    const overlay = document.getElementById('importOverlay');
    const mainContent = document.getElementById('mainContent');
    
    if (overlay && mainContent) {
        overlay.classList.add('d-none');
        mainContent.classList.remove('d-none');
        console.log('Overlay hidden, main content shown');
    }
}

function showMainDashboard() {
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

    // Initialize export/import functionality
    initializeFileHandling();

    // Load initial home section
    showSection('home');
}

async function importInitialData(file) {
    return new Promise((resolve, reject) => {
        // Show loading notification
        showNotification('Processing initial setup file...', 'info');
        console.log('Starting initial import of file:', file.name);

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                console.log('File loaded, processing workbook...');
                const workbook = XLSX.read(data, {type: 'array'});
                console.log('Available sheets:', workbook.SheetNames);
                
                let importSummary = {
                    sales: 0,
                    inventory: 0
                };

                // Import sales data if available
                if (workbook.SheetNames.includes('Sales')) {
                    const salesSheet = workbook.Sheets['Sales'];
                    const salesData = XLSX.utils.sheet_to_json(salesSheet);
                    console.log(`Found ${salesData.length} sales records`);
                    
                    const formattedSalesData = salesData.map(sale => {
                        console.log('Processing sale:', sale);
                        const saleItems = sale.Items.split(', ').map(item => {
                            const match = item.match(/(.*) \((\d+)\)/);
                            return {
                                name: match[1],
                                quantity: parseInt(match[2]),
                                price: sale.Total / parseInt(match[2]),
                                total: sale.Total
                            };
                        });
                        
                        return {
                            date: new Date(sale.Date),
                            items: saleItems,
                            total: sale.Total,
                            refunded: sale.Status === 'Refunded',
                            refundDate: sale.Status === 'Refunded' ? new Date(sale.RefundDate) : null
                        };
                    });
                    
                    importSummary.sales = formattedSalesData.length;
                    console.log('Formatted sales data:', formattedSalesData);
                    
                    localStorage.setItem('salesData', JSON.stringify(formattedSalesData.map(sale => ({
                        ...sale,
                        date: sale.date.toISOString(),
                        refundDate: sale.refundDate ? sale.refundDate.toISOString() : null
                    }))));
                    showNotification(`Imported ${formattedSalesData.length} sales records`, 'success');
                } else {
                    console.log('No Sales sheet found in workbook');
                    if (!localStorage.getItem('salesData')) {
                        localStorage.setItem('salesData', '[]');
                    }
                    showNotification('No sales data found in file', 'info');
                }
                
                // Import inventory data if available
                if (workbook.SheetNames.includes('Inventory')) {
                    const inventorySheet = workbook.Sheets['Inventory'];
                    const inventoryData = XLSX.utils.sheet_to_json(inventorySheet);
                    console.log(`Found ${inventoryData.length} inventory items`);
                    importSummary.inventory = inventoryData.length;
                    
                    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
                    showNotification(`Imported ${inventoryData.length} inventory items`, 'success');
                } else {
                    console.log('No Inventory sheet found in workbook');
                    if (!localStorage.getItem('inventoryData')) {
                        localStorage.setItem('inventoryData', '[]');
                    }
                    showNotification('No inventory data found in file', 'info');
                }
                
                // Final success notification with summary
                setTimeout(() => {
                    showNotification(
                        `Setup complete: ${importSummary.sales} sales, ${importSummary.inventory} inventory items`, 
                        'success'
                    );
                }, 2000);
                
                resolve();
            } catch (error) {
                console.error('Import processing error:', error);
                showNotification('Failed to process import: ' + error.message, 'error');
                reject(error);
            }
        };
        
        reader.onerror = (error) => {
            console.error('File reading error:', error);
            showNotification('Failed to read the file', 'error');
            reject(new Error('Failed to read the file'));
        };
        
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

// Updated notification system with Bootstrap's toast component
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications that are done
    document.querySelectorAll('.toast.hide').forEach(toast => toast.remove());

    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1060';
        document.body.appendChild(toastContainer);
    }

    // Create new toast
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    
    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastElement);
    
    // Safely initialize the toast
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastElement, {
            delay: duration,
            animation: true,
            autohide: true
        });
        
        toast.show();
    } else {
        // Fallback if Bootstrap's JS isn't loaded
        toastElement.style.display = 'block';
        setTimeout(() => toastElement.remove(), duration);
    }
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

async function showSection(sectionId) {
    // Wait for DOM to be fully ready
    if (document.readyState !== 'complete') {
        await new Promise(resolve => {
            window.addEventListener('load', resolve);
        });
    }

    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent) return;
    
    try {
        // Deactivate all sections first
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        // Check if section already exists
        let sectionElement = document.getElementById(sectionId);
        if (!sectionElement) {
            // Load new section only if it doesn't exist
            const fileName = sectionId === 'sale' ? 'sales' : sectionId;
            const templateContent = await fetchTemplate(`../pages/${fileName}-dashboard.html`);
            
            dashboardContent.innerHTML = templateContent;
            sectionElement = document.getElementById(sectionId);
        }
        
        // Activate the section
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
        
        // Initialize section-specific functionality only when needed
        if (sectionId === 'sale' || sectionId === 'inventory') {
            await Inventory.initializeInventoryData();
        }
        
        switch(sectionId) {
            case 'home':
                await Home.renderCalendar();
                Home.initializeCalendarKeyboardNavigation();
                break;
            case 'inventory':
                await Inventory.renderInventoryTable();
                break;
            case 'sale':
                await Sales.renderSalesInventory();
                Sales.initializeTableKeyboardNav();
                break;
        }

        // Update active navigation link
        updateActiveNavLink(sectionId);
        
    } catch (error) {
        console.error('Error loading section:', error);
        showNotification('Error loading section: ' + error.message, 'error');
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

async function importFromExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to import', 'error');
        return;
    }

    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Show initial loading notification
    showNotification('Processing file...', 'info');

    try {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                let importSummary = {
                    sales: 0,
                    inventory: 0
                };

                // Import sales data if available
                if (workbook.SheetNames.includes('Sales')) {
                    const salesSheet = workbook.Sheets['Sales'];
                    const salesData = XLSX.utils.sheet_to_json(salesSheet);
                    
                    if (salesData.length > 0) {
                        const formattedSalesData = salesData.map(sale => {
                            const saleItems = sale.Items.split(', ').map(item => {
                                const match = item.match(/(.*) \((\d+)\)/);
                                return {
                                    name: match[1],
                                    quantity: parseInt(match[2]),
                                    price: sale.Total / parseInt(match[2]),
                                    total: sale.Total
                                };
                            });
                            
                            return {
                                date: new Date(sale.Date),
                                items: saleItems,
                                total: sale.Total,
                                refunded: sale.Status === 'Refunded',
                                refundDate: sale.Status === 'Refunded' ? new Date(sale.RefundDate) : null
                            };
                        });
                        
                        importSummary.sales = formattedSalesData.length;
                        localStorage.setItem('salesData', JSON.stringify(formattedSalesData.map(sale => ({
                            ...sale,
                            date: sale.date.toISOString(),
                            refundDate: sale.refundDate ? sale.refundDate.toISOString() : null
                        }))));
                        
                        showNotification(`Imported ${formattedSalesData.length} sales records`, 'success', 2000);
                    }
                } else {
                    showNotification('No sales data sheet found', 'info', 2000);
                }
                
                // Import inventory data if available
                if (workbook.SheetNames.includes('Inventory')) {
                    const inventorySheet = workbook.Sheets['Inventory'];
                    const inventoryData = XLSX.utils.sheet_to_json(inventorySheet);
                    
                    if (inventoryData.length > 0) {
                        importSummary.inventory = inventoryData.length;
                        localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
                        showNotification(`Imported ${inventoryData.length} inventory items`, 'success', 2000);
                    }
                } else {
                    showNotification('No inventory data sheet found', 'info', 2000);
                }

                // Final success notification
                setTimeout(() => {
                    showNotification(
                        `Import complete: ${importSummary.sales} sales, ${importSummary.inventory} inventory items`, 
                        'success',
                        3000
                    );
                }, 2500);

                // Refresh displays
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
                
                fileInput.value = ''; // Reset the input
            } catch (error) {
                console.error('Import processing error:', error);
                showNotification('Failed to process import: ' + error.message, 'error', 5000);
            }
        };
        
        reader.onerror = (error) => {
            console.error('File reading error:', error);
            showNotification('Failed to read the file', 'error', 5000);
        };
        
        await reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('File handling error:', error);
        showNotification('Error handling file', 'error', 5000);
    }
}

// Initialize export/import functionality
function initializeFileHandling() {
    const exportButton = document.getElementById('exportButton');
    const excelFileInput = document.getElementById('excelFile');
    
    if (exportButton) {
        exportButton.addEventListener('click', exportToExcel);
    }
    
    if (excelFileInput) {
        excelFileInput.addEventListener('change', importFromExcel);
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
