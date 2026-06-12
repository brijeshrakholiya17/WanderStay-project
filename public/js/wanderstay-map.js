/* WanderStay Map View Logic - Improved Geocoding, Zoom Popups & India Frame */

document.addEventListener("DOMContentLoaded", function () {
    const listings = window.WANDERSTAY_MAP_LISTINGS || [];
    let filteredListings = [...listings];
    
    // UI Elements
    const searchInput = document.getElementById("mapSearchInput");
    const resultCount = document.getElementById("mapResultCount");
    const mapSidebar = document.getElementById("mapSidebar");
    const listViewRow = document.getElementById("listViewRow");
    const mapViewContainer = document.getElementById("mapViewContainer");
    const listViewContainer = document.getElementById("listViewContainer");
    const mapEmptyState = document.getElementById("mapEmptyState");
    
    const toggleMapViewBtn = document.getElementById("toggleMapViewBtn");
    const toggleListViewBtn = document.getElementById("toggleListViewBtn");
    
    let map = null;
    let mapLoaded = false;
    let currentPopup = null;
    let autoOpened = false;
    
    // Initial Frame: INDIA
    const defaultCenter = [78.9629, 20.5937]; 
    const defaultZoom = 4.5;
    
    // Helper to generate GeoJSON FeatureCollection
    function getGeoJSON(items) {
        return {
            type: "FeatureCollection",
            features: items.map(listing => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: listing.coordinates
                },
                properties: {
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    location: listing.location,
                    country: listing.country,
                    category: listing.category,
                    image: listing.image ? listing.image.url : null,
                    url: listing.url
                }
            }))
        };
    }
    
    // Generate Popup HTML Content
    function createPopupMarkup(props) {
        const fallbackImg = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60";
        const imgUrl = props.image || fallbackImg;
        const formattedPrice = Number(props.price).toLocaleString('en-IN');
        return `
            <div class="map-popup-card">
                <img src="${imgUrl}" class="map-popup-img" alt="${props.title}">
                <div class="map-popup-title">${props.title}</div>
                <div class="map-popup-location">${props.location}, ${props.country}</div>
                <div class="map-popup-price">₹${formattedPrice} <span style="font-weight: 400; font-size: 0.75rem;">/ night</span></div>
                <a href="${props.url}" class="map-popup-link">View Details</a>
            </div>
        `;
    }
    
    // Open Popup programmatic helper
    function openPopupForListing(listing) {
        if (currentPopup) {
            currentPopup.remove();
        }
        
        const imgUrl = listing.image ? listing.image.url : "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60";
        
        currentPopup = new maplibregl.Popup({ offset: 30 })
            .setLngLat(listing.coordinates)
            .setHTML(createPopupMarkup({
                id: listing.id,
                title: listing.title,
                price: listing.price,
                location: listing.location,
                country: listing.country,
                category: listing.category,
                image: imgUrl,
                url: listing.url
            }))
            .addTo(map);
            
        currentPopup.on("close", () => {
            currentPopup = null;
            autoOpened = false;
        });
        
        highlightSidebarCard(listing.id);
    }
    
    // Render Sidebar List and Grid List
    function renderListings(items) {
        // Clear previous items
        mapSidebar.innerHTML = "";
        listViewRow.innerHTML = "";
        
        resultCount.textContent = `Showing ${items.length} ${items.length === 1 ? 'stay' : 'stays'}`;
        
        if (items.length === 0) {
            mapEmptyState.classList.remove("d-none");
            mapSidebar.classList.add("d-none");
            listViewRow.innerHTML = "";
            return;
        } else {
            mapEmptyState.classList.add("d-none");
            mapSidebar.classList.remove("d-none");
        }
        
        const fallbackImg = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60";
        
        items.forEach(listing => {
            const imgUrl = listing.image ? listing.image.url : fallbackImg;
            const formattedPrice = Number(listing.price).toLocaleString('en-IN');
            
            // 1. Sidebar Card
            const sidebarCard = document.createElement("div");
            sidebarCard.className = "sidebar-card";
            sidebarCard.setAttribute("data-id", listing.id);
            sidebarCard.innerHTML = `
                <img src="${imgUrl}" class="sidebar-card-img" alt="${listing.title}">
                <div class="sidebar-card-info">
                    <div>
                        <h6 class="sidebar-card-title" title="${listing.title}">${listing.title}</h6>
                        <p class="sidebar-card-location">${listing.location}, ${listing.country}</p>
                    </div>
                    <div class="d-flex justify-content-between align-items-end mt-1">
                        <span class="sidebar-card-category">${listing.category}</span>
                        <p class="sidebar-card-price">₹${formattedPrice} <span style="font-weight:400;font-size:0.75rem;">/night</span></p>
                    </div>
                </div>
            `;
            
            // Fly to marker on sidebar card click
            sidebarCard.addEventListener("click", () => {
                document.querySelectorAll(".sidebar-card").forEach(c => c.classList.remove("active"));
                sidebarCard.classList.add("active");
                
                if (map) {
                    map.flyTo({
                        center: listing.coordinates,
                        zoom: 15.5,
                        essential: true
                    });
                    
                    openPopupForListing(listing);
                    autoOpened = false; // Manually selected
                }
            });
            mapSidebar.appendChild(sidebarCard);
            
            // 2. Grid List Card (Matches existing WanderStay aesthetics)
            const gridCol = document.createElement("div");
            gridCol.className = "col";
            gridCol.innerHTML = `
                <a href="${listing.url}" style="text-decoration: none; color: inherit;">
                    <div class="card listing-card" style="opacity: 1; animation: none;">
                        <div class="img-container">
                            <img src="${imgUrl}" class="card-img-top" alt="${listing.title}">
                        </div>
                        <div class="card-body">
                            <div class="card-title">${listing.title}</div>
                            <div class="text-muted" style="font-size: 0.9rem;">${listing.category}</div>
                            <div class="card-price-container">
                                <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.8rem;"></i>
                                <span class="price-val" style="font-weight:600;">${formattedPrice}</span>
                                <span style="font-weight: 400;">/night</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
            listViewRow.appendChild(gridCol);
        });
    }
    
    // Highlight sidebar card
    function highlightSidebarCard(id) {
        document.querySelectorAll(".sidebar-card").forEach(c => {
            if (c.getAttribute("data-id") === id) {
                c.classList.add("active");
                c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                c.classList.remove("active");
            }
        });
    }
    
    // Initialize MapLibre
    if (document.getElementById("mapCanvas")) {
        map = new maplibregl.Map({
            container: "mapCanvas",
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: defaultCenter,
            zoom: defaultZoom
        });
        
        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        map.on("load", function () {
            mapLoaded = true;
            
            // Add Source
            map.addSource("listings-src", {
                type: "geojson",
                data: getGeoJSON(filteredListings),
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });
            
            // Add Cluster circles
            map.addLayer({
                id: "clusters",
                type: "circle",
                source: "listings-src",
                filter: ["has", "point_count"],
                paint: {
                    "circle-color": [
                        "step",
                        ["get", "point_count"],
                        "#ffb3b7", 5,
                        "#ff7379", 20,
                        "#fe424d"
                    ],
                    "circle-radius": [
                        "step",
                        ["get", "point_count"],
                        18, 5,
                        24, 20,
                        30
                    ],
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff"
                }
            });
            
            // Add Cluster counter text
            map.addLayer({
                id: "cluster-count",
                type: "symbol",
                source: "listings-src",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count}",
                    "text-font": ["Open Sans Bold", "Arial HTML5 Bold"],
                    "text-size": 12
                },
                paint: {
                    "text-color": "#fff"
                }
            });
            
            // Add Unclustered individual points
            map.addLayer({
                id: "unclustered-point",
                type: "circle",
                source: "listings-src",
                filter: ["!", ["has", "point_count"]],
                paint: {
                    "circle-color": "#fe424d",
                    "circle-radius": 9,
                    "circle-stroke-width": 2.5,
                    "circle-stroke-color": "#fff"
                }
            });
            
            // Click cluster logic (Ease zoom)
            map.on("click", "clusters", async function (e) {
                const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
                const clusterId = features[0].properties.cluster_id;
                const zoom = await map.getSource("listings-src").getClusterExpansionZoom(clusterId);
                
                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom + 0.5
                });
            });
            
            // Click individual pin
            map.on("click", "unclustered-point", function (e) {
                const coordinates = e.features[0].geometry.coordinates.slice();
                const props = e.features[0].properties;
                
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }
                
                const listing = filteredListings.find(l => l.id === props.id);
                if (listing) {
                    openPopupForListing(listing);
                    autoOpened = false;
                }
            });
            
            // Hover cursors
            map.on("mouseenter", "clusters", () => map.getCanvas().style.cursor = "pointer");
            map.on("mouseleave", "clusters", () => map.getCanvas().style.cursor = "");
            map.on("mouseenter", "unclustered-point", () => map.getCanvas().style.cursor = "pointer");
            map.on("mouseleave", "unclustered-point", () => map.getCanvas().style.cursor = "");
            
            // Dynamic zoom popup logic
            map.on("zoom", function () {
                const zoom = map.getZoom();
                if (zoom >= 15) {
                    if (!currentPopup) {
                        const center = map.getCenter();
                        let closestListing = null;
                        let minDistance = Infinity;
                        
                        filteredListings.forEach(l => {
                            const dist = Math.pow(l.coordinates[0] - center.lng, 2) + Math.pow(l.coordinates[1] - center.lat, 2);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestListing = l;
                            }
                        });
                        
                        if (closestListing) {
                            openPopupForListing(closestListing);
                            autoOpened = true;
                        }
                    }
                } else {
                    if (currentPopup && autoOpened) {
                        currentPopup.remove();
                        currentPopup = null;
                        autoOpened = false;
                        document.querySelectorAll(".sidebar-card").forEach(c => c.classList.remove("active"));
                    }
                }
            });
        });
    }
    
    // Initial Render
    renderListings(filteredListings);
    
    // Client Side Search Filter
    searchInput.addEventListener("input", function (e) {
        const query = e.target.value.toLowerCase().trim();
        
        filteredListings = listings.filter(l => {
            return (l.title && l.title.toLowerCase().includes(query)) ||
                   (l.location && l.location.toLowerCase().includes(query)) ||
                   (l.country && l.country.toLowerCase().includes(query)) ||
                   (l.category && l.category.toLowerCase().includes(query)) ||
                   (l.address && l.address.toLowerCase().includes(query));
        });
        
        // Render DOM lists
        renderListings(filteredListings);
        
        // Update map source
        if (map && mapLoaded) {
            map.getSource("listings-src").setData(getGeoJSON(filteredListings));
        }
    });
    
    // Toggle Map View
    toggleMapViewBtn.addEventListener("click", function () {
        toggleListViewBtn.classList.remove("active");
        toggleMapViewBtn.classList.add("active");
        
        listViewContainer.classList.remove("active");
        mapViewContainer.classList.remove("hidden");
        
        // Clean resize map when container becomes visible
        if (map) {
            setTimeout(() => {
                map.resize();
            }, 250);
        }
    });
    
    // Toggle List View
    toggleListViewBtn.addEventListener("click", function () {
        toggleMapViewBtn.classList.remove("active");
        toggleListViewBtn.classList.add("active");
        
        mapViewContainer.classList.add("hidden");
        listViewContainer.classList.add("active");
    });
});
