# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)
- [Algolia Search](https://www.algolia.com) - For news search functionality

## Algolia Search Integration

This project includes Algolia search integration for the noticias (news) system. When you create, update, or delete news articles, they are automatically indexed to Algolia search.

### Features:
- **Automatic Indexing**: News articles are automatically indexed when created, updated, or deleted
- **Full Content Search**: Fetches and indexes the complete markdown content from article links
- **Intelligent Content Parsing**: Removes markdown syntax for cleaner search indexing
- **Manual Sync**: Use the "Sincronizar Algolia" button in the admin interface to manually sync all articles
- **Batch Processing**: Processes articles in batches for optimal performance during sync
- **URL Pattern**: All indexed articles include the URL pattern `https://ifmsabrazil.org/arquivo/[id]`
- **Search Fields**: Title, summary, author, date, and full article content are indexed for comprehensive search

### Required Environment Variables:
```env
ALGOLIA_APPLICATION_ID="6RE19NWP78"
ALGOLIA_API_KEY="7ef269a35a7a8f7c5ba6d6316283ac42"
```

### Setup:
1. Add the environment variables to your `.env.local` file
2. Navigate to the Noticias admin page
3. Click "Sincronizar Algolia" to perform the initial sync
4. The system will automatically maintain the search index as you manage articles

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
