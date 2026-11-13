# Third-party code kept in the repository

The game has no build step and loads only Phaser from a CDN, so the two small libraries the
teacher layer needs are stored here.

| File | What it does | Source | Licence |
|---|---|---|---|
| `qrcode.js` | Draws the QR code on "Share with my teacher" | qrcode-generator 1.4.4, Kazuhiko Arase, https://github.com/kazuhikoarase/qrcode-generator | MIT (header in the file) |
| `jsQR.js` | Reads QR codes from the camera or a picture on the teacher dashboard | jsQR 1.4.0, Cosmo Wolfe, https://github.com/cozmo/jsQR | Apache 2.0 (`LICENSE-jsQR.txt`) |

"QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
