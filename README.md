# Netlify sentry plugin

Automatically generate a sentry release for your site after it finishes building in Netlify.

## Installation

To install, add the following lines to your `netlify.toml` file:

```toml
[[plugins]]
  package = "netlify-plugin-sentry"
```

Note: The `[[plugins]]` line is required for each plugin, even if you have other plugins in your `netlify.toml` file already.

## Configuration

Configure the plugin with your sentry settings

```toml
[[plugins]]
  package = "netlify-plugin-sentry"

  [plugins.inputs]
    sentryOrg = ""
    sentryProject = ""
    sentryAuthKey = ""
```
