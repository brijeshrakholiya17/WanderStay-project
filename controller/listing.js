const Listing = require('../models/listing.js');
const User = require('../models/user.js');
const { v4: uuidv4 } = require('uuid');
const ExpressError = require("../utils/ExpressError.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Booking = require("../models/booking.js");

const getGeocodedCoordinates = async (title, address, location, country) => {
    try {
        const components = [];
        if (title && title.trim()) components.push(title.trim());
        if (address && address.trim() && !components.some(c => c.toLowerCase() === address.trim().toLowerCase())) {
            components.push(address.trim());
        }
        if (location && location.trim() && !components.some(c => c.toLowerCase() === location.trim().toLowerCase())) {
            components.push(location.trim());
        }
        if (country && country.trim() && !components.some(c => c.toLowerCase() === country.trim().toLowerCase())) {
            components.push(country.trim());
        }
        
        const queryStr = components.join(", ");
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=1`;
        
        const response = await fetch(url, {
            headers: {
                "User-Agent": "WanderStay-App/1.0"
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const lng = parseFloat(data[0].lon);
                const lat = parseFloat(data[0].lat);
                return [lng, lat];
            }
        }
        
        // Fallback to title, location and country
        const fallback1 = [];
        if (title && title.trim()) fallback1.push(title.trim());
        if (location && location.trim() && !fallback1.some(c => c.toLowerCase() === location.trim().toLowerCase())) {
            fallback1.push(location.trim());
        }
        if (country && country.trim() && !fallback1.some(c => c.toLowerCase() === country.trim().toLowerCase())) {
            fallback1.push(country.trim());
        }
        
        if (fallback1.length > 0) {
            const queryStrF1 = fallback1.join(", ");
            const urlF1 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStrF1)}&format=json&limit=1`;
            const resF1 = await fetch(urlF1, {
                headers: { "User-Agent": "WanderStay-App/1.0" }
            });
            if (resF1.ok) {
                const dataF1 = await resF1.json();
                if (dataF1 && dataF1.length > 0) {
                    return [parseFloat(dataF1[0].lon), parseFloat(dataF1[0].lat)];
                }
            }
        }
        
        // Fallback to address, location and country
        const fallbackComponents = [];
        if (address && address.trim()) fallbackComponents.push(address.trim());
        if (location && location.trim() && !fallbackComponents.some(c => c.toLowerCase() === location.trim().toLowerCase())) {
            fallbackComponents.push(location.trim());
        }
        if (country && country.trim() && !fallbackComponents.some(c => c.toLowerCase() === country.trim().toLowerCase())) {
            fallbackComponents.push(country.trim());
        }
        
        if (fallbackComponents.length > 0) {
            const fallbackQuery = fallbackComponents.join(", ");
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1`;
            const fallbackResponse = await fetch(fallbackUrl, {
                headers: {
                    "User-Agent": "WanderStay-App/1.0"
                }
            });
            
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData && fallbackData.length > 0) {
                    const lng = parseFloat(fallbackData[0].lon);
                    const lat = parseFloat(fallbackData[0].lat);
                    return [lng, lat];
                }
            }
        }

        // Deep fallback to location and country only
        const lastFallback = [];
        if (location && location.trim()) lastFallback.push(location.trim());
        if (country && country.trim() && !lastFallback.some(c => c.toLowerCase() === country.trim().toLowerCase())) {
            lastFallback.push(country.trim());
        }
        if (lastFallback.length > 0) {
            const lastQuery = lastFallback.join(", ");
            const lastUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lastQuery)}&format=json&limit=1`;
            const lastResponse = await fetch(lastUrl, {
                headers: { "User-Agent": "WanderStay-App/1.0" }
            });
            if (lastResponse.ok) {
                const lastData = await lastResponse.json();
                if (lastData && lastData.length > 0) {
                    return [parseFloat(lastData[0].lon), parseFloat(lastData[0].lat)];
                }
            }
        }
        
    } catch (error) {
        console.error("Geocoding failed:", error);
    }
    return null;
};

