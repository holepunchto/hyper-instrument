const { isBare, isPear } = require('which-runtime')
if (isBare) require('bare-process/global')

async function main () {
  if (isPear) await global.Pear.versions().then(console.log)
  require('prom-client', { with: { imports: './imports.json' } })
}
main()
