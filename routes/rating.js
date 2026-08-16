import express from 'express';
import authorisation from '../middleware/authorisation.js';

const router = express.Router();

// Returns all ratings
router.get("/", authorisation, async (req, res, next) => {
    try{
        if (req.query.page) {
            const page = Number(req.query.page);
            if (!Number.isInteger(Number(req.query.page)) ||page < 1) {
                res.status(400).json({ error: true, message: "Invalid page parameter. Must be an integer greater than or equal to 1."});
                return;
            }
        }
        const currentPage = Number(req.query.page) || 1;
        const from = (currentPage - 1) * 10;

        const [ratings, allRatings] = await Promise.all([
            req.db
            .from("ratings")
            .select("rentalId", "rating", "comment", "dateTime")
            .where("userId", "=", req.user.userId)
            .limit(10)
            .offset(from),

            req.db
            .from("ratings")
            .select("rentalId")
            .where("userId", "=", req.user.userId)
            
        ])

        const cleanedRatings = ratings.map(({ comment, ...rest }) =>
            comment != null ? { ...rest, comment } : rest
        );

        // Pagination Calculationa
        const perPage = 10;
        const totalRatings = allRatings.length;
        const to = from < totalRentals ? Math.min(from + perPage, totalRentals) : from;
        const totalPages = Math.ceil(totalRatings/perPage);
        const prevPage = (currentPage-1 > 0 ? currentPage-1 : null);
        const nextPage = currentPage < totalPages ? currentPage+1 : null;

        res.json({ data: cleanedRatings, pagination: {total:totalRatings, lastPage:totalPages, prevPage:prevPage, nextPage:nextPage, perPage: perPage, "currentPage": currentPage, from:from, to:to}});

    } catch (err){
        res.status(500).json({ error: true, message: "Error in MySQL query" });
    }
});

// Returns rating for specific id
router.get("/rentals/:id", authorisation, (req, res, next) => {
    // Filter according to params
    const filter = {
        "rentalId": req.params.id,
        "userId": req.user.userId
    };
    req.db
    .from("ratings")
    .select("dateTime", "rating", "comment")
    .where(filter)
    .then((rows) => {
        if (rows.length === 0) {
            res.status(404).json({ error: true, message: "No rating exists with this rental ID." });
        }
        else{
            if (!rows[0].comment){
                res.status(200).json({"dateTime":rows[0].dateTime, "rating":rows[0].rating});
            }
            else{
                res.json(rows[0]);
            }
        }
    })
    .catch((err) => {
        res.status(500).json({ error: true, message: "Error in MySQL query" });
    });
});

// Allows user to rate specific id
router.post('/rentals/:id', authorisation, (req, res) => {
    // Validate Rating and comments
    if (typeof req.body.rating !== 'number' || req.body.rating < 1 || req.body.rating > 5) {
        res.status(400).json({ error: true, message: 'Invalid rating. Rating must be an integer value between 1 and 5.'});
        return;
    }
    if (req.body.comment !== undefined) {
        if (typeof req.body.comment !== 'string' || req.body.comment.length < 1 || req.body.comment.length > 2000){
            res.status(400).json({ error: true, message: 'Invalid comment parameter. Comment must be a string 1-2000 characters long.'});
            return;
        }
    }
    // Check the rental exsists
    req.db('rentals')
    .where("id", "=", req.params.id,)
    .then(rows => {
        if (rows.length > 0){
            const filter = {
                "rentalId": req.params.id,
                "userId": req.user.userId
            };
            req.db('ratings')
            .where(filter)
            .then(row => {
                // If a rating has already been made, update
                if (row[0]){
                    const dateofComment = new Date();
                    const rating = req.body.comment ? {"rating": req.body.rating, "comment": req.body.comment, "dateTime": dateofComment} : {"rating": req.body.rating, "dateTime": dateofComment}

                    req.db('ratings').where(filter).update(rating)
                    .then(()=>{
                        req.body.comment ? res.status(201).json({rating: req.body.rating, comment: req.body.comment, dateTime: dateofComment.toISOString()}) : res.status(201).json({rating: req.body.rating, dateTime:dateofComment.toISOString()});
                    })
                    .catch(error => {
                        res.status(500).json({ error: true, message: `Error Updating Rating - ${error}` });
                    })
                }
                // If a rating has not been made, add it
                else{
                    const dateofComment = new Date();
                    const rating = req.body.comment ? {"userId": req.user.userId, "rentalId": req.params.id, "rating": req.body.rating, "comment": req.body.comment, "dateTime": dateofComment} : {"userId": req.user.userId, "rentalId": req.params.id, "rating": req.body.rating, "dateTime": dateofComment}

                    req.db('ratings').insert(rating)
                    .then(()=>{
                        req.body.comment ? res.status(201).json({rating: req.body.rating, comment: req.body.comment, dateTime: dateofComment.toISOString()}) : res.status(201).json({rating: req.body.rating, dateTime: dateofComment.toISOString()});
                    })
                    .catch(error => {
                        res.status(500).json({ error: true, message: `Error Creating New Rating - ${error}` });
                    })
                }
            }).catch(error => {
                res.status(500).json({ error: true, message: 'Database error - not updated' });
            })
        }
        else{
            res.status(404).json({ error: true, message: "No rental exists with this ID." });
        }
    })
    .catch(err => {
        res.status(500).json({ error: true, message: 'Error in MySQL query' });
    });
});

router.post('/debugEraseRatings', async (req, res) => {
    try {
      await req.db('ratings').del();
      res.status(200).json({ message: 'All ratings successfully erased.' });
    } catch (err) {
      res.status(500).json({ error: true, message: 'Unable to erase all ratings' });
    }
});


export default router;