const { isBare, isPear } = require('which-runtime')
if (isBare) require('bare-process/global')

async function main () {
  if (isBare) console.log(global.Bare)
  if (isPear) await global.Pear.versions().then(console.log)
  require('prom-client', { with: { imports: './imports.json' } })
}
main()
