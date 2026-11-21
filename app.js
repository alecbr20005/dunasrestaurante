const dishGrid = document.querySelector("#dish-grid");
const dishDialog = document.querySelector("#dish-dialog");
const dishDetail = document.querySelector("#dish-detail");
const menuExtras = [
  { name:"Tako de atún con pesto de albahaca", category:"pescado", description:"Descripción pendiente de validación.", price:{ amount:null, confirmed:false }, ingredients:[], ingredientsConfirmed:false, allergens:{ confirmed:false, items:[], crossContamination:null } },
  { name:"Merluza con salsa de queso gratinado", category:"pescado", description:"Descripción pendiente de validación.", price:{ amount:null, confirmed:false }, ingredients:[], ingredientsConfirmed:false, allergens:{ confirmed:false, items:[], crossContamination:null } },
  { name:"Fresones de mousse de pato", category:"carne", description:"Descripción pendiente de validación.", price:{ amount:null, confirmed:false }, ingredients:[], ingredientsConfirmed:false, allergens:{ confirmed:false, items:[], crossContamination:null } }
];
let featured = [];
let menuItems = [];

function priceLabel(dish) {
  if (!dish.price || !dish.price.confirmed || typeof dish.price.amount !== "number") {
    return "Precio pendiente de confirmación";
  }
  return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR" }).format(dish.price.amount);
}

function imageMarkup(dish, className) {
  const loading = className === "detail-photo" ? "eager" : "lazy";
  return `<div class="${className} dish-photo-pending">
    <img src="${dish.image}" alt="${dish.name}" loading="${loading}" decoding="async">
    <span class="photo-placeholder">Fotografía pendiente</span>
  </div>`;
}

function cardHtml(dish, index) {
  const filter = `${dish.category || ""} ${dish.featured ? "destacado" : ""}`;
  return `<article class="dish-card" data-name="${dish.name.toLowerCase()}" data-filter="${filter}" data-index="${index}" tabindex="0">
    ${dish.image ? imageMarkup(dish, "dish-photo") : ""}
    <div class="dish-card-content">
      <span class="price">${priceLabel(dish)}</span>
      <h3>${dish.name}</h3>
      <p>${dish.description || "Descripción pendiente de validación por el restaurante."}</p>
      ${dish.model ? `<small class="model-note">${dish.model.provenance === "illustrative" ? "Modelo ilustrativo" : dish.model.provenance === "scanned" ? "Modelo escaneado" : "Procedencia del modelo pendiente de confirmar"}</small><button class="dish-3d-button" type="button" data-open-model="${index}">Ver en 3D / AR</button>` : ""}
    </div>
  </article>`;
}

function renderMenu(items = menuItems) {
  dishGrid.innerHTML = items.map(dish => cardHtml(dish, menuItems.indexOf(dish))).join("");
  bindDishCards(dishGrid);
  bindDishImages(dishGrid);
}

function bindDishCards(container) {
  container.querySelectorAll(".dish-card").forEach(card => {
    const open = () => openDish(Number(card.dataset.index));
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => { if (event.key === "Enter") open(); });
  });
  container.querySelectorAll("[data-open-model]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openDish(Number(button.dataset.openModel));
  }));
}

function bindDishImages(container) {
  container.querySelectorAll(".dish-photo-pending img").forEach(image => {
    image.addEventListener("load", () => image.closest(".dish-photo-pending").classList.add("loaded"), { once:true });
    image.addEventListener("error", () => {
      image.closest(".dish-photo-pending").classList.add("missing");
      image.remove();
    }, { once:true });
  });
}

