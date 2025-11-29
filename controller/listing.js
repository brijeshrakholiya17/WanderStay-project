const Listing = require('../models/listing.js');
const { v4: uuidv4 } = require('uuid');
const ExpressError = require("../utils/ExpressError.js");

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
            res.render("listings/index.ejs" , {listing});
        }
    }
    else if(filter){
        let listing =  await Listing.find({category : { $regex: filter, $options: 'i' }});
        if(listing.length===0){
            req.flash('error',`No Listing available in ${filter} category!`);
            res.redirect("/listings");
        }
        else{
            res.render("listings/index.ejs" , {listing});
        }
        
        
    }
    else{
        let listing =  await Listing.find({});
        res.render("listings/index.ejs" , {listing});
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
    let {id} = uuidv4();
    let {title : newtitle , description : Newdesc , image : Newimg , price : Newprice , location : Newlocation , country : Newcountry , category : Newcategory} = req.body;
    const newlist = new Listing(
        {
            _id : id,
            title : newtitle , 
            description : Newdesc , 
            image : Newimg , 
            price : Newprice, 
            location : Newlocation , 
            country : Newcountry ,
            category : Newcategory
        });
    console.log(typeof(Newprice));
    req.flash('success','New listing created!');
    if(!newlist.description) {
        throw new ExpressError(400, "Description is missing");
    }
    if(!newlist.location) {
        throw new ExpressError(400, "Location is missing");
    }
    if(!newlist.country) {
        throw new ExpressError(400, "Country is missing");
    }
    newlist.owner = req.user._id;
    newlist.image = {url , filename};
    let samplelist = await newlist.save();
    console.log(samplelist);
    res.redirect("/listings");
}

module.exports.renderEditForm = async (req,res) => {
    let {id} = req.params;
    let listing =  await Listing.findById(id);
    if(!listing){
        req.flash('error','Listing you requested for does not exist!');
        res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl.replace("/upload","/upload/w_250");
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
