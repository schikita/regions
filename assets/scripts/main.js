// ========================================
// КОНФИГУРАЦИЯ ЦВЕТОВ РЕГИОНОВ
// ========================================
const regionsColors = {
  "Брестская область": { color: "#e74c3c" },
  "Витебская область": { color: "#9b59b6" },
  "Гомельская область": { color: "#27ae60" },
  "Гродненская область": { color: "#f39c12" },
  "Минская область": { color: "#2980b9" },
  "Могилевская область": { color: "#00b893" },
};

// ========================================
// ИНИЦИАЛИЗАЦИЯ КАРТЫ
// ========================================
const isMobile =
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

const map = L.map("map", {
  zoomControl: isMobile,
  scrollWheelZoom: false,
  doubleClickZoom: isMobile,
  dragging: true,
  touchZoom: true,
  attributionControl: false,
  tap: false,
  tapTolerance: 15,
}).setView([54.4, 27.5667], isMobile ? 8 : 7.8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "",
}).addTo(map);

let geojsonLayer;

// ========================================
// СТИЛИЗАЦИЯ РАЙОНОВ
// ========================================
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
    fillOpacity: typeof linkReg === "string" && linkReg.trim() !== "" ? 0.8 : 0.22,
  };
}

// ========================================
// ОБРАБОТЧИКИ ХОВЕРА
// ========================================
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 2,
    color: "#1976d2",
    fillColor: "#90caf9",
    fillOpacity: 0.6,
  });
  layer.bringToFront();
}

function resetHighlight(e) {
  geojsonLayer.resetStyle(e.target);
}

// ========================================
// МОДАЛЬНОЕ ОКНО
// ========================================
const modal = document.getElementById("regionModal");
const closeBtn = document.querySelector(".close");

function showModal(properties) {
  // Установка заголовка
  document.getElementById("modalTitle").textContent = properties.shapeName;

  // Установка фона в header
  const modalHeader = document.querySelector(".modal-header");
  if (properties.imgRegion) {
    modalHeader.style.backgroundImage = `url('${properties.imgRegion}')`;
  } else {
    modalHeader.style.backgroundImage =
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  }

  // Определение показателей для карточек
  const indicatorsDef = [
    { key: "area", label: "Площадь<br> района" },
    { key: "population", label: "Численность населения" },
    { key: "economicallyActive", label: "Заняты в экономике" },
  ];

  // Генерация карточек показателей
  const indicators = indicatorsDef
    .map(
      (item) => `
    <div class="info-card">
      <h4>${item.label}</h4>
      <div class="value">${properties[item.key] ?? "—"}</div>
    </div>
  `
    )
    .join("");

  // Формирование полного контента с описанием
  const infoHtml = `
    ${indicators}
    <div class="description">
      ${properties.regionInfo || "Нет дополнительной информации."}
    </div>
  `;
  document.getElementById("modalInfo").innerHTML = infoHtml;

  // Кнопка-ссылка в футере (только если есть валидная ссылка)
  const footer = document.getElementById("modalFooter");
  const hasLink =
    typeof properties.linkReg === "string" && properties.linkReg.trim() !== "";
  
  if (hasLink) {
    footer.innerHTML = `<a href="${properties.linkReg}" target="_blank" rel="noopener">Подробнее</a>`;
  } else {
    footer.innerHTML = "";
  }

  modal.style.display = "block";
}

// Закрытие модального окна
closeBtn.onclick = () => {
  modal.style.display = "none";
};

window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
};

// ========================================
// ИНФОРМАЦИОННАЯ ПАНЕЛЬ
// ========================================
function updateInfoPanel(props) {
  const panel = document.querySelector(".info-content");
  
  if (props) {
    panel.innerHTML = `
      <h2>${props.shapeName}</h2>
      <img src="${props.imgRegion}" alt="${props.shapeName}" style="width:100%; border-radius:10px; margin:10px 0;">
      <p style="color:#ffffff;">${props.regionInfo}</p>
    `;
  } else {
    panel.innerHTML = `
      <div class="welcome-message">
        <i class="fas fa-map-marked-alt"></i>
        <h2>О проекте</h2>
        <p>
          Наш интерактивный проект - о социально-экономическом развитии районов Беларуси. На карте обозначены области
          и районы страны с возможностью просмотра ключевых показателей: численность населения, занятость и площадь.
          Кроме того, есть дополнительная аналитическая информация.
          Цель проекта — обеспечить наглядное представление о потенциале и динамике развития каждого района страны.
        </p>
      </div>
      <div class="project-hint">
        <img src="./assets/img/Pointer.png" width="20px;" alt="Указатель">  
        Кликните на любой район на карте, чтобы узнать подробную экономическую информацию.
      </div>
    `;
  }
}

