
const express = require('express')
const rollup  = require('rollup')
const resolve = require('rollup-plugin-node-resolve')
const buble   = require('rollup-plugin-buble')
const uglify  = require('rollup-plugin-uglify').uglify

const argv = process.argv.slice(2)

let port = 8000

if (argv.length > 0) {
    let arg = parseInt(argv[0])
    if (isNaN(arg)) {
        build(argv[0])
    } else {
        port = arg
        const sourcemaps = {}
        const caches     = {}
        express()
            .use(express.static('.'))
            .get('*.js', async (req, res) => {
                try {
                    res.type('js')
                    const bundle = await rollup.rollup({
                        cache: caches[req.path],
                        input: `.${req.path}x`,
                        plugins: [
                            resolve({
                                extensions: ['.js', '.jsx']
                            }),
                            buble({
                                jsx: 'h',
                                objectAssign: 'Object.assign',
                                transforms: {
                                    dangerousForOf: true,
                                    dangerousTaggedTemplateString: true
                                }
                            })
                        ]
                    })
                    caches[req.path] = bundle.cache
                    const {output} = await bundle.generate({
                        format: 'iife',
                        name: 'app',
                        sourcemap: true
                    })
                    sourcemaps[`${req.path}.map`] = output[0].map.toString()
                    res.send(output[0].code + `//# sourceMappingURL=${req.path}.map`)
                } catch (e) {
                    res.send(`throw new Error(${JSON.stringify(e.message)})`)
                }
            })
            .get('*.map', async (req, res) => {
                res.type('map').send(sourcemaps[req.path])
            })
            .listen(port, () => {
                console.log(`Listening on port ${port}...`)
            })
    }
}

async function build (input) {
  const options = {
      input,
      plugins: [
          resolve({
              extensions: ['.js', '.jsx']
          }),
          buble({
              jsx: 'h',
              objectAssign: 'Object.assign',
              transforms: {
                  dangerousForOf: true,
                  dangerousTaggedTemplateString: true
              }
          }),
          uglify()
      ],
      output: {
          file: input.replace(/\.jsx?/i, '.js'),
          format: 'iife',
          name: 'app',
          sourcemap: true
      }
  }
  const bundle = await rollup.rollup(options)
  await bundle.generate(options.output)
  await bundle.write(options.output)
}
