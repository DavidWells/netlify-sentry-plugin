/* Generates sentry releases */
const fs = require('fs')
const path = require('path')
const SentryCli = require('@sentry/cli')
const { promisify, inspect } = require('util')
const writeFile = promisify(fs.writeFile)
const deleteFile = promisify(fs.unlink)

const CWD = path.resolve(process.cwd())
const SENTRY_CONFIG_PATH = path.resolve(CWD, '.sentryclirc')

module.exports = {
  onPostBuild: async (pluginApi) => {
    /*
    // Uncomment this block to see all the values pluginApi has
    console.log('---------------------------------------------------')
    console.log('Netlify Build Plugin API values')
    console.log(inspect(pluginApi, { showHidden: false, depth: null }))
    console.log('---------------------------------------------------')
    /**/

    const { constants, inputs, utils } = pluginApi
    const { PUBLISH_DIR, IS_LOCAL } = constants

    const RUNNING_IN_NETLIFY = !IS_LOCAL

    /* Set the user input settings */
    const sentryOrg = process.env.SENTRY_ORG || inputs.sentryOrg
    const sentryProject = process.env.SENTRY_PROJECT || inputs.sentryProject
    const sentryAuthKey = process.env.SENTRY_AUTH_TOKEN || inputs.sentryAuthKey
    const sourceMapLocation = inputs.sourceMapLocation || PUBLISH_DIR
    const sourceMapPrefix = inputs.sourceMapPrefix

    /* If inside of remote Netlify CI, setup crendentials */
    if (RUNNING_IN_NETLIFY) {
      await createSentryConfig({ sentryOrg, sentryProject, sentryAuthKey })
    }

    /* Run sentry release */
    await sentryRelease({
      sentryAuthKey,
      sourceMapLocation,
      sourceMapPrefix
    })

    console.log()
    console.log('Sentry release successful!')
    console.log()

    if (RUNNING_IN_NETLIFY) {
      await deleteSentryConfig()
    }
  }
}

// https://github.com/tyschroed/part-placer/blob/d244bfa24eb633ba2c67349891cc9428104e3a49/scripts/sentry.js#L13
async function sentryRelease({ sentryAuthKey, sourceMapLocation }) {
  // default config file is read from ~/.sentryclirc
  if (!sentryAuthKey) {
    throw new Error('SentryCLI needs sentryAuthKey. Please set env variable SENTRY_AUTH_TOKEN')
  }

  const cli = new SentryCli()

  const generatedRelease = await cli.releases.proposeVersion()
  console.log('Generated release name', generatedRelease)

  const release = process.env.COMMIT_REF

  // const releaseVersion = await cli.releases.proposeVersion();
  console.log('Proposed version:\n', release)

  const options = {
    debug: false,
    include: ['./build/'],
    urlPrefix: '~',
    rewrite: true,
    ignore: ['node_modules']
  }
  // console.log('upload options:\n', options)

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
  // https://docs.sentry.io/cli/releases/#sentry-cli-commit-integration
  // await cli.releases.setCommits(release, {
  //   repo: 'repo',
  //   auto: true
  // })
  // https://docs.sentry.io/cli/releases/#finalizing-releases
  await cli.releases.finalize(release)

  // Set script in head? https://github.com/dcsil/klutch/blob/8de5b6c524f15c1f7bc039c31a73c905b9e56bb5/app/client/plugins/sentry-cordova/scripts/before_compile.js#L109-L113
}

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

function fileExists(s) {
  // eslint-disable-next-line
  return new Promise( r => fs.access(s, fs.F_OK, e => r(!e)))
}
