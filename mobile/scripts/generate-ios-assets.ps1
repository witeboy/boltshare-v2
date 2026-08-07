Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $PSScriptRoot '..\ios\App\App\Assets.xcassets'
$yellow = [System.Drawing.Color]::FromArgb(250, 204, 21)
$black = [System.Drawing.Color]::FromArgb(13, 13, 13)

function New-BoltPolygon([float]$originX, [float]$originY, [float]$scale) {
    return [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new($originX + 61 * $scale, $originY + 18 * $scale),
        [System.Drawing.PointF]::new($originX + 31 * $scale, $originY + 59 * $scale),
        [System.Drawing.PointF]::new($originX + 50 * $scale, $originY + 59 * $scale),
        [System.Drawing.PointF]::new($originX + 44 * $scale, $originY + 91 * $scale),
        [System.Drawing.PointF]::new($originX + 78 * $scale, $originY + 47 * $scale),
        [System.Drawing.PointF]::new($originX + 58 * $scale, $originY + 47 * $scale)
    )
}

function New-BrandIcon([string]$path) {
    $bitmap = [System.Drawing.Bitmap]::new(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear($yellow)
        $bolt = New-BoltPolygon 0 0 (1024 / 108)
        $brush = [System.Drawing.SolidBrush]::new($black)
        try { $graphics.FillPolygon($brush, $bolt) } finally { $brush.Dispose() }
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

function New-Splash([string]$path) {
    $size = 2732
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear($black)
        $tileSize = 560
        $tileX = ($size - $tileSize) / 2
        $tileY = ($size - $tileSize) / 2
        $tilePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try {
            $radius = 110
            $diameter = $radius * 2
            $tilePath.AddArc($tileX, $tileY, $diameter, $diameter, 180, 90)
            $tilePath.AddArc($tileX + $tileSize - $diameter, $tileY, $diameter, $diameter, 270, 90)
            $tilePath.AddArc($tileX + $tileSize - $diameter, $tileY + $tileSize - $diameter, $diameter, $diameter, 0, 90)
            $tilePath.AddArc($tileX, $tileY + $tileSize - $diameter, $diameter, $diameter, 90, 90)
            $tilePath.CloseFigure()
            $yellowBrush = [System.Drawing.SolidBrush]::new($yellow)
            try { $graphics.FillPath($yellowBrush, $tilePath) } finally { $yellowBrush.Dispose() }
        } finally { $tilePath.Dispose() }

        $boltScale = $tileSize / 108
        $bolt = New-BoltPolygon $tileX $tileY $boltScale
        $blackBrush = [System.Drawing.SolidBrush]::new($black)
        try { $graphics.FillPolygon($blackBrush, $bolt) } finally { $blackBrush.Dispose() }
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-BrandIcon (Join-Path $assetRoot 'AppIcon.appiconset\AppIcon-512@2x.png')
foreach ($name in @('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png')) {
    New-Splash (Join-Path $assetRoot "Splash.imageset\$name")
}
