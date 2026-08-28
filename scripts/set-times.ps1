# 把测试库里假笔记的文件时间戳改成它们「应该」的创建日期。
# Node 改不了 Windows 的 CreationTime，而 Dataview 的 file.ctime 正是读它 ——
# 不改的话所有笔记都算今天创建，热力图会挤成一根柱子。
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$vault = Join-Path $root "testvault"
$stampFile = Join-Path $PSScriptRoot ".stamps.json"

if (-not (Test-Path $stampFile)) {
  Write-Error "找不到 $stampFile，先跑 node scripts/make-testvault.mjs"
}

$stamps = Get-Content $stampFile -Raw -Encoding UTF8 | ConvertFrom-Json
$n = 0
foreach ($s in $stamps) {
  $f = Join-Path $vault $s.path
  if (-not (Test-Path $f)) { continue }
  $t = [datetime]::Parse($s.time)
  $item = Get-Item -LiteralPath $f
  $item.CreationTime = $t
  $item.LastWriteTime = $t
  $n++
}
Write-Output "✓ 已设置 $n 个文件的时间戳"
