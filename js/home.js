import { salesData, initializeSalesData, processRefund } from './sales.js';
import { inventoryData } from './inventory.js';

// Initialize dates in UTC
let calendarDate = new Date(Date.UTC(2025, 3, 1)); // April 1, 2025 UTC
let selectedDate = new Date(Date.UTC(2025, 3, 20));  // April 20, 2025 UTC

function reloadSalesData() {
    // Force reload sales data from localStorage
    const storedData = localStorage.getItem('salesData');
    console.log('Raw stored sales data:', storedData);
    
    const loadedData = JSON.parse(storedData) || [];
    console.log('Parsed sales data:', loadedData);
    
    // Clear existing sales data
    salesData.length = 0;
    
    // Convert dates and add to salesData
    loadedData.forEach(sale => {
        const saleDate = new Date(sale.date);
        const convertedSale = {
            ...sale,
            date: saleDate
        };
        console.log('Processing sale:', {
            originalDate: sale.date,
            convertedDate: saleDate,
            dateComponents: {
                year: saleDate.getUTCFullYear(),
                month: saleDate.getUTCMonth(),
                date: saleDate.getUTCDate(),
                hours: saleDate.getUTCHours()
            }
        });
        salesData.push(convertedSale);
    });
    
    console.log('Final reloaded sales data:', salesData);
}

// Helper function to normalize a date to UTC midnight
function normalizeDate(date) {
    const normalized = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ));
    return normalized;
}

// Helper function to check if two dates are the same day in UTC
function isDateEqual(date1, date2) {
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    console.log('Comparing dates:', {
        date1: {
            original: date1,
            year: d1.getUTCFullYear(),
            month: d1.getUTCMonth(),
            day: d1.getUTCDate()
        },
        date2: {
            original: date2,
            year: d2.getUTCFullYear(),
            month: d2.getUTCMonth(),
            day: d2.getUTCDate()
        }
    });
    
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
           d1.getUTCMonth() === d2.getUTCMonth() &&
           d1.getUTCDate() === d2.getUTCDate();
}

// Helper function to get the week number
function getWeekNumber(date) {
    const d = new Date(date);
    const firstDayOfMonth = new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        1
    ));
    return Math.ceil((d.getUTCDate() + firstDayOfMonth.getUTCDay()) / 7);
}

// Calculate monthly sales total and revenue
function calculateMonthlyTotals() {
    let total = 0;
    let revenue = 0;
    
    salesData.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate.getUTCMonth() === calendarDate.getUTCMonth() && 
            saleDate.getUTCFullYear() === calendarDate.getUTCFullYear() &&
            !sale.refunded) {
            total += sale.total;
            
            // Calculate revenue for each item in the sale
            sale.items.forEach(item => {
                const inventoryItem = inventoryData.find(invItem => 
                    invItem.name === item.name.split(' (')[0]  // Handle items with variant in name
                );
                if (inventoryItem) {
                    revenue += (item.price - inventoryItem.costPrice) * item.quantity;
                }
            });
        }
    });
    
    return { total, revenue };
}

// Calculate weekly sales totals
function calculateWeeklySales() {
    const weeklySales = new Map();
    
    salesData.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate.getUTCMonth() === calendarDate.getUTCMonth() && 
            saleDate.getUTCFullYear() === calendarDate.getUTCFullYear()) {
            const weekNum = getWeekNumber(saleDate);
            const currentTotal = weeklySales.get(weekNum) || 0;
            weeklySales.set(weekNum, currentTotal + sale.total);
        }
    });
    
    return weeklySales;
}

function renderWeeklySales() {
    const weeklySalesTable = document.getElementById('weeklySalesTable');
    if (!weeklySalesTable) return;
    
    const tbody = weeklySalesTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    const weeklySales = calculateWeeklySales();
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
    const monthlyTotal = document.getElementById('monthlyTotal');
    if (monthlyTotal) {
        monthlyTotal.textContent = `$${calculateMonthlyTotal().toFixed(2)}`;
    }
}

