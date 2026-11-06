const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const values = new Map()
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}
global.document = {
  documentElement: { lang: '' },
  title: '',
  querySelector: () => ({ setAttribute: () => {} }),
}

function loadI18n() {
  const sourcePath = path.resolve(__dirname, '../src/i18n.ts')
  const source = fs.readFileSync(sourcePath, 'utf8')
  const compiled = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  })
  const loadedModule = new Module(sourcePath, module)
  loadedModule.filename = sourcePath
  loadedModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
  loadedModule._compile(compiled, sourcePath)
  return loadedModule.exports.default
}

test('defaults to English and persists language changes', async () => {
  const i18n = loadI18n()
  assert.equal(i18n.language, 'en')
  assert.equal(i18n.t('Biblioteca'), 'Library')

  await i18n.changeLanguage('pt-BR')
  assert.equal(i18n.t('Biblioteca'), 'Biblioteca')
  assert.equal(values.get('gamevault-language'), 'pt-BR')
  assert.equal(document.documentElement.lang, 'pt-BR')
})
