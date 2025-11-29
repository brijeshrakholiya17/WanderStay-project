const Review = require("../models/review.js");
const Listing = require("../models/listing.js");

module.exports.createReview = async (req,res,next) => {
    let {id} = req.params;
    let listing = await Listing.findById(`${id}`);
    let {rating,comment} = req.body;
    const newreview = new Review(
        {
            rating : rating,
            comment : comment,
        });
    newreview.author = req.user._id;
    await listing.review.push(newreview);
    let result = await newreview.save();
    await listing.save();
    if(!newreview.comment) {
        throw new ExpressError(400, "Add some comments for review");
    }

    res.redirect(`/listings/${id}`);
    console.log(result);
}

module.exports.destroyReview = async (req,res) => {
    let {id , reviewId} = req.params;

    await Listing.findByIdAndUpdate(id , {$pull : { reviews : reviewId}});
    await Review.findByIdAndDelete(reviewId);

    await res.redirect(`/listings/${id}`);
}