module.exports.index = async (req,res) => {
    const search = req.query.search;
    const filter = req.query.value;
    if(search){
        let listing =  await Listing.find({$or: [
            {title : { $regex: search, $options: 'i' }},
            {country : { $regex: search, $options: 'i' }},
            {location : { $regex: search, $options: 'i' }}
          ]});
          if(listing.length===0){
            req.flash('error',`No Listing available for your search!`);
            res.redirect("/listings");
        }
        else{
            const wishlistIds = req.user ? req.user.wishlist?.map(id => id.toString()) : [];
            res.render("listings/index.ejs" , {listing, wishlistIds});
        }
    }
    else if(filter){
        let listing =  await Listing.find({category : { $regex: filter, $options: 'i' }});
        if(listing.length===0){
            req.flash('error',`No Listing available in ${filter} category!`);
            res.redirect("/listings");
        }
        else{
            const wishlistIds = req.user ? req.user.wishlist?.map(id => id.toString()) : [];
            res.render("listings/index.ejs" , {listing, wishlistIds});
        }
        
        
    }
    else{
        let listing =  await Listing.find({});
        const wishlistIds = req.user ? req.user.wishlist?.map(id => id.toString()) : [];
        res.render("listings/index.ejs" , {listing, wishlistIds});
    }
    
}
 
module.exports.renderNewForm = async (req,res) => {
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req,res) => {
    let {id} = req.params;
    let listing =  await Listing.findById(id).populate({path : 'review', populate : 'author'}).populate('owner');
    if(!listing){
        req.flash('error','Listing you requested for does not exist!');
        res.redirect("/listings");
    }
    res.render("listings/show.ejs" , {listing});
}

module.exports.createListing = async (req,res,next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    
    // Removed: let id = uuidv4(); 
    
    let {title, description, image, price, location, country, category, address, latitude, longitude} = req.body;
    
    // Validate required fields
    if(!title) {
        throw new ExpressError(400, "Title is missing");
    }
    if(!description) {
        throw new ExpressError(400, "Description is missing");
    }
    if(!location) {
        throw new ExpressError(400, "Location is missing");
    }
    if(!country) {
        throw new ExpressError(400, "Country is missing");
    }
    if(!address) {
        throw new ExpressError(400, "Address is missing");
    }
    if(!price || isNaN(Number(price))) {
        throw new ExpressError(400, "Price should be a valid number");
    }
    if(!category) {
        throw new ExpressError(400, "Category is missing");
    }

    let geometry = undefined;
    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
        geometry = {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
    } else {
        const coords = await getGeocodedCoordinates(title, address, location, country);
        if (coords) {
            geometry = {
                type: "Point",
                coordinates: coords
            };
        }
    }
    
    const newlist = new Listing({
        // Removed _id assignment entirely. MongoDB will handle it.
        title: title,
        description: description,
        image: {url, filename},
        price: price,
        location: location,
        country: country,
        category: category,
        address: address,
        geometry: geometry,
        owner: req.user._id
    });
    
    let samplelist = await newlist.save();
    console.log(samplelist);
    req.flash('success','New listing created!');
    res.redirect("/listings");
}

module.exports.renderEditForm = async (req,res) => {
    let {id} = req.params;
    let listing =  await Listing.findById(id);
    if(!listing){
        req.flash('error','Listing you requested for does not exist!');
        res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url.replace("/upload","/upload/w_250");
    res.render("listings/edit.ejs" , {listing , originalImageUrl});
}

module.exports.updateListing = async (req,res) => {
    let {id} = req.params;      
    const {title, description, price, location, country, category, address, latitude, longitude} = req.body;
    
    let updateData = {
        title,
        description,
        price,
        location,
        country,
        category,
        address
    };

    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
        updateData.geometry = {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
    } else if (address) {
        const coords = await getGeocodedCoordinates(title, address, location, country);
        if (coords) {
            updateData.geometry = {
                type: "Point",
                coordinates: coords
            };
        } else {
            updateData.$unset = { geometry: "" };
        }
    }

    let listing = await Listing.findByIdAndUpdate(id, updateData, { new: true });

    if(typeof req.file !== "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = {url , filename};
        await listing.save();
    }
    
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req,res) => {
    let {id} = req.params;
    let deletedlist = await Listing.findByIdAndDelete(id);
    console.log(deletedlist)
    res.redirect('/listings');
}

module.exports.toggleWishlist = async (req, res) => {
    const { id } = req.params;
    
    if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }
    
    const listing = await Listing.findById(id);
    if (!listing) {
        return res.status(404).json({ status: 'error', message: 'Listing not found' });
    }

    const user = req.user;
    const exists = user.wishlist.some(listingId => listingId.toString() === id);
    
    if (exists) {
        user.wishlist = user.wishlist.filter(listingId => listingId.toString() !== id);
    } else {
        user.wishlist.push(id);
    }
    
    await user.save();
    const favorited = !exists;
    
    return res.json({ 
        status: 'success', 
        wishlist: user.wishlist.map(id => id.toString()), 
        favorited: favorited 
    });
};

