const dishGrid = document.querySelector("#dish-grid");
const dishDialog = document.querySelector("#dish-dialog");
const dishDetail = document.querySelector("#dish-detail");
let menuItems = [];

function confirmedPrice(dish) {
  if (!dish.price || !dish.price.confirmed || !Number.isFinite(dish.price.amount)) return "";
  const amount = new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR" }).format(dish.price.amount);
  return `<span class="price">${amount}</span>`;
}

function imageMarkup(dish, className) {
  if (!dish.imageAvailable) {
    return `<div class="${className} dish-photo-pending missing"><span class="photo-placeholder">Fotografía pendiente</span></div>`;
  }
  const loading = className === "detail-photo" ? "eager" : "lazy";
  return `<div class="${className} dish-photo-pending">
    <img src="${dish.image}" alt="${dish.name}" loading="${loading}" decoding="async">
    <span class="photo-placeholder">Fotografía pendiente</span>
  </div>`;
}

function cardHtml(dish) {
  const description = typeof dish.description === "string" && dish.description.trim()
    ? `<p>${dish.description}</p>`
    : "";
  const modelButton = dish.modelAvailable
    ? `<button class="dish-3d-button" type="button" data-open-model="${dish.id}" aria-label="Ver modelo 3D de ${dish.name}">Ver en 3D</button>`
    : "";
  return `<article class="dish-card">
    ${dish.image ? imageMarkup(dish, "dish-photo") : ""}
    <div class="dish-card-content">
      ${confirmedPrice(dish)}
      <h3>${dish.name}</h3>
      ${description}
      <button class="dish-open" type="button" data-open-dish="${dish.id}" aria-label="Ver ficha de ${dish.name}">Ver ficha</button>
      ${modelButton}
    </div>
  </article>`;
}

function renderMenu(items = menuItems) {
  dishGrid.innerHTML = items.map(cardHtml).join("");
  bindDishCards(dishGrid);
  bindDishImages(dishGrid);
}

function bindDishCards(container) {
  container.querySelectorAll("[data-open-dish]").forEach(button => {
    button.addEventListener("click", () => openDish(button.dataset.openDish));
  });
  container.querySelectorAll("[data-open-model]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openDish(button.dataset.openModel, true);
  }));
}

function bindDishImages(container) {
  container.querySelectorAll(".dish-photo-pending img").forEach(image => {
    const wrapper = image.closest(".dish-photo-pending");
    const markLoaded = () => wrapper.classList.add("loaded");
    const markMissing = () => {
      wrapper.classList.add("missing");
      image.remove();
    };
    image.addEventListener("load", markLoaded, { once:true });
    image.addEventListener("error", markMissing, { once:true });
    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markMissing();
    }
  });
}

function openDish(dishId, openModel = false) {
  const dish = menuItems.find(item => item.id === dishId);
  if (!dish) return;
  const ingredients = dish.ingredientsConfirmed && Array.isArray(dish.ingredients) && dish.ingredients.length
    ? `<div><strong>Ingredientes</strong><p>${dish.ingredients.join(", ")}</p></div>`
    : "";
  const allergenItems = dish.allergens && dish.allergens.confirmed && Array.isArray(dish.allergens.items)
    ? dish.allergens.items.filter(Boolean)
    : [];
  const allergens = allergenItems.length
    ? `<div><strong>Alérgenos confirmados</strong><p>${allergenItems.join(", ")}</p></div>`
    : "";
  const crossContamination = dish.allergens && dish.allergens.confirmed && dish.allergens.crossContamination
    ? `<div><strong>Contaminación cruzada</strong><p>${dish.allergens.crossContamination}</p></div>`
    : "";
  const lastReviewed = dish.lastReviewed
    ? `<div><strong>Última revisión</strong><p>${dish.lastReviewed}</p></div>`
    : "";
  const description = typeof dish.description === "string" && dish.description.trim()
    ? `<p>${dish.description}</p>`
    : "";
  const modelControls = dish.modelAvailable
    ? `<p class="model-provenance">${dish.model.provenance === "illustrative" ? "Modelo ilustrativo" : "Modelo escaneado"}</p>
       <button class="dish-3d-button" id="detail-model-button" type="button">Ver en 3D</button>
       <div class="model-viewer-wrap" id="model-viewer-wrap" hidden></div>`
    : `<div class="model-pending" role="status"><strong>Modelo 3D pendiente</strong>
       <p>Cuando esté disponible y verificada su procedencia, se mostrará aquí. Ruta prevista: <code>${dish.model.src}</code></p></div>`;
  dishDetail.dataset.dishId = dish.id;
  dishDetail.innerHTML = `${dish.image ? imageMarkup(dish, "detail-photo") : ""}
    <p class="kicker">Ficha del plato</p><h2>${dish.name}</h2>
    ${confirmedPrice(dish)}
    ${description}
    ${ingredients || allergens || crossContamination || lastReviewed
      ? `<div class="detail-list">${ingredients}${allergens}${crossContamination}${lastReviewed}</div>`
      : ""}
    ${modelControls}
    <p class="form-note">Si tienes alergias o intolerancias, consulta con el personal del restaurante. La información debe verificarse para cada visita.</p>`;
  dishDialog.showModal();
  bindDishImages(dishDetail);
  const modelButton = document.querySelector("#detail-model-button");
  if (modelButton) modelButton.addEventListener("click", () => loadDishModel(dish));
  if (openModel && dish.modelAvailable) loadDishModel(dish);
}

