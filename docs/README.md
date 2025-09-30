# Imagor Studio Documentation

This directory contains the Docusaurus-based documentation site for Imagor Studio, deployed at [docs.imagor.net](https://docs.imagor.net).

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

```bash
cd docs
npm install
```

### Start Development Server

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Test Production Build

```bash
npm run serve
```

This command serves the production build locally for testing.

## Deployment to Cloudflare Pages

The documentation site is automatically deployed to Cloudflare Pages via GitHub Actions when changes are pushed to the `main` branch.

### Setup Instructions

#### 1. Create Cloudflare Pages Project

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Pages**
3. Click **Create a project**
4. Connect your GitHub repository
5. Configure build settings:
   - **Project name**: `imagor-studio-docs`
   - **Production branch**: `main`
   - **Build command**: Leave empty (handled by GitHub Actions)
   - **Build output directory**: Leave empty (handled by GitHub Actions)

#### 2. Get Cloudflare API Credentials

1. Go to **My Profile** → **API Tokens**
2. Create a new API token with **Cloudflare Pages** permissions
3. Note down your **Account ID** (found in the Pages project settings)

#### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

#### 4. Configure Custom Domain

1. In Cloudflare Pages project settings, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter `docs.imagor.net`
4. Cloudflare will automatically configure DNS records

The DNS configuration will be:
- Type: `CNAME`
- Name: `docs`
- Target: `imagor-studio-docs.pages.dev` (or your Pages URL)
- Proxy status: Proxied

#### 5. Deploy

Push changes to the `main` branch:

```bash
git add .
git commit -m "Update documentation"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Build the documentation
2. Deploy to Cloudflare Pages
3. Make it available at docs.imagor.net

## Project Structure

```
docs/
├── docs/                          # Documentation markdown files
│   ├── intro.md                  # Introduction page
│   ├── getting-started/          # Getting started guides
│   ├── configuration/            # Configuration documentation
│   ├── deployment/               # Deployment guides
│   ├── architecture.md           # Architecture overview
│   └── ecosystem.md              # Ecosystem information
├── src/                          # React components
│   ├── css/                      # Custom CSS
│   └── pages/                    # Custom pages
├── static/                       # Static assets
│   └── img/                      # Images
├── docusaurus.config.ts          # Docusaurus configuration
├── sidebars.ts                   # Sidebar configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Writing Documentation

### Adding a New Page

1. Create a new markdown file in the appropriate directory under `docs/`
2. Add frontmatter at the top:

```markdown
---
sidebar_position: 1
---

# Page Title

Content here...
```

3. Update `sidebars.ts` if needed to include the new page in navigation

### Markdown Features

Docusaurus supports enhanced markdown features:

#### Admonitions

```markdown
:::tip
This is a tip
:::

:::warning
This is a warning
:::

:::danger
This is a danger notice
:::

:::info
This is an info box
:::
```

#### Code Blocks

````markdown
```bash
npm install
```

```typescript
const config: Config = {
  // ...
};
```
````

#### Tabs

```markdown
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="npm" label="npm">
    npm install
  </TabItem>
  <TabItem value="yarn" label="Yarn">
    yarn add
  </TabItem>
</Tabs>
```

## Troubleshooting

### Build Fails with Broken Links

Check for broken internal links in your markdown files. All links should use relative paths:

```markdown
[Configuration](./configuration/overview)  ✅
[Configuration](/docs/configuration)       ❌
```

### Port Already in Use

If port 3000 is already in use, specify a different port:

```bash
npm start -- --port 3001
```

### Node Version Issues

Ensure you're using Node.js 18 or higher:

```bash
node --version
```

## Resources

- [Docusaurus Documentation](https://docusaurus.io/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## License

Apache License 2.0 - See the main project LICENSE file for details.
