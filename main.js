const defaults = {
  title: 'Noida, Uttar Pradesh, India',
  subtitle: 'E SQUARE, C2 Sector 96, Noida Uttar Pradesh 201301, India',
  lat: '28.541264',
  lon: '77.34641',
  date: '2025-06-04',
  time: '13:02',
  timezone: '+05:30',
  scale: 100,
};

const placeholderMap =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#1f6f78"/>
          <stop offset="1" stop-color="#223843"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#g)"/>
      <path d="M0 76h256M0 150h256M78 0v256M158 0v256" stroke="#ffffff" stroke-opacity=".18" stroke-width="12"/>
      <path d="M0 120c40-22 80-25 123-10 50 17 82 12 133-26v57c-48 25-86 30-135 14-42-14-78-10-121 14z" fill="#93c5fd" fill-opacity=".35"/>
      <path d="M48 211 211 45" stroke="#f8fafc" stroke-opacity=".22" stroke-width="18"/>
    </svg>
  `);

const logo = './assets/logo.jpg';

const state = {
  photoUrl: '',
  mapUrl: placeholderMap,
  manualMap: false,
  naturalWidth: 0,
  naturalHeight: 0,
  previewScale: 1,
  ...defaults,
};

const els = {
  dropZone: document.querySelector('#dropZone'),
  photoInput: document.querySelector('#photoInput'),
  workspace: document.querySelector('#workspace'),
  previewShell: document.querySelector('.preview-shell'),
  previewSizer: document.querySelector('#previewSizer'),
  captureArea: document.querySelector('#captureArea'),
  photoImage: document.querySelector('#photoImage'),
  overlayBox: document.querySelector('#overlayBox'),
  logoImage: document.querySelector('#logoImage'),
  mapFrame: document.querySelector('.map-image'),
  mapImage: document.querySelector('#mapImage'),
  titleInput: document.querySelector('#titleInput'),
  subtitleInput: document.querySelector('#subtitleInput'),
  latInput: document.querySelector('#latInput'),
  lonInput: document.querySelector('#lonInput'),
  dateInput: document.querySelector('#dateInput'),
  timeInput: document.querySelector('#timeInput'),
  timezoneInput: document.querySelector('#timezoneInput'),
  scaleInput: document.querySelector('#scaleInput'),
  scaleValue: document.querySelector('#scaleValue'),
  mapInput: document.querySelector('#mapInput'),
  downloadButton: document.querySelector('#downloadButton'),
  mapPin: document.querySelector('.map-pin'),
  titleText: document.querySelector('#titleText'),
  subtitleText: document.querySelector('#subtitleText'),
  coordsTimeText: document.querySelector('#coordsTimeText'),
  appLabelText: document.querySelector('#appLabelText'),
};

function init() {
  els.logoImage.src = logo;
  els.mapImage.src = state.mapUrl;

  bindInput('titleInput', 'title');
  bindInput('subtitleInput', 'subtitle');
  bindInput('latInput', 'lat', autoFetchMap);
  bindInput('lonInput', 'lon', autoFetchMap);
  bindInput('dateInput', 'date');
  bindInput('timeInput', 'time');
  bindInput('timezoneInput', 'timezone');

  Object.entries(defaults).forEach(([key, value]) => {
    const input = els[`${key}Input`];
    if (input) input.value = value;
  });

  els.scaleInput.addEventListener('input', () => {
    state.scale = Number(els.scaleInput.value);
    render();
  });

  els.photoInput.addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (file) loadPhoto(file);
  });

  els.dropZone.addEventListener('click', () => els.photoInput.click());
  els.dropZone.addEventListener('dragover', onDragOver);
  els.dropZone.addEventListener('dragleave', onDragLeave);
  els.dropZone.addEventListener('drop', onPhotoDrop);

  els.mapInput.addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (!file) return;
    state.manualMap = true;
    setMapUrl(URL.createObjectURL(file));
  });

  els.downloadButton.addEventListener('click', downloadImage);
  window.addEventListener('resize', fitPreview);

  render();
  autoFetchMap();
}

function bindInput(elementKey, stateKey, afterChange) {
  els[elementKey].value = defaults[stateKey];
  els[elementKey].addEventListener('input', () => {
    state[stateKey] = els[elementKey].value;
    render();
    if (afterChange) afterChange();
  });
}

function onDragOver(event) {
  event.preventDefault();
  els.dropZone.classList.add('is-dragging');
}

function onDragLeave() {
  els.dropZone.classList.remove('is-dragging');
}

function onPhotoDrop(event) {
  event.preventDefault();
  els.dropZone.classList.remove('is-dragging');
  const [file] = event.dataTransfer.files;
  if (file && file.type.startsWith('image/')) loadPhoto(file);
}

function loadPhoto(file) {
  if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    state.photoUrl = url;
    state.naturalWidth = image.naturalWidth;
    state.naturalHeight = image.naturalHeight;
    els.photoImage.src = url;
    els.photoImage.width = state.naturalWidth;
    els.photoImage.height = state.naturalHeight;
    els.dropZone.classList.add('hidden');
    els.workspace.classList.remove('hidden');
    els.workspace.classList.add('flex');
    els.downloadButton.classList.remove('hidden');
    sizeCaptureArea();
    render();
    requestAnimationFrame(fitPreview);
  };

  image.src = url;
}

function sizeCaptureArea() {
  els.captureArea.style.width = `${state.naturalWidth}px`;
  els.captureArea.style.height = `${state.naturalHeight}px`;
}

function render() {
  els.titleText.textContent = state.title;
  els.subtitleText.textContent = state.subtitle;
  els.coordsTimeText.innerHTML = `Lat ${state.lat}° Long ${state.lon}°<br>${formatDateTime()}`;
  els.appLabelText.textContent = 'GPS Map Camera';
  els.scaleValue.textContent = `${state.scale}%`;
  els.mapImage.src = state.mapUrl;
  els.mapPin.classList.toggle('hidden', state.manualMap);
  els.mapFrame.classList.toggle('auto-map-thumb', !state.manualMap);
  updateOverlayScale();
}

function updateOverlayScale() {
  const imageWidth = state.naturalWidth || 750;
  const sideGutter = 16;
  const maxScaleWithoutOverflow = Math.max(0.1, (imageWidth - sideGutter * 2) / 750);
  const userScale = state.scale / 100;
  els.overlayBox.style.transform = `scale(${Math.min(userScale, maxScaleWithoutOverflow)})`;
  els.overlayBox.style.transformOrigin = 'bottom center';
}

function fitPreview() {
  if (!state.naturalWidth || !state.naturalHeight) return;

  const availableWidth = Math.max(280, els.previewShell.clientWidth - 32);
  const availableHeight = Math.max(280, els.previewShell.clientHeight - 32);
  state.previewScale = Math.min(1, availableWidth / state.naturalWidth, availableHeight / state.naturalHeight);

  els.previewSizer.style.width = `${state.naturalWidth * state.previewScale}px`;
  els.previewSizer.style.height = `${state.naturalHeight * state.previewScale}px`;
  els.captureArea.style.transform = `scale(${state.previewScale})`;
}

function autoFetchMap() {
  if (state.manualMap) return;

  const lat = Number(state.lat);
  const lon = Number(state.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -85.0511 || lat > 85.0511 || lon < -180 || lon > 180) {
    setMapUrl(placeholderMap);
    return;
  }

  const z = 15;
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
  );
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  const tile = new Image();
  tile.crossOrigin = 'anonymous';
  tile.onload = () => setMapUrl(url);
  tile.onerror = () => setMapUrl(placeholderMap);
  tile.src = url;
}

function setMapUrl(url) {
  state.mapUrl = url;
  els.mapImage.crossOrigin = url.startsWith('http') ? 'anonymous' : null;
  render();
}

function formatDateTime() {
  const [year, month, day] = state.date.split('-');
  const [hourText, minute = '00'] = state.time.split(':');
  const hour = Number(hourText);
  const safeDate = year && month && day ? `${month}/${day}/${year}` : '04/06/2025';
  const safeHour = Number.isFinite(hour) ? hour : 13;
  const hour12 = safeHour % 12 || 12;
  const period = safeHour >= 12 ? 'PM' : 'AM';
  const paddedHour = String(hour12).padStart(2, '0');
  const paddedMinute = minute.padStart(2, '0');

  return `${safeDate} ${paddedHour}:${paddedMinute}${period} GMT ${state.timezone}`;
}

async function downloadImage() {
  if (!state.photoUrl || !window.html2canvas) return;

  const previousTransform = els.captureArea.style.transform;
  els.captureArea.style.transform = 'none';

  try {
    const canvas = await window.html2canvas(els.captureArea, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      width: state.naturalWidth,
      height: state.naturalHeight,
      windowWidth: state.naturalWidth,
      windowHeight: state.naturalHeight,
    });
    const link = document.createElement('a');
    link.download = 'gps-map-overlay.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    els.captureArea.style.transform = previousTransform;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
