// Remove database import and replace with API calls
async function fetchDashboardData() {
    try {
        // Fetch all data from API endpoints
        const [salesResponse, productsResponse] = await Promise.all([
            fetch('/api/sales'),
            fetch('/api/products')
        ]);

        const sales = await salesResponse.json();
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