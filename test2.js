const { isBare } = require('which-runtime')
if (isBare) require('bare-process/global')

require('prom-client', { with: { imports: './imports.json' } })
