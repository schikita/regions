// Инициализация карты
const map = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    dragging: false
}).setView([53.9, 27.5667], 7);

// Базовый слой карты
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geojsonLayer;

// Стили
function style(feature) {
    return {
        fillColor: "#000000",
        weight: 1,
        opacity: 1,
        color: "#333",
        fillOpacity: 0
    };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 2,
        color: "#1976d2",
        fillColor: "#90caf9",
        fillOpacity: 0.6
    });
    layer.bringToFront();
}

function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
}

// Модальное окно
const modal = document.getElementById('regionModal');
const closeBtn = document.querySelector('.close');

function showModal(properties) {
    document.getElementById('modalTitle').textContent = properties.shapeName;

    // Собираем экономические показатели
    const indicators = Object.keys(properties)
        .filter(key => key.startsWith("econom-"))
        .map(key => `
            <div class="info-card">
                <h4>${key.replace("econom-", "Показатель ")}</h4>
                <div class="value">${properties[key]}</div>
            </div>
        `)
        .join("");

    document.getElementById('modalInfo').innerHTML = indicators;

    modal.style.display = "block";
}

// Вывод справа при наведении
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
                <h3>Добро пожаловать!</h3>
                <p>Кликните на любой регион на карте, чтобы узнать подробную экономическую информацию</p>
            </div>
        `;
    }
}

// События для каждого района
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: function(e) {
            highlightFeature(e);
            updateInfoPanel(feature.properties);
        },
        mouseout: function(e) {
            resetHighlight(e);
            updateInfoPanel(null);
        },
        click: function(e) {
            showModal(feature.properties);
        }
    });
}

// Загружаем данные из GeoJSON
fetch("geoBoundaries-BLR-ADM2.geojson")
    .then(response => response.json())
    .then(data => {
        geojsonLayer = L.geoJSON(data, {
            style: style,
            onEachFeature: onEachFeature,
            className: 'district-layer'
        }).addTo(map);

        map.fitBounds(geojsonLayer.getBounds(), {padding: [20, 20]});
    })
    .catch(error => {
        console.error("Ошибка загрузки GeoJSON:", error);
    });

// Закрытие модального окна
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

// Блокировка взаимодействия с картой
map.keyboard.disable();
map.touchZoom.disable();