function openDish(index) {
  const dish = menuItems[index];
  if (!dish) return;
  const ingredients = dish.ingredientsConfirmed && dish.ingredients.length
    ? dish.ingredients.join(", ")
    : "Pendientes de confirmación por el restaurante.";
  const allergens = dish.allergens.confirmed
    ? dish.allergens.items.join(", ") || "No declarados por el restaurante."
    : "No confirmados. Consulta al personal si tienes alergias o intolerancias.";
  const crossContamination = dish.allergens.confirmed
    ? dish.allergens.crossContamination || "Información pendiente."
    : "Información pendiente de confirmación.";
  dishDetail.innerHTML = `${dish.image ? imageMarkup(dish, "detail-photo") : ""}
    <p class="kicker">Ficha de plato</p><h2>${dish.name}</h2>
    <div class="detail-meta"><span>${priceLabel(dish)}</span></div>
    <p>${dish.description || "Descripción pendiente de validación por el restaurante."}</p>
    <div class="detail-list">
      <div><strong>Ingredientes</strong><p>${ingredients}</p></div>
      <div><strong>Alérgenos</strong><p>${allergens}</p></div>
      <div><strong>Contaminación cruzada</strong><p>${crossContamination}</p></div>
      <div><strong>Última revisión</strong><p>${dish.lastReviewed || "Pendiente"}</p></div>
    </div>
    ${dish.model ? `<small class="model-note">${dish.model.provenance === "illustrative" ? "Representación 3D ilustrativa." : dish.model.provenance === "scanned" ? "Modelo 3D escaneado." : "Procedencia del modelo pendiente de clasificación."}</small><div class="model-viewer-wrap" id="model-viewer-wrap"></div>` : ""}
    <p class="form-note">La información sobre alergias e intolerancias debe confirmarse con el personal del restaurante.</p>
    <button class="button button-primary" id="detail-guide">Ver en Food Guide</button>`;
  dishDialog.showModal();
  bindDishImages(dishDetail);
  if (dish.model) prepareModelViewer(dish);
  document.querySelector("#detail-guide").addEventListener("click", () => {
    dishDialog.close();
    document.querySelector("#food-guide").scrollIntoView();
  });
}

async function prepareModelViewer(dish) {
  const wrap = document.querySelector("#model-viewer-wrap");
  if (!wrap) return;
  const modelPath = dish.model.src;
  wrap.innerHTML = `<div class="model-unavailable"><strong>Comprobando modelo 3D…</strong></div>`;
  try {
    const response = await fetch(modelPath, { method:"HEAD" });
    if (!response.ok) {
      wrap.innerHTML = `<div class="model-unavailable"><strong>Modelo 3D pendiente</strong><p>Añade un GLB válido en <code>${modelPath}</code>. El botón AR solo aparecerá si el modelo y el dispositivo son compatibles.</p></div>`;
      return;
    }
    if (!window.customElements || !customElements.get("model-viewer")) {
      wrap.innerHTML = `<div class="model-unavailable"><strong>Visor 3D no disponible</strong><p>No se pudo inicializar el visor. El archivo esperado es <code>${modelPath}</code>.</p></div>`;
      return;
    }
    wrap.innerHTML = `<model-viewer src="${modelPath}" alt="Modelo 3D de ${dish.name}" camera-controls touch-action="pan-y" ar ar-modes="webxr scene-viewer quick-look" shadow-intensity="1" loading="eager"><button slot="ar-button" class="ar-button" id="activate-ar" hidden>Ver en tu espacio</button></model-viewer>`;
    const viewer = wrap.querySelector("model-viewer");
    const arButton = wrap.querySelector("#activate-ar");
    const syncAR = () => { arButton.hidden = !viewer.canActivateAR; };
    viewer.addEventListener("load", syncAR, { once:true });
    viewer.addEventListener("ar-status", syncAR);
    viewer.addEventListener("error", () => {
      wrap.innerHTML = `<div class="model-unavailable"><strong>No se pudo cargar el modelo 3D</strong><p>Revisa que el archivo GLB esté completo y sea compatible: <code>${modelPath}</code>.</p></div>`;
    }, { once:true });
    arButton.addEventListener("click", () => viewer.activateAR());
  } catch (error) {
    wrap.innerHTML = `<div class="model-unavailable"><strong>No se pudo verificar el modelo 3D</strong><p>Comprueba el archivo y la conexión: <code>${modelPath}</code>.</p></div>`;
  }
}

