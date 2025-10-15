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

// === Глобальный флаг выбранного района, чтобы ничего не "всплывало" после скрытия
let districtUIOpen = false;
let hideTimer = null;

// ========================================
// ИНИЦИАЛИЗАЦИЯ КАРТЫ
// ========================================
const isMobile =
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

function checkIsDesktop() {
  return window.innerWidth >= 768;
}

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
    fillOpacity:
      typeof linkReg === "string" && linkReg.trim() !== "" ? 0.8 : 0.22,
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

// Хелпер: создать (или вернуть) контейнер карточек
function ensureIndicatorsContainer() {
  let el = document.querySelector(".district-indicators");
  if (!el) {
    el = document.createElement("div");
    el.className = "district-indicators";
    document.body.appendChild(el);
  }
  return el;
}

// Хелпер: удалить UI карточек и кнопку полностью
function destroyDistrictUI() {
  const indicators = document.querySelector(".district-indicators");
  const backBtn = document.querySelector(".back-button");
  if (indicators && indicators.parentNode)
    indicators.parentNode.removeChild(indicators);
  if (backBtn && backBtn.parentNode) backBtn.parentNode.removeChild(backBtn);
}

// ========================================
// МОДАЛЬНОЕ ОКНО (ДЛЯ МОБИЛЬНЫХ)
// ========================================
const modal = document.getElementById("regionModal");
const closeBtn = document.querySelector(".close");

function showModal(properties) {
  document.getElementById("modalTitle").textContent = properties.shapeName;

  const modalHeader = document.querySelector(".modal-header");
  if (properties.imgRegion) {
    modalHeader.style.backgroundImage = `url('${properties.imgRegion}')`;
  } else {
    modalHeader.style.backgroundImage =
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  }

  const indicatorsDef = [
    { key: "area", label: "Площадь<br> района" },
    { key: "population", label: "Численность населения" },
    { key: "economicallyActive", label: "Заняты в экономике" },
  ];

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

  const infoHtml = `
    ${indicators}
    <div class="description">
      ${properties.regionInfo || "Нет дополнительной информации."}
    </div>
  `;
  document.getElementById("modalInfo").innerHTML = infoHtml;

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

closeBtn.onclick = () => {
  modal.style.display = "none";
};

window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
};

// ========================================
// ПОКАЗ ИНФОРМАЦИИ О РАЙОНЕ (ДЛЯ ДЕСКТОПА)
// ========================================
function showDistrictInfo(properties, layer) {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  const indicatorsContainer = ensureIndicatorsContainer();

  let backButton = document.querySelector(".back-button");
  if (!backButton) {
    backButton = document.createElement("button");
    backButton.className = "back-button";
    backButton.textContent = "← Назад";
    backButton.onclick = resetMapView;
    document.body.appendChild(backButton);
  }

  indicatorsContainer.innerHTML = `
    <div class="indicator-popup">
      <h4>Площадь района</h4>
      <div class="value">${properties.area ?? "—"}</div>
    </div>
    <div class="indicator-popup">
      <h4>Численность населения</h4>
      <div class="value">${properties.population ?? "—"}</div>
    </div>
    <div class="indicator-popup">
      <h4>Заняты в экономике</h4>
      <div class="value">${properties.economicallyActive ?? "—"}</div>
    </div>
    ${
      properties.linkReg
        ? `<div class="indicator-popup link-popup">
             <a href="${properties.linkReg}" target="_blank" rel="noopener">Подробнее →</a>
           </div>`
        : ""
    }
  `;

  // === показываем кнопку и вычисляем позицию относительно header ===
  const header = document.querySelector(".header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;

  backButton.style.top = `${headerHeight + 20}px`;
  backButton.style.display = "block";
  backButton.classList.add("active");
  backButton.style.opacity = "1";

  indicatorsContainer.style.display = "flex";
  indicatorsContainer.classList.add("active");
  districtUIOpen = true;

  const bounds = layer.getBounds();
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, duration: 0.8 });
}

