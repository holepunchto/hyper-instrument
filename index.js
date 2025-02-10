const path = require('path')
const DhtPromClient = require('dht-prom-client')
const HyperswarmStats = require('hyperswarm-stats')
const HypercoreStats = require('hypercore-stats')
const HyperDhtStats = require('hyperdht-stats')
const promClient = require('prom-client')

// Attempt to get the package version of the main module (commonJS only)
let PACKAGE_VERSION = null
try {
  const loc = path.join(require.main.path, 'package.json')
  const { version } = require(loc)
  PACKAGE_VERSION = version
} catch {} // could not extract version

function hyperInstrument ({
  swarm,
  corestore,
  dht,
  scraperPublicKey,
  scraperSecret,
  prometheusAlias,
  prometheusServiceName,
  moduleVersions = null,
  scraperDht = null, // If the metrics should be scraped over a different DHT than 'dht'
}) {
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
  scraperDht = scraperDht || dht

  promClient.collectDefaultMetrics()
  if (PACKAGE_VERSION) registerPackageVersion(PACKAGE_VERSION)

  registerModuleVersions(moduleVersions)

  if (swarm) {
    const swarmStats = new HyperswarmStats(swarm)
    swarmStats.registerPrometheusMetrics(promClient)
  } else {
    const dhtStats = new HyperDhtStats(dht)
    dhtStats.registerPrometheusMetrics(promClient)
  }

  if (corestore) {
    const hypercoreStats = HypercoreStats.fromCorestore(corestore)
    hypercoreStats.registerPrometheusMetrics(promClient)
  }

  const promRpcClient = new DhtPromClient(
    scraperDht,
    promClient,
    scraperPublicKey,
    prometheusAlias,
    scraperSecret,
    prometheusServiceName
  )

  return promRpcClient
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

module.exports = hyperInstrument
