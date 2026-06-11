const Listing = require('../models/listing.js');
const User = require('../models/user.js');
const { v4: uuidv4 } = require('uuid');
const ExpressError = require("../utils/ExpressError.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Booking = require("../models/booking.js");

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
    
    let {title, description, image, price, location, country, category} = req.body;
    
    // Validate required fields
    if(!description) {
        throw new ExpressError(400, "Description is missing");
    }
    if(!location) {
        throw new ExpressError(400, "Location is missing");
    }
    if(!country) {
        throw new ExpressError(400, "Country is missing");
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
    let listing = await Listing.findByIdAndUpdate(id,req.body);

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

module.exports.getAiPriceSuggestion = async (req, res) => {
    try {
        const { title, description, category, location, country, roomType, season, amenities } = req.body;
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(400).json({
                status: 'error',
                message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables (.env).'
            });
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
        
        const prompt = `
            You are a real-estate and holiday rental pricing expert. Based on the following property details, suggest an optimal price range.
            
            Property Title: ${title || "N/A"}
            Description: ${description || "N/A"}
            Category: ${category || "N/A"}
            Location/City: ${location || "N/A"}
            Country: ${country || "N/A"}
            Room Type: ${roomType || "N/A"}
            Season: ${season || "N/A"}
            Amenities: ${amenities || "N/A"}
            
            Task:
            1. Analyze this property against similar Airbnb listings in ${location || "this area"} with comparable amenities.
            2. Determine:
               - The suggested optimal price per night (in Indian Rupees INR, return just a number).
               - The min and max price range per night.
               - Your confidence rating (High, Medium, Low) based on the inputs provided.
               - 3-4 bullet points detailing your market analysis (e.g., impact of location, amenities, room type, season, etc.).
            
            Return the output as a valid JSON object ONLY. Do not write any markdown code blocks, text before or after the JSON.
            The JSON object must have EXACTLY the following format:
            {
              "suggestedPrice": 1500,
              "minPrice": 1200,
              "maxPrice": 1800,
              "confidence": "High",
              "currency": "INR",
              "analysis": [
                "Analysis point 1...",
                "Analysis point 2...",
                "Analysis point 3..."
              ]
            }
        `;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        // Robust JSON parsing (handles potential markdown code blocks)
        let cleanedText = responseText;
        if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        
        let suggestion;
        try {
            suggestion = JSON.parse(cleanedText);
        } catch (parseErr) {
            console.error("Gemini raw response:", responseText);
            throw new Error("Failed to parse Gemini API response. Raw response was not valid JSON.");
        }
        
        return res.json({
            status: 'success',
            data: suggestion
        });
        
    } catch (err) {
        console.error("AI Price Suggestion Error:", err);
        return res.status(500).json({
            status: 'error',
            message: err.message || 'An error occurred while fetching the price suggestion.'
        });
    }
};

module.exports.getBookings = async (req, res) => {
    const { id } = req.params;
    const bookings = await Booking.find({ listing: id, status: 'confirmed' }, 'checkIn checkOut');
    res.json(bookings);
};


