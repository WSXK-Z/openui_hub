#!/usr/bin/env node
/**
 * dpui 元包 bin shim：从本包 vendor/<os>-<arch>/ 选择对应平台二进制并转发执行。
 * 使 `npm i -g @dp_ui/hub_cli` 后直接获得 `dpui` 命令（单包内自带全部平台产物）。
 */
'use strict'

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const platformName = process.platform === 'win32' ? 'win32' : process.platform
const archName = process.arch // x64 | arm64
const binName = process.platform === 'win32' ? 'dpui.exe' : 'dpui'
const binPath = path.join(__dirname, '..', 'vendor', `${platformName}-${archName}`, binName)

if (!fs.existsSync(binPath)) {
  console.error(
    `dpui: 本包缺少当前平台二进制 ${path.relative(process.cwd(), binPath)}。` +
      `（支持平台见 vendor/；当前 ${platformName}-${archName} 可能尚未构建，或安装包已损坏）`,
  )
  process.exit(1)
}

const res = spawnSync(binPath, process.argv.slice(2), { stdio: 'inherit' })
process.exit(res.status ?? 1)
