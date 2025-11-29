const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const ListingSchema = new Schema({
    title : {
        type : String,
        required : true,
    },
    description : String,
    image : {
        url : String,
        filename : String,
    },
    price : {
        type : Number,
        required : true,
    },
    location : String,
    country : String,
    review : [
        {
            type: Schema.Types.ObjectId,
            ref : 'Review',
        }
    ],
    owner : {
        type: Schema.Types.ObjectId,
        ref : 'User',
    },
    category : {
        type : String,
        required : true,
    }
});

ListingSchema.post("findOneAndDelete", async (listing) => {
    if(listing){
        await Review.deleteMany({_id : {$in : listing.review}});
    }
});

const Listing = mongoose.model("Listing", ListingSchema);
module.exports = Listing;