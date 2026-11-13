// Reading QR codes on the teacher dashboard: from the camera, or from a picture or screenshot.
// Uses jsQR (src/vendor/jsQR.js), loaded only when a teacher scans. Pictures stay on the device.

let loading = null;

/** Loads the QR reader once. A single-file build has it inline already (window.jsQR). */
export function loadReader() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../vendor/jsQR.js', import.meta.url).href;
      s.onload = () => (window.jsQR ? resolve(window.jsQR) : reject(new Error('reader')));
      s.onerror = () => { loading = null; reject(new Error('reader')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

function read(jsQR, source, w, h, both) {
  const max = 1400;
  const k = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: both ? 'attemptBoth' : 'dontInvert' });
  return hit && hit.data ? hit.data : null;
}

/** The text of the QR code in a picture file, or null. */
export async function readImageFile(file) {
  const jsQR = await loadReader();
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
    return read(jsQR, img, img.naturalWidth, img.naturalHeight, true);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function cameraAvailable() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Shows the camera in a <video> and calls onText for each QR code seen.
 * Returns a function that stops the camera. Throws if the camera cannot be used.
 */
export async function startCamera(video, onText) {
  const jsQR = await loadReader();
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  await video.play();
  let on = true, last = '', lastAt = 0;
  const loop = () => {
    if (!on) return;
    if (video.readyState >= 2 && video.videoWidth) {
      let text = null;
      try { text = read(jsQR, video, video.videoWidth, video.videoHeight, false); } catch (e) { /* try the next frame */ }
      const now = Date.now();
      // The same code stays in view for a while: report it once, then again only after a pause.
      if (text && (text !== last || now - lastAt > 4000)) { last = text; lastAt = now; onText(text); }
    }
    setTimeout(loop, 160);
  };
  loop();
  return () => {
    on = false;
    stream.getTracks().forEach((tr) => tr.stop());
    video.srcObject = null;
  };
}
