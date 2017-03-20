const express = require('express');
const mongodb = require('mongodb');
const request = require('request');
const bodyParser = require('body-parser');
const URL = process.env.MONGODB_URI;
const ejs = require('ejs');
const port = process.env.PORT || 3000;
const app = express();

//Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Connect to database and start server
mongodb.MongoClient.connect(URL, (err, database) => {
    if(err) throw err;
    db = database;
    app.listen(port, () => {
        console.log('Server listening on port '+port+'!');
    });
});

//Routes
app.get('/', (req, res) => {
    res.render('index');
});

//Image search route
app.get('/imagesearch/:search', (req, res) => {
    let when = new Date();
    let search = req.params.search;
    console.log('Search string: ',search);

    //Check for offset query
    let offset = 1;
    if(req.query.offset){
        offset = req.query.offset;
        console.log('Offset: ', offset);
    }    
    
    //Insert search into imagesearch db, needs to be only most recent 10
    let recentObj = {'searchTerm': search, 'when': when};
    db.collection('recentSearches').insert(recentObj);

    //Call Google Search API with search params

    let apiTarget = 'https://www.googleapis.com/customsearch/v1?key=AIzaSyA_QQYLV5zv-XbJ1i5scCPd7XKLCDaeLdU&cx=003432151851286608373:dwjomat_wy4&searchType=image&alt=json&num=10&q='+search+'&start='+offset;

    request(apiTarget, (err, response, body) => {
        if(err) console.log(err);
        let resultsBody = JSON.parse(body);
        //Filter results to display
        let searchResults = resultsBody.items.map((result) => {
            let filteredResult = {};
            filteredResult.link  = result.link;
            filteredResult.description = result.snippet;
            filteredResult.height = result.image.height;
            filteredResult.width = result.image.width;
            filteredResult.pageLink = result.image.contextLink;
            return filteredResult;
        });
        //Render results page
        res.render('results', {
            'searchString': search,
            'apiResults': JSON.stringify(searchResults)
        });
    });
    
});

//Route for displaying 10 most recent searches from the DB
app.get('/recent', (req, res) => {
    db.collection('recentSearches').find({}, {_id:0}).sort({_id: -1}).limit(10).toArray().then((result) => {
        // console.log(JSON.stringify(result));
        res.render('recent', {
            'recentSearches': JSON.stringify(result)
        });
    }).catch((err) => {
        if(err) throw err;
    });    
});