// ========================================
// МАРКИРОВКА КЛИКАБЕЛЬНОСТИ РАЙОНОВ
// ========================================
function markClickable(layer, isClickable) {
  layer.on("add", () => {
    const el = layer.getElement();
    if (!el) return;
    
    el.classList.add("district-path");
    el.classList.toggle("clickable", isClickable);
    el.classList.toggle("disabled", !isClickable);
  });
  
  // Ослабление заливки для некликабельных районов
  if (!isClickable) {
    layer.setStyle({ fillOpacity: 0.22 });
  }
}

// ========================================
// ОБРАБОТЧИКИ СОБЫТИЙ РАЙОНОВ
// ========================================
function onEachFeature(feature, layer) {
  const props = feature.properties;
  const hasLink =
    typeof props.linkReg === "string" && props.linkReg.trim() !== "";

  markClickable(layer, hasLink);

  layer.on({
    mouseover: (e) => {
      highlightFeature(e);
      updateInfoPanel(props);
    },
    mouseout: (e) => {
      resetHighlight(e);
      updateInfoPanel(null);
    },
    click: () => {
      if (hasLink) {
        showModal(props);
      }
    },
  });
}

// ========================================
// ЗАГРУЗКА И ОБРАБОТКА GEOJSON
// ========================================
fetch("geoBoundaries-BLR-ADM2-1.geojson")
  .then((response) => response.json())
  .then((data) => {
    // Обработка свойств каждого района
    data.features.forEach((feature) => {
      const p = feature.properties;

      // Установка названий и групп
      p.shapeName = p.NL_NAME_2 || p.NAME_2 || "Неизвестный район";
      p.regionGroup = p.regionGroup || p.NL_NAME_1 || p.NAME_1 || "Неизвестная область";

      // Установка изображений и описаний по умолчанию
      p.imgRegion = p.imgRegion || "./assets/img/default.jpg";
      p.regionInfo = p.regionInfo || "Нет дополнительной информации.";
      
      // Установка экономических показателей
      for (let i = 1; i <= 3; i++) {
        p[`econom-${i}`] = p[`econom-${i}`] || "—";
      }

      // Обработка ссылок
      if (typeof p.linkReg !== "string" || p.linkReg.trim() === "") {
        p.linkReg = null;
      }
    });

    // Добавление слоя районов на карту
    geojsonLayer = L.geoJSON(data, {
      style: style,
      onEachFeature: onEachFeature,
    }).addTo(map);

    // Подгонка карты под границы Беларуси
    map.fitBounds(geojsonLayer.getBounds(), {
      padding: [20, 20],
      maxZoom: 8.5,
    });

    // Небольшой сдвиг карты вверх для лучшего позиционирования
    setTimeout(() => {
      map.panBy([0, 40]);
    }, 300);
  })
  .catch((error) => {
    console.error("Ошибка загрузки GeoJSON:", error);
  });

// ========================================
// БЛОКИРОВКА НЕЖЕЛАТЕЛЬНЫХ ВЗАИМОДЕЙСТВИЙ
// ========================================
map.keyboard.disable();

// ========================================
// НАВИГАЦИОННОЕ МЕНЮ
// ========================================
const menuToggle = document.getElementById("menuToggle");
const sideNav = document.getElementById("sideNav");
const closeNav = document.getElementById("closeNav");

// Создание оверлея
const navOverlay = document.createElement("div");
navOverlay.className = "nav-overlay";
document.body.appendChild(navOverlay);

// Функция открытия меню
function openMenu() {
  sideNav.classList.add("open");
  menuToggle.classList.add("active");
  navOverlay.classList.add("active");
  document.body.style.overflow = "hidden"; // Блокируем прокрутку
}

// Функция закрытия меню
function closeMenu() {
  sideNav.classList.remove("open");
  menuToggle.classList.remove("active");
  navOverlay.classList.remove("active");
  document.body.style.overflow = ""; // Возвращаем прокрутку
}

// Открытие/закрытие меню по клику на кнопку
menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  if (sideNav.classList.contains("open")) {
    closeMenu();  // ← Если меню открыто (крестик) - закрываем
  } else {
    openMenu();   // ← Если меню закрыто (гамбургер) - открываем
  }
});

// Закрытие меню по кнопке закрытия
closeNav.addEventListener("click", () => {
  closeMenu();
});

// Закрытие меню при клике на оверлей
navOverlay.addEventListener("click", () => {
  closeMenu();
});

// Закрытие меню при нажатии Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sideNav.classList.contains("open")) {
    closeMenu();
  }
});

// ========================================
// РАЗВОРАЧИВАНИЕ ОБЛАСТЕЙ В МЕНЮ
// ========================================
document.querySelectorAll(".region-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const subList = btn.nextElementSibling;
    subList.classList.toggle("open");
  });
});

// ========================================
// ОБРАБОТКА ИЗМЕНЕНИЯ РАЗМЕРА ОКНА
// ========================================
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    map.invalidateSize();
  }, 250);
});