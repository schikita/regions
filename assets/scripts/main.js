// Цвета регионов
const regionsColors = {
  "Брестская область": { color: "#e74c3c" },
  "Витебская область": { color: "#9b59b6" },
  "Гомельская область": { color: "#27ae60" },
  "Гродненская область": { color: "#f39c12" },
  "Минская область":   { color: "#2980b9" },
  "Могилевская область": { color: "#00b893" },
};

// Карта
const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

const map = L.map("map", {
  zoomControl: isMobile,          // покажем «+ / -» на мобиле
  scrollWheelZoom: false,         // колесо нам не нужно на мобиле
  doubleClickZoom: isMobile,      // двойной тап увеличивает
  dragging: true,                 // позволяем перетаскивать и на мобиле
  touchZoom: true,                // включаем pinch-to-zoom
  attributionControl: false,
  tap: false,                     // во многих случаях помогает на iOS
  tapTolerance: 15
}).setView([54.4, 27.5667], isMobile ? 8 : 7.8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20, attribution: "",
}).addTo(map);

let geojsonLayer;

// Стиль геометрии
function style(feature) {
  const { regionGroup, linkReg } = feature.properties;
  let color = "#cccccc";
  if (regionGroup && regionsColors[regionGroup]) {
    color = regionsColors[regionGroup].color;
  }
  return {
    fillColor: color,
    weight: 1,
    opacity: 1,
    color: "#333",
    fillOpacity: (typeof linkReg === "string" && linkReg.trim() !== "") ? 0.8 : 0.22
  };
}


// Ховер
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({ weight: 2, color: "#1976d2", fillColor: "#90caf9", fillOpacity: 0.6 });
  layer.bringToFront();
}
function resetHighlight(e) {
  geojsonLayer.resetStyle(e.target);
}

// Модалка
const modal = document.getElementById("regionModal");
const closeBtn = document.querySelector(".close");

function showModal(properties) {
  // Заголовок
  document.getElementById("modalTitle").textContent = properties.shapeName;

  // Фон в header
  const modalHeader = document.querySelector(".modal-header");
  if (properties.imgRegion) {
    modalHeader.style.backgroundImage = `url('${properties.imgRegion}')`;
  } else {
    modalHeader.style.backgroundImage = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  }

  // Карточки показателей + описание
  const indicatorsDef = [
    { key: "area", label: "Площадь<br> района" },
    { key: "population", label: "Численность населения" },
    { key: "economicallyActive", label: "Заняты в экономике" },
  ];

  const indicators = indicatorsDef.map(item => `
    <div class="info-card">
      <h4>${item.label}</h4>
      <div class="value">${properties[item.key] ?? "—"}</div>
    </div>
  `).join("");

  const infoHtml = `
    ${indicators}
    <div class="description">
      ${properties.regionInfo || "Нет дополнительной информации."}
    </div>
  `;
  document.getElementById("modalInfo").innerHTML = infoHtml;

  // Кнопка-ссылка в футере (только если есть валидная ссылка)
  const footer = document.getElementById("modalFooter");
  const hasLink = typeof properties.linkReg === "string" && properties.linkReg.trim() !== "";
  if (hasLink) {
    footer.innerHTML = `<a href="${properties.linkReg}" target="_blank" rel="noopener">Подробнее</a>`;
  } else {
    footer.innerHTML = "";
  }

  modal.style.display = "block";
}

// Правый инфо-панель
function updateInfoPanel(props) {
  const panel = document.querySelector(".info-content");
  if (props) {
    panel.innerHTML = `
      <h2>${props.shapeName}</h2>
      <img src="${props.imgRegion}" alt="${props.shapeName}" style="width:100%; border-radius:10px; margin:10px 0;">
      <p>${props.regionInfo}</p>
    `;
  } else {
    panel.innerHTML = `
        <div class="welcome-message">
          <i class="fas fa-map-marked-alt"></i>
          <h3>О проекте</h3>
          <p>
            Данный интерактивный проект предназначен для визуализации социально-экономического развития районов
            Республики Беларусь.
            На карте представлены области и районы страны с возможностью просмотра ключевых показателей: численности
            населения, занятости, площади, а также дополнительной аналитической информации.
            Цель проекта — обеспечить наглядное представление о потенциале и динамике развития каждого района,
            способствовать информированности и открытости данных.</p>
        </div>
        <div class="project-hint">
          🗺️ Кликните на любой регион на карте, чтобы узнать подробную экономическую информацию.
        </div>
    `;
  }
}

// Пометка кликабельности (меняем классы path после добавления в DOM)
function markClickable(layer, isClickable) {
  layer.on("add", () => {
    const el = layer.getElement();
    if (!el) return;
    el.classList.add("district-path");
    el.classList.toggle("clickable", isClickable);
    el.classList.toggle("disabled", !isClickable);
  });
  // Дополнительно ослабим заливку для не кликабельных
  if (!isClickable) layer.setStyle({ fillOpacity: 0.22 });
}

// Обработчики событий на каждом районе
function onEachFeature(feature, layer) {
  const props = feature.properties;
  const hasLink = typeof props.linkReg === "string" && props.linkReg.trim() !== "";

  markClickable(layer, hasLink);

  layer.on({
    mouseover: (e) => { highlightFeature(e); updateInfoPanel(props); },
    mouseout:  (e) => { resetHighlight(e); updateInfoPanel(null); },
    click:     ()  => { if (hasLink) showModal(props); /* иначе — ничего */ }
  });
}

// Загрузка GeoJSON
fetch("geoBoundaries-BLR-ADM2-1.geojson")
  .then((r) => r.json())
  .then((data) => {
    data.features.forEach((feature) => {
      const p = feature.properties;

      // Названия/группы
      p.shapeName   = p.NL_NAME_2 || p.NAME_2 || "Неизвестный район";
      p.regionGroup = p.regionGroup || p.NL_NAME_1 || p.NAME_1 || "Неизвестная область";

      // Заполнители
      p.imgRegion  = p.imgRegion  || "./assets/img/default.jpg";
      p.regionInfo = p.regionInfo || "Нет дополнительной информации.";
      for (let i = 1; i <= 3; i++) p[`econom-${i}`] = p[`econom-${i}`] || "—";

      // Ссылки
      if (typeof p.linkReg !== "string" || p.linkReg.trim() === "") p.linkReg = null;
    });

    // Добавляем слой с районами
    geojsonLayer = L.geoJSON(data, {
      style: style,
      onEachFeature,
    }).addTo(map);

    // Масштабируем под всю Беларусь
    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20], maxZoom: 8.5 });

    // Через короткую задержку сдвигаем карту немного вверх (на 120 пикселей)
    setTimeout(() => {
      map.panBy([0, 40]); // ↑ вверх, можно увеличить до 150
    }, 300);
  })
  .catch((err) => console.error("Ошибка загрузки GeoJSON:", err));


// Закрытие модалки
closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// Блокируем лишние взаимодействия
map.keyboard.disable();
//map.touchZoom.disable();
