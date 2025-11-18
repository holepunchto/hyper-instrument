const { isBare, isPear } = require('which-runtime')
if (isBare) require('bare-process/global')

const process = require('process')
const path = require('path')
const HyperswarmStats = require('hyperswarm-stats')
const HypercoreStats = require('hypercore-stats')
const HyperDhtStats = require('hyperdht-stats')
const ReadyResource = require('ready-resource')
const DhtPromClient = require('dht-prom-client')
// the following line uses bare-module to remap Node.js imports to their bare equivalents
const promClient = require('prom-client', { with: { imports: './imports.json' } })

// Attempt to get the package version of the main module (commonJS only)
let PACKAGE_VERSION = null
try {
  let loc = path.join(require.main.path, 'package.json')
  if (isPear) loc = global.Pear.app.key ? `${global.Pear.app.applink}/${loc}` : `pear://dev/${loc}`
  const { version } = require(loc)
  PACKAGE_VERSION = version
} catch {} // could not extract version

class HyperInstrumentation extends ReadyResource {
  constructor({
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
    registerProcessId()

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

    this.dhtPromClient = new DhtPromClient(
      dht,
      promClient,
      scraperPublicKey,
      prometheusAlias,
      scraperSecret,
      prometheusServiceName
    )
  }

  get promClient() {
    return this.dhtPromClient.promClient
  }

  async _open() {
    await this.dhtPromClient.ready()
  }

  async _close() {
    await this.dhtPromClient.close()
  }

  registerLogger(logger = console) {
    this.dhtPromClient.registerLogger(logger)
    if (this.hypercoreStats) {
      this.hypercoreStats.on('internal-error', (e) => {
        console.warn(`Hypercore stats internal error: ${e.stack}`)
      })
    }
  }
}

function registerPackageVersion(version) {
  // Gauges expect a number, so we set the version as label instead
  return new promClient.Gauge({
    name: 'package_version',
    help: 'Package version in config.json',
    labelNames: ['version'],
    collect() {
      this.labels(version).set(1)
    }
  })
}

function registerModuleVersions(names) {
  for (const name of names) {
    const normName = name.replace('@', '').replaceAll('/', '_').replaceAll('-', '_')

    try {
      const v = require(`${name}/package.json`).version
      new promClient.Gauge({
        // eslint-disable-line no-new
        name: `${normName}_version`,
        help: `${name} version`,
        labelNames: [`${normName}_version`],
        collect() {
          this.labels(v).set(1)
        }
      })
    } catch {} // dependency not found or version can't be extracted
  }
}

function registerProcessId() {
  return new promClient.Gauge({
    name: 'process_pid',
    help: 'Process id on the operating system',
    collect() {
      this.set(process.pid)
    }
  })
}

module.exports = HyperInstrumentation
