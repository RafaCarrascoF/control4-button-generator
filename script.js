// Rutas dentro del .c4z y tamaño/variante de cada icono que se regenera.
// "default" = estado OFF (se pasa a blanco y negro); "selected" = estado ON (color).
const IMAGE_SPECS = [
  ["www/icons/device/default_70.png", 70, "default"],
  ["www/icons/device/default_90.png", 90, "default"],
  ["www/icons/device/default_300.png", 300, "default"],
  ["www/icons/device/default_512.png", 512, "default"],
  ["www/icons/device/default_1024.png", 1024, "default"],
  ["www/icons/device/selected_70.png", 70, "selected"],
  ["www/icons/device/selected_90.png", 90, "selected"],
  ["www/icons/device/selected_300.png", 300, "selected"],
  ["www/icons/device/selected_512.png", 512, "selected"],
  ["www/icons/device/selected_1024.png", 1024, "selected"],
  ["www/icons/device_lg.png", 32, "selected"],
  ["www/icons/device_sm.png", 16, "selected"],
  ["www/icons-old/device/default_70.png", 70, "default"],
  ["www/icons-old/device/default_90.png", 90, "default"],
  ["www/icons-old/device/default_300.png", 300, "default"],
  ["www/icons-old/device/selected_70.png", 70, "selected"],
  ["www/icons-old/device/selected_90.png", 90, "selected"],
  ["www/icons-old/device/selected_300.png", 300, "selected"],
  ["www/icons-old/device_lg.png", 32, "selected"],
  ["www/icons-old/device_sm.png", 16, "selected"],
];

// Estado global: driver base cargado y contador de botones añadidos.
let baseFile = null;
let buttonCounter = 0;

// Referencias a los elementos fijos de la página.
const buttons = document.querySelector("#buttons");
const template = document.querySelector("#buttonTemplate");
const addButton = document.querySelector("#addButton");
const generateButton = document.querySelector("#generateButton");
const logEl = document.querySelector("#log");

// Convierte el nombre del driver en un id válido (minúsculas, sin acentos ni símbolos).
function sanitizeDriverId(name) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// Limpia el nombre del creador para el XML (sin acentos, espacios ni símbolos).
function sanitizeCreator(name) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

// Añade un cero a la izquierda a números de un dígito (p. ej. 5 -> "05").
function pad(n) {
  return String(n).padStart(2, "0");
}

// Devuelve la fecha en el formato que espera Control4: MM/DD/AAAA HH:mm (hora local).
function formatControl4Date(date = new Date()) {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Muestra un mensaje de estado en el pie de la herramienta (muted/ok/error).
function setLog(text, type = "muted") {
  logEl.textContent = text;
  logEl.className = `status ${type}`;
}

// Conecta una zona de "arrastrar y soltar": click para elegir archivo, drag&drop y resaltado.
function setupDropzone(zone, input, onFiles) {
  zone.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    if (input.files.length) onFiles(Array.from(input.files));
  });

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragover");
    if (event.dataTransfer.files.length) {
      onFiles(Array.from(event.dataTransfer.files));
    }
  });
}

// Habilita/deshabilita el botón "Generar" y actualiza el mensaje según el estado del formulario.
function updateGenerateState() {
  const completeCards = getCards().filter(isCardComplete);

  generateButton.disabled = !baseFile || completeCards.length === 0;

  if (!baseFile) {
    setLog("No se pudo cargar el driver base. Abre la herramienta desde la web publicada.", "error");
  } else if (completeCards.length === 0) {
    setLog("Añade al menos un botón con nombre, creador e imagen.", "muted");
  } else {
    setLog(`Listo para generar ${completeCards.length} driver(s).`, "ok");
  }
}

// Devuelve todas las tarjetas de botón presentes en la página.
function getCards() {
  return Array.from(document.querySelectorAll(".button-card"));
}

// Indica si una tarjeta tiene todos los datos para generar, según su modo de imagen.
function isCardComplete(card) {
  const named = card.querySelector(".driverName").value.trim()
    && card.querySelector(".creator").value.trim();
  const hasImages = card._mode === "dual"
    ? Boolean(card._offFile && card._onFile)
    : Boolean(card._imageFile);
  return Boolean(named) && hasImages;
}

// Borra el contenido de un canvas (deja la previsualización vacía).
function clearCanvas(canvas) {
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

// Carga un archivo de imagen como objeto Image (promesa que resuelve al cargar).
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen PNG."));
    };
    img.src = url;
  });
}

