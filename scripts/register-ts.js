const fs = require('fs');
const path = require('path');
const Module = require('module');

let tsCompiler = null;
let babelCore = null;
let babelPresetTs = null;
let babelPresetEnv = null;
let babelPresetReact = null;

try {
  tsCompiler = require('typescript');
} catch {
  // Fallback to system Babel in environments where node_modules is not yet installed
  const sysNodePath = '/usr/share/nodejs';
  try {
    babelCore = require(path.join(sysNodePath, '@babel/core'));
    babelPresetTs = require(path.join(sysNodePath, '@babel/preset-typescript'));
    babelPresetEnv = require(path.join(sysNodePath, '@babel/preset-env'));
    babelPresetReact = require(path.join(sysNodePath, '@babel/preset-react'));
  } catch {
    // Ignore if neither is present
  }
}

function compileTypeScriptCode(sourceCode, filename) {
  if (tsCompiler) {
    const result = tsCompiler.transpileModule(sourceCode, {
      fileName: filename,
      compilerOptions: {
        module: tsCompiler.ModuleKind.CommonJS,
        target: tsCompiler.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: tsCompiler.JsxEmit.ReactJSX,
        isolatedModules: true,
      },
    });
    return result.outputText;
  }

  if (babelCore && babelPresetTs && babelPresetEnv) {
    const presets = [
      [babelPresetEnv, { targets: { node: 'current' }, modules: 'commonjs' }],
      [babelPresetTs, { isTSX: filename.endsWith('.tsx'), allExtensions: true }],
    ];
    if (filename.endsWith('.tsx') && babelPresetReact) {
      presets.push([babelPresetReact, { runtime: 'classic' }]);
    }
    const result = babelCore.transformSync(sourceCode, {
      filename,
      presets,
      babelrc: false,
      configFile: false,
    });
    return result ? result.code : sourceCode;
  }

  throw new Error(
    'TypeScript compiler not found. Please run "npm install" first.'
  );
}

function registerTsExtension() {
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (err) {
      if (
        (request.startsWith('./') || request.startsWith('../')) &&
        parent &&
        parent.filename
      ) {
        const baseDir = path.dirname(parent.filename);
        for (const ext of ['.ts', '.tsx']) {
          const candidate = path.resolve(baseDir, request + ext);
          if (fs.existsSync(candidate)) {
            return candidate;
          }
        }
      }
      throw err;
    }
  };

  const loader = function (module, filename) {
    const raw = fs.readFileSync(filename, 'utf8');
    const compiled = compileTypeScriptCode(raw, filename);
    module._compile(compiled, filename);
  };

  Module._extensions['.ts'] = loader;
  Module._extensions['.tsx'] = loader;
}

module.exports = {
  registerTsExtension,
  compileTypeScriptCode,
};
