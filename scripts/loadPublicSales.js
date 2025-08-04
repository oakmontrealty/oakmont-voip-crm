curl -s "https://data.sa.gov.au/data/dataset/a75c-sales.csv" -o /tmp/sa.csv && node scripts/loadPublicSales.js /tmp/sa.csv SA
