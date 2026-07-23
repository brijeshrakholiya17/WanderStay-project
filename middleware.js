const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

module.exports.isLoggedin = (req,res,next) => {
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        // Check if it's an API request
        if(req.method === 'POST' || req.accepts('json')) {
            res.redirect("/login");
            return res.status(401).json({ status: 'error', message: 'You need to login' });
        }
        req.flash('error','You need to first login to make changes');
        return res.redirect("/login");
    }
    next();
}

module.exports.saveredirectUrl = (req,res,next) => {
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner = async(req,res,next) => {
    let {id} = req.params;
    let listing = await Listing.findById(id);
    if(!listing) {
        req.flash('error',"Listing not found");
        return res.redirect("/listings");
    }
    const ownerId = listing.owner && (listing.owner._id || listing.owner);
    if(!ownerId || !ownerId.equals(req.user._id)){
        req.flash('error',"You are not owner of this listing");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

module.exports.isAuthor = async(req,res,next) => {
    let {id , reviewId} = req.params;
    let review = await Review.findById(reviewId);
    if(!review) {
        req.flash('error',"Review not found");
        return res.redirect(`/listings/${id}`);
    }
    
    // Allow either the author of the review or the owner of the listing to delete it
    let listing = await Listing.findById(id);
    const ownerId = listing && listing.owner && (listing.owner._id || listing.owner);
    const authorId = review.author && (review.author._id || review.author);
    
    const isOwnerOfListing = ownerId && ownerId.equals(req.user._id);
    const isAuthorOfReview = authorId && authorId.equals(req.user._id);
    
    if(!isAuthorOfReview && !isOwnerOfListing){
        req.flash('error',"You are not authorized to delete this review");
        return res.redirect(`/listings/${id}`);
    }
    next();
}