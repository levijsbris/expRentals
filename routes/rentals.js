import express from 'express';

const router = express.Router();

// Returns all states
router.get("/states", (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    const invalidQueries = Object.keys(req.query).join(', ');

    res.status(400).json({
      error: true,
      message: `Invalid query parameters: ${invalidQueries}. Query parameters are not permitted.`
    });
    return;
  }
  req.db
  .from("states")
  .select("state")
  .then((rows) => {
    const states = rows.map(row => row.state);
    res.json(states);
  })
  .catch((err) => {
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  });
});

// Returns all property types
router.get("/property-types", (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    const invalidQueries = Object.keys(req.query).join(', ');

    res.status(400).json({
      error: true,
      message: `Invalid query parameters: ${invalidQueries}. Query parameters are not permitted.`
    });
    return;
  }
  req.db
  .from("property-types")
  .select("type")
  .then((rows) => {
    const types = rows.map(row => row.type);
    res.json( types );
  })
  .catch((err) => {
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  });
});

router.get("/search", async (req, res, next) => {
  let query = req.db.from("rentals");

  // Validate Queries
  if (req.query.postcode) {
    const postcode = Number(req.query.postcode);
    if (!Number.isInteger(Number(req.query.postcode)) || postcode < 0 || postcode > 9999) {
      res.status(400).json({ error: true, message: "Invalid postcode parameter. Must be an integer in the range of 0000-9999."});
      return;
    }
  }
  if (req.query.minimumRent) {
    const minimumRent = Number(req.query.minimumRent);
    if (!Number.isInteger(Number(req.query.minimumRent)) || minimumRent < 0) {
      res.status(400).json({ error: true, message: "Invalid minimumRent parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.maximumRent) {
    const maximumRent = Number(req.query.maximumRent);
    if (!Number.isInteger(Number(req.query.maximumRent)) || maximumRent < 0) {
      res.status(400).json({ error: true, message: "Invalid maximumRent parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.minimumBathrooms) {
    const minimumBathrooms = Number(req.query.minimumBathrooms);
    if (!Number.isInteger(Number(req.query.minimumBathrooms)) || minimumBathrooms < 0) {
      res.status(400).json({ error: true, message: "Invalid minimumBathrooms parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.maximumBathrooms) {
    const maximumBathrooms = Number(req.query.maximumBathrooms);
    if (!Number.isInteger(Number(req.query.maximumBathrooms)) || maximumBathrooms < 0) {
      res.status(400).json({ error: true, message: "Invalid maximumBathrooms parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.minimumBedrooms) {
    const minimumBedrooms = Number(req.query.minimumBedrooms);
    if (!Number.isInteger(Number(req.query.minimumBedrooms)) || minimumBedrooms < 0) {
      res.status(400).json({ error: true, message: "Invalid minimumBedrooms parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.maximumBedrooms) {
    const maximumBedrooms = Number(req.query.maximumBedrooms);
    if (!Number.isInteger(Number(req.query.maximumBedrooms)) || maximumBedrooms < 0) {
      res.status(400).json({ error: true, message: "Invalid maximumBedrooms parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.minimumParking) {
    const minimumParking = Number(req.query.minimumParking);
    if (!Number.isInteger(Number(req.query.minimumParking)) || minimumParking < 0) {
      res.status(400).json({ error: true, message: "Invalid minimumParking parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.maximumParking) {
    const maximumParking = Number(req.query.maximumParking);
    if (!Number.isInteger(Number(req.query.maximumParking)) || maximumParking < 0) {
      res.status(400).json({ error: true, message: "Invalid maximumParking parameter. Must be a non-negative integer."});
      return;
    }
  }
  if (req.query.minimumRating) {
    const minimumRating = Number(req.query.minimumRating);
    if (!Number.isFinite(Number(req.query.minimumRating)) || minimumRating < 0) {
      res.status(400).json({ error: true, message: "Invalid minimumRating parameter. Must be a non-negative number."});
      return;
    }
  }
  if (req.query.maximumRating) {
    const maximumRating = Number(req.query.maximumRating);
    if (!Number.isFinite(Number(req.query.maximumRating)) || maximumRating < 0) {
      res.status(400).json({ error: true, message: "Invalid maximumRating parameter. Must be a non-negative number."});
      return;
    }
  }
  if (req.query.sortOrder && !req.query.sortBy){
    res.status(400).json({ error: true, message: "Invalid sortOrder parameter. sortBy must be specified."});
    return;
  }
  if (req.query.sortBy) {
    if (req.query.sortBy !== 'id' && req.query.sortBy !== 'title' && req.query.sortBy !== 'rent' && req.query.sortBy !== 'propertyType' && req.query.sortBy !== 'latitude' && req.query.sortBy !== 'longitude' && req.query.sortBy !== 'postcode' && req.query.sortBy !== 'state' && req.query.sortBy !== 'suburb' && req.query.sortBy !== 'bathrooms' && req.query.sortBy !== 'bedrooms' && req.query.sortBy !== 'parkingSpaces' && req.query.sortBy !== 'averageRating' && req.query.sortBy !== 'numRatings') {
      res.status(400).json({ error: true, message: "Invalid sortBy parameter. Must refer to a valid sortable property."});
      return;
    }
  }
  if (req.query.sortOrder) {
    if (req.query.sortOrder !== 'asc' && req.query.sortOrder !== 'desc') {
      res.status(400).json({ error: true, message: "Invalid sortOrder parameter. Must be 'asc' or 'desc'."});
      return;
    }
  }
  if (req.query.page) {
    const page = Number(req.query.page);
    if (!Number.isInteger(Number(req.query.page)) ||page < 1) {
      res.status(400).json({ error: true, message: "Invalid page parameter. Must be an integer greater than or equal to 1."});
      return;
    }
  }

  // Apply Queries
  if (req.query.suburb) { query = query.where("suburb", req.query.suburb); }
  if (req.query.state) { query = query.where("state", req.query.state); }
  if (req.query.postcode) { query = query.where("postcode", req.query.postcode); }

  if (req.query.minimumRent) { query = query.where("rent", ">=", req.query.minimumRent); }
  if (req.query.maximumRent) { query = query.where("rent", "<=", req.query.maximumRent); }
  if (req.query.minimumBathrooms) { query = query.where("bathrooms", ">=", req.query.minimumBathrooms); }
  if (req.query.maximumBathrooms) { query = query.where("bathrooms", "<=", req.query.maximumBathrooms); }
  if (req.query.minimumBedrooms) { query = query.where("bedrooms", ">=", req.query.minimumBedrooms); }
  if (req.query.maximumBedrooms) { query = query.where("bedrooms", "<=", req.query.maximumBedrooms); }
  if (req.query.minimumParking) { query = query.where("parkingSpaces", ">=", req.query.minimumParking); }
  if (req.query.maximumParking) { query = query.where("parkingSpaces", "<=", req.query.maximumParking); }

  if (req.query.propertyTypes) {
    const propertyTypes = Array.isArray(req.query.propertyTypes)
      ? req.query.propertyTypes
      : req.query.propertyTypes.split(",");
    query = query.whereIn("propertyType", propertyTypes);
  }

  // Join the averate ratings
  const allAverageRatings = req.db.from('ratings')
  .select('rentalId')
  .avg('rating as averageRating')
  .groupBy('rentalId')
  .count('* as numRatings')
  .as('averageRatings');
  query = query.leftJoin(allAverageRatings, "rentals.id", "averageRatings.rentalId");

  if (req.query.minimumRating) { query = query.where("averageRating", ">=", req.query.minimumRating); }
  if (req.query.maximumRating) { query = query.where("averageRating", "<=", req.query.maximumRating); }

  // Apply order
  if (req.query.sortBy){
    query = query.orderBy(req.query.sortBy, req.query.sortOrder || "asc");
  }

  const currentPage = Number(req.query.page) || 1;
  const from = (currentPage - 1) * 10;

  // Run the query, once for the count and again for the rows
  let countResult;
  let rows;

  // Fetch all for count
  try {
    countResult = await query;
  } catch(err) {
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  };

  // Adjust query to fetch only first 10
  query = query.limit(10).offset(from);
  try {
    rows = await query
  } catch(err) {
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  };

  // Replace null numRatings with 0
  const data = rows.map(row => ({
    ...row,
    numRatings: row.numRatings ?? 0,
  }));

  const perPage = 10;
  const totalRentals = countResult.length;
  const to = from < totalRentals ? Math.min(from + perPage, totalRentals) : from;
  const totalPages = Math.ceil(totalRentals/perPage);
  const prevPage = (currentPage-1 > 0 ? currentPage-1 : null);
  const nextPage = currentPage < totalPages ? currentPage+1 : null;

  res.json({ data: data, pagination: {perPage: perPage, "currentPage": currentPage, from:from, to:to, total:totalRentals, lastPage:totalPages, prevPage:prevPage, nextPage:nextPage}});

});

// Returns rental of specific id
router.get("/:id", async (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    const invalidQueries = Object.keys(req.query).join(', ');

    res.status(400).json({
      error: true,
      message: `Invalid query parameters: ${invalidQueries}. Query parameters are not permitted.`
    });
    return;
  }

  try{

    const [rental, ratings, commentedReviews] = await Promise.all([
    
      req.db
      .from("rentals")
      .select("title", "rent", "description", "propertyType", "locality", "latitude", "longitude", "postcode", "state", "streetAddress", "suburb", "bathrooms", "bedrooms", "parkingSpaces", "agencyName", "amenities")
      .where("id", "=", req.params.id)
      .first(),

      req.db
      .select('rating')
      .from("ratings")
      .where("rentalId", "=", req.params.id),

      req.db
      .select('rating', "users.email as user", "comment", "dateTime")
      .from("ratings")
      .where("rentalId", "=", req.params.id)
      .join('users', 'ratings.userId', 'users.id')

    ])

    // If there are not ratings, return an error message
    if (!rental) {
      return res.status(404).json({ error: true, message: "No rental exists with this ID." });
    }

    // Calculate the ratings data points
    const numRatings = ratings.length; 
    const totalOfRatings = ratings.reduce((accumulator, current) => accumulator + current.rating, 0);
    const averageRating =  numRatings > 0 ? totalOfRatings / numRatings : null

    // Remove comments from reviews if null
    const reviews = commentedReviews.map(({comment, ...rest}) => comment ? {...rest, comment} : rest);

    return res.json({ ...rental, averageRating, numRatings, reviews: reviews });
  }
  catch (err){
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  }
});

export default router;