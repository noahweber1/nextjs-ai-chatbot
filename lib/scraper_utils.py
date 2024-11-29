import requests
from bs4 import BeautifulSoup
import json
import os
import time
from datetime import datetime
from typing import Dict, Any

# Types and Interfaces
class ScraperResult:
    def __init__(self, content: str, url: str, timestamp: str, page_count: int):
        self.content = content
        self.metadata = {
            "url": url,
            "timestamp": timestamp,
            "pageCount": page_count,
        }

# Utility Function for Scraping
def scrape_url(url: str, max_depth: int = 2) -> ScraperResult:
    try:
        print(f"Starting to scrape {url}...")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Process content - You can customize based on your needs
        content = soup.get_text(separator="\n", strip=True)
        page_count = 1  # Adjust if scraping multiple pages

        return ScraperResult(
            content=content,
            url=url,
            timestamp=datetime.utcnow().isoformat(),
            page_count=page_count
        )
    except requests.RequestException as error:
        print(f"Error during scraping: {error}")
        raise Exception(f"Failed to scrape URL {url}: {str(error)}")

# Retry Logic
def scrape_with_retry(url: str, max_retries: int = 3) -> ScraperResult:
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Attempt {attempt} of {max_retries} to scrape {url}")
            result = scrape_url(url)
            print(f"Successfully scraped {url} on attempt {attempt}")
            return result
        except Exception as error:
            if attempt == max_retries:
                raise error
            print(f"Attempt {attempt} failed, retrying in {attempt} seconds...")
            time.sleep(attempt)  # Exponential backoff

# Save Results to File
def save_results(result: ScraperResult):
    output_dir = os.path.join(os.getcwd(), "scrape-results")

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Sanitize URL to create a valid filename
    sanitized_filename = result.metadata["url"].replace("https://", "").replace("http://", "").replace("/", "_").replace(":", "_")
    filepath = os.path.join(output_dir, f"{sanitized_filename}.json")

    with open(filepath, "w", encoding="utf-8") as file:
        json.dump({
            "content": result.content,
            "metadata": result.metadata
        }, file, indent=2)

    print(f"Results saved to {filepath}")

# Main Execution
def main():
    # URLs to scrape - Add your target URLs here
    urls_to_scrape = [
        "https://wingman-store.com/collections/headphones",
        # Add more URLs as needed
    ]

    print("Starting scraping process...")

    for url in urls_to_scrape:
        try:
            result = scrape_with_retry(url)
            
            # Log results
            print("\nScraping Results:")
            print("URL:", result.metadata["url"])
            print("Timestamp:", result.metadata["timestamp"])
            print("Pages Scraped:", result.metadata["pageCount"])
            print("Content Length:", len(result.content))

            # Save results
            save_results(result)

        except Exception as error:
            print(f"Failed to scrape {url}: {error}")

    print("\nScraping process completed!")

# Execute the script
if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Script failed:", error)
