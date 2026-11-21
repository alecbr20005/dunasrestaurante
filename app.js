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
    : "";
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
    modelViewerLoading = import("https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js");
  }
  return modelViewerLoading;
}

async function loadDishModel(dish) {
  const wrap = document.querySelector("#model-viewer-wrap");
  if (!wrap || !dish.modelAvailable || wrap.dataset.loading === "true") return;
  wrap.dataset.loading = "true";
  wrap.hidden = false;
  wrap.innerHTML = `<div class="model-unavailable"><strong>Cargando visor 3D…</strong></div>`;
  try {
    const response = await fetch(dish.model.src, { method:"HEAD", cache:"no-store" });
    if (!response.ok) {
      dish.modelAvailable = false;
      wrap.hidden = true;
      wrap.replaceChildren();
      document.querySelectorAll(`[data-open-model="${dish.id}"]`).forEach(button => button.remove());
      document.querySelector("#detail-model-button")?.remove();
      return;
    }
    await ensureModelViewerLoaded();
    if (!customElements.get("model-viewer")) {
      throw new Error("No se pudo inicializar model-viewer.");
    }
    if (dishDetail.dataset.dishId !== dish.id) return;
    wrap.innerHTML = `<model-viewer src="${dish.model.src}" alt="Modelo 3D de ${dish.name}" camera-controls touch-action="pan-y" ar ar-modes="webxr scene-viewer quick-look" shadow-intensity="1" loading="eager"><button slot="ar-button" class="ar-button" id="activate-ar" hidden>Ver en tu espacio</button></model-viewer>`;
    const viewer = wrap.querySelector("model-viewer");
    const arButton = wrap.querySelector("#activate-ar");
    const syncAR = () => { arButton.hidden = !viewer.canActivateAR; };
    viewer.addEventListener("load", syncAR, { once:true });
    viewer.addEventListener("ar-status", syncAR);
    viewer.addEventListener("error", () => {
      wrap.innerHTML = `<div class="model-unavailable"><strong>No se pudo cargar el modelo 3D.</strong></div>`;
      wrap.dataset.loading = "false";
    }, { once:true });
    arButton.addEventListener("click", () => viewer.activateAR());
  } catch (error) {
    wrap.innerHTML = `<div class="model-unavailable"><strong>No se pudo cargar el visor 3D.</strong><p>Inténtalo de nuevo más tarde.</p></div>`;
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
      const [imageAvailable, modelAvailable] = await Promise.all([
        dish.image && dish.imageAvailable ? resourceExists(dish.image) : false,
        dish.model && dish.model.available && dish.model.src && ["illustrative", "scanned"].includes(dish.model.provenance)
          ? resourceExists(dish.model.src)
          : false
      ]);
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
  try {
    const response = await fetch(path, { method:"HEAD", cache:"no-store" });
    return response.ok;
  } catch {
    return false;
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

async function initPanorama() {
  const panorama = document.querySelector("#panorama");
  const placeholder = document.querySelector("#tour-placeholder");
  const instructions = document.querySelector("#tour-instructions");
  if (panorama.dataset.available !== "true") return;
  const imagePath = panorama.dataset.src || "assets/recorrido-360.jpg";
  try {
    const response = await fetch(imagePath, { method:"HEAD", cache:"no-store" });
    if (!response.ok) return;
    const panoramaImage = new Image();
    panoramaImage.src = imagePath;
    await new Promise((resolve, reject) => {
      panoramaImage.onload = resolve;
      panoramaImage.onerror = reject;
    });
    const ratio = panoramaImage.naturalWidth / panoramaImage.naturalHeight;
    if (Math.abs(ratio - 2) > 0.02) {
      showToast("El panorama debe ser equirectangular y tener proporción 2:1.");
      return;
    }

    await Promise.all([
      loadStylesheet("https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"),
      loadScript("https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js")
    ]);
    if (!window.pannellum) throw new Error("Pannellum no se pudo inicializar.");

    panorama.hidden = false;
    const viewer = window.pannellum.viewer("panorama", {
      type:"equirectangular",
      panorama:imagePath,
      autoLoad:true,
      showControls:true,
      showFullscreenCtrl:false,
      mouseZoom:true,
      doubleClickZoom:true,
      draggable:true,
      hfov:100,
      minHfov:50,
      maxHfov:110
    });
    viewer.on("error", () => {
      panorama.hidden = true;
      placeholder.hidden = false;
      instructions.hidden = true;
      showToast("No se pudo cargar el panorama. Comprueba el archivo e inténtalo de nuevo.");
    });
    placeholder.hidden = true;
    instructions.hidden = false;
    setupGyroscope(viewer);
    document.querySelector("#fullscreen-toggle").addEventListener("click", () => {
      try {
        viewer.toggleFullscreen();
      } catch {
        showToast("La pantalla completa no está disponible en este navegador.");
      }
    });
  } catch (error) {
    panorama.hidden = true;
    showToast("No se pudo iniciar el recorrido 360°. La vista provisional sigue disponible.");
    console.error(error);
  }
}
initPanorama();

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = () => reject(new Error("No se pudo cargar la hoja de estilos del visor."));
    document.head.append(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar el visor panorámico."));
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
