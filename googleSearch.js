const fs = require('fs');
const fetch = require('node-fetch'); // Using node-fetch@2

// Load configuration from file
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const processedUrlsFile = "processed_urls.txt";
const outputCsvFile = "google_search_results.csv";

/**
 * Build a refined query string.
 */
function buildQuery({ intitleKeywords, keywords, domains, locations, minDate, avoidKeywords }) {
  const intitlePart = intitleKeywords && intitleKeywords.length > 0 
    ? `intitle:(${intitleKeywords.map(k => `"${k}"`).join(" OR ")})` 
    : "";
  const keywordsPart = keywords && keywords.length > 0 
    ? `(${keywords.map(k => `"${k}"`).join(" OR ")})`
    : "";
  const domainsPart = domains && domains.length > 0 
    ? `(${domains.map(domain => `site:${domain}`).join(" OR ")})`
    : "";
  const locationsPart = locations && locations.length > 0 
    ? `(${locations.map(loc => `"${loc}"`).join(" OR ")})`
    : "";
  const excludePart = avoidKeywords && avoidKeywords.length > 0 
    ? `-(${avoidKeywords.map(term => `"${term}"`).join(" OR ")})`
    : "";
  const datePart = minDate ? `after:${minDate}` : "";
  
  return [intitlePart, keywordsPart, domainsPart, locationsPart, excludePart, datePart]
    .filter(Boolean).join(" ");
}

/**
 * Check if text contains any of the avoid keywords (case-insensitive).
 * This is an additional safeguard even though the query excludes unwanted keywords.
 */
function containsAvoidKeyword(text, avoidKeywords) {
  return avoidKeywords.some(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Try to extract a published date from result metadata (if available).
 */
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
 * Fetch all results from the Google Custom Search API until the
 * desired maxResults is reached or no further pages are available.
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
      
      // If we've reached/exceeded maxResults, trim and break.
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
      
      // Delay to avoid rate limiting.
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error fetching results at start index ${startIndex}:`, error);
      break;
    }
  }
  return allItems;
}

/**
 * Loads already processed URLs from file into a Set.
 */
function loadProcessedUrls() {
  if (!fs.existsSync(processedUrlsFile)) return new Set();
  const data = fs.readFileSync(processedUrlsFile, 'utf8');
  return new Set(data.split('\n').filter(url => url.trim().length > 0));
}

/**
 * Appends a set of URLs to the processed URLs file.
 */
function saveProcessedUrls(newUrls) {
  if (newUrls.length === 0) return;
  const data = newUrls.join('\n') + '\n';
  fs.appendFileSync(processedUrlsFile, data, 'utf8');
}

/**
 * Appends new results to the CSV file.
 * If the CSV does not exist, writes the header first.
 */
function appendToCSV(results) {
  const header = "Title,URL\n";
  let fileExists = fs.existsSync(outputCsvFile);
  let csvData = "";
  
  results.forEach(result => {
    const escapeCSV = (str) => `"${str.replace(/"/g, '""')}"`;
    csvData += `${escapeCSV(result.Title)},${escapeCSV(result.URL)}\n`;
  });
  
  if (!fileExists) {
    csvData = header + csvData;
  }
  
  fs.appendFileSync(outputCsvFile, csvData, 'utf8');
}

// Main function: Build query, fetch results, filter them, then append to CSV.
async function main() {
  const query = buildQuery(config);
  console.log("Google Search Query:", query);

  const rawItems = await fetchAllResults(query);
  console.log(`Fetched ${rawItems.length} raw results`);

  // Convert minDate (if provided) to a Date object.
  const minDateObj = config.minDate ? new Date(config.minDate) : null;

  // Filter results: remove items with avoid keywords and those published before minDate.
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

  // Load URLs that have been processed in the past
  const processedUrls = loadProcessedUrls();

  // Filter out results that have already been collected.
  const newResults = filteredResults.filter(result => !processedUrls.has(result.URL));

  if (newResults.length > 0) {
    console.log(`Appending ${newResults.length} new unique results to CSV...`);
    appendToCSV(newResults);
    // Save the new URLs for future runs.
    const newUrls = newResults.map(result => result.URL);
    saveProcessedUrls(newUrls);
  } else {
    console.log("No new results found after filtering.");
  }
}

main().catch(err => console.error("Unexpected error:", err));
