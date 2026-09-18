# Optional asset-authoring utility. Normal Node builds use the checked-in PNGs.
# Reuses reviewed public portfolio images; never reads private data or downloads assets.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskAssetRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets/social'))
New-Item -ItemType Directory -Path $taskAssetRoot -Force | Out-Null
$taskCovers = node (Join-Path $PSScriptRoot 'social-cards.mjs') | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $taskCovers.Count -eq 0) { throw 'Could not load reviewed social-cover metadata.' }
foreach ($taskCover in $taskCovers) {
    $taskBitmap = [System.Drawing.Bitmap]::new(1200, 630)
    $taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
    $taskResources = [System.Collections.Generic.List[System.IDisposable]]::new()
    try {
        $taskGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $taskGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $taskGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#e0e9f0'))
        $taskInk = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#101126'))
        $taskMuted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#43505d'))
        $taskAccent = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#a45c00'))
        $taskLine = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#aebcc7'), 2)
        $taskRoute = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#a45c00'), 6)
        $taskSmall = [System.Drawing.Font]::new('Segoe UI', 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $taskTitle = [System.Drawing.Font]::new('Segoe UI', 48, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $taskMetric = [System.Drawing.Font]::new('Segoe UI', 64, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $taskCaption = [System.Drawing.Font]::new('Segoe UI', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        foreach ($taskResource in @($taskInk,$taskMuted,$taskAccent,$taskLine,$taskRoute,$taskSmall,$taskTitle,$taskMetric,$taskCaption)) { $taskResources.Add($taskResource) }
        $taskGraphics.FillRectangle($taskInk, 0, 0, 16, 630)
        $taskGraphics.DrawString($taskCover.Category, $taskSmall, $taskAccent, 64, 55)
        $taskGraphics.DrawString($taskCover.Title, $taskTitle, $taskInk, [System.Drawing.RectangleF]::new(60, 120, 740, 180))
        $taskGraphics.DrawString($taskCover.Metric, $taskMetric, $taskInk, 60, 338)
        $taskGraphics.DrawString($taskCover.Caption, $taskCaption, $taskMuted, [System.Drawing.RectangleF]::new(64, 430, 740, 80))
        $taskGraphics.DrawLine($taskLine, 64, 541, 1136, 541)
        $taskGraphics.DrawString('ESAD KOPRU  /  SELECTED WORK', $taskSmall, $taskMuted, 64, 568)
        # Abstract network motif, deliberately not a real map.
        for ($taskRow = 0; $taskRow -lt 5; $taskRow++) {
            for ($taskColumn = 0; $taskColumn -lt 4; $taskColumn++) {
                $taskX = 876 + 76 * $taskColumn
                $taskY = 143 + 76 * $taskRow
                if ($taskColumn -lt 3) { $taskGraphics.DrawLine($taskLine, $taskX, $taskY, $taskX + 76, $taskY) }
                if ($taskRow -lt 4) { $taskGraphics.DrawLine($taskLine, $taskX, $taskY, $taskX, $taskY + 76) }
                $taskGraphics.FillEllipse($taskMuted, $taskX - 4, $taskY - 4, 8, 8)
            }
        }
        $taskPoints = [System.Drawing.Point[]]@([System.Drawing.Point]::new(876,447),[System.Drawing.Point]::new(876,295),[System.Drawing.Point]::new(1028,295),[System.Drawing.Point]::new(1028,143),[System.Drawing.Point]::new(1104,143))
        $taskGraphics.DrawLines($taskRoute, $taskPoints)
        $taskGraphics.FillEllipse($taskAccent, 1095, 134, 18, 18)
        # Use a published project screenshot where available. Never load remote images.
        if ($taskCover.ImagePath -and $taskCover.ImagePath -match '^assets/screenshots/[a-z0-9-]+\.(png|jpg|webp)$') {
            $taskScreenshotPath = Join-Path $PSScriptRoot ('../' + $taskCover.ImagePath)
            # System.Drawing does not decode WebP. Use the corresponding reviewed PNG/JPG.
            if ($taskScreenshotPath.EndsWith('-preview.webp')) {
                $taskScreenshotPath = $taskScreenshotPath.Replace('-preview.webp', '.png')
                if (-not (Test-Path -LiteralPath $taskScreenshotPath)) { $taskScreenshotPath = $taskScreenshotPath.Replace('.png', '.jpg') }
            }
            $taskScreenshot = [System.Drawing.Image]::FromFile($taskScreenshotPath)
            try {
                $taskGraphics.FillRectangle($taskInk, 828, 120, 332, 388)
                $taskScale = [Math]::Min(316 / $taskScreenshot.Width, 372 / $taskScreenshot.Height)
                $taskWidth = [int]($taskScreenshot.Width * $taskScale)
                $taskHeight = [int]($taskScreenshot.Height * $taskScale)
                $taskGraphics.DrawImage($taskScreenshot, 836 + [int]((316 - $taskWidth) / 2), 128 + [int]((372 - $taskHeight) / 2), $taskWidth, $taskHeight)
            } finally { $taskScreenshot.Dispose() }
        }
        $taskBitmap.Save((Join-Path $taskAssetRoot ($taskCover.Name + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        foreach ($taskResource in $taskResources) { $taskResource.Dispose() }
        $taskGraphics.Dispose()
        $taskBitmap.Dispose()
    }
}
Write-Output "Created $($taskCovers.Count) 1200x630 project-specific social-preview covers."