// Dibuja la imagen centrada y escalada en el canvas. En modo "default" la pasa a blanco y negro.
async function drawImageToCanvas(file, canvas, mode) {
  const img = await loadImage(file);
  const size = canvas.width;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);

  // Escalar manteniendo proporción y centrar dentro del canvas cuadrado.
  const scale = Math.min(size / img.width, size / img.height);
  const drawW = Math.round(img.width * scale);
  const drawH = Math.round(img.height * scale);
  const x = Math.round((size - drawW) / 2);
  const y = Math.round((size - drawH) / 2);

  ctx.drawImage(img, x, y, drawW, drawH);

  // Para el estado OFF: convertir cada píxel a gris (luminosidad ponderada).
  if (mode === "default") {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

// Renderiza la imagen al tamaño/modo indicados y devuelve el PNG resultante como Blob.
async function renderPngBlob(file, size, mode) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  await drawImageToCanvas(file, canvas, mode);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error("No se pudo generar una imagen PNG."));
      else resolve(blob);
    }, "image/png");
  });
}

// Reemplaza el contenido de una etiqueta XML <tag>...</tag>; lanza error si no existe.
function replaceTag(xml, tag, value) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`);
  if (!re.test(xml)) {
    throw new Error(`No se encontró la etiqueta <${tag}> en driver.xml.`);
  }
  return xml.replace(re, `<${tag}>${value}</${tag}>`);
}

// Actualiza driver.xml con los datos del botón: nombre, creador, fechas, versión y rutas de iconos.
function updateDriverXml(xml, data) {
  let out = xml;
  out = replaceTag(out, "name", data.driverName);
  out = replaceTag(out, "creator", data.creator);
  out = replaceTag(out, "created", data.created);
  out = replaceTag(out, "modified", data.modified);
  out = replaceTag(out, "version", String(data.version));

  // Reapuntar las rutas de iconos al id del nuevo driver.
  out = out.replace(
    /controller:\/\/driver\/[^/]+\/icons\/device\//g,
    `controller://driver/${data.driverId}/icons/device/`
  );

  return out;
}

// Fuerza la descarga de un Blob con el nombre de archivo indicado.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Crea una nueva tarjeta de botón a partir de la plantilla y conecta sus eventos.
function addButtonCard() {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".button-card");
  const title = fragment.querySelector("h3");
  const remove = fragment.querySelector(".remove");
  const driverName = fragment.querySelector(".driverName");
  const creator = fragment.querySelector(".creator");
  const driverId = fragment.querySelector(".driverId");
  const creatorXml = fragment.querySelector(".creatorXml");
  const modeOptions = fragment.querySelectorAll(".modeOption");
  const singleImage = fragment.querySelector(".singleImage");
  const dualImage = fragment.querySelector(".dualImage");
  const imageDrop = fragment.querySelector(".imageDrop");
  const imageInput = fragment.querySelector(".imageInput");
  const offDrop = fragment.querySelector(".offDrop");
  const offInput = fragment.querySelector(".offInput");
  const onDrop = fragment.querySelector(".onDrop");
  const onInput = fragment.querySelector(".onInput");
  const defaultPreview = fragment.querySelector(".previewDefault");
  const selectedPreview = fragment.querySelector(".previewSelected");

  buttonCounter += 1;
  title.textContent = `Botón ${buttonCounter}`;
  card._mode = "single";

  // Agrupar los radios de modo por tarjeta (nombre único para no mezclar botones).
  modeOptions.forEach(radio => { radio.name = `mode-${buttonCounter}`; });

  // Refresca los valores calculados (id y creador) al escribir en los campos.
  function updateComputed() {
    driverId.textContent = sanitizeDriverId(driverName.value) || "-";
    creatorXml.textContent = sanitizeCreator(creator.value) || "-";
    updateGenerateState();
  }

  driverName.addEventListener("input", updateComputed);
  creator.addEventListener("input", updateComputed);

  // Repinta las previsualizaciones OFF/ON según el modo y las imágenes cargadas.
  async function refreshPreviews() {
    if (card._mode === "dual") {
      card._offFile ? await drawImageToCanvas(card._offFile, defaultPreview, "selected") : clearCanvas(defaultPreview);
      card._onFile ? await drawImageToCanvas(card._onFile, selectedPreview, "selected") : clearCanvas(selectedPreview);
    } else if (card._imageFile) {
      await drawImageToCanvas(card._imageFile, defaultPreview, "default");
      await drawImageToCanvas(card._imageFile, selectedPreview, "selected");
    } else {
      clearCanvas(defaultPreview);
      clearCanvas(selectedPreview);
    }
  }

  // Cambia entre "una imagen" y "dos imágenes", mostrando la sección correspondiente.
  function applyMode(mode) {
    card._mode = mode;
    singleImage.hidden = mode !== "single";
    dualImage.hidden = mode !== "dual";
    refreshPreviews();
    updateGenerateState();
  }

  modeOptions.forEach(radio => {
    radio.addEventListener("change", () => { if (radio.checked) applyMode(radio.value); });
  });

  // Valida y guarda una imagen en la ranura indicada (_imageFile, _offFile o _onFile).
  function handleImageFile(files, slot, dropEl) {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Selecciona un archivo de imagen (PNG, JPG, WebP…).");
      return;
    }
    card[slot] = file;
    const note = file.type.includes("png") ? "" : " · se convertirá a PNG";
    dropEl.querySelector("span").textContent = `✓ ${file.name}${note}`;
    refreshPreviews();
    updateGenerateState();
  }

  // Permite eliminar la tarjeta, salvo que sea la única.
  remove.addEventListener("click", () => {
    if (getCards().length > 1) {
      card.remove();
      updateGenerateState();
    }
  });

  setupDropzone(imageDrop, imageInput, files => handleImageFile(files, "_imageFile", imageDrop));
  setupDropzone(offDrop, offInput, files => handleImageFile(files, "_offFile", offDrop));
  setupDropzone(onDrop, onInput, files => handleImageFile(files, "_onFile", onDrop));

  buttons.appendChild(fragment);
  updateGenerateState();
}

