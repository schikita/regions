// Создаем карту
const map = L.map("map").setView([53.9, 27.5667], 7); // центр Минска

// Базовый слой карты
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let geojsonLayer;

// Загружаем GeoJSON
fetch("geoBoundaries-BLR-ADM2.geojson")
  .then(response => response.json())
  .then(data => {
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

      const props = layer.feature.properties;
      document.getElementById("info").innerHTML = `
        <h2>${props.shapeName}</h2>
        <p><b>ID:</b> ${props.shapeID}</p>
      `;
    }

    function resetHighlight(e) {
      geojsonLayer.resetStyle(e.target);
      document.getElementById("info").innerHTML = `
        <h2>Информация</h2>
        <p>Наведите на район на карте, чтобы увидеть информацию.</p>
      `;
    }

    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
      });
    }

    geojsonLayer = L.geoJSON(data, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());
  });