// Функция сброса карты
// === СБРОС КАРТЫ И СКРЫТИЕ UI (с уничтожением DOM-узлов)
function resetMapView() {
  // если уже скрыто — выходим
  if (!districtUIOpen) return;

  const indicatorsContainer = document.querySelector(".district-indicators");
  const backButton = document.querySelector(".back-button");

  // плавная анимация исчезновения, затем полное удаление узлов
  if (indicatorsContainer) {
    indicatorsContainer.style.transition = "all 0.25s ease";
    indicatorsContainer.style.opacity = "0";
    indicatorsContainer.style.transform = "translateY(20px)";
  }
  if (backButton) {
    backButton.style.transition = "all 0.25s ease";
    backButton.style.opacity = "0";
    backButton.style.transform = "translateY(-10px)";
  }

  // Жёсткая защита от повторного появления
  districtUIOpen = false;

  hideTimer = setTimeout(() => {
    destroyDistrictUI(); // <— полностью убираем элементы из DOM
    hideTimer = null;

    // Возврат обзора карты
    if (geojsonLayer) {
      map.fitBounds(geojsonLayer.getBounds(), {
        padding: [20, 20],
        maxZoom: 8.5,
        duration: 0.8,
      });
      setTimeout(() => map.panBy([0, 40]), 300);
    }

    // Возвращаем приветственный блок после удаления UI
    updateInfoPanel(null);
  }, 260);
}