// Genera el .c4z de una tarjeta: clona el base, actualiza el XML y regenera todos los iconos.
async function generateOne(card) {
  const driverName = card.querySelector(".driverName").value.trim();
  const creator = sanitizeCreator(card.querySelector(".creator").value);
  const driverId = sanitizeDriverId(driverName);
  const dual = card._mode === "dual";
  const offFile = dual ? card._offFile : card._imageFile;
  const onFile = dual ? card._onFile : card._imageFile;

  if (!driverName || !creator || !driverId || !offFile || !onFile) {
    throw new Error("Faltan datos de un botón.");
  }

  const zip = await JSZip.loadAsync(baseFile);
  const xmlFile = zip.file("driver.xml");

  if (!xmlFile) {
    throw new Error("El archivo base no contiene driver.xml en la raíz.");
  }

  // Sustituir el driver.xml por la versión con los datos del botón.
  const now = formatControl4Date();
  const originalXml = await xmlFile.async("string");
  const updatedXml = updateDriverXml(originalXml, {
    driverName,
    creator,
    driverId,
    version: 1,
    created: now,
    modified: now,
  });

  zip.file("driver.xml", updatedXml);

  // Regenerar todos los iconos. Con una imagen: OFF en B/N y ON en color.
  // Con dos imágenes: cada estado usa su propia imagen, ambas en color.
  for (const [path, size, mode] of IMAGE_SPECS) {
    const file = mode === "default" ? offFile : onFile;
    const renderMode = dual ? "selected" : mode;
    const blob = await renderPngBlob(file, size, renderMode);
    zip.file(path, blob, { binary: true });
  }

  const output = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    filename: `${driverId}.c4z`,
    blob: output,
  };
}

// Driver base incluido en el proyecto; se carga solo al abrir la herramienta.
const BUNDLED_BASE = "experience-button-scenario.c4z";

// Descarga el driver base incluido. Si falla (p. ej. abierto como file://), deja baseFile a null.
async function preloadBundledBase() {
  try {
    const res = await fetch(BUNDLED_BASE);
    if (!res.ok) throw new Error("no disponible");
    const blob = await res.blob();
    baseFile = new File([blob], BUNDLED_BASE, { type: "application/zip" });
  } catch (error) {
    baseFile = null;
  }
  updateGenerateState();
}

addButton.addEventListener("click", addButtonCard);

// Acción principal: generar uno o varios drivers. Uno solo descarga un .c4z; varios, un .zip.
generateButton.addEventListener("click", async () => {
  generateButton.disabled = true;
  setLog("Generando...", "muted");

  try {
    const cards = getCards().filter(isCardComplete);

    if (cards.length === 1) {
      const result = await generateOne(cards[0]);
      downloadBlob(result.blob, result.filename);
      setLog(`Generado: ${result.filename}`, "ok");
    } else {
      // Varios botones: empaquetar cada .c4z dentro de un único .zip.
      const bundle = new JSZip();

      for (const card of cards) {
        const result = await generateOne(card);
        bundle.file(result.filename, result.blob);
      }

      const output = await bundle.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      downloadBlob(output, "control4-experience-buttons.zip");
      setLog(`Generados ${cards.length} drivers dentro de control4-experience-buttons.zip`, "ok");
    }
  } catch (error) {
    console.error(error);
    setLog(error.message || "Error generando el driver.", "error");
  } finally {
    updateGenerateState();
  }
});

// Arranque: crear la primera tarjeta y cargar el driver base incluido.
addButtonCard();
preloadBundledBase();
