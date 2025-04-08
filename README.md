**[View the Repository](https://www.github.com/thejessicafelts/job-seeker.git)**

# Google Custom Job Searcher

This Node.js application uses the [Google Custom Search API](https://developers.google.com/custom-search/v1/overview) to retrieve search results based on specified keywords, domains (including subdomains), locations, and date criteria. The results are filtered (by avoid keywords, minimum publication date, etc.), then output to the console and saved to a CSV file for review.

> **Note:** The API credentials and sensitive configuration details are stored in a `config.json` file. This file is excluded from version control via `.gitignore` to protect your credentials.

## Features

- **Advanced Query Building:** Combines multiple criteria including two sets of keywords:
  - **intitleKeywords:** Keywords that must appear in the page title.
  - **keywords:** General search terms that can appear anywhere in the page.
- **Domain Filtering:** Uses the `site:` operator to restrict results to specified domains (including all subdomains).
- **Location and Date Filtering:** Limits search results to pages matching provided location terms and (optionally) those published after a given date.
- **Avoid Keywords:** Excludes results containing designated phrases (e.g., "government clearance").
- **Pagination:** Fetches multiple pages of results up to a user-defined maximum.
- **CSV Output:** Saves the title and URL of each result into a CSV file.
- **User Configurable:** All search settings are managed through a single configuration file.

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

Create a file named `config.json` in the root of your repository. This file should contain your search criteria and API credentials. A sample configuration file is provided in the repository as `sampleConfig.json`; you can rename it to `config.json` and update the values as needed.

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
- Call the Google Custom Search API and paginate through the results up to the limit defined in `"maxResults"`.
- Filter the results based on avoid keywords and minimum publication date.
- Output the title and URL of each result to the console and write them to `google_search_results.csv`.

## Customization

Feel free to adjust the parameters in `config.json` to meet your specific search criteria. The main script (`googleSearch.js`) is modular and uses clearly defined functions, making it straightforward to modify the query logic or output processing as needed.