async function loadMenuData() {
  try {
    const response = await fetch("data/menu.json");
    if (!response.ok) throw new Error(`No se pudo cargar data/menu.json (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data.dishes) || data.dishes.length !== 5) throw new Error("data/menu.json debe contener los cinco platos destacados");
    featured = data.dishes;
    menuItems = [...featured, ...menuExtras];
    renderMenu();
  } catch (error) {
    dishGrid.innerHTML = `<p class="menu-error">No se pudo cargar la carta. ${error.message}</p>`;
  }
}
loadMenuData();
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  const filter = button.dataset.filter;
  document.querySelectorAll(".dish-card").forEach(card => {
    card.style.display = filter === "todos" || card.dataset.filter.includes(filter) ? "" : "none";
  });
}));

document.querySelector("#menu-search").addEventListener("input", event => {
  const query = event.target.value.toLowerCase().trim();
  document.querySelectorAll(".dish-card").forEach(card => card.style.display = card.dataset.name.includes(query) ? "" : "none");
});

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
  tab.classList.add("active");
  if (tab.dataset.category === "bodega") {
    dishGrid.innerHTML = `<article class="dish-card"><h3>Bodega</h3><p>Consulta la selección vigente en el restaurante. La lista detallada requiere verificar la carta oficial actualizada.</p></article>`;
  } else if (tab.dataset.category === "empresa") {
    dishGrid.innerHTML = `<article class="dish-card"><h3>Menús concertados</h3><p><a href="https://www.lasdunassevilla.com/wp-content/uploads/2026/10/Menu_empresa_2026_web.pdf" target="_blank">Abrir PDF oficial 2026</a></p></article>`;
  } else if (tab.dataset.category === "grupos") {
    dishGrid.innerHTML = featured.map((dish, index) => cardHtml(dish, menuItems.indexOf(dish))).join("");
    bindDishCards(dishGrid);
    bindDishImages(dishGrid);
  } else renderMenu();
}));

document.querySelectorAll(".dialog-close").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
dishDialog.addEventListener("click", event => { if (event.target === dishDialog) dishDialog.close(); });

async function initPanorama() {
  const panorama = document.querySelector("#panorama");
  const placeholder = document.querySelector("#tour-placeholder");
  const instructions = document.querySelector("#tour-instructions");
  try {
    const response = await fetch("assets/recorrido-360.jpg", { method:"HEAD" });
    if (!response.ok) return;
    if (!window.pannellum) return;
      const panoramaImage = new Image();
      panoramaImage.src = "assets/recorrido-360.jpg";
      await new Promise((resolve, reject) => {
        panoramaImage.onload = resolve;
        panoramaImage.onerror = reject;
      });
      const ratio = panoramaImage.naturalWidth / panoramaImage.naturalHeight;
      if (Math.abs(ratio - 2) > 0.02) {
        showToast("El panorama debe ser equirectangular y tener proporción 2:1.");
        return;
      }
    placeholder.hidden = true;
    panorama.hidden = false;
    const viewer = window.pannellum.viewer("panorama", {
      type:"equirectangular",
      panorama:"assets/recorrido-360.jpg",
      autoLoad:true,
      showControls:true,
      mouseZoom:true,
      doubleClickZoom:true,
      draggable:true,
      hfov:100,
      minHfov:50,
      maxHfov:110
    });
    instructions.hidden = false;
    setupGyroscope(viewer);
  } catch {
    panorama.hidden = true;
  }
}
initPanorama();

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

function runGuide(query) {
  const result = document.querySelector("#guide-result");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = featured.filter(dish => {
    const confirmedIngredients = dish.ingredientsConfirmed ? dish.ingredients.join(" ") : "";
    return `${dish.name} ${dish.category} ${confirmedIngredients}`.toLowerCase().includes(normalizedQuery);
  });
  if (!query.trim()) { result.innerHTML = "<p>Introduce una preferencia o ingrediente.</p>"; return; }
  if (!matches.length) { result.innerHTML = "<p>No tenemos una coincidencia confirmada. Consulta al personal las opciones disponibles.</p>"; return; }
  result.innerHTML = matches.slice(0,3).map(dish => `<strong>${dish.name}</strong><small>${dish.description || "Descripción pendiente de validación."}</small>`).join("<hr>");
}
document.querySelector("#guide-search").addEventListener("click", () => runGuide(document.querySelector("#guide-input").value));
document.querySelector("#guide-input").addEventListener("keydown", event => { if (event.key === "Enter") runGuide(event.target.value); });

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
  const text = `Hola, quiero solicitar presupuesto para un grupo:\nNombre: ${data.name}\nTeléfono: ${data.phone}\nFecha: ${data.date}\nPersonas: ${data.people}\nOcasión: ${data.occasion}`;
  window.open(whatsAppUrl("34691664814", text), "_blank", "noopener");
  showToast("Solicitud de grupo preparada.");
});

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".nav");
  nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", nav.classList.contains("open"));
});
document.querySelectorAll(".nav a").forEach(link => link.addEventListener("click", () => document.querySelector(".nav").classList.remove("open")));

document.querySelector("[data-lang-toggle]").addEventListener("click", () => showToast("Versión inglesa en preparación"));
