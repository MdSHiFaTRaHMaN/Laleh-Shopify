Add-Type -AssemblyName System.Drawing
$file = "C:\Users\shiat\.gemini\antigravity-ide\brain\78a501ab-2a68-43be-a22f-c1bc7356d282\.user_uploaded\media_1791803274572.png"
$img = [System.Drawing.Image]::FromFile($file)
Write-Output "Size: $($img.Width) x $($img.Height)"

# Crop thumbnail 1 (returns thumbnail around Y=360..480, X=55..180)
$rect1 = New-Object System.Drawing.Rectangle(55, 360, 120, 110)
$bmp1 = New-Object System.Drawing.Bitmap($rect1.Width, $rect1.Height)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $rect1.Width, $rect1.Height)), $rect1, [System.Drawing.GraphicsUnit]::Pixel)
$bmp1.Save("C:\Users\shiat\.gemini\antigravity-ide\brain\78a501ab-2a68-43be-a22f-c1bc7356d282\thumb1.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Crop thumbnail 2 (contact thumbnail around Y=570..680, X=55..180)
$rect2 = New-Object System.Drawing.Rectangle(55, 570, 120, 110)
$bmp2 = New-Object System.Drawing.Bitmap($rect2.Width, $rect2.Height)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $rect2.Width, $rect2.Height)), $rect2, [System.Drawing.GraphicsUnit]::Pixel)
$bmp2.Save("C:\Users\shiat\.gemini\antigravity-ide\brain\78a501ab-2a68-43be-a22f-c1bc7356d282\thumb2.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Crop bottom
$yBottom = [int]$img.Height - 70
$rect3 = New-Object System.Drawing.Rectangle(0, $yBottom, [int]$img.Width, 70)
$bmp3 = New-Object System.Drawing.Bitmap($rect3.Width, $rect3.Height)
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $rect3.Width, $rect3.Height)), $rect3, [System.Drawing.GraphicsUnit]::Pixel)
$bmp3.Save("C:\Users\shiat\.gemini\antigravity-ide\brain\78a501ab-2a68-43be-a22f-c1bc7356d282\bottom.png", [System.Drawing.Imaging.ImageFormat]::Png)

$img.Dispose()
Write-Output "Done cropping"
