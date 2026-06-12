/* WanderStay Detail Show Map - Roadway Zoom Popups */

document.addEventListener("DOMContentLoaded", function () {
    const mapEl = document.getElementById("listingShowMap");
    if (!mapEl) return;
    
    const lng = parseFloat(mapEl.getAttribute("data-lng"));
    const lat = parseFloat(mapEl.getAttribute("data-lat"));
    const title = mapEl.getAttribute("data-title") || "Stay";
    const location = mapEl.getAttribute("data-location") || "";
    const address = mapEl.getAttribute("data-address") || "";
    
    if (isNaN(lng) || isNaN(lat)) {
        return; 
    }
    
    const map = new maplibregl.Map({
        container: "listingShowMap",
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [lng, lat],
        zoom: 13
    });
    
    // Add controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // Create popup markup
    const displayLoc = address ? `${address}, ${location}` : location;
    const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.85rem; padding: 2px;">
            <strong style="color: #222; font-size: 0.9rem; display: block; margin-bottom: 2px;">${title}</strong>
            <span style="color: #717171;">${displayLoc}</span>
        </div>
    `;
    
    const popup = new maplibregl.Popup({ offset: 30 })
        .setLngLat([lng, lat])
        .setHTML(popupContent);
    
    // Add marker
    new maplibregl.Marker({ color: "#fe424d" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);
        
    let autoOpened = false;
        
    // Listen to zoom
    map.on("zoom", function () {
        const zoom = map.getZoom();
        if (zoom >= 15) {
            if (!popup.isOpen()) {
                popup.addTo(map);
                autoOpened = true;
            }
        } else {
            if (popup.isOpen() && autoOpened) {
                popup.remove();
                autoOpened = false;
            }
        }
    });
});