// ========================================
// ИНФОРМАЦИОННАЯ ПАНЕЛЬ (ПРИВЕТСТВИЕ)
// ========================================
function updateInfoPanel(props) {
  const panel = document.querySelector(".info-content");

  if (props) {
    panel.innerHTML = `
      <h2>${props.shapeName || props.NL_NAME_2}</h2>
      <img src="${props.imgRegion}" alt="${
      props.shapeName
    }" style="width:100%; border-radius:0px 15px 0px 15px; margin:10px 0;">
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
        ВЫБЕРИТЕ РАЙОН НА КАРТЕ
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
    // Обновляем панель только если не открыт район
    if (!districtUIOpen) {
      highlightFeature(e);
      updateInfoPanel(props);
    }
  },
  mouseout: (e) => {
    resetHighlight(e);
    // Если район не выбран — возвращаем приветствие
    if (!districtUIOpen) {
      updateInfoPanel(null);
    }
  },
  click: () => {
    if (hasLink) {
      if (checkIsDesktop()) {
        // При клике показываем район и "фиксируем" панель
        districtUIOpen = true;
        showDistrictInfo(props, layer);
        updateInfoPanel(props); // фиксируем выбранный район в панели
      } else {
        showModal(props);
      }
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
    data.features.forEach((feature) => {
      const p = feature.properties;

      p.shapeName = p.NL_NAME_2 || p.NAME_2 || "Неизвестный район";
      p.regionGroup =
        p.regionGroup || p.NL_NAME_1 || p.NAME_1 || "Неизвестная область";

      p.imgRegion = p.imgRegion || "./assets/img/default.jpg";
      p.regionInfo = p.regionInfo || "Нет дополнительной информации.";

      for (let i = 1; i <= 3; i++) {
        p[`econom-${i}`] = p[`econom-${i}`] || "—";
      }

      if (typeof p.linkReg !== "string" || p.linkReg.trim() === "") {
        p.linkReg = null;
      }
    });

    // ========================================
    // ДИНАМИЧЕСКОЕ МЕНЮ ОБЛАСТЕЙ И РАЙОНОВ
    // ========================================
    const regionList = document.getElementById("regionList");
    if (regionList) {
      // Группируем районы по областям
      const regionsMap = {};

      data.features.forEach((feature) => {
        const props = feature.properties;
        const regionName =
          props.regionGroup ||
          props.NL_NAME_1 ||
          props.NAME_1 ||
          "Неопределённая область";
        const districtName = props.shapeName || props.NL_NAME_2 || props.NAME_2;

        // Добавляем только те районы, у которых есть ссылка (linkReg)
        if (props.linkReg && props.linkReg.trim() !== "") {
          if (!regionsMap[regionName]) {
            regionsMap[regionName] = [];
          }

          regionsMap[regionName].push({
            name: districtName,
            link: props.linkReg,
          });
        }
      });

      // Очищаем меню
      regionList.innerHTML = "";

      // Генерируем разметку
      Object.entries(regionsMap).forEach(([regionName, districts]) => {
        const li = document.createElement("li");
        li.classList.add("nav-item");

        const regionButton = document.createElement("button");
        regionButton.classList.add("region-toggle");
        regionButton.textContent = regionName;

        const subList = document.createElement("ul");
        subList.classList.add("sub-list");

        districts.forEach((district) => {
          const subItem = document.createElement("li");
          const link = document.createElement("a");
          link.href = district.link;
          link.textContent = district.name;
          link.target = "_blank";
          subItem.appendChild(link);
          subList.appendChild(subItem);
        });

        li.appendChild(regionButton);
        li.appendChild(subList);
        regionList.appendChild(li);

        // Добавляем обработчик для разворачивания
        regionButton.addEventListener("click", () => {
          const isOpen = subList.classList.contains("open");

          // Закрываем все остальные подменю
          document.querySelectorAll(".sub-list.open").forEach((list) => {
            if (list !== subList) {
              list.classList.remove("open");
            }
          });

          // Переключаем текущее
          if (!isOpen) {
            subList.classList.add("open");
          } else {
            subList.classList.remove("open");
          }
        });
      });
    }

    geojsonLayer = L.geoJSON(data, {
      style: style,
      onEachFeature: onEachFeature,
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds(), {
      padding: [20, 20],
      maxZoom: 8.5,
    });

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

const navOverlay = document.createElement("div");
navOverlay.className = "nav-overlay";
document.body.appendChild(navOverlay);

function openMenu() {
  sideNav.classList.add("open");
  menuToggle.classList.add("active");
  navOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  sideNav.classList.remove("open");
  menuToggle.classList.remove("active");
  navOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  if (sideNav.classList.contains("open")) {
    closeMenu();
  } else {
    openMenu();
  }
});

navOverlay.addEventListener("click", () => {
  closeMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sideNav.classList.contains("open")) {
    closeMenu();
  }
});

// ========================================
// РАЗВОРАЧИВАНИЕ ОБЛАСТЕЙ В МЕНЮ
// ========================================
document.querySelectorAll(".region-toggle").forEach((btn) => {
  const subList = btn.nextElementSibling;
  btn.addEventListener("click", () => {
    const isOpen = subList.classList.contains("open");

    // закрываем другие открытые списки
    document.querySelectorAll(".sub-list.open").forEach((list) => {
      if (list !== subList) {
        list.classList.remove("open");
      }
    });

    // плавное закрытие текущего
    if (isOpen) {
      subList.style.maxHeight = subList.scrollHeight + "px"; // зафиксировать текущую высоту
      requestAnimationFrame(() => {
        subList.classList.remove("open");
      });
    } else {
      subList.classList.add("open");
    }
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

document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.querySelector(".back-button");
  const districtIndicators = document.querySelector(".district-indicators");

  if (backButton && districtIndicators) {
    backButton.addEventListener("click", () => {
      // Анимация исчезновения
      districtIndicators.style.opacity = "0";
      districtIndicators.style.transform = "translateY(20px)";
      backButton.style.opacity = "0";
      backButton.style.transform = "translateY(-10px)";

      // После анимации — скрываем
      setTimeout(() => {
        districtIndicators.style.display = "none";
        backButton.classList.remove("active");
        backButton.style.display = "none";
        districtIndicators.style.opacity = "";
        districtIndicators.style.transform = "";
        backButton.style.opacity = "";
        backButton.style.transform = "";
      }, 300);
    });
  }
});

// ========================================
// МОДАЛЬНОЕ ОКНО "О ПРОЕКТЕ"
// ========================================
const aboutBtn = document.getElementById("aboutProjectBtn");
const aboutModal = document.getElementById("aboutProjectModal");
const aboutClose = aboutModal?.querySelector(".about-close");

if (aboutBtn && aboutModal && aboutClose) {
  aboutBtn.addEventListener("click", () => {
    aboutModal.classList.add("active");
    document.body.classList.add("modal-open");
  });

  aboutClose.addEventListener("click", () => {
    aboutModal.classList.remove("active");
    document.body.classList.remove("modal-open");
  });

  aboutModal.addEventListener("click", (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.remove("active");
      document.body.classList.remove("modal-open");
    }
  });
}



// ======   ВЫЧИСЛЕНИЕ ВЫСОТЫ HEADER ДЛЯ ПРАВИЛЬНОГО ПОЗИЦИОНИРОВАНИЯ КНОПКИ НАЗАД === //

window.addEventListener("load", function () {
  // Получаем высоту header
  const header = document.querySelector(".header");
  const headerHeight = header.getBoundingClientRect().height;

  // Получаем кнопку "Назад"
  const backButton = document.querySelector(".back-button");

  // Устанавливаем top в зависимости от высоты header
  if (backButton) {
    backButton.style.top = `${headerHeight + 20}px`; // 20px - отступ от header
    backButton.style.display = "block"; // Делаем кнопку видимой сразу
  }
});

// Также обновляем топ кнопки при изменении размеров окна
window.addEventListener("resize", function () {
  const header = document.querySelector(".header");
  const headerHeight = header.getBoundingClientRect().height;

  const backButton = document.querySelector(".back-button");
  if (backButton) {
    backButton.style.top = `${headerHeight + 20}px`; // 20px отступ
  }
});
