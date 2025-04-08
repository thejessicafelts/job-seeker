const fs = require('fs');
const fetch = require('node-fetch'); // Using node-fetch@2

// Load configuration from file
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const processedUrlsFile = "processed_urls.txt";
const outputCsvFile = "google_search_results.csv";

/**
 * Normalize a URL by trimming whitespace and converting to lowercase.
 */
function normalizeUrl(url) {
  return url.trim().toLowerCase();
}

/**
 * Build a refined query string.
*/
function buildQuery({ intitleKeywords, keywords, domains, locations, minDate, avoidKeywords }) {
  const intitlePart = (intitleKeywords && intitleKeywords.length > 0)
    ? `intitle:(${intitleKeywords.map(k => `"${k}"`).join(" OR ")})`
    : "";
  const keywordsPart = (keywords && keywords.length > 0)
    ? `(${keywords.map(k => `"${k}"`).join(" OR ")})`
    : "";
  const domainsPart = (domains && domains.length > 0)
    ? `(${domains.map(domain => `site:${domain}`).join(" OR ")})`
    : "";
  const locationsPart = (locations && locations.length > 0)
    ? `(${locations.map(loc => `"${loc}"`).join(" OR ")})`
    : "";
  const excludePart = (avoidKeywords && avoidKeywords.length > 0)
    ? `-(${avoidKeywords.map(term => `"${term}"`).join(" OR ")})`
    : "";
  const datePart = minDate ? `after:${minDate}` : "";
  
  return [intitlePart, keywordsPart, domainsPart, locationsPart, excludePart, datePart]
    .filter(Boolean).join(" ");
}

/**
 * Check if text contains any of the avoid keywords (case-insensitive).
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
 * Loads already processed URLs from file into a Set.
 */
function loadProcessedUrls() {
  if (!fs.existsSync(processedUrlsFile)) return new Set();
  const data = fs.readFileSync(processedUrlsFile, 'utf8');
  return new Set(data.split('\n')
    .filter(url => url.trim().length > 0)
    .map(url => normalizeUrl(url))
  );
}

/**
 * Appends URLs to the processed URLs file.
 */
function saveProcessedUrls(newUrls) {
  if (newUrls.length === 0) return;
  const data = newUrls.join('\n') + '\n';
  fs.appendFileSync(processedUrlsFile, data, 'utf8');
}

/**
 * Appends results to the CSV file.
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

/**
 * Fetch new (unique) results that pass filtering criteria.
 *
 * Continues paginating through Google Custom Search results until the number
 * of new results (that are not already processed) reaches config.maxResults,
 * or until no further pages are available.
 */
async function fetchNewResults(query, processedUrls) {
  const apiEndpoint = 'https://www.googleapis.com/customsearch/v1';
  let startIndex = 1;
  let newResults = [];
  const maxNewResults = config.maxResults;
  const minDateObj = config.minDate ? new Date(config.minDate) : null;
  
  while (newResults.length < maxNewResults) {
    const url = `${apiEndpoint}?key=${config.apiKey}&cx=${config.cx}&q=${encodeURIComponent(query)}&start=${startIndex}`;
    console.log(`Fetching results starting at index ${startIndex}...`);
    
    let data;
    try {
      const res = await fetch(url);
      data = await res.json();
    } catch (error) {
      console.error(`Error fetching results at start index ${startIndex}:`, error);
      break;
    }
    
    if (!data.items || data.items.length === 0) break;
    
    // Process the items on this page
    for (const item of data.items) {
      const title = item.title || "";
      const urlItem = item.link || "";
      const normalized = normalizeUrl(urlItem);
      
      // Check if already processed or already collected in this run
      if (processedUrls.has(normalized)) continue;
      if (newResults.some(result => normalizeUrl(result.URL) === normalized)) continue;
      
      // Check avoid keywords (using title)
      if (containsAvoidKeyword(title, config.avoidKeywords)) continue;
      
      // Check minDate (if available)
      if (minDateObj) {
        const publishedDate = getPublishedDate(item);
        if (publishedDate && publishedDate < minDateObj) continue;
      }
      
      newResults.push({ Title: title, URL: urlItem });
      
      // Stop early if we've accumulated enough new results
      if (newResults.length >= maxNewResults) break;
    }
    
    // If we've reached enough new results, break out of the loop
    if (newResults.length >= maxNewResults) break;
    
    // Move to the next page if available
    if (data.queries && data.queries.nextPage && data.queries.nextPage[0].startIndex) {
      startIndex = data.queries.nextPage[0].startIndex;
    } else {
      break;
    }
    // Google API limit - typically start index doesn't go beyond 91.
    if (startIndex > 91) break;
    
    // Delay to avoid rate limiting.
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return newResults;
}

// Main function: Build query, fetch new results, and append them.
async function main() {
  const query = buildQuery(config);
  console.log("Google Search Query:", query);

  const processedUrls = loadProcessedUrls();
  const newResults = await fetchNewResults(query, processedUrls);
  console.log(`Fetched ${newResults.length} new unique results`);

  if (newResults.length > 0) {
    console.log(`Appending ${newResults.length} new unique results to CSV...`);
    appendToCSV(newResults);
    const newNormalizedUrls = newResults.map(result => normalizeUrl(result.URL));
    saveProcessedUrls(newNormalizedUrls);
  } else {
    console.log("No new results found after filtering.");
  }
}

main().catch(err => console.error("Unexpected error:", err));
