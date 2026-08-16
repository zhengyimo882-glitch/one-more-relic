param(
  [string]$OutputDirectory = "public/assets/generated/relic_restoration_v1"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sources = @{
  CoinClean = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-fbb97f86-c3f6-4f91-899e-bc5f076fb24a.png'
  CoinDirty = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-211fa404-8c94-44ae-9ef8-582048b05d48.png'
  CoinDamaged = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-a9a756e6-079b-4199-a8cc-fda25de22e7e.png'
  BookClean = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-495a0a65-1fca-4565-93b8-b4c3c6dbb790.png'
  BookDirty = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-2149abd9-07f2-4608-a92a-fde4274cf1e1.png'
  BookDamaged = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-a0fd8c98-4ae2-4338-9127-cb7df5cadafc.png'
  Tools = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-52bf7b93-f015-4e1a-82cf-6d2dce16dd1c.png'
  Workbench = 'C:\Users\Lenovo\.codex\generated_images\019ff943-5886-7eb1-84e4-b7fbd37f1b22\exec-3aafee2b-22c9-49a7-94f2-364d7920502c.png'
}

$resolvedOutput = Join-Path (Get-Location) $OutputDirectory
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

function Remove-CheckerBackground([System.Drawing.Bitmap]$bitmap) {
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      $maximum = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
      $minimum = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
      if (($maximum - $minimum) -le 9 -and $minimum -ge 208) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }
}

function Export-Crop(
  [string]$Source,
  [string]$Name,
  [double]$X,
  [double]$Y,
  [double]$Width,
  [double]$Height,
  [int]$TargetWidth,
  [int]$TargetHeight,
  [bool]$RemoveChecker = $false
) {
  $sourceOriginal = [System.Drawing.Bitmap]::new($Source)
  $sourceBitmap = [System.Drawing.Bitmap]::new($sourceOriginal.Width, $sourceOriginal.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $sourceGraphics = [System.Drawing.Graphics]::FromImage($sourceBitmap)
  $sourceGraphics.DrawImageUnscaled($sourceOriginal, 0, 0)
  $sourceGraphics.Dispose(); $sourceOriginal.Dispose()
  if ($RemoveChecker) { Remove-CheckerBackground $sourceBitmap }
  $crop = [System.Drawing.Rectangle]::new(
    [int]($sourceBitmap.Width * $X),
    [int]($sourceBitmap.Height * $Y),
    [int]($sourceBitmap.Width * $Width),
    [int]($sourceBitmap.Height * $Height)
  )
  $target = [System.Drawing.Bitmap]::new($TargetWidth, $TargetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($sourceBitmap, [System.Drawing.Rectangle]::new(0, 0, $TargetWidth, $TargetHeight), $crop, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  $sourceBitmap.Dispose()
  $path = Join-Path $resolvedOutput "$Name.png"
  $target.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $target.Dispose()
}

function Export-Shadow([string]$InputName, [string]$OutputName) {
  $sourcePath = Join-Path $resolvedOutput "$InputName.png"
  $source = [System.Drawing.Bitmap]::new($sourcePath)
  $shadow = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  foreach ($offset in @(@(9, 13, 0.12), @(13, 18, 0.18), @(18, 23, 0.08))) {
    $dx = [int]$offset[0]; $dy = [int]$offset[1]; $strength = [double]$offset[2]
    for ($y = 0; $y -lt ($source.Height - $dy); $y += 2) {
      for ($x = 0; $x -lt ($source.Width - $dx); $x += 2) {
        $alpha = $source.GetPixel($x, $y).A
        if ($alpha -gt 10) {
          $existing = $shadow.GetPixel($x + $dx, $y + $dy).A
          $next = [Math]::Min(150, $existing + [int]($alpha * $strength))
          $color = [System.Drawing.Color]::FromArgb($next, 10, 7, 4)
          $shadow.SetPixel($x + $dx, $y + $dy, $color)
          if (($x + $dx + 1) -lt $shadow.Width) { $shadow.SetPixel($x + $dx + 1, $y + $dy, $color) }
          if (($y + $dy + 1) -lt $shadow.Height) { $shadow.SetPixel($x + $dx, $y + $dy + 1, $color) }
        }
      }
    }
  }
  $shadow.Save((Join-Path $resolvedOutput "$OutputName.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $shadow.Dispose(); $source.Dispose()
}

$coinFaces = @(
  @{ Name = 'front'; X = 0.0; Y = 0.0; W = 0.445; H = 1.0; TW = 780; TH = 780 },
  @{ Name = 'back'; X = 0.45; Y = 0.0; W = 0.445; H = 1.0; TW = 780; TH = 780 },
  @{ Name = 'edge'; X = 0.885; Y = 0.0; W = 0.115; H = 1.0; TW = 230; TH = 780 }
)
foreach ($face in $coinFaces) {
  Export-Crop $sources.CoinClean "coin_$($face.Name)_clean" $face.X $face.Y $face.W $face.H $face.TW $face.TH $false
  Export-Crop $sources.CoinDirty "coin_$($face.Name)_dirty" $face.X $face.Y $face.W $face.H $face.TW $face.TH $true
  Export-Crop $sources.CoinDamaged "coin_$($face.Name)_damaged" $face.X $face.Y $face.W $face.H $face.TW $face.TH $false
  Export-Shadow "coin_$($face.Name)_clean" "coin_$($face.Name)_shadow"
}

$bookFaces = @(
  @{ Name = 'front'; X = 0.08; Y = 0.0; W = 0.37; H = 0.50; TW = 650; TH = 700 },
  @{ Name = 'back'; X = 0.50; Y = 0.0; W = 0.38; H = 0.50; TW = 650; TH = 700 },
  @{ Name = 'spine'; X = 0.0; Y = 0.54; W = 0.48; H = 0.35; TW = 800; TH = 300 },
  @{ Name = 'open'; X = 0.45; Y = 0.50; W = 0.55; H = 0.50; TW = 900; TH = 650 }
)
foreach ($face in $bookFaces) {
  Export-Crop $sources.BookClean "book_$($face.Name)_clean" $face.X $face.Y $face.W $face.H $face.TW $face.TH $false
  Export-Crop $sources.BookDirty "book_$($face.Name)_dirty" $face.X $face.Y $face.W $face.H $face.TW $face.TH $true
  Export-Crop $sources.BookDamaged "book_$($face.Name)_damaged" $face.X $face.Y $face.W $face.H $face.TW $face.TH $true
  Export-Shadow "book_$($face.Name)_clean" "book_$($face.Name)_shadow"
}

Export-Crop $sources.Tools 'tool_soft_brush' 0.0 0.0 0.34 1.0 430 720 $false
Export-Crop $sources.Tools 'tool_bamboo_pick' 0.32 0.0 0.36 1.0 430 720 $false
Export-Crop $sources.Tools 'tool_dry_cloth' 0.66 0.0 0.34 1.0 430 720 $false

Export-Crop $sources.Workbench 'workbench_mat' 0.0 0.0 1.0 0.59 1100 620 $false
Export-Crop $sources.Workbench 'notebook_closed' 0.0 0.60 0.29 0.40 480 500 $false
Export-Crop $sources.Workbench 'notebook_open' 0.24 0.58 0.39 0.42 640 500 $false
Export-Crop $sources.Workbench 'work_lamp' 0.61 0.58 0.39 0.42 600 500 $false

Write-Output "Prepared restoration assets in $resolvedOutput"
