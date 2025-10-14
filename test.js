const test = require('brittle')
const Hyperswarm = require('hyperswarm')
const setupTestnet = require('hyperdht/testnet')
const tmpDir = require('test-tmp')
const Corestore = require('corestore')
const b4a = require('b4a')

// the order of these imports is important due to the import mapping in the main module (index.js)
const HypercoreInstrument = require('.')
const promClient = require('prom-client')

const DEBUG = false

test('basic happy path', async t => {
  const testnet = await setupTestnet()
  const { bootstrap } = testnet
  const swarm = new Hyperswarm({ bootstrap })
  const corestore = new Corestore(await tmpDir(t))

  const key = b4a.alloc(32)

  const client = new HypercoreInstrument({
    swarm,
    corestore,
    scraperPublicKey: key,
    prometheusAlias: 'alias',
    scraperSecret: key,
    prometheusServiceName: 'name'
  })

  const txt = await promClient.register.metrics()
  t.ok(txt.includes('hypercore_version'), 'hypercore version metric')
  t.ok(txt.includes('udx_native_version'), 'udx_native_version')
  t.ok(txt.includes('dht_rpc_version'), 'dht_rpc_version')
  t.ok(txt.includes('hyperdht_version'), 'hyperdht_version')
  t.ok(txt.includes('hyperswarm_version'), 'hyperswarm_version')
  t.ok(txt.includes('corestore_version'), 'corestore_version')
  t.ok(txt.includes('hyperbee_version'), 'hyperbee_version')
  t.ok(txt.includes('process_pid', 'process pid included'))
  t.absent(txt.includes('autobase_version'), 'autobase not included if not available')

  if (DEBUG) console.log(txt)

  await client.close()
  await corestore.close()
  await testnet.destroy()
})