let modelViewerLoading;
function ensureModelViewerLoaded() {
  if (customElements.get("model-viewer")) return Promise.resolve();
  if (!modelViewerLoading) {
    const loading = import("https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js");
    let timeoutId;
    const timeout = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Tiempo de espera al cargar model-viewer.")), 15000);
    });
    modelViewerLoading = Promise.race([loading, timeout])
      .finally(() => clearTimeout(timeoutId))
      .catch(error => {
        modelViewerLoading = null;
        throw error;
      });
  }
  return modelViewerLoading;
}

function modelFallbackMarkup(dish, message) {
  const photo = dish.imageAvailable && dish.image
    ? `<img class="model-fallback-photo" src="${dish.image}" alt="Fotografía de ${dish.name}">`
    : "";
  return `<div class="model-unavailable" role="status">${photo}<div><strong>${message}</strong>
    <p>El visor 3D no está disponible. Consulta la fotografía del plato mientras se incorpora un modelo válido.</p></div></div>`;
}

async function loadDishModel(dish) {
  const wrap = document.querySelector("#model-viewer-wrap");
  if (!wrap || !dish.modelAvailable || wrap.dataset.loading === "true") return;
  wrap.dataset.loading = "true";
  wrap.hidden = false;
  wrap.innerHTML = `<div class="model-unavailable"><strong>Cargando visor 3D…</strong></div>`;
  try {
    if (!await resourceExists(dish.model.src)) {
      dish.modelAvailable = false;
      wrap.innerHTML = modelFallbackMarkup(dish, "No se encontró el archivo GLB.");
      wrap.dataset.loading = "false";
      return;
    }
    await ensureModelViewerLoaded();
    if (!customElements.get("model-viewer")) {
      throw new Error("No se pudo inicializar model-viewer.");
    }
    if (dishDetail.dataset.dishId !== dish.id) return;
    const poster = dish.imageAvailable && dish.image ? `poster="${dish.image}"` : "";
    const iosSrc = dish.model.iosSrc && /\.usdz$/i.test(dish.model.iosSrc) &&
      await resourceExists(dish.model.iosSrc)
      ? `ios-src="${dish.model.iosSrc}"`
      : "";
    wrap.innerHTML = `<model-viewer src="${dish.model.src}" ${poster} ${iosSrc} alt="Modelo 3D de ${dish.name}" camera-controls auto-rotate touch-action="pan-y" ar ar-modes="webxr scene-viewer quick-look" environment-image="neutral" shadow-intensity="1" loading="eager"><button slot="ar-button" class="ar-button" id="activate-ar" hidden>Ver en mi espacio</button></model-viewer><p class="ar-compatibility" id="ar-compatibility" role="status" hidden></p>`;
    const viewer = wrap.querySelector("model-viewer");
    const arButton = wrap.querySelector("#activate-ar");
    const arCompatibility = wrap.querySelector("#ar-compatibility");
    let modelLoaded = false;
    const modelLoadTimeout = setTimeout(() => {
      if (modelLoaded || !wrap.isConnected || dishDetail.dataset.dishId !== dish.id) return;
      wrap.innerHTML = modelFallbackMarkup(dish, "El modelo 3D tardó demasiado en cargar.");
      wrap.dataset.loading = "false";
    }, 20000);
    const syncAR = () => {
      if (!modelLoaded) return;
      const canActivateAR = Boolean(window.isSecureContext && viewer.canActivateAR);
      arButton.hidden = !canActivateAR;
      arCompatibility.hidden = canActivateAR;
      arCompatibility.textContent = window.isSecureContext
        ? "La realidad aumentada no está disponible en este dispositivo o navegador."
        : "La realidad aumentada requiere HTTPS o localhost.";
    };
    viewer.addEventListener("load", () => {
      clearTimeout(modelLoadTimeout);
      modelLoaded = true;
      wrap.dataset.loading = "false";
      syncAR();
    }, { once:true });
    viewer.addEventListener("ar-status", syncAR);
    viewer.addEventListener("error", () => {
      clearTimeout(modelLoadTimeout);
      wrap.innerHTML = modelFallbackMarkup(dish, "No se pudo cargar el archivo GLB.");
      wrap.dataset.loading = "false";
    }, { once:true });
    arButton.addEventListener("click", () => {
      if (window.isSecureContext && viewer.canActivateAR) viewer.activateAR();
    });
  } catch (error) {
    wrap.innerHTML = modelFallbackMarkup(dish, "No se pudo iniciar el visor 3D.");
    wrap.dataset.loading = "false";
    showToast("No se pudo iniciar el visor 3D.");
    console.error(error);
  }
}

