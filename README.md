**[View the Repository](https://www.github.com/thejessicafelts/job-seeker.git)**

# Google Custom Job Searcher

This Node.js application uses the [Google Custom Search API](https://developers.google.com/custom-search/v1/overview) to retrieve search results based on specified criteria such as keywords, domains (including subdomains), locations, and publication date. The script filters out results containing undesirable phrases and continues paginating until it accumulates the number of unique *new* results defined by your configuration. These unique results are then appended to a CSV file, and their URLs are stored in a separate file so that duplicates are skipped in future searches.

> **Note:** The API credentials and sensitive configuration details are stored in a `config.json` file, which is excluded from version control via `.gitignore` to protect your credentials. Your search results, stored in the `google_search_results.csv` file, and your list of processed URLs, stored in the `processed_urls.txt` file, are also excluded from version control via `.gitignore` to protect the privacy of your searches.

## Features

- **Advanced Query Building:**  
  Combines two sets of search terms:
  - **intitleKeywords:** Keywords that must appear in the page title (using the `intitle:` operator).
  - **keywords:** General search terms that can appear anywhere in the page.
- **Domain Filtering:**  
  Uses the `site:` operator to restrict results to specified domains (and all of their subdomains).
- **Location and Date Filtering:**  
  Limits search results based on location criteria and (optionally) a minimum publication date.
- **Avoid Keywords:**  
  Excludes results containing designated phrases (e.g., "government clearance").
- **Dynamic Pagination:**  
  Continues fetching additional pages beyond duplicates until the number of **new unique results** reaches the configured `maxResults` value.
- **Duplicate Tracking:**  
  Stores processed URLs in a file (`processed_urls.txt`) to avoid reprocessing duplicates on subsequent searches.
- **CSV Output:**  
  Appends new unique results (Title and URL) to `google_search_results.csv` instead of overwriting them.
- **User Configurable:**  
  All search settings are managed through a single configuration file.

## Prerequisites

- [Node.js](https://nodejs.org) (version 10 or later recommended)
- A Google Custom Search API key and a Custom Search Engine (CSE) ID

## Setup

### 1. Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/thejessicafelts/job-seeker.git
cd job-seeker
```

### 2. Install Dependencies

Install the required Node.js dependencies in your project directory:

```bash
npm install node-fetch@2
```

### 3. Create the Configuration File

Create a file named `config.json` in the root of your repository. This file should contain your search criteria and API credentials. A sample configuration file is provided in the repository as `sampleConfig.json`; you should rename it to `config.json` and update the values as needed. A sample file for processed URLs is also provided in the repository as `sampleProcessedUrls.txt`; you should rename it to `processed_urls.txt`.

Below is an example configuration:

```
{
    "intitleKeywords": ["frontend developer"],
    "keywords": ["experienced", "senior"],
    "avoidKeywords": ["government clearance"],
    "minDate": ["2025-01-01"],
    "domains": ["workday.com", "icims.com"],
    "locations": ["Remote", "USA"],
    "maxResults": 10,
    "apiKey": "YOUR_API_KEY",
    "cx": "YOUR_CSE_ID"
}
```

**IMPORTANT:**
- **DO NOT commit** `config.json` **to your repository.** The `.gitignore` file in this repository already excludes `config.json` to protect your sensitive information.
- Replace `"YOUR_API_KEY"` and `"YOUR_CSE_ID` with your actual credientials (see next section for instructions on how to set these up).

### 4. Set Up Your Google Custom Search API and CSE Keys
 
**Getting Your API Key:**

1. Visit the [Google Developers Console](https://console.developers.google.com/)
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Library**.
4. Search for **Custom Search API** and enable it.
5. Go to **APIs & Services > Credentials** and click **Create Credentials > API Key**.
6. Copy your new API key and paste it into the `config.json` file under the `"apiKey"` field.

**Creating a Custom Search Engine (CSE) and Obtaining the CSE ID:**

1. Go to the [Google Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all).
2. Click on **"Add"** or **"New Search Engine"**.
3. In the **"Sites to search"** select **"Search the entire web"**, since this script allows you to provide your own list of URLs.
4. Provide a name for your search engine and click **"Create"**.
5. Once created, go to the **Control Panel** of your new search engine.
6. Look for the **"Search engine ID"** (also known as the `cx` parameter).
7. Copy the CSE ID and paste it into the `config.json` file under the `"cx"` field.

## Usage

Once the configuration is complete, run the script with:
```bash
node googleSearch.js
```

The script will:

- Build the search query based on your critera.
- Use the Google Custom Search API to fetch results, skipping duplicates, until `"maxResults"` new unique results are accumulated.
- Append new unique results to the `google_search_results.csv` file.
- Store the URLs of processed pages in `processed_urls.txt` so that subsequent runs do not process duplicates.

## Customization

Feel free to adjust the parameters in `config.json` to meet your specific search criteria. The main script (`googleSearch.js`) is modular and uses clearly defined functions, making it straightforward to modify the query logic or output processing as needed.