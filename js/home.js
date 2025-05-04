import * as db from './database/index.js';

// Initialize dates in UTC
let calendarDate = new Date(Date.UTC(2025, 3, 1)); // April 1, 2025 UTC
let selectedDate = new Date(Date.UTC(2025, 3, 20));  // April 20, 2025 UTC

// Helper function to normalize a date to UTC midnight
function normalizeDate(date) {
    return new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ));
}

// Helper functions
function isDateEqual(date1, date2) {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
           d1.getUTCMonth() === d2.getUTCMonth() &&
           d1.getUTCDate() === d2.getUTCDate();
}

function getWeekNumber(date) {
    const d = new Date(date);
    const firstDayOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    return Math.ceil((d.getUTCDate() + firstDayOfMonth.getUTCDay()) / 7);
}

async function calculateMonthlyTotals() {
    const year = calendarDate.getUTCFullYear();
    const month = calendarDate.getUTCMonth();
    
    return await db.getMonthlyStats(year, month);
}

// Calculate weekly sales totals
async function calculateWeeklySales() {
    const weeklySales = new Map();
    const startOfMonth = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth(),
        1
    ));
    const endOfMonth = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth() + 1,
        0,
        23, 59, 59
    ));

    const sales = await db.getSales(startOfMonth, endOfMonth);
    
    sales.forEach(sale => {
        if (!sale.refunded) {
            const weekNum = getWeekNumber(sale.date);
            const currentTotal = weeklySales.get(weekNum) || 0;
            weeklySales.set(weekNum, currentTotal + Number(sale.total));
        }
    });
    
    return weeklySales;
}

