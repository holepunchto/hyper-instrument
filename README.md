# Hyper Instrument

Instrument services in the Hypercore ecosystem.

Supports the metrics of
- [hypercore-stats](https://github.com/holepunchto/hypercore-stats)
- [hyperswarm-stats](https://github.com/holepunchto/hyperswarm-stats)
- [hyperdht-stats](https://github.com/holepunchto/hyperdht-stats)

The service registers itself with a [DHT Prometheus](https://gitlab.com/dcent-tech/dht-prometheus) instance, which scrapes the metrics at regular intervals.

A [Grafana dashboard](https://grafana.com/grafana/dashboards/22313-hypercore-hyperswarm/) visualising all metrics is available ([source](https://github.com/holepunchto/Grafana-hypercore-stats)).

## Install

```
npm i hyper-instrument
```

## Versions

- V1.x.x works for Hypercore 10.x and Corestore 6.x. It has a different API, so make sure to look at the V1 README.
- V2.x.x works for Hypercore v11.x.x and Corestore v7.x.x

## Usage

```
const HyperInstrument = require('hyper-instrument')
const Hyperdht = require('hyperdht')

const scraperPublicKey = // Public key of the metrics scraper
const scraperSecret = // Secret of the metrics scraper
const prometheusAlias = // unique alias identifying this instance
const prometheusServiceName = // the name of the service

const dht = new Hyperdht()

const instrumentation = new HyperInstrument({
  dht,
  scraperPublicKey,
  scraperSecret,
  prometheusAlias,
  prometheusServiceName
})

// You can add additional metrics
new dhtPromClient.promClient.Gauge({
  name: 'my_custom_metric',
  help: 'my custom metric help',
  collect () {
    return 1 // dummy metric
  }
})

// start the scraping
await instrumentation.ready()
```

## API

#### `const instrumentation = new HyperInstrument(params)`

Set up instrumentation.

Sets up a [DHT-Prom client](https://gitlab.com/dcent-tech/dht-prom-client) instance.

It is possible to add additional metrics by adding them to `instrumentation.dhtPromClient.promClient`, which is a [Prom-client](https://github.com/siimon/prom-client) instance.

`params` must include:
- `scraperPublicKey`: public key of the DHT-Prometheus scraper (hex, z32 or buffer)
- `scraperSecret`: secret of the DHT-Prometheus scraper (hex, z32 or buffer)
- `prometheusAlias`: string uniquely identifying this instance to the scraper
- `prometheusServiceName`: string containing the name of the service

`params` must also include exactly one of
- `dht`: a HyperDHT instance
- `swarm`: a Hyperswarm instance

The passed-in swarm/dht will be instrumented. It will also be used to connect with the scraper.

You should pass in `swarm` if your service operates at Hyperswarm level, since Hyperswarm extends HyperDHT (the Hyperswarm metrics include all HyperDHT metrics).

Optionally, `params` can also include:
- `corestore`: a Corestore instance. Passing in a Corestore will set up [hypercore-stats](https://github.com/holepunchto/hypercore-stats) instrumentation
- `moduleVersions`: a list of package names for which to expose the version number as a metric. Defaults to the core datastructure and networking libraries.

#### `await instrumentation.ready()`

Start the metrics scraping.

#### `await instrumentation.close()`

Stop the metrics scraping.

#### `registerLogger(logger=console)`

Register a logger, so it logs info about the instrumentation (like when it successfully registers with the scraper). `logger` can be a `pino` instance, or `console` (default).
