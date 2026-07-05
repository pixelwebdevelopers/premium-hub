/* eslint-disable */
const fs = require('fs');
const path = require('path');

async function fetchCountries() {
  console.log('Fetching countries from REST Countries API...');
  try {
    const response = await fetch('https://restcountries.com/v3.1/all');
    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.length} raw country records. Processing...`);

    const processed = data
      .map((c) => {
        const code = c.cca2;
        const name = c.name?.common || c.name?.official || '';
        let currency = 'USD'; // fallback
        
        if (c.currencies) {
          const keys = Object.keys(c.currencies);
          if (keys.length > 0) {
            currency = keys[0];
          }
        }

        return { code, name, currency };
      })
      .filter((c) => c.code && c.name)
      // Sort alphabetically by name
      .sort((a, b) => a.name.localeCompare(b.name));

    // Remove duplicates if any
    const unique = [];
    const seen = new Set();
    for (const c of processed) {
      if (!seen.has(c.code)) {
        seen.add(c.code);
        unique.push(c);
      }
    }

    console.log(`Processed ${unique.length} unique countries.`);

    const outputFilePath = path.join(__dirname, '../src/lib/countries.ts');
    
    const fileContent = `export interface Country {
  code: string;
  name: string;
  currency: string;
}

export const COUNTRIES: Country[] = ${JSON.stringify(unique, null, 2)};
`;

    fs.writeFileSync(outputFilePath, fileContent, 'utf-8');
    console.log(`Successfully generated countries list at: ${outputFilePath}`);
  } catch (error) {
    console.error('Error fetching countries:', error);
    process.exit(1);
  }
}

fetchCountries();
