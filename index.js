const path = require('path')
const DhtPromClient = require('dht-prom-client')
const HyperswarmStats = require('hyperswarm-stats')
const HypercoreStats = require('hypercore-stats')
const HyperDhtStats = require('hyperdht-stats')
const promClient = require('prom-client')
const ReadyResource = require('ready-resource')

// Attempt to get the package version of the main module (commonJS only)
let PACKAGE_VERSION = null
try {
  const loc = path.join(require.main.path, 'package.json')
  const { version } = require(loc)
  PACKAGE_VERSION = version
} catch {} // could not extract version

class HyperInstrumentation extends ReadyResource {
  constructor ({
    swarm,
    corestore,
    dht,
    scraperPublicKey,
    scraperSecret,
    prometheusAlias,
    prometheusServiceName,
    moduleVersions = null
  }) {
    super()

    if (swarm && dht) throw new Error('Exactly 1 of dht or swarm should be specified')
    if (swarm) dht = swarm.dht
    if (!moduleVersions) {
      moduleVersions = [
        'udx-native',
        'dht-rpc',
        'hyperdht',
        'hyperswarm',
        'hypercore',
        'corestore',
        'hyperbee',
        'autobase',
        'hyperdb'
      ]
    }

    promClient.collectDefaultMetrics()
    if (PACKAGE_VERSION) registerPackageVersion(PACKAGE_VERSION)

    registerModuleVersions(moduleVersions)

    this.swarmStats = null
    this.dhtStats = null
    if (swarm) {
      this.swarmStats = new HyperswarmStats(swarm)
      this.swarmStats.registerPrometheusMetrics(promClient)
    } else {
      this.dhtStats = new HyperDhtStats(dht)
      this.dhtStats.registerPrometheusMetrics(promClient)
    }

    this.hypercoreStats = null
    if (corestore) {
      this.hypercoreStats = HypercoreStats.fromCorestore(corestore)
      this.hypercoreStats.registerPrometheusMetrics(promClient)
    }

    this.promRpcClient = new DhtPromClient(
      dht,
      promClient,
      scraperPublicKey,
      prometheusAlias,
      scraperSecret,
      prometheusServiceName
    )
  }

  async _open () {
    await this.promRpcClient.ready()
  }

  async _close () {
    await this.promRpcClient.close()
  }

  registerLogger (logger = console) {
    this.dhtPromClient.registerLogger(logger)
    if (this.hypercoreStats) {
      this.hypercoreStats.on('internal-error', (e) => {
        console.warn(`Hypercore stats internal error: ${e.stack}`)
      })
    }
  }
}

function registerPackageVersion (version) {
  // Gauges expect a number, so we set the version as label instead
  return new promClient.Gauge({
    name: 'package_version',
    help: 'Package version in config.json',
    labelNames: ['version'],
    collect () {
      this.labels(
        version
      ).set(1)
    }
  })
}

function registerModuleVersions (names) {
  for (const name of names) {
    const normName = name.replace('-', '_')

    try {
      const v = require(`${name}/package.json`).version
      new promClient.Gauge({ // eslint-disable-line no-new
        name: `${normName}_version`,
        help: `${name} version`,
        labelNames: [`${normName}_version`],
        collect () {
          this.labels(v).set(1)
        }
      })
    } catch { } // dependency not found or version can't be extracted
  }
}

module.exports = HyperInstrumentation
