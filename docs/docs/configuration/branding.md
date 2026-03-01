# Branding Configuration

Imagor Studio supports customising the application title and brand link shown in the navigation bar, browser tab, login page, and error pages. This feature requires a valid license.

## Configuration Options

| Option | Flag | Environment Variable | Registry Key | Default |
|--------|------|---------------------|--------------|---------|
| App Title | `--app-title` | `APP_TITLE` | `config.app_title` | `Imagor Studio` |
| App URL | `--app-url` | `APP_URL` | `config.app_url` | `https://imagor.net` |

## License Requirement

Branding customisation is only applied when the instance has an active license. On unlicensed instances the title and link always fall back to the defaults (`Imagor Studio` / `https://imagor.net`), even if registry values are saved.

The branding settings are visible in the admin panel but remain disabled until a valid license is activated. **[Get a license →](https://imagor.net/buy/early-bird/)**

## Where Branding Is Applied

- **Navigation bar** — image editor header
- **Login page** — top-left brand link
- **Admin setup page** — top-left brand link
- **Error page** — top-left brand link
- **Browser tab title** — `Page · Home | Brand Title`

## Setting via Admin Panel

1. Activate a license under **Admin → License**
2. Go to **Admin → System Settings**
3. Fill in **Brand Title** and **Brand URL**
4. Click **Update Settings**

Changes take effect immediately without a server restart.

## Setting via Environment Variable

```bash
APP_TITLE=Acme Images
APP_URL=https://acme.example.com
```

Environment variable values take precedence over the admin panel and are shown with an "overridden by config" indicator in the UI.

## Setting via CLI Flag

```bash
imagor-studio --app-title "Acme Images" --app-url "https://acme.example.com"
```

See [Configuration Overview](./overview) for a full description of the priority order (CLI → env → `.env` → registry).
