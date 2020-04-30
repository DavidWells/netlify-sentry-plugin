/* Generates sentry releases */
const fs = require('fs')
const path = require('path')
const SentryCli = require('@sentry/cli')
const { promisify, inspect } = require('util')
const writeFile = promisify(fs.writeFile)
const deleteFile = promisify(fs.unlink)

const CWD = path.resolve(process.cwd())
const SENTRY_CONFIG_PATH = path.resolve(CWD, '.sentryclirc')
// https://github.com/tyschroed/part-placer/blob/d244bfa24eb633ba2c67349891cc9428104e3a49/scripts/sentry.js#L13
async function sentryRelease({ sentryAuthKey, git }) {
  // default config file is read from ~/.sentryclirc
  if (!sentryAuthKey) {
    throw new Error('SentryCLI needs sentryAuthKey. Please set env variable SENTRY_AUTH_TOKEN')
  }

  const cli = new SentryCli()

  const generatedRelease = await cli.releases.proposeVersion()
  console.log('generatedRelease', generatedRelease)

  const release = git.sha

  // const releaseVersion = await cli.releases.proposeVersion();
  console.log('Proposed version:\n', release)

  const options = {
    debug: false,
    include: ['./build/'],
    urlPrefix: '~',
    rewrite: true,
    ignore: ['node_modules']
  }

  console.log('upload options:\n', options)

  // await cli.execute(['releases', 'delete', version, 'A']);

  // https://docs.sentry.io/cli/releases/#creating-releases
  await cli.releases.new(release)
  // https://docs.sentry.io/cli/releases/#managing-release-artifacts
  await cli.releases.uploadSourceMaps(release, options)
  /* create react app
  await cli.releases.uploadSourceMaps(release, {
    include: ['build/static/js'],
    urlPrefix: '~/static/js',
    rewrite: false,
  });
   */
  // https://github.com/tffe-team/rKit/blob/9303742f285bc7112afec1bc9b5d68ba0dc22ec1/lib/commands/sync.js#L166-L181
  // https://docs.sentry.io/cli/releases/#sentry-cli-commit-integration
  await cli.releases.setCommits(release, { auto: true })
  // https://docs.sentry.io/cli/releases/#finalizing-releases
  await cli.releases.finalize(release)

  // Set script in head? https://github.com/dcsil/klutch/blob/8de5b6c524f15c1f7bc039c31a73c905b9e56bb5/app/client/plugins/sentry-cordova/scripts/before_compile.js#L109-L113
}

sentryRelease({})

async function createSentryConfig({ sentryOrg, sentryProject, sentryAuthKey }) {
  const sentryConfigFile = `
  [auth]
  token=${sentryAuthKey}
  [defaults]
  project=${sentryProject}
  org=${sentryOrg}
  `

  await writeFile(SENTRY_CONFIG_PATH, sentryConfigFile, { flag: 'w+' })
}

async function deleteSentryConfig() {
  await deleteFile(SENTRY_CONFIG_PATH)
}

module.exports = {
  onPostBuild: async (pluginApi) => {
    const { constants, inputs, utils } = pluginApi

    console.log(inspect(pluginApi, { showHidden: false, depth: null }))

    const sentryOrg = inputs.sentryAuthKey || process.env.SENTRY_ORG
    const sentryProject = inputs.sentryProject || process.env.SENTRY_PROJECT
    const sentryAuthKey = inputs.sentryAuthKey || process.env.SENTRY_AUTH_TOKEN

    // await sentryRelease({ sentryAuthKey, sentryOrg, sentryProject })
  }
}


function fileExists(s) {
  // eslint-disable-next-line
  return new Promise( r => fs.access(s, fs.F_OK, e => r(!e)))
}

// https://github.com/netlify/code-examples/blob/master/function_examples/sentry_releases/cmd/deploy-succeeded/main.go
// https://github.com/getsentry/sentry-webpack-plugin/blob/master/src/index.js#L329-L331
// https://github.com/dimigoin/dimigoin-front/blob/bbc527939f90cc1c355b9e4a557dc4967285358d/.circleci/deploy.js#L8
