import * as Home from './home.js';
import * as Inventory from './inventory.js';
import * as Sales from './sales.js';
import * as db from './database/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Application starting...');
        await bootstrap();
    } catch (error) {
        console.error('Critical initialization error:', error);
        showErrorState(error);
    }
});

async function bootstrap() {
    // First, ensure DOM is ready
    if (document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve));
    }

    // Initialize notification system first
    setupNotificationSystem();

    try {
        // Initialize database connection
        const dbInitialized = await db.initialize();
        if (!dbInitialized) {
            throw new Error('Failed to initialize database');
        }
        console.log('Database initialized successfully');

        // Load application
        await initializeApplication();
    } catch (error) {
        throw new Error(`Bootstrap failed: ${error.message}`);
    }
}

function setupNotificationSystem() {
    window.addEventListener('show-notification', (event) => {
        showNotification(event.detail.message, event.detail.type);
    });
    showNotification('Application is starting...', 'info');
}

async function initializeApplication() {
    try {
        console.log('Initializing application...');
        
        // Initialize both inventory and sales data
        await Promise.all([
            Inventory.initializeInventoryData(),
            Sales.initializeSalesData()
        ]);
        
        // Show main dashboard
        showMainDashboard();
        
        // Load initial home section
        const dashboardContent = document.getElementById('dashboard-content');
        if (dashboardContent) {
            await showSection('home');
            
            // Force refresh all views
            Home.renderCalendar();
            Home.initializeCalendarKeyboardNavigation();
            await Inventory.renderInventoryTable();
            await Sales.renderSalesInventory();
            
            console.log('All views initialized successfully');
            showNotification('Application initialized successfully', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('Application initialization error:', error);
        showNotification('Failed to initialize application: ' + error.message, 'error');
        throw error;
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

    // Load initial home section
    showSection('home');
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
            const templateContent = await fetchTemplate(`/pages/${fileName}-dashboard.html`);
            
            if (templateContent) {
                // Create a temporary container to parse the HTML
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = templateContent;
                
                // Get the actual section element
                sectionElement = tempContainer.querySelector(`#${sectionId}`);
                if (sectionElement) {
                    dashboardContent.appendChild(sectionElement);
                } else {
                    throw new Error(`Section element #${sectionId} not found in template`);
                }
            } else {
                throw new Error(`Failed to load template for section ${sectionId}`);
            }
        }
        
        // Activate the section
        if (sectionElement) {
            sectionElement.classList.add('active');
            
            // Initialize section-specific functionality
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
        const templateContent = await fetchTemplate('/pages/home-dashboard.html');
        if (templateContent) {
            // Create a temporary container to parse the HTML
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = templateContent;
            
            // Get the actual section element content
            const sectionContent = tempContainer.querySelector('#home');
            if (sectionContent) {
                homeSection.innerHTML = sectionContent.innerHTML;
                
                // Initialize calendar and stats after content is loaded
                Home.renderCalendar();
                Home.initializeCalendarKeyboardNavigation();
            }
        }
    }
}

// Helper function to fetch HTML templates
async function fetchTemplate(path) {
    try {
        console.log('Fetching template:', path);
        const absolutePath = path.replace(/^\.\.\//, '/');
        console.log('Using absolute path:', absolutePath);
        const response = await fetch(absolutePath);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        console.log('Template loaded successfully:', absolutePath);
        return text;
    } catch (error) {
        console.error('Error loading template:', path, error);
        showNotification(`Failed to load template: ${path}`, 'error');
        return '';
    }
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
    console.log(`Showing notification: ${message} (${type})`);
    
    // Remove any existing notifications that are fading out
    document.querySelectorAll('.toast.hide').forEach(toast => toast.remove());

    // Create or get toast container
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '2000';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0 show`;
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
    
    // Initialize toast with Bootstrap if available, otherwise use fallback
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastElement, {
            delay: duration,
            animation: true,
            autohide: true
        });
        toast.show();
    } else {
        // Fallback if Bootstrap JS isn't loaded
        toastElement.style.opacity = '1';
        toastElement.style.display = 'block';
        setTimeout(() => {
            toastElement.style.opacity = '0';
            toastElement.style.transition = 'opacity 0.15s linear';
            setTimeout(() => toastElement.remove(), 150);
        }, duration);
    }

    // Remove from DOM after hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
    
    // Also log to console for debugging
    console.log(`Notification shown: ${message}`);
}

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
