const fs = require('fs');
const fetch = require('node-fetch'); // Using node-fetch@2

// Load configuration from file
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Build a query string
function buildQuery({ keywords, domains, locations, minDate }) {
  const quoteJoin = (arr) => `(${arr.map(item => `"${item}"`).join(' OR ')})`;
  const keywordsPart = quoteJoin(keywords);
  const domainsPart = `(${domains.map(domain => `site:${domain}`).join(' OR ')})`;
  const locationsPart = quoteJoin(locations);
  const datePart = minDate ? `after:${minDate}` : '';
  return [keywordsPart, domainsPart, locationsPart, datePart].filter(Boolean).join(' ');
}

// Check if text contains any of the avoid keywords (case-insensitive)
function containsAvoidKeyword(text, avoidKeywords) {
  return avoidKeywords.some(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Try to extract a published date from result metadata (if available)
function getPublishedDate(item) {
  const meta = item.pagemap && item.pagemap.metatags;
  if (meta) {
    for (const tag of meta) {
      if (tag["article:published_time"]) return new Date(tag["article:published_time"]);
      if (tag["og:published_time"]) return new Date(tag["og:published_time"]);
    }
  }
  return null;
}

/**
 * Fetches all results from the Google Custom Search API
 * until the desired maxResults is reached or no further pages are available.
 */
async function fetchAllResults(query) {
  const apiEndpoint = 'https://www.googleapis.com/customsearch/v1';
  let startIndex = 1;
  const allItems = [];
  const maxResults = config.maxResults || Infinity;
  
  while (true) {
    if (allItems.length >= maxResults) break;
    
    const url = `${apiEndpoint}?key=${config.apiKey}&cx=${config.cx}&q=${encodeURIComponent(query)}&start=${startIndex}`;
    console.log(`Fetching results starting at index ${startIndex}...`);
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.items || data.items.length === 0) break;
      
      allItems.push(...data.items);
      
      // If we have gathered enough results, trim the array to maxResults
      if (allItems.length >= maxResults) {
        allItems.length = maxResults;
        break;
      }
      
      if (data.queries && data.queries.nextPage && data.queries.nextPage[0].startIndex) {
        startIndex = data.queries.nextPage[0].startIndex;
      } else {
        break;
      }
      
      // Google API typically limits start index (often 91 is the max)
      if (startIndex > 91) break;
      
      // Short delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error fetching results at start index ${startIndex}:`, error);
      break;
    }
  }
  return allItems;
}

// Main function: build query, fetch results, filter them, then output to console and CSV.
async function main() {
  const query = buildQuery(config);
  console.log("Google Search Query:", query);

  const rawItems = await fetchAllResults(query);
  console.log(`Fetched ${rawItems.length} raw results`);

  // Convert configured minimum date to a Date object (if provided)
  const minDateObj = config.minDate ? new Date(config.minDate) : null;

  // Filter results: avoid keywords and results before minDate (when available)
  const filteredResults = rawItems.reduce((acc, item) => {
    const title = item.title || "";
    const url = item.link || "";
    
    if (containsAvoidKeyword(title, config.avoidKeywords)) return acc;

    if (minDateObj) {
      const publishedDate = getPublishedDate(item);
      if (publishedDate && publishedDate < minDateObj) return acc;
    }
    
    acc.push({ Title: title, URL: url });
    return acc;
  }, []);

  // Output results to console.
  filteredResults.forEach(result => {
    console.log(`Title: ${result.Title}`);
    console.log(`URL: ${result.URL}`);
    console.log('-----------------------------');
  });

  // Write results to CSV file.
  if (filteredResults.length > 0) {
    const header = "Title,URL\n";
    const csvRows = filteredResults.map(result => {
      const escapeCSV = (str) => `"${str.replace(/"/g, '""')}"`;
      return `${escapeCSV(result.Title)},${escapeCSV(result.URL)}`;
    });
    const csvContent = header + csvRows.join("\n");
    fs.writeFile("google_search_results.csv", csvContent, "utf8", err => {
      if (err) console.error("Error writing CSV file:", err);
      else console.log("Results saved to google_search_results.csv");
    });
  } else {
    console.log("No results after applying filters.");
  }
}

main().catch(err => console.error("Unexpected error:", err));
