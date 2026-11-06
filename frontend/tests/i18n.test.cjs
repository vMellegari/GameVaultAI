const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const values = new Map()
const metaValues = new Map()
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}
global.document = {
  documentElement: { lang: '' },
  title: '',
  querySelector: () => ({
    setAttribute: (name, value) => metaValues.set(name, value),
  }),
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
  return loadedModule.exports
}

test('defaults to English and persists language changes', async () => {
  const { default: i18n, formatNumber, formatDate } = loadI18n()
  assert.equal(i18n.language, 'en')
  assert.equal(i18n.t('Biblioteca'), 'Library')
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(document.title, 'GameVault AI | Your game library')
  assert.match(metaValues.get('content'), /organize your library/)

  const sourceRoot = path.resolve(__dirname, '../src')
  const sourceFiles = []
  function collectTypeScriptFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) collectTypeScriptFiles(entryPath)
      else if (entry.isFile() && entry.name.endsWith('.tsx')) sourceFiles.push(entryPath)
    }
  }
  collectTypeScriptFiles(sourceRoot)

  const translationKeys = new Set()
  for (const sourcePath of sourceFiles) {
    const source = fs.readFileSync(sourcePath, 'utf8')
    const sourceFile = ts.createSourceFile(
      sourcePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText(sourceFile) === 'i18n' &&
        node.expression.name.text === 't'
      ) {
        const key = node.arguments[0]
        if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))) {
          translationKeys.add(key.text)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }

  const missingEnglishTranslations = [...translationKeys].filter(
    (key) => i18n.getResource('en', 'translation', key) === undefined,
  )
  assert.deepEqual(missingEnglishTranslations, [])

  await i18n.changeLanguage('pt-BR')
  assert.equal(i18n.t('Biblioteca'), 'Biblioteca')
  assert.equal(values.get('gamevault-language'), 'pt-BR')
  assert.equal(document.documentElement.lang, 'pt-BR')
  assert.equal(document.title, 'GameVault AI | Sua biblioteca de jogos')
  assert.match(metaValues.get('content'), /organize sua biblioteca/)
  assert.equal(formatNumber(1234.5), '1.234,5')
  assert.notEqual(formatDate('2024-02-01'), 'Feb 1, 2024')
})