async function loadMenuData() {
  try {
    const response = await fetch("data/menu.json");
    if (!response.ok) throw new Error(`No se pudo cargar data/menu.json (${response.status})`);
    const data = await response.json();
    const expectedNames = [
      "Tartar de atún con wakame",
      "Merluza con gulas al ajillo y alioli de tinta de calamar",
      "Canelón de carrillada",
      "Carrillada ibérica al PX",
      "Tiras de pollo al curry rojo y mahonesa de soja"
    ];
    if (!Array.isArray(data.dishes) || data.dishes.length !== expectedNames.length ||
        data.dishes.some((dish, index) => dish.name !== expectedNames[index])) {
      throw new Error("data/menu.json debe contener exactamente los cinco platos indicados.");
    }
    menuItems = data.dishes;
    const availability = await Promise.all(menuItems.map(async dish => {
      const imageAvailable = Boolean(dish.image && dish.imageAvailable);
      const modelAvailable = dish.model && dish.model.available && /\.glb$/i.test(dish.model.src || "") &&
        ["illustrative", "scanned"].includes(dish.model.provenance)
        ? await resourceExists(dish.model.src)
        : false;
      return { imageAvailable, modelAvailable };
    }));
    menuItems.forEach((dish, index) => {
      dish.imageAvailable = availability[index].imageAvailable;
      dish.modelAvailable = availability[index].modelAvailable;
    });
    renderMenu();
  } catch (error) {
    dishGrid.innerHTML = `<p class="menu-error">No se pudo cargar la carta. ${error.message}</p>`;
  }
}
loadMenuData();

async function resourceExists(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, { method:"HEAD", cache:"no-store", signal:controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

document.querySelectorAll(".dialog-close").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
dishDialog.addEventListener("click", event => { if (event.target === dishDialog) dishDialog.close(); });

function initPhotoTour() {
  const image = document.querySelector("#tour-photo-image");
  const caption = document.querySelector("#tour-photo-caption");
  const buttons = [...document.querySelectorAll("[data-tour-photo]")];
  const photos = {
    exterior: {
      src:"assets/negocio/recorrido-exterior.jpg",
      alt:"Fachada de Las Dunas con miembros del equipo frente a la entrada",
      caption:"Exterior · fachada y equipo"
    },
    interior: {
      src:"assets/negocio/recorrido-interior.jpg",
      alt:"Vista del interior de Las Dunas, con la barra y el salón",
      caption:"Interior · barra y salón"
    }
  };
  if (!image || !caption || buttons.length === 0) return;

  buttons.forEach(button => button.addEventListener("click", () => {
    const photo = photos[button.dataset.tourPhoto];
    if (!photo) return;
    image.src = photo.src;
    image.alt = photo.alt;
    caption.textContent = photo.caption;
    buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  }));
}
initPhotoTour();

function loadImageDimensions(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => reject(new Error(`Tiempo de espera al cargar ${path}.`)), 15000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve({ width:image.naturalWidth, height:image.naturalHeight });
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`No se pudo cargar ${path}.`));
    };
    image.src = path;
    if (image.complete) {
      clearTimeout(timeout);
      if (image.naturalWidth > 0) resolve({ width:image.naturalWidth, height:image.naturalHeight });
      else reject(new Error(`No se pudo cargar ${path}.`));
    }
  });
}

