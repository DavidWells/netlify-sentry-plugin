# Netlify Sentry plugin &nbsp;&nbsp;&nbsp;<a href="https://app.netlify.com/start/deploy?repository=https://github.com/netlify/netlify-sentry-plugin"><img src="https://www.netlify.com/img/deploy/button.svg"></a>

Automatically generate a [Sentry](https://sentry.io/) release for your site after it finishes building in Netlify.

Make sure build plugins are enabled on your site to see the plugin run.

## Installation

To install, add the following lines to your `netlify.toml` file:

```toml
[[plugins]]
  package = "netlify-plugin-sentry"
```

Note: The `[[plugins]]` line is required for each plugin, even if you have other plugins in your `netlify.toml` file already.

## Configuration

Configure the plugin with your sentry settings.

```toml
[[plugins]]
  package = "netlify-plugin-sentry"

  [plugins.inputs]
    sentryOrg = ""
    sentryProject = ""
    sentryAuthKey = ""
```

You can also use [site environment variables](https://docs.netlify.com/configure-builds/environment-variables/) to configure these values.

- `process.env.SENTRY_ORG` - Your Sentry organization name
- `process.env.SENTRY_PROJECT` - Your Sentry project name
- `process.env.SENTRY_AUTH_TOKEN` - Auth token for Sentry
