import fs from 'fs';

// Utility script for testing sales data - only runs when explicitly called
export function checkSalesData() {
    // Get test data from localStorage
    const storedData = localStorage.getItem('salesData');
    console.log('Raw stored sales data:', storedData);
    
    if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log('\nParsed data verification:');
        parsedData.forEach(sale => {
            const saleDate = new Date(sale.date);
            console.log(`\nSale:`, {
                originalDate: sale.date,
                parsedComponents: {
                    year: saleDate.getUTCFullYear(),
                    month: saleDate.getUTCMonth(),
                    day: saleDate.getUTCDate(),
                    hours: saleDate.getUTCHours(),
                    minutes: saleDate.getUTCMinutes()
                },
                total: sale.total
            });
        });
    } else {
        console.log('No sales data found in localStorage');
    }
}