function isValidPanoramaScene(scene) {
  return scene && scene.available === true &&
    typeof scene.id === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(scene.id) &&
    typeof scene.title === "string" && typeof scene.panorama === "string";
}

function mapPanoramaHotSpots(scene, sceneIds) {
  if (!Array.isArray(scene.hotSpots)) return [];
  return scene.hotSpots
    .filter(hotSpot => hotSpot && hotSpot.type === "scene" &&
      sceneIds.has(hotSpot.sceneId) && Number.isFinite(hotSpot.pitch) &&
      Number.isFinite(hotSpot.yaw) && typeof hotSpot.text === "string")
    .map(hotSpot => ({
      type:"scene",
      sceneId:hotSpot.sceneId,
      pitch:hotSpot.pitch,
      yaw:hotSpot.yaw,
      text:hotSpot.text
    }));
}

async function ensurePannellumLoaded() {
  if (window.pannellum) return;
  await Promise.all([
    loadStylesheet("https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"),
    loadScript("https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js")
  ]);
  if (!window.pannellum) throw new Error("Pannellum no se pudo inicializar.");
}

async function initPanorama() {
  const panorama = document.querySelector("#panorama");
  const placeholder = document.querySelector("#tour-placeholder");
  const instructions = document.querySelector("#tour-instructions");
  if (!panorama || !placeholder || !instructions) return;

  try {
    const configPath = panorama.dataset.config || "data/panorama.json";
    const response = await fetch(configPath);
    if (!response.ok) throw new Error(`No se pudo cargar ${configPath} (${response.status}).`);
    const config = await response.json();
    if (!Array.isArray(config.scenes)) throw new Error("La configuración del recorrido no contiene escenas válidas.");

    const configuredScenes = config.scenes.filter(isValidPanoramaScene);
    if (configuredScenes.length === 0) return;

    const availableScenes = [];
    for (const scene of configuredScenes) {
      if (!await resourceExists(scene.panorama)) {
        if (scene.id === config.startScene) showToast("No se encontró la fotografía panorámica configurada.");
        continue;
      }
      const dimensions = await loadImageDimensions(scene.panorama);
      if (Math.abs(dimensions.width / dimensions.height - 2) / 2 > 0.02) {
        if (scene.id === config.startScene) showToast("El panorama debe ser equirectangular y tener proporción 2:1.");
        continue;
      }
      availableScenes.push({
        ...scene,
        vaov:Math.min(180, 360 * dimensions.height / dimensions.width)
      });
    }
    if (availableScenes.length === 0) return;

    await ensurePannellumLoaded();
    const sceneIds = new Set(availableScenes.map(scene => scene.id));
    const scenes = Object.fromEntries(availableScenes.map(scene => [scene.id, {
      title:scene.title,
      type:"equirectangular",
      panorama:scene.panorama,
      vaov:scene.vaov,
      hotSpots:mapPanoramaHotSpots(scene, sceneIds)
    }]));
    const firstScene = sceneIds.has(config.startScene) ? config.startScene : availableScenes[0].id;
    const controls = {
      autoLoad:true,
      showControls:true,
      showFullscreenCtrl:true,
      mouseZoom:true,
      doubleClickZoom:true,
      draggable:true,
      hfov:100,
      minHfov:50,
      maxHfov:110
    };
    const viewerConfig = availableScenes.length === 1
      ? { ...controls, ...scenes[firstScene] }
      : {
          default:{ ...controls, firstScene, sceneFadeDuration:700 },
          scenes
        };

    panorama.hidden = false;
    const viewer = window.pannellum.viewer("panorama", viewerConfig);
    viewer.on("load", () => {
      placeholder.hidden = true;
      const liveCopy = document.querySelector("#tour-live-copy");
      if (liveCopy) liveCopy.hidden = false;
      instructions.hidden = false;
    });
    viewer.on("error", () => {
      panorama.hidden = true;
      placeholder.hidden = false;
      const liveCopy = document.querySelector("#tour-live-copy");
      if (liveCopy) liveCopy.hidden = true;
      instructions.hidden = true;
      showToast("No se pudo cargar el panorama. Comprueba el archivo e inténtalo de nuevo.");
    });
    setupGyroscope(viewer);
    const activateOnKeyboard = (control, label, action) => {
      if (!control) return;
      control.setAttribute("role", "button");
      control.tabIndex = 0;
      control.setAttribute("aria-label", label);
      control.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        action();
      });
    };
    activateOnKeyboard(panorama.querySelector(".pnlm-zoom-in"), "Acercar vista", () => {
      viewer.setHfov(viewer.getHfov() - 5, false);
    });
    activateOnKeyboard(panorama.querySelector(".pnlm-zoom-out"), "Alejar vista", () => {
      viewer.setHfov(viewer.getHfov() + 5, false);
    });
    const fullscreenButton = document.querySelector("#fullscreen-toggle");
    const pannellumFullscreenControl = panorama.querySelector(".pnlm-fullscreen-toggle-button");
    if (pannellumFullscreenControl) {
      pannellumFullscreenControl.hidden = true;
      activateOnKeyboard(pannellumFullscreenControl, "Entrar en pantalla completa", () => viewer.toggleFullscreen());
    }
    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", () => {
        try {
          viewer.toggleFullscreen();
        } catch {
          showToast("La pantalla completa no está disponible en este navegador.");
        }
      });
      viewer.on("fullscreenchange", isFullscreen => {
        const label = isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa";
        fullscreenButton.textContent = label;
        fullscreenButton.setAttribute("aria-label", label);
        fullscreenButton.hidden = isFullscreen;
        if (pannellumFullscreenControl) {
          pannellumFullscreenControl.hidden = !isFullscreen;
          pannellumFullscreenControl.setAttribute("aria-label", label);
          pannellumFullscreenControl.title = label;
        }
      });
    }
  } catch (error) {
    panorama.hidden = true;
    placeholder.hidden = false;
    const liveCopy = document.querySelector("#tour-live-copy");
    if (liveCopy) liveCopy.hidden = true;
    instructions.hidden = true;
    showToast("No se pudo iniciar el recorrido 360°. Estamos preparando nuestro recorrido 360°.");
    console.error(error);
  }
}
initPanorama();

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    const timeout = setTimeout(() => {
      link.remove();
      reject(new Error("Tiempo de espera al cargar la hoja de estilos del visor."));
    }, 15000);
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    link.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("No se pudo cargar la hoja de estilos del visor."));
    };
    document.head.append(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("Tiempo de espera al cargar el visor panorámico."));
    }, 15000);
    script.src = src;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("No se pudo cargar el visor panorámico."));
    };
    document.head.append(script);
  });
}