module.exports.showWishlist = async (req, res) => {
    const user = await User.findById(req.user._id).populate('wishlist');
    const wishlistListings = user.wishlist || [];
    res.render('listings/wishlist.ejs', { wishlistListings });
};

// Heuristic Pricing Fallback Engine: Guarantees 100% uptime if Google AI experiences transient outages or quota limits
const calculateHeuristicPriceSuggestion = (details) => {
    const { category = '', location = '', roomType = '', season = '', amenities = '' } = details;

    const categoryBase = {
        'Trending': 3800,
        'Rooms': 1800,
        'Iconic Cities': 4200,
        'Mountains': 3500,
        'Castles': 9500,
        'Amazing Pools': 5500,
        'Camping': 1400,
        'Farms': 2800,
        'Arctic': 4800,
        'Beachfront': 5200,
        'Luxury': 8500
    };

    let base = categoryBase[category] || 3200;

    const roomTypeNorm = (roomType || '').toLowerCase();
    let roomMultiplier = 1.0;
    if (roomTypeNorm.includes('shared')) {
        roomMultiplier = 0.45;
    } else if (roomTypeNorm.includes('private')) {
        roomMultiplier = 0.65;
    } else if (roomTypeNorm.includes('villa') || roomTypeNorm.includes('luxury')) {
        roomMultiplier = 1.45;
    }

    const seasonNorm = (season || '').toLowerCase();
    let seasonMultiplier = 1.0;
    let seasonDesc = 'standard seasonal demand';
    if (seasonNorm.includes('peak') || seasonNorm.includes('holiday') || seasonNorm.includes('december')) {
        seasonMultiplier = 1.35;
        seasonDesc = 'peak travel season occupancy surge';
    } else if (seasonNorm.includes('high') || seasonNorm.includes('summer')) {
        seasonMultiplier = 1.15;
        seasonDesc = 'high travel season premium';
    } else if (seasonNorm.includes('low') || seasonNorm.includes('monsoon') || seasonNorm.includes('off')) {
        seasonMultiplier = 0.85;
        seasonDesc = 'competitive off-peak market rates';
    }

    let amenityBonus = 0;
    const amenitiesArr = typeof amenities === 'string'
        ? amenities.split(',').map(a => a.trim()).filter(Boolean)
        : Array.isArray(amenities) ? amenities : [];

    amenitiesArr.forEach(item => {
        const lower = item.toLowerCase();
        if (lower.includes('pool') || lower.includes('jacuzzi') || lower.includes('hot tub')) {
            amenityBonus += 500;
        } else if (lower.includes('ac') || lower.includes('air conditioning')) {
            amenityBonus += 250;
        } else if (lower.includes('wifi') || lower.includes('kitchen')) {
            amenityBonus += 150;
        } else if (lower.includes('parking') || lower.includes('gym')) {
            amenityBonus += 200;
        } else {
            amenityBonus += 100;
        }
    });

    let suggestedPrice = Math.round(((base * roomMultiplier * seasonMultiplier) + amenityBonus) / 100) * 100;
    suggestedPrice = Math.max(800, suggestedPrice);

    // Tight and realistic bounds (~12% below, ~15% above)
    const minPrice = Math.round((suggestedPrice * 0.88) / 50) * 50;
    const maxPrice = Math.round((suggestedPrice * 1.15) / 50) * 50;

    const analysis = [
        `Regional market index for ${category || 'residential'} accommodations in ${location || 'this destination'} averages ₹${base}/night.`,
        `Accommodation configuration (${roomType || 'Entire property'}) scaled with an adjustment coefficient of ${roomMultiplier}x.`,
        `Seasonal demand modeling applied (${seasonDesc}) reflecting local booking velocity.`,
        amenitiesArr.length > 0
            ? `Features analyzed: ${amenitiesArr.slice(0, 3).join(', ')}${amenitiesArr.length > 3 ? ' and more' : ''} contributing a ₹${amenityBonus} amenity premium.`
            : `Amenity baseline calibrated to maintain competitive rental yield.`
    ];

    return {
        suggestedPrice,
        minPrice,
        maxPrice,
        confidence: "High",
        currency: "INR",
        analysis,
        isFallback: true
    };
};

