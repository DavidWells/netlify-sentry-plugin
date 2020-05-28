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
    const { constants, inputs, utils } = pluginApi
    const { PUBLISH_DIR, IS_LOCAL } = constants

    const RUNNING_IN_NETLIFY = !IS_LOCAL

    /* Set the user input settings */
    const sentryOrg = process.env.SENTRY_ORG || inputs.sentryOrg
    const sentryProject = process.env.SENTRY_PROJECT || inputs.sentryProject
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || inputs.sentryAuthToken
    const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.CONTEXT
    const sourceMapPath = inputs.sourceMapPath || PUBLISH_DIR
    const sourceMapUrlPrefix = inputs.sourceMapUrlPrefix || DEFAULT_SOURCE_MAP_URL_PREFIX
    const skipSetCommits = inputs.skipSetCommits || false
    const skipSourceMaps = inputs.skipSourceMaps || false

    if (RUNNING_IN_NETLIFY) {
      if (!sentryAuthToken) {
        return utils.build.failBuild('SentryCLI needs an authentication token. Please set env variable SENTRY_AUTH_TOKEN')
      } else if (!sentryOrg) {
        return utils.build.failBuild('SentryCLI needs the organization slug. Please set env variable SENTRY_ORG or set sentryOrg plugin input')
      } else if (!sentryProject) {
        return utils.build.failBuild('SentryCLI needs the project slug. Please set env variable SENTRY_ORG or set sentryProject plugin input')
      }
      
      await createSentryConfig({ sentryOrg, sentryProject, sentryAuthToken })

      /* Notify Sentry of release being deployed on Netlify */
      await sentryRelease({
        sentryAuthToken,
        sentryEnvironment,
        sourceMapPath,
        sourceMapUrlPrefix,
        skipSetCommits,
        skipSourceMaps
      })

      console.log()
      console.log('Successfully notified Sentry of deployment!')
      console.log()

      await deleteSentryConfig()
    }
  }
}

async function sentryRelease({ sentryAuthToken, sentryEnvironment, sourceMapPath, sourceMapUrlPrefix, skipSetCommits, skipSourceMaps }) {
  // default config file is read from ~/.sentryclirc
  const release = process.env.COMMIT_REF
  const cli = new SentryCli()

  console.log('Creating new release with version: ', release)

  // https://docs.sentry.io/cli/releases/#creating-releases
  await cli.releases.new(release)

  // https://docs.sentry.io/cli/releases/#managing-release-artifacts
  if (!skipSourceMaps) {
    await cli.releases.uploadSourceMaps(release, {
      debug: false,
      include: [sourceMapPath],
      urlPrefix: sourceMapUrlPrefix,
      rewrite: true,
      ignore: ['node_modules']
    })
  }

  // https://docs.sentry.io/cli/releases/#sentry-cli-commit-integration
  if (!skipSetCommits) {
    const repository = process.env.REPOSITORY_URL.split('/').slice(-2).join('/')
    try {
      await cli.releases.setCommits(release, {
        repo: repository,
        commit: process.env.COMMIT_REF
      })
    } catch (error) {
      console.log(error)
      return utils.build.failBuild(
        `SentryCLI failed to set commits. You likely need to set up a repository or repository integration. 
         Read more: https://docs.sentry.io/workflow/releases/?platform=python#install-repo-integration`
      )
    }
  }
  // https://docs.sentry.io/cli/releases/#finalizing-releases
  await cli.releases.finalize(release)

  // https://docs.sentry.io/cli/releases/#creating-deploys
  await cli.releases.execute(['releases', 'deploys', release, 'new', '-e', sentryEnvironment])
}

async function createSentryConfig({ sentryOrg, sentryProject, sentryAuthToken }) {
  const sentryConfigFile = `
  [auth]
  token=${sentryAuthToken}
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
