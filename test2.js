(async () => {
  if (global.Pear) await global.Pear.versions().then(console.log)
  require('prom-client', { with: { imports: './imports.json' } })
})()