const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Robust multi-model cascade with exponential backoff & jitter
const requestGeminiWithCascade = async (genAI, prompt) => {
    const candidateModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];
    let lastError = null;

    for (const modelName of candidateModels) {
        let attempts = 0;
        const maxAttempts = 2; // Up to 2 attempts per candidate model

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.15 // Low temperature for high precision and consistent pricing
                    }
                });
                const result = await model.generateContent(prompt);
                const responseText = result.response.text().trim();

                // Clean markdown code fence if wrapped
                let cleanedText = responseText;
                if (cleanedText.startsWith("```")) {
                    cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
                }

                // Parse JSON safely
                let suggestion;
                try {
                    suggestion = JSON.parse(cleanedText);
                } catch (jsonErr) {
                    const match = cleanedText.match(/\{[\s\S]*\}/);
                    if (match) {
                        suggestion = JSON.parse(match[0]);
                    } else {
                        throw jsonErr;
                    }
                }

                if (suggestion && suggestion.suggestedPrice) {
                    suggestion.suggestedPrice = Math.round(Number(suggestion.suggestedPrice) / 50) * 50;

                    // Ensure tight, realistic price variation around suggested price
                    const fallbackMin = Math.round((suggestion.suggestedPrice * 0.88) / 50) * 50;
                    const fallbackMax = Math.round((suggestion.suggestedPrice * 1.15) / 50) * 50;

                    const currentMin = Number(suggestion.minPrice);
                    if (!currentMin || currentMin < suggestion.suggestedPrice * 0.75 || currentMin >= suggestion.suggestedPrice) {
                        suggestion.minPrice = fallbackMin;
                    } else {
                        suggestion.minPrice = Math.round(currentMin / 50) * 50;
                    }

                    const currentMax = Number(suggestion.maxPrice);
                    if (!currentMax || currentMax > suggestion.suggestedPrice * 1.35 || currentMax <= suggestion.suggestedPrice) {
                        suggestion.maxPrice = fallbackMax;
                    } else {
                        suggestion.maxPrice = Math.round(currentMax / 50) * 50;
                    }

                    return suggestion;
                }
                throw new Error("Invalid response format: missing price attributes.");
            } catch (err) {
                lastError = err;
                const errMsg = (err.message || '').toLowerCase();
                const isTransient = errMsg.includes('503') ||
                                    errMsg.includes('429') ||
                                    errMsg.includes('high demand') ||
                                    errMsg.includes('service unavailable') ||
                                    errMsg.includes('resourceexhausted');

                console.warn(`[Gemini API] ${modelName} attempt ${attempts} warning:`, err.message);

                if (isTransient && attempts < maxAttempts) {
                    const delay = (1000 * Math.pow(1.5, attempts)) + Math.floor(Math.random() * 400);
                    await waitMs(delay);
                } else {
                    break; // Move to next candidate model
                }
            }
        }
    }

    throw lastError || new Error("All candidate Gemini models were unavailable.");
};

