import * as Home from './home.js';
import * as Inventory from './inventory.js';
import * as Sales from './sales.js';
import * as db from './database/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Application starting...');
        await bootstrap();
        // Automatically load home dashboard
        await showSection('home');
    } catch (error) {
        console.error('Critical initialization error:', error);
        showErrorState(error);
    }
});

async function bootstrap() {
    try {
        // Initialize database connection
        const dbInitialized = await db.initialize();
        if (!dbInitialized) {
            throw new Error('Failed to initialize database');
        }
        console.log('Database initialized successfully');

        // Initialize navigation handlers
        initializeNavigation();
        
        return true;
    } catch (error) {
        throw new Error(`Bootstrap failed: ${error.message}`);
    }
}

function initializeNavigation() {
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = e.currentTarget.dataset.section;
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(navLink => {
                navLink.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
            
            // Load section content
            await showSection(section);
        });
    });
}

async function showSection(sectionId) {
    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent) return;
    
    try {
        // Show loading state
        dashboardContent.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 200px;">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        // Load content
        const contentPath = `/pages/${sectionId === 'sale' ? 'sales' : sectionId}-dashboard.html`;
        const response = await fetch(contentPath);
        if (!response.ok) {
            throw new Error(`Failed to load content: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // Extract only the main content
        let mainContent = tempDiv.querySelector('main')?.innerHTML || 
                         tempDiv.querySelector('.container-fluid')?.innerHTML || 
                         content;
        
        // Update the dashboard content
        dashboardContent.innerHTML = mainContent;
        
        // Initialize section-specific functionality
        await initializeSection(sectionId);
        
    } catch (error) {
        console.error('Error loading section:', error);
        dashboardContent.innerHTML = `
            <div class="alert alert-danger m-3" role="alert">
                Error loading content: ${error.message}
            </div>
        `;
    }
}

async function initializeSection(sectionId) {
    try {
        switch(sectionId) {
            case 'home':
                await Home.renderCalendar();
                Home.initializeCalendarKeyboardNavigation();
                break;
            case 'inventory':
                await Inventory.initializeInventoryData();
                await Inventory.renderInventoryTable();
                break;
            case 'sale':
                await Sales.initializeSalesData();
                await Sales.renderSalesInventory();
                Sales.initializeTableKeyboardNav();
                break;
        }
    } catch (error) {
        console.error(`Error initializing section ${sectionId}:`, error);
        throw error;
    }
}

// Notification system with Bootstrap's toast component
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
    
    // Initialize toast
    const toast = new bootstrap.Toast(toastElement, {
        delay: duration,
        animation: true,
        autohide: true
    });
    toast.show();

    // Remove from DOM after hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Make necessary functions available to HTML
window.showSection = showSection;
