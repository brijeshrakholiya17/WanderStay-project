const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require('passport');
const {isLoggedin, isOwner} = require("../middleware.js");
const listingController = require('../controller/listing.js');
const multer = require("multer");
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });


router.route('/')
.get(wrapAsync(listingController.index))
.post(isLoggedin ,upload.single('image'), wrapAsync(listingController.createListing));

//New Route
router.get('/new', isLoggedin ,wrapAsync(listingController.renderNewForm));

router.route('/:id')
.get(wrapAsync(listingController.showListing))
.put(isLoggedin, isOwner ,upload.single('image'), wrapAsync(listingController.updateListing))
.delete(isLoggedin ,isOwner, wrapAsync(listingController.destroyListing));

// Edit route
router.get('/:id/edit',isLoggedin,isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;