function setupGyroscope(viewer) {
  const button = document.querySelector("#gyro-toggle");
  if (!button || !window.DeviceOrientationEvent) {
    if (button) button.hidden = true;
    return;
  }
  button.addEventListener("click", async () => {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") throw new Error("Permiso denegado");
      }
      window.addEventListener("deviceorientation", event => {
        if (event.alpha == null) return;
        viewer.setYaw(event.alpha);
        if (event.beta != null) viewer.setPitch(Math.max(-60, Math.min(60, event.beta - 45)));
      }, { passive:true });
      button.textContent = "Giroscopio activo";
      button.disabled = true;
    } catch {
      showToast("El giroscopio no está disponible en este dispositivo.");
    }
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function whatsAppUrl(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

document.querySelector("#reservation-form").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const text = `Hola, quiero solicitar una reserva:\nNombre: ${data.name}\nTeléfono: ${data.phone}\nFecha: ${data.date}\nHora: ${data.time}\nComensales: ${data.people}\nOcasión: ${data.occasion}\nObservaciones: ${data.notes || "Ninguna"}\n\nEsta es una solicitud y no una reserva confirmada.`;
  window.open(whatsAppUrl("34691664814", text), "_blank", "noopener");
  showToast("Solicitud preparada. Confirma con el restaurante.");
});

document.querySelector("#group-form").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const text = `Hola, quiero solicitar presupuesto para un grupo:\nNombre: ${data.name}\nTeléfono: ${data.phone}\nFecha: ${data.date}\nHora: ${data.time}\nPersonas: ${data.people}\nOcasión: ${data.occasion}\nObservaciones: ${data.notes || "Ninguna"}`;
  window.open(whatsAppUrl("34691664814", text), "_blank", "noopener");
  showToast("Solicitud de grupo preparada.");
});

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".nav");
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen);
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
});
document.querySelectorAll(".nav a").forEach(link => link.addEventListener("click", () => {
  document.querySelector(".nav").classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
}));