function updateSalesView() {
    const viewOption = document.getElementById('salesViewOption').value;
    const salesDetailsList = document.getElementById('salesDetailsList');
    if (!salesDetailsList) return;

    let filteredSales = salesData.filter(sale => {
        const saleDate = new Date(sale.date);
        switch (viewOption) {
            case 'day':
                return isDateEqual(saleDate, selectedDate);
            case 'week':
                return getWeekNumber(saleDate) === getWeekNumber(selectedDate) &&
                       saleDate.getMonth() === selectedDate.getUTCMonth() &&
                       saleDate.getFullYear() === selectedDate.getUTCFullYear();
            case 'month':
                return saleDate.getMonth() === selectedDate.getUTCMonth() &&
                       saleDate.getFullYear() === selectedDate.getUTCFullYear();
            default:
                return false;
        }
    });

    salesDetailsList.innerHTML = '';
    filteredSales.forEach(sale => {
        const saleDiv = document.createElement('div');
        saleDiv.className = 'sale-item';
        saleDiv.innerHTML = `
            <div class="item-name">Sale on ${new Date(sale.date).toLocaleDateString()}</div>
            <div class="item-details">
                ${sale.items.map(item => `${item.name} (${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('<br>')}
                <div class="total">Total: $${sale.total.toFixed(2)}</div>
            </div>
        `;
        salesDetailsList.appendChild(saleDiv);
    });
}

function getSalesForDay(date) {
    return salesData.filter(sale => isDateEqual(sale.date, date));
}

function getSalesForWeek(date) {
    // Always reload sales data before filtering
    initializeSalesData();
    
    const weekNum = getWeekNumber(date);
    return salesData.filter(sale => {
        const saleDate = new Date(sale.date);
        return getWeekNumber(saleDate) === weekNum &&
               saleDate.getMonth() === date.getUTCMonth() &&
               saleDate.getFullYear() === date.getUTCFullYear();
    });
}

function renderDateDetails(date) {
    console.log('renderDateDetails called with date:', date);
    
    // Force reload sales data
    reloadSalesData();
    
    // Get sales for the selected day
    const dailySales = salesData.filter(sale => {
        const saleDate = new Date(sale.date);
        return isDateEqual(saleDate, date);
    });

    // Render daily sales
    const dailySalesList = document.getElementById('dailySalesList');
    if (dailySalesList) {
        dailySalesList.innerHTML = '';
        
        if (dailySales && dailySales.length > 0) {
            // Render individual sales
            dailySales.forEach((sale, index) => {
                const saleDiv = document.createElement('div');
                saleDiv.className = `sale-item${sale.refunded ? ' refunded-sale' : ''}`;
                const localSaleDate = new Date(sale.date);
                
                // Build items list with details
                const itemsList = sale.items.map(item => {
                    return `
                        <div class="item-row">
                            <span class="item-name">${item.name}</span>
                            <span class="item-details">
                                ${item.quantity} × $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}
                            </span>
                        </div>
                    `;
                }).join('');
                
                saleDiv.innerHTML = `
                    <div class="sale-header">
                        Sale at ${localSaleDate.toLocaleTimeString()}
                        ${sale.refunded ? '<span class="refunded-tag">Refunded</span>' : 
                          `<button class="refund-button" onclick="handleRefund('${sale.date}', ${index})">Refund</button>`}
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
}

// Add handler for refund button clicks
function handleRefund(saleDate, saleIndex) {
    const confirmed = window.confirm('Are you sure you want to process this refund?');
    if (confirmed) {
        if (processRefund(saleDate, saleIndex)) {
            // Refresh the calendar view to update totals
            renderCalendar();
        }
    }
}

// Make handleRefund available globally
window.handleRefund = handleRefund;

function createDateWithSameTime(fromDate, withDate) {
    // Create new date in UTC
    return normalizeDate(withDate);
}

function updateStatisticsDisplays(date) {
    // Check if the required elements exist first
    const elements = {
        dailyTotal: document.getElementById('dailyTotalDisplay'),
        dailyItems: document.getElementById('dailyItemCountDisplay'),
        dailyRevenue: document.getElementById('dailyRevenueDisplay'),
        monthlyTotal: document.getElementById('monthlyTotalDisplay'),
        monthlyRevenue: document.getElementById('monthlyRevenueDisplay')
    };
    
    // If any of the required elements are missing, return early
    if (!Object.values(elements).every(el => el)) {
        console.log('Statistics elements not ready yet');
        return;
    }
    
    const salesForDay = getSalesForDay(date);
    let dailyTotal = 0;
    let dailyRevenue = 0;
    let itemCount = 0;

    // Calculate daily statistics
    salesForDay.forEach(sale => {
        if (!sale.refunded) {
            dailyTotal += sale.total;
            sale.items.forEach(item => {
                itemCount += item.quantity;
                const inventoryItem = inventoryData.find(invItem => 
                    invItem.name === item.name.split(' (')[0]
                );
                if (inventoryItem) {
                    dailyRevenue += (item.price - inventoryItem.costPrice) * item.quantity;
                }
            });
        }
    });

    // Calculate monthly statistics
    const { total: monthlyTotal, revenue: monthlyRevenue } = calculateMonthlyTotals();

    // Update all displays
    elements.dailyTotal.textContent = `$${dailyTotal.toFixed(2)}`;
    elements.dailyItems.textContent = itemCount;
    elements.dailyRevenue.textContent = `$${dailyRevenue.toFixed(2)}`;
    elements.monthlyTotal.textContent = `$${monthlyTotal.toFixed(2)}`;
    elements.monthlyRevenue.textContent = `$${monthlyRevenue.toFixed(2)}`;
}

export function renderCalendar() {
    console.log('Rendering calendar for:', calendarDate.toISOString());
    updateCalendarHeader();
    
    // Reset calendar table header first
    const calendarTable = document.querySelector('#salesCalendar');
    const headerRow = calendarTable.querySelector('thead tr');
    // Clear any existing headers first
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
    
    // Force reload sales data to ensure we have the latest data
    initializeSalesData();
    
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

    // Start from the first day of the week containing the first of the month
    let currentDay = new Date(firstDayOfMonth);
    currentDay.setUTCDate(currentDay.getUTCDate() - currentDay.getUTCDay());

    // Render calendar grid
    while (currentDay <= lastDayOfMonth || currentDay.getUTCDay() !== 0) {
        const row = document.createElement('tr');
        row.setAttribute('role', 'row');
        
        // Regular day cells
        for (let i = 0; i < 7; i++) {
            const cell = document.createElement('td');
            cell.setAttribute('tabindex', '0');
            cell.setAttribute('role', 'gridcell');
            
            const currentUTCDate = new Date(Date.UTC(
                currentDay.getUTCFullYear(),
                currentDay.getUTCMonth(),
                currentDay.getUTCDate()
            ));
            
            // Set data attributes for the cell
            cell.setAttribute('data-date', currentUTCDate.toISOString());
            cell.setAttribute('aria-label', currentUTCDate.toDateString());
            
            // Style cells from current month differently
            if (currentDay.getUTCMonth() === calendarDate.getUTCMonth()) {
                cell.textContent = currentDay.getUTCDate();
                cell.classList.add('current-month');
                
                // Find all sales for this day
                const salesForDay = salesData.filter(sale => {
                    const saleDate = new Date(sale.date);
                    return isDateEqual(saleDate, currentUTCDate);
                });
                
                // Add sales information if there are any sales (excluding refunded ones)
                if (salesForDay.length > 0) {
                    const totalSales = salesForDay.reduce((sum, sale) => 
                        sum + (sale.refunded ? 0 : sale.total), 0);
                    if (totalSales > 0) {
                        const salesInfo = document.createElement('div');
                        salesInfo.className = 'sales-total';
                        salesInfo.textContent = `$${totalSales.toFixed(2)}`;
                        salesInfo.setAttribute('aria-label', `Sales total: $${totalSales.toFixed(2)}`);
                        cell.appendChild(salesInfo);
                    }
                }
                
                // Highlight selected date
                if (isDateEqual(currentUTCDate, selectedDate)) {
                    cell.classList.add('selected');
                    cell.setAttribute('aria-selected', 'true');
                }
            } else {
                // Style cells from adjacent months
                cell.classList.add('adjacent-month');
                cell.textContent = currentDay.getUTCDate();
            }

            // Add click handler
            cell.addEventListener('click', () => handleDateClick(currentUTCDate, cell));
            row.appendChild(cell);
            
            // Move to next day
            currentDay.setUTCDate(currentDay.getUTCDate() + 1);
        }

        calendarBody.appendChild(row);
    }

    // Update monthly total
    updateMonthlyTotal();

    if (selectedDate) {
        renderDateDetails(selectedDate);
        updateStatisticsDisplays(selectedDate);
    }
}

// Separate function to update monthly total
function updateMonthlyTotal() {
    const { total, revenue } = calculateMonthlyTotals();
    const monthlyTotal = document.getElementById('monthlyTotal');
    const monthlyRevenue = document.getElementById('monthlyRevenue');
    
    if (monthlyTotal) {
        monthlyTotal.textContent = `$${total.toFixed(2)}`;
    }
    if (monthlyRevenue) {
        monthlyRevenue.textContent = `Revenue: $${revenue.toFixed(2)}`;
    }
}

function handleDateClick(date, cell) {
    console.log('Date clicked:', date.toISOString());
    
    // Update selected state
    document.querySelectorAll('#salesCalendar td').forEach(td => {
        td.classList.remove('selected');
        td.removeAttribute('aria-selected');
    });
    
    cell.classList.add('selected');
    cell.setAttribute('aria-selected', 'true');
    
    // Update selected date and render details
    selectedDate = date;
    renderDateDetails(selectedDate);
    updateStatisticsDisplays(selectedDate);
}

// Separate the updateCalendarHeader function and make it more robust
function updateCalendarHeader() {
    const monthElement = document.getElementById('currentMonth');
    const yearElement = document.getElementById('currentYear');
    
    if (monthElement && yearElement) {
        // Use UTC methods for consistent display
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

export function navigateCalendar(direction) {
    // Create a new UTC date to avoid mutating the existing one
    calendarDate = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth() + direction,
        1
    ));
    
    // Ensure selected date stays in sync with calendar navigation
    selectedDate = new Date(Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth(),
        selectedDate.getUTCDate()
    ));
    
    console.log('Calendar navigated to:', calendarDate.toISOString());
    console.log('Selected date updated to:', selectedDate.toISOString());
    
    renderCalendar();
    updateCalendarHeader();
    updateStatisticsDisplays(selectedDate);
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