module.exports.getAiPriceSuggestion = async (req, res) => {
    try {
        const { title, description, category, location, country, roomType, season, amenities } = req.body;
        
        const prompt = `
You are an expert real estate appraiser and dynamic revenue pricing engine for vacation rentals (Airbnb, Vrbo, MakeMyTrip) in India.
Your task is to calculate a PRECISE, TRUE-TO-MARKET nightly rental price in Indian Rupees (INR) for this specific listing.

PROPERTY DETAILS:
- Title: ${title || "N/A"}
- Description: ${description || "N/A"}
- Category: ${category || "N/A"}
- Location/City: ${location || "N/A"}
- Country: ${country || "India"}
- Room / Property Type: ${roomType || "Entire place"}
- Current Season: ${season || "Regular Season"}
- Amenities: ${amenities || "N/A"}

PRICING CALIBRATION RULES (Strict Market Realism in India / INR):
1. DYNAMIC VALUATION MATRIX (in INR):
   - Private Room / Shared Space / Budget Homestay: ₹1,200 – ₹2,500/night (do not overprice private rooms as entire villas).
   - Standard 1-2 BHK Apartment / Cottage / Farmstay: ₹2,500 – ₹4,800/night.
   - Scenic / Boutique / Mountain Chalet / Beachfront Condo: ₹4,500 – ₹7,500/night.
   - Luxury Villa / Entire Estate with Private Pool in major tourist destinations: ₹8,000 – ₹16,000/night.
   - Evaluate the exact property type and category carefully: Ensure the price accurately mirrors real booking demand on Airbnb India and WanderStay.

2. PRECISE RANGE & VARIATION (Strict limits):
   - suggestedPrice: The exact realistic median booking price (integer rounded to nearest 50 or 100).
   - minPrice: Exactly 10% to 15% below suggestedPrice (competitive floor for mid-week / low-demand nights).
   - maxPrice: Exactly 12% to 18% above suggestedPrice (peak weekend / festival surge ceiling).
   - The total variation span (maxPrice - minPrice) must be tight and actionable for real hosts (never excessive).

3. ANALYSIS BULLETS:
   - Provide 3-4 distinct, concise sentences detailing:
     * Location & sub-market baseline rate
     * Room type & space configuration factor
     * Seasonal demand impact
     * High-value amenities contribution

OUTPUT JSON FORMAT (Return valid JSON only):
{
  "suggestedPrice": 0,
  "minPrice": 0,
  "maxPrice": 0,
  "confidence": "High",
  "currency": "INR",
  "analysis": [
    "Market rate observation for location and category...",
    "Space and property type factor...",
    "Seasonal demand adjustment...",
    "Amenity value evaluation..."
  ]
}
`;

        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const suggestion = await requestGeminiWithCascade(genAI, prompt);
                return res.json({
                    status: 'success',
                    data: suggestion
                });
            } catch (apiErr) {
                console.warn("[Gemini API] Cascade exhausted. Seamlessly activating heuristic pricing engine fallback:", apiErr.message);
            }
        }

        // Zero-Downtime Fallback: Heuristic calculation ensures user is never blocked
        const fallbackSuggestion = calculateHeuristicPriceSuggestion(req.body);
        return res.json({
            status: 'success',
            data: fallbackSuggestion
        });
        
    } catch (err) {
        console.error("AI Price Suggestion Error:", err);
        // Absolute fallback if anything unforeseen happens
        const fallbackSuggestion = calculateHeuristicPriceSuggestion(req.body || {});
        return res.json({
            status: 'success',
            data: fallbackSuggestion
        });
    }
};

module.exports.getBookings = async (req, res) => {
    const { id } = req.params;
    const bookings = await Booking.find({ listing: id, status: 'confirmed' }, 'checkIn checkOut');
    res.json(bookings);
};

module.exports.renderMapPage = async (req, res) => {
    const listings = await Listing.find({}).populate("owner");

    const mapListings = listings
        .filter(listing => {
            const coords = listing.geometry && listing.geometry.coordinates;
            return Array.isArray(coords)
                && coords.length === 2
                && typeof coords[0] === "number"
                && typeof coords[1] === "number"
                && coords[0] >= -180
                && coords[0] <= 180
                && coords[1] >= -90
                && coords[1] <= 90;
        })
        .map(listing => ({
            id: listing._id.toString(),
            title: listing.title,
            price: listing.price,
            location: listing.location || "",
            country: listing.country || "",
            address: listing.address || "",
            category: listing.category || "",
            image: listing.image,
            coordinates: listing.geometry.coordinates,
            url: `/listings/${listing._id}`
        }));

    res.render("listings/map", { mapListings });
};


