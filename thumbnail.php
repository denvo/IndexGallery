<?php
/**
 * Thumbnail generator for IndexGallery project
 * by Denis Volkov (den@denvo.name)
 */

// Default options
$Options = array(
    // Thumbnail max width (px)
    'maxWidth'      => 250,
    // Thumbnail max height (px)
    'maxHeight'     => 250,
    // Thumbnail name template (%s will be replace by base image name and the extension will be added)
    'thumbnailName' => '%s_small'
);

$MimeTypes = array(
    'gif'   => 'image/gif',
    'png'   => 'image/png',
    'jpg'   => 'image/jpeg'
);

function outputContentTypeHeader($extension) {
    global $MimeTypes;

    header('Content-Type: ' . $MimeTypes[strtolower($extension)]);
}

function shrinkImage($srcName, $dstName, $width, $height)
{
    $imgInfo = getimagesize($srcName);
    if(!$imgInfo) {
        return false;
    }

    $img = imagecreatefromstring(file_get_contents($srcName));
    if (!$img) {
        return false;
    }

    $w = $imgInfo[0];
    $h = $imgInfo[1];

    if ($w > $width) {
        $h *= $width / $w;
        $w = $width;
    }
    if ($h > $height) {
        $w *= $height / $h;
        $h = $height;
    }

    if ($w != $imgInfo[0] || $h != $imgInfo[1]) {
        $smallImg = imagecreatetruecolor($w, $h);
        if(!$smallImg) {
            return false;
        }
        imagecopyresampled($smallImg, $img, 0, 0, 0, 0,
                           $w, $h, $imgInfo[0], $imgInfo[1]);
        imagedestroy($img);
    }
    else {
        $smallImg = $img;
    }

    $pathParts = $dstName ? pathinfo($dstName) : pathinfo($srcName);
    if (!$dstName) {
        outputContentTypeHeader($pathParts['extension']);
    }
    if ($pathParts['extension'] == 'gif') {
        $success = imagegif($smallImg, $dstName);
    } elseif ($pathParts['extension'] == 'png') {
        $success = imagepng($smallImg, $dstName);
    } else {
        $success = imagejpeg($smallImg, $dstName, 97);
    }

    imagedestroy($smallImg);

    return $success;
}

if (isset($_GET['org'])) {
    $orgName = $_GET['org'];
    $orgPath = pathinfo($orgName);
    $srcName = $_SERVER['DOCUMENT_ROOT'] . $orgName;
    $dstName = $_SERVER['DOCUMENT_ROOT'] . $orgPath['dirname']
             . '/' . sprintf($Options['thumbnailName'], $orgPath['filename'])
             . '.' . strtolower($orgPath['extension']);
    // If cannot create the output file, output directly to the browser
    if (!is_writeable($dstName)) {
        $dstName = NULL;
    }

    if (shrinkImage($srcName, $dstName, $Options['maxWidth'], $Options['maxHeight'])) {
        if ($dstName) {
            outputContentTypeHeader($orgPath['extension']);
            readfile($dstName);
        }
    } else {
        header('HTTP/1.0 500 Internal Server Error');
    }
} else {
    header('HTTP/1.0 400 Bad request');
}