async function renderWeeklySales() {
    const weeklySalesTable = document.getElementById('weeklySalesTable');
    if (!weeklySalesTable) return;
    
    const tbody = weeklySalesTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    const weeklySales = await calculateWeeklySales();
    const sortedWeeks = Array.from(weeklySales.keys()).sort((a, b) => a - b);
    
    sortedWeeks.forEach(weekNum => {
        const total = weeklySales.get(weekNum);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Week ${weekNum}</td>
            <td>$${total.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

    // Update monthly total
    const { totalSales } = await calculateMonthlyTotals();
    const monthlyTotal = document.getElementById('monthlyTotal');
    if (monthlyTotal) {
        monthlyTotal.textContent = `$${totalSales.toFixed(2)}`;
    }
}

async function updateSalesView() {
    const viewOption = document.getElementById('salesViewOption').value;
    const salesDetailsList = document.getElementById('salesDetailsList');
    if (!salesDetailsList) return;

    let startDate, endDate;
    switch (viewOption) {
        case 'day':
            startDate = normalizeDate(selectedDate);
            endDate = new Date(startDate);
            endDate.setUTCHours(23, 59, 59, 999);
            break;
        case 'week':
            const weekNum = getWeekNumber(selectedDate);
            startDate = new Date(selectedDate);
            startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());
            endDate = new Date(startDate);
            endDate.setUTCDate(endDate.getUTCDate() + 6);
            endDate.setUTCHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1));
            endDate = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 0, 23, 59, 59));
            break;
        default:
            return;
    }

    const sales = await db.getSales(startDate, endDate);
    salesDetailsList.innerHTML = '';
    
    sales.forEach(sale => {
        const saleDiv = document.createElement('div');
        saleDiv.className = 'sale-item';
        saleDiv.innerHTML = `
            <div class="item-name">Sale on ${new Date(sale.date).toLocaleDateString()}</div>
            <div class="item-details">
                ${sale.items.map(item => 
                    `${item.Product.name} (${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
                ).join('<br>')}
                <div class="total">Total: $${sale.total.toFixed(2)}</div>
            </div>
        `;
        salesDetailsList.appendChild(saleDiv);
    });
}

async function getSalesForDay(date) {
    const startOfDay = normalizeDate(date);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    return await db.getSales(startOfDay, endOfDay);
}

async function renderDateDetails(date) {
    const dailySales = await getSalesForDay(date);
    const dailySalesList = document.getElementById('dailySalesList');
    
    if (dailySalesList) {
        dailySalesList.innerHTML = '';
        
        if (dailySales && dailySales.length > 0) {
            dailySales.forEach((sale) => {
                const saleDiv = document.createElement('div');
                saleDiv.className = `sale-item${sale.refunded ? ' refunded-sale' : ''}`;
                
                const itemsList = sale.items.map(item => {
                    return `
                        <div class="item-row">
                            <span class="item-name">${item.Product.name}</span>
                            <span class="item-details">
                                ${item.quantity} × $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}
                            </span>
                        </div>
                    `;
                }).join('');
                
                saleDiv.innerHTML = `
                    <div class="sale-header">
                        Sale at ${new Date(sale.date).toLocaleTimeString()}
                        ${sale.refunded ? '<span class="refunded-tag">Refunded</span>' : 
                          `<button class="refund-button" onclick="handleRefund('${sale.id}')">Refund</button>`}
                    </div>
                    <div class="items-list">
                        ${itemsList}
                    </div>
                    <div class="sale-total">
                        Total: $${sale.total.toFixed(2)}
                    </div>
                `;
                dailySalesList.appendChild(saleDiv);
            });
        } else {
            dailySalesList.innerHTML = '<p class="no-sales">No sales on this day</p>';
        }
    }

    // Update statistics
    await updateStatisticsDisplays(date);
}

async function handleRefund(saleId) {
    const confirmed = window.confirm('Are you sure you want to process this refund?');
    if (confirmed) {
        if (await db.refundSale(saleId)) {
            // Refresh the calendar view to update totals
            await renderCalendar();
            await renderDateDetails(selectedDate);
        }
    }
}

// Make handleRefund available globally
window.handleRefund = handleRefund;

async function updateStatisticsDisplays(date) {
    const elements = {
        dailyTotal: document.getElementById('dailyTotalDisplay'),
        dailyItems: document.getElementById('dailyItemCountDisplay'),
        dailyRevenue: document.getElementById('dailyRevenueDisplay'),
        monthlyTotal: document.getElementById('monthlyTotalDisplay'),
        monthlyRevenue: document.getElementById('monthlyRevenueDisplay')
    };
    
    if (!Object.values(elements).every(el => el)) {
        console.log('Statistics elements not ready yet');
        return;
    }
    
    // Get daily statistics
    const dailyStats = await db.getDailyStats(date);
    
    // Get monthly statistics
    const monthlyStats = await db.getMonthlyStats(
        date.getUTCFullYear(),
        date.getUTCMonth()
    );
    
    // Update all displays
    elements.dailyTotal.textContent = `$${dailyStats.totalSales.toFixed(2)}`;
    elements.dailyItems.textContent = dailyStats.itemCount;
    elements.dailyRevenue.textContent = `$${dailyStats.revenue.toFixed(2)}`;
    elements.monthlyTotal.textContent = `$${monthlyStats.totalSales.toFixed(2)}`;
    elements.monthlyRevenue.textContent = `$${monthlyStats.revenue.toFixed(2)}`;
}

export async function renderCalendar() {
    console.log('Rendering calendar for:', calendarDate.toISOString());
    updateCalendarHeader();
    
    const calendarTable = document.querySelector('#salesCalendar');
    const headerRow = calendarTable.querySelector('thead tr');
    headerRow.innerHTML = `
        <th scope="col">Sun</th>
        <th scope="col">Mon</th>
        <th scope="col">Tue</th>
        <th scope="col">Wed</th>
        <th scope="col">Thu</th>
        <th scope="col">Fri</th>
        <th scope="col">Sat</th>
    `;
    
    const calendarBody = calendarTable.querySelector('tbody');
    if (!calendarBody) {
        console.error('Calendar tbody not found');
        return;
    }
    
    calendarBody.innerHTML = '';
    
    // Create dates in UTC for the calendar range
    const firstDayOfMonth = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth(),
        1
    ));
    
    const lastDayOfMonth = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth() + 1,
        0
    ));

    // Get all sales for the month
    const monthSales = await db.getSales(firstDayOfMonth, lastDayOfMonth);
    
    // Group sales by date
    const salesByDate = new Map();
    monthSales.forEach(sale => {
        if (!sale.refunded) {
            const saleDate = new Date(sale.date);
            const dateKey = saleDate.toISOString().split('T')[0];
            const currentTotal = salesByDate.get(dateKey) || 0;
            salesByDate.set(dateKey, currentTotal + Number(sale.total));
        }
    });

    // Start from the first day of the week containing the first of the month
    let currentDay = new Date(firstDayOfMonth);
    currentDay.setUTCDate(currentDay.getUTCDate() - currentDay.getUTCDay());

    while (currentDay <= lastDayOfMonth || currentDay.getUTCDay() !== 0) {
        if (currentDay.getUTCDay() === 0) {
            const row = document.createElement('tr');
            row.setAttribute('role', 'row');
            calendarBody.appendChild(row);
        }
        
        const cell = document.createElement('td');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'gridcell');
        
        const currentUTCDate = normalizeDate(currentDay);
        const dateKey = currentUTCDate.toISOString().split('T')[0];
        
        cell.setAttribute('data-date', currentUTCDate.toISOString());
        cell.setAttribute('aria-label', currentUTCDate.toDateString());
        
        if (currentDay.getUTCMonth() === calendarDate.getUTCMonth()) {
            cell.textContent = currentDay.getUTCDate();
            cell.classList.add('current-month');
            
            const dailyTotal = salesByDate.get(dateKey);
            if (dailyTotal) {
                const salesInfo = document.createElement('div');
                salesInfo.className = 'sales-total';
                salesInfo.textContent = `$${dailyTotal.toFixed(2)}`;
                salesInfo.setAttribute('aria-label', `Sales total: $${dailyTotal.toFixed(2)}`);
                cell.appendChild(salesInfo);
            }
            
            if (isDateEqual(currentUTCDate, selectedDate)) {
                cell.classList.add('selected');
                cell.setAttribute('aria-selected', 'true');
            }
        } else {
            cell.classList.add('adjacent-month');
            cell.textContent = currentDay.getUTCDate();
        }

        cell.addEventListener('click', () => handleDateClick(currentUTCDate, cell));
        calendarBody.lastElementChild.appendChild(cell);
        
        currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }

    if (selectedDate) {
        await renderDateDetails(selectedDate);
        await updateStatisticsDisplays(selectedDate);
    }
}

async function handleDateClick(date, cell) {
    console.log('Date clicked:', date.toISOString());
    
    document.querySelectorAll('#salesCalendar td').forEach(td => {
        td.classList.remove('selected');
        td.removeAttribute('aria-selected');
    });
    
    cell.classList.add('selected');
    cell.setAttribute('aria-selected', 'true');
    
    selectedDate = date;
    await renderDateDetails(selectedDate);
    await updateStatisticsDisplays(selectedDate);
}

function updateCalendarHeader() {
    const monthElement = document.getElementById('currentMonth');
    const yearElement = document.getElementById('currentYear');
    
    if (monthElement && yearElement) {
        const month = calendarDate.toLocaleString('default', { 
            month: 'long',
            timeZone: 'UTC'
        });
        monthElement.textContent = month;
        yearElement.textContent = calendarDate.getUTCFullYear();
        
        const headerContainer = monthElement.parentElement;
        if (headerContainer) {
            headerContainer.style.display = 'flex';
        }
    }
}

export async function navigateCalendar(direction) {
    calendarDate = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth() + direction,
        1
    ));
    
    selectedDate = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth(),
        selectedDate.getUTCDate()
    ));
    
    console.log('Calendar navigated to:', calendarDate.toISOString());
    console.log('Selected date updated to:', selectedDate.toISOString());
    
    await renderCalendar();
    updateCalendarHeader();
    await updateStatisticsDisplays(selectedDate);
}

export function initializeCalendarKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.closest('.calendar-container')) {
            switch (e.key) {
                case 'ArrowLeft':
                    navigateCalendar(-1);
                    break;
                case 'ArrowRight':
                    navigateCalendar(1);
                    break;
                case 'Home':
                    calendarDate = new Date();
                    selectedDate = new Date();
                    renderCalendar();
                    updateCalendarHeader();
                    e.preventDefault();
                    break;
            }
        }
    });
}

// Make updateSalesView available globally
window.updateSalesView = updateSalesView;

// Dashboard data management
async function fetchDashboardData() {
    try {
        // Fetch total sales
        const salesResponse = await fetch('/api/sales');
        const sales = await salesResponse.json();
        
        // Fetch products
        const productsResponse = await fetch('/api/products');
        const products = await productsResponse.json();
        
        updateDashboard(sales, products);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

function updateDashboard(sales, products) {
    // Update total sales
    const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    
    // Update items sold today
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(sale => sale.date.startsWith(today));
    const itemsSold = todaySales.reduce((sum, sale) => {
        return sum + sale.SaleItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    document.getElementById('itemsSold').textContent = itemsSold;
    
    // Update total products
    document.getElementById('totalProducts').textContent = products.length;
    
    // Update recent sales table
    updateRecentSales(sales.slice(-5));
}

function updateRecentSales(recentSales) {
    const tbody = document.getElementById('recentSales');
    tbody.innerHTML = '';
    
    recentSales.reverse().forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sale.id}</td>
            <td>${formatDate(sale.date)}</td>
            <td>${sale.SaleItems ? sale.SaleItems.reduce((sum, item) => sum + item.quantity, 0) : 0}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>
                <span class="badge ${sale.refunded ? 'bg-danger' : 'bg-success'}">
                    ${sale.refunded ? 'Refunded' : 'Completed'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    // You can implement your preferred error notification here
    console.error(message);
    alert(message);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
    // Refresh dashboard every 5 minutes
    setInterval(fetchDashboardData, 300000);
});