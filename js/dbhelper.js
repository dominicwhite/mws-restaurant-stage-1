/**
 * Common database helper functions.
 */
const IDB_VERSION = 2;

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/`;
  }
  
  static fetchRestaurantsFromServer(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL + 'restaurants');
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const restaurants = JSON.parse(xhr.responseText);
        
        idb.open('restaurants-db', IDB_VERSION).then(function(db) {
          const tx = db.transaction('restaurants', 'readwrite');
          const keyvalStore = tx.objectStore('restaurants')
          for (const r of restaurants) {
            keyvalStore.put(r);
          }
        });
        callback(null, restaurants);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    if ('indexedDB' in window){
      const idbPromise = idb.open('restaurants-db', IDB_VERSION, upgradeDB => {
        upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
        upgradeDB.createObjectStore('reviews', {keyPath: 'id', autoIncrement: true});
        upgradeDB.createObjectStore('localdata', {keyPath: 'id', autoIncrement: true});
      });
      idbPromise.then(function(db) {
        const tx = db.transaction('restaurants', 'readwrite');
        const keyvalStore = tx.objectStore('restaurants');
        keyvalStore.getAll().then(
          function(vals) {
            if (vals.length > 0){
              callback(null, vals);
            }
            else{
              DBHelper.fetchRestaurantsFromServer(callback);
            }
          }
        );
        //return tx.complete;
      });
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  /**
   * Fetch all reviews from server and cache
   */
  static fetchReviewsFromServer(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL + 'reviews?limit=-1');
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const reviews = JSON.parse(xhr.responseText);
        
        idb.open('restaurants-db', IDB_VERSION).then(function(db) {
          const tx = db.transaction('reviews', 'readwrite');
          const keyvalStore = tx.objectStore('reviews')
          for (const r of reviews) {
            keyvalStore.put(r);
          }
        });
        callback(null, reviews);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }

  /**
   * Fetch all reviews
   */
  static fetchReviews(callback) {
    if ('indexedDB' in window){
      const idbPromise = idb.open('restaurants-db', IDB_VERSION);
      idbPromise.then(function(db) {
        const tx = db.transaction('reviews', 'readwrite');
        const keyvalStore = tx.objectStore('reviews');
        keyvalStore.getAll().then(
          function(vals) {
            if (vals.length > 0){
              callback(null, vals);
            }
            else{
              DBHelper.fetchReviewsFromServer(callback);
            }
          }
        );
      });
    }
  }

  /**
   * Fetch a restaurant's reviews by its ID.
   */
  static fetchReviewsById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        const theseReviews = reviews.filter(r => r.restaurant_id == id);
          callback(null, theseReviews);
      }
    });
  }

  /**
   * Save a new review to IndexedDB
   */
  static cacheNewReview(review) {
    return idb.open('restaurants-db', IDB_VERSION).then(function(db){
      const tx = db.transaction('reviews', 'readwrite');
      const keyvalStore = tx.objectStore('reviews');
      return keyvalStore.put(review);
    });
  }

  /**
   * Add an unsynced review to IndexedDB to be sent to server on next reload
   */
  static queueNewReview(review) {
    return idb.open('restaurants-db', IDB_VERSION).then(function(db){
      const tx = db.transaction('localdata', 'readwrite');
      const keyvalStore = tx.objectStore('localdata');
      return keyvalStore.put(review);
    });
  }

  /**
   * Send review to server
   */ 
  static sendUpdate(data, fresh=true){
    const XHR = new XMLHttpRequest();
    XHR.addEventListener("load", function(event) {
      if (!fresh) DBHelper.deleteLocalUpdate(data.id);
    });
    XHR.addEventListener("error", function(event) {
      if (fresh) DBHelper.queueNewReview(createReviewObject(data));
    });
    XHR.open("POST", DBHelper.DATABASE_URL + 'reviews');
    if (!fresh) {
      //delete data['id'];
      XHR.send(JSON.stringify(data, ['name', 'rating', 'restaurant_id', 'comments']));
    }
    else XHR.send(data);
  }

  /**
   * Sync localData key-value store (on reload or online)
   */ 
  static idbSync(){
    idb.open('restaurants-db', IDB_VERSION).then(function(db){
      const tx = db.transaction('localdata', 'readwrite');
      const keyvalStore = tx.objectStore('localdata');
      keyvalStore.getAll().then(
        function(vals) {
          for (const v of vals) {
            DBHelper.sendUpdate(
              {
                id: v.id,
                restaurant_id: v.restaurant_id,
                name: v.name,
                rating: v.rating,
                comments: v.comments
              }, false
            );
          }
        }
      );
    });
  }
  
  /**
   * Delete review from localdata key-val store
   */ 
  static deleteLocalUpdate(id){
    idb.open('restaurants-db', IDB_VERSION).then(function(db){
      const tx = db.transaction('localdata', 'readwrite');
      const keyvalStore = tx.objectStore('localdata');
      keyvalStore.delete(id);
      return tx.complete;
    });
  }

}

