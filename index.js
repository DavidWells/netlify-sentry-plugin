/* 
  The Sentry Netlify build plugin:
    - Notifies Sentry of new releases being deployed.
    - Uploads source maps to Sentry.
    - Sends Sentry the commit SHA of HEAD to enable commit features.
*/

const fs = require('fs')
const path = require('path')
const SentryCli = require('@sentry/cli')
const { promisify, inspect } = require('util')

const writeFile = promisify(fs.writeFile)
const deleteFile = promisify(fs.unlink)

const CWD = path.resolve(process.cwd())
const SENTRY_CONFIG_PATH = path.resolve(CWD, '.sentryclirc')
const DEFAULT_SOURCE_MAP_URL_PREFIX = "~/"

module.exports = {
  onPostBuild: async (pluginApi) => {

    // Uncomment this block to see all the values pluginApi has
    console.log('---------------------------------------------------')
    console.log('Netlify Build Plugin API values')
    console.log(inspect(pluginApi, { showHidden: false, depth: null }))
    console.log('---------------------------------------------------')

    const { constants, inputs, utils } = pluginApi
    const { PUBLISH_DIR, IS_LOCAL } = constants

    const RUNNING_IN_NETLIFY = !IS_LOCAL

    /* Set the user input settings */
    const sentryOrg = process.env.SENTRY_ORG || inputs.sentryOrg
    const sentryProject = process.env.SENTRY_PROJECT || inputs.sentryProject
    const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || inputs.sentryEnvironment
    const sentryAuthenticationToken = process.env.SENTRY_AUTH_TOKEN || inputs.sentryAuthenticationToken
    const sourceMapPath = inputs.sourceMapPath || PUBLISH_DIR
    const sourceMapUrlPrefix = inputs.sourceMapUrlPrefix || DEFAULT_SOURCE_MAP_URL_PREFIX

    /* If inside of remote Netlify CI, setup crendentials */
    if (RUNNING_IN_NETLIFY) {
      await createSentryConfig({ sentryOrg, sentryProject, sentryAuthenticationToken })
    }

    /* Notify Sentry of release being deployed on Netlify */
    await sentryRelease({
      sentryAuthenticationToken,
      sentryEnvironment,
      sourceMapPath,
      sourceMapUrlPrefix
    })

    console.log()
    console.log('Successfully notified Sentry of deployment!')
    console.log()

    if (RUNNING_IN_NETLIFY) {
      await deleteSentryConfig()
    }
  }
}

async function sentryRelease({ sentryAuthenticationToken, sentryEnvironment, sourceMapPath, sourceMapUrlPrefix }) {
  // default config file is read from ~/.sentryclirc
  if (!sentryAuthenticationToken) {
    throw new Error('SentryCLI needs an authentication token. Please set env variable SENTRY_AUTH_TOKEN')
  }

  const release = process.env.COMMIT_REF
  const cli = new SentryCli()

  console.log('Creating new release with version: ', release)

  // https://docs.sentry.io/cli/releases/#creating-releases
  await cli.releases.new(release)

  // https://docs.sentry.io/cli/releases/#managing-release-artifacts
  await cli.releases.uploadSourceMaps(release, {
    debug: false,
    include: [sourceMapPath],
    urlPrefix: sourceMapUrlPrefix,
    rewrite: true,
    ignore: ['node_modules']
  })

  // https://docs.sentry.io/cli/releases/#sentry-cli-commit-integration
  await cli.releases.setCommits(release, {
    auto: true
  })
  // https://docs.sentry.io/cli/releases/#finalizing-releases
  await cli.releases.finalize(release)

  // https://docs.sentry.io/cli/releases/#creating-deploys
  await cli.releases.execute(['releases', 'deploys', release, 'new', '-e', sentryEnvironment])
}

async function createSentryConfig({ sentryOrg, sentryProject, sentryAuthenticationToken }) {
  const sentryConfigFile = `
  [auth]
  token=${sentryAuthenticationToken}
  [defaults]
  project=${sentryProject}
  org=${sentryOrg}
  `
  await writeFile(SENTRY_CONFIG_PATH, sentryConfigFile, { flag: 'w+' })
}

async function deleteSentryConfig() {
  await deleteFile(SENTRY_CONFIG_PATH)
}

function fileExists(s) {
  // eslint-disable-next-line
  return new Promise( r => fs.access(s, fs.F_OK, e => r(!e)))
}
