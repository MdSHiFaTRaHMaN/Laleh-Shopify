Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\Users\shiat\.gemini\antigravity\brain\e47f8d80-a5ea-4eab-a0da-2945d55e87f5\.user_uploaded\media_1791867004511_161c21e5.png")
$rect = New-Object System.Drawing.Rectangle(110, 50, 140, 60)
$w = [int]($rect.Width * 4)
$h = [int]($rect.Height * 4)
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), $rect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save("c:\SIFAT-16005\Shopify Store\LaLaH SHoPiFy\scratch\top_thumb_zoom.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "Done zoom thumb"

