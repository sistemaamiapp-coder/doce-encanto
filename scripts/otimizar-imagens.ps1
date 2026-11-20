param(
  [string]$Origem,
  [string]$Destino,
  [int]$LarguraMax = 900,
  [int]$Qualidade = 86
)

Add-Type -AssemblyName System.Drawing

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Qualidade)

if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino -Force | Out-Null }

Get-ChildItem -Path $Origem -Filter *.png | ForEach-Object {
  $file = $_
  $base = ($file.BaseName -split '_')[0]
  $bmp = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $ratio = [Math]::Min(1.0, [Math]::Min($LarguraMax / $bmp.Width, $LarguraMax / $bmp.Height))
    $w = [int][Math]::Round($bmp.Width * $ratio)
    $h = [int][Math]::Round($bmp.Height * $ratio)
    $nova = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($nova)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($bmp, 0, 0, $w, $h)
    $saida = Join-Path $Destino ($base + '.jpg')
    $nova.Save($saida, $encoder, $encParams)
    $g.Dispose()
    $nova.Dispose()
    Write-Host ("OK  {0} -> {1} ({2}x{3})" -f $file.Name, $saida, $w, $h)
  } finally {
    $bmp.Dispose()
  }
}