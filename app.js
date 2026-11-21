const featured = [
  { name:"Tartar de atún con wakame", category:"pescado", filter:"pescado destacado", price:"Consultar carta vigente", description:"Atún con wakame.", ingredients:"Atún, wakame", allergens:"Pescado", color:"#b85a43", group:true },
  { name:"Merluza con gulas al ajillo y alioli de tinta de calamar", category:"pescado", filter:"pescado destacado", price:"Consultar carta vigente", description:"Merluza acompañada de gulas al ajillo y alioli de tinta.", ingredients:"Merluza, gulas, ajo, calamar", allergens:"Pescado, moluscos, huevo", color:"#d2b16a", group:true },
  { name:"Canelón de carrillada", category:"carne", filter:"carne destacado", price:"Consultar carta vigente", description:"Canelón relleno de carrillada.", ingredients:"Carrillada, pasta", allergens:"Gluten, lactosa, huevo", color:"#8a4e3d", group:true },
  { name:"Carrillada ibérica PX", category:"carne", filter:"carne destacado", price:"Consultar carta vigente", description:"Carrillada ibérica con salsa PX.", ingredients:"Carrillada ibérica, vino Pedro Ximénez", allergens:"Sulfitos", color:"#704138", group:true },
  { name:"Tiras de pollo al curry rojo y mahonesa de soja", category:"carne", filter:"carne destacado", price:"Consultar carta vigente", description:"Tiras de pollo con curry rojo y mahonesa de soja.", ingredients:"Pollo, curry rojo, soja", allergens:"Soja, sulfitos", color:"#c88b46", group:true }
];

const menuItems = [
  ...featured,
  { name:"Tako de atún con pesto de albahaca", category:"pescado", filter:"pescado", price:"Consultar carta vigente", description:"Atún fresco macerado con pesto de albahaca.", ingredients:"Atún, albahaca", allergens:"Pescado, frutos secos", color:"#b85a43" },
  { name:"Merluza con salsa de queso gratinado", category:"pescado", filter:"pescado", price:"Consultar carta vigente", description:"Merluza con crema de queso gratinado.", ingredients:"Merluza, queso", allergens:"Pescado, lactosa", color:"#d2b16a" },
  { name:"Fresones de mousse de pato", category:"carne", filter:"carne", price:"Consultar carta vigente", description:"Fresones rellenos de mousse de pato.", ingredients:"Pato, fresón", allergens:"Consultar al personal", color:"#8a4e3d" }
];

const dishGrid = document.querySelector("#dish-grid");
const featuredGrid = document.querySelector("#featured-grid");
const dishDialog = document.querySelector("#dish-dialog");
const dishDetail = document.querySelector("#dish-detail");

function cardHtml(dish, index) {
  return `<article class="dish-card" data-name="${dish.name.toLowerCase()}" data-filter="${dish.filter}" data-index="${index}" tabindex="0">
    <span class="price">${dish.price}</span>
    <h3>${dish.name}</h3>
    <p>${dish.description}</p>
  </article>`;
}

function renderMenu(items = menuItems) {
  dishGrid.innerHTML = items.map((dish, index) => cardHtml(dish, menuItems.indexOf(dish))).join("");
  bindDishCards(dishGrid);
}

function bindDishCards(container) {
  container.querySelectorAll(".dish-card").forEach(card => {
    const open = () => openDish(Number(card.dataset.index));
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => { if (event.key === "Enter") open(); });
  });
}

function openDish(index) {
  const dish = menuItems[index];
  if (!dish) return;
  dishDetail.innerHTML = `<p class="kicker">Ficha de plato · demo</p><h2>${dish.name}</h2>
    <div class="detail-meta"><span>${dish.price}</span></div>
    <p>${dish.description}</p>
    <div class="detail-list">
      <div><strong>Ingredientes confirmados</strong><p>${dish.ingredients}</p></div>
      <div><strong>Alérgenos indicados</strong><p>${dish.allergens}</p></div>
    </div>
    <p class="form-note">Consulta al personal antes de consumir si tienes alergias o intolerancias.</p>
    <button class="button button-primary" id="detail-guide">Ver en Food Guide</button>`;
  dishDialog.showModal();
  document.querySelector("#detail-guide").addEventListener("click", () => {
    dishDialog.close();
    document.querySelector("#food-guide").scrollIntoView();
  });
}

renderMenu();
featuredGrid.innerHTML = featured.map((dish, index) => `
  <article class="plate-card" data-index="${menuItems.indexOf(dish)}" tabindex="0">
    <div class="dish-3d" style="--dish-color:${dish.color}"></div>
    <h3>${dish.name}</h3>
    <small>Ver representación 3D ilustrativa</small>
  </article>`).join("");

featuredGrid.querySelectorAll(".plate-card").forEach(card => {
  const open = () => openDish(Number(card.dataset.index));
  card.addEventListener("click", open);
  card.addEventListener("keydown", event => { if (event.key === "Enter") open(); });
});

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
  } else renderMenu();
}));

document.querySelectorAll(".dialog-close").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
dishDialog.addEventListener("click", event => { if (event.target === dishDialog) dishDialog.close(); });

const tourDialog = document.querySelector("#tour-dialog");
document.querySelector("#open-tour").addEventListener("click", () => tourDialog.showModal());
tourDialog.addEventListener("click", event => { if (event.target === tourDialog) tourDialog.close(); });
document.querySelectorAll(".hotspot").forEach(hotspot => hotspot.addEventListener("click", () => {
  document.querySelector("#tour-label").textContent = hotspot.dataset.tour;
  document.querySelector("#tour-view").classList.toggle("zoom");
}));

function runGuide(query) {
  const result = document.querySelector("#guide-result");
  const matches = featured.filter(dish => `${dish.name} ${dish.ingredients}`.toLowerCase().includes(query.toLower()));
  if (!query.trim()) { result.innerHTML = "<p>Introduce una preferencia o ingrediente.</p>"; return; }
  if (!matches.length) { result.innerHTML = "<p>No tenemos una coincidencia confirmada. Consulta al personal las opciones disponibles.</p>"; return; }
  result.innerHTML = matches.slice(0,3).map(dish => `<strong>${dish.name}</strong><small>${dish.description}</small>`).join("<hr>");
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
