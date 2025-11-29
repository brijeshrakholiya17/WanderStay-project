const express = require('express');
const router = express.Router({mergeParams : true});
const Review = require("../models/review.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const { isLoggedin , isAuthor} = require('../middleware.js');
const reviewController = require('../controller/review.js');

//Review route
router.post('/',isLoggedin, wrapAsync(reviewController.createReview));

//Review delete route
router.delete('/:reviewId',isLoggedin,isAuthor, wrapAsync(reviewController.destroyReview));

module.exports = router;