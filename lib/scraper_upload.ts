import { config } from 'dotenv';
import { put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Function to upload a file to Vercel Blob
async function uploadToBlob(filePath: string, blobName: string): Promise<string> {
  try {
    // Read file content
    const absolutePath = path.resolve(filePath);
    const fileContent = await fs.readFile(absolutePath, 'utf-8');

    // Upload file to Vercel Blob
    console.log(`Uploading file "${blobName}" to Vercel Blob...`);
    const { url } = await put(blobName, fileContent, {
      access: 'public', // Make the file publicly accessible
    });

    console.log(`File uploaded successfully!`);
    console.log(`Blob URL: ${url}`);
    return url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw error;
  }
}

// Main execution function
(async function main() {
  const filePath = '/workspaces/nextjs-ai-chatbot/scrape-results/scrape-1732626044.json'; // Path to the file to upload
  const blobName = '/workspaces/nextjs-ai-chatbot/scrape-results/scrape-1732626044.json'; // Name to use in Blob storage

  try {
    const blobUrl = await uploadToBlob(filePath, blobName);
    console.log('Upload complete:', blobUrl);
  } catch (error) {
    console.error('Failed to upload file:', error);
  }
})();
