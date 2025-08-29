(async () => {
  await Pear.versions().then(console.log)
  require('prom-client')
})()
