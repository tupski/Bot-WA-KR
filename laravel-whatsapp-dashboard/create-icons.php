<?php
// Simple script to create basic PWA icons
$sizes = [16, 32, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512];

foreach ($sizes as $size) {
    // Create a simple colored square as placeholder
    $image = imagecreatetruecolor($size, $size);
    
    // Create gradient-like effect
    $color1 = imagecolorallocate($image, 102, 126, 234); // #667eea
    $color2 = imagecolorallocate($image, 118, 75, 162);  // #764ba2
    $white = imagecolorallocate($image, 255, 255, 255);
    
    // Fill with gradient
    for ($y = 0; $y < $size; $y++) {
        $ratio = $y / $size;
        $r = 102 + ($ratio * (118 - 102));
        $g = 126 + ($ratio * (75 - 126));
        $b = 234 + ($ratio * (162 - 234));
        
        $color = imagecolorallocate($image, $r, $g, $b);
        imageline($image, 0, $y, $size, $y, $color);
    }
    
    // Add text if size is large enough
    if ($size >= 72) {
        $fontSize = max(8, $size / 8);
        $text = 'KR';
        
        // Calculate text position
        $textBox = imagettfbbox($fontSize, 0, __DIR__ . '/arial.ttf', $text);
        if (!$textBox) {
            // Fallback to imagestring if TTF not available
            $x = ($size - strlen($text) * $fontSize) / 2;
            $y = ($size + $fontSize) / 2;
            imagestring($image, 5, $x, $y - 10, $text, $white);
        }
    }
    
    // Save the image
    $filename = "public/images/icons/icon-{$size}x{$size}.png";
    imagepng($image, $filename);
    imagedestroy($image);
    
    echo "Created: $filename\n";
}

echo "All icons created successfully!\n";
?>
