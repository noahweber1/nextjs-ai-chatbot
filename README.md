<h1 align="center">AI Store Advisor</h1>

<p align="center">
  An Open-Source AI Chatbot Platform Built for E-commerce Store Advisory
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#store-integration"><strong>Store Integration</strong></a> ·
  <a href="#setup-guide"><strong>Setup Guide</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- Intelligent Store Advisory
  - Contextual understanding of your store's products and services
  - Personalized customer interactions based on store context
  - Dynamic product recommendations
  - Currently supporting Bear Mattresses and Wingman Headphones stores

- Advanced Chat Interface
  - Real-time responses with streaming capabilities
  - File attachment support for product images
  - Rich message formatting and UI components
  - Conversation history tracking

- Technical Foundation
  - Built with [Next.js](https://nextjs.org) App Router
  - React Server Components (RSCs) for optimal performance
  - [AI SDK](https://sdk.vercel.ai/docs) integration for LLM capabilities
  - [shadcn/ui](https://ui.shadcn.com) components with [Tailwind CSS](https://tailwindcss.com)

- Data Management
  - PostgreSQL database for chat history and user data
  - Blob storage for efficient file handling
  - Secure authentication system

## Store Integration

This platform is designed to integrate with e-commerce stores, providing AI-powered customer service and product advisory. Current implementations include:

- Bear Mattresses: Complete mattress product line advisory
- Wingman Headphones: Audio equipment consultation and recommendations

Adding new stores is straightforward through our store context system.

## Setup Guide

To set up your own instance of the AI Store Advisor, you'll need:

1. API keys for your chosen LLM provider
2. Database configuration for storing chat history
3. Store context files for your product catalog
4. Authentication credentials

See the [`.env.example`](.env.example) file for required environment variables.

## Running locally

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment variables in a `.env` file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
pnpm dev
```

Your AI Store Advisor should now be running on [localhost:3000](http://localhost:3000/).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.