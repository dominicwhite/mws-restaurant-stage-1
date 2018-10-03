/**
 * This website uses FontAwesome icons under a Creative Commons Attribution 
 * 4.0 International license: https://fontawesome.com/license
 */

let restaurant;
let reviews;
var newMap;
var focusedElementBeforeModal;

/**
* Register service worker if supported
*/
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(
      function(registration) {
        console.log("Success! Scope: " + registration.scope);
      },
      function(error) {
        console.log("Error. " + error);
      }
    );
  });
}

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  DBHelper.idbSync();
});

window.addEventListener('online', function(e) { DBHelper.idbSync(); });

document.ononline = function () {  }

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiZGV3aGl0ZTQiLCJhIjoiY2prNjViN2xzMXY3bjNxbnRndmp3azUxaCJ9.KPmCIxGLFyIqGxdgYa6rEg',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
  fetchReviewsFromURL((error, reviews) => {
    if (error) {
      console.log(error);
    } else {
      fillReviewsHTML(reviews);
    }
  });
}
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */

insertIntoImgURL = (url, subStr) => {
  return url + subStr + '.jpg';
}

function makeFavourite(favEl){
  favEl.style.background = '#4BB543';
  favEl.innerHTML = 'Favourited';
}

function removeFavourite(favEl){
  favEl.style.background = '#f58500';
  favEl.innerHTML = 'Make Favourite';
}

fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favourite = document.getElementById('restaurant-favourite');
  let toggleParam;
  if (restaurant.is_favorite && restaurant.is_favorite === 'true'){
    makeFavourite(favourite);
    toggleParam = 'false';
  } else { 
    favourite.innerHTML = 'Make favourite';
    toggleParam = 'true';
  }
  favourite.onclick = function(){
    if (window.navigator.onLine){
      DBHelper.toggleFavourite(
        function() {
          if (toggleParam === 'true'){
            console.log('adding');
            makeFavourite(favourite);
            toggleParam = 'false';
          } else {
            removeFavourite(favourite);
            console.log('removing');
            toggleParam = 'true';
          }
        }, restaurant.id, toggleParam
      );
    }
  }

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "Picture of the restaurant " + restaurant.name;
  image.setAttribute('srcset', 
    `${insertIntoImgURL(DBHelper.imageUrlForRestaurant(restaurant), '')} 800w, 
     ${insertIntoImgURL(DBHelper.imageUrlForRestaurant(restaurant), '-md')} 500w,
     ${insertIntoImgURL(DBHelper.imageUrlForRestaurant(restaurant), '-sm')} 250w`);
  image.setAttribute('sizes', '(max-width: 337px) 250px, 450px');

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  //fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create a field and label
 */
createFormField = (field) => {
  const entry = document.createElement('p');
  if (field.label) {
    const label = document.createElement('label');
    label.for = field.id;
    label.innerHTML = field.label;
    entry.appendChild(label);
    entry.appendChild(document.createElement('br'));
  }
  const input = document.createElement(field.fieldType);
  Object.entries(field.attributes).forEach( ([attribute, value]) => {
    input.setAttribute(attribute, value);
  });
  if (field.fieldType === 'select'){
    field.attributes.options.map( (option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.innerHTML = option;
      input.appendChild(opt);
    });
  }
  entry.appendChild(input);
  return entry;
}

/**
 * Create form to add new review.
 */
createNewReviewForm = () => {
  const container = document.getElementById('new-review-content');
  
  const title = document.createElement('h2');
  title.innerHTML = 'Write a Review';
  container.appendChild(title);
  
  const form = document.createElement('form');
  form.id = 'new-review-form';
  
  formFields = [
    {
      label: 'Reviewer Name:',
      fieldType: 'input',
      attributes: {id: 'username', name: 'name', type: 'text'}
    },
    {
      label: 'Rating (out of 5):',
      fieldType: 'select',
      attributes: {id: 'user-rating', name: 'rating', options: [5, 4, 3, 2, 1]}
    },
    {
      label: 'Review:',
      fieldType: 'textarea',
      attributes: {id: 'user-review', name: 'comments', rows: '10', cols: ''}
    },
    {
      fieldType: 'input',
      attributes: {name: 'restaurant_id', type: 'hidden', value: self.restaurant.id}
    },
    {
      fieldType: 'input',
      attributes: {type: 'submit', id: 'submit-review', value: 'Leave Review'}
    }
  ];
  
  formFields.map( (ff) => {
    form.appendChild(createFormField(ff));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitReview();
  });
  container.appendChild(form);
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  
  const newReviewButton = document.createElement('button');
  newReviewButton.innerHTML = '&#43; Add Review';
  newReviewButton.id = 'new-review-button';
  newReviewButton.onclick = () => {
    focusedElementBeforeModal = document.activeElement;
    const modal = document.getElementById('new-review-modal');
    modal.style.display = 'block';
    document.getElementById('new-review-content').style.display = 'block';
    modal.addEventListener('keydown', trapTabKey);
    const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contentediterable]';
    let focusableElements = modal.querySelectorAll(focusableElementsString);
    focusableElements = Array.prototype.slice.call(focusableElements);
    
    var firstTabStop = focusableElements[0];
    var lastTabStop = focusableElements[focusableElements.length - 1];
    
    firstTabStop.focus();
    
    function trapTabKey(e){
      if (e.keyCode === 9){
        if (e.shiftKey) {
          if (document.activeElement === firstTabStop) {
            e.preventDefault();
            lastTabStop.focus();
          }
        } else {
          if (document.activeElement === lastTabStop) {
            e.preventDefault();
            firstTabStop.focus();
          }
        }
      }
    }
  };
  container.appendChild(newReviewButton);
  
  createNewReviewForm();
  
  document.getElementById("close-modal").onclick = function() {
    document.getElementById('new-review-modal').style.display = 'none';
    document.getElementById('new-review-content').style.display = 'none';
    document.getElementById('new-review-button').focus();
  };
  
  //document.getElementById("close-modal").onclick = closeModal();
  
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
  
  document.getElementById('new-review-content').style.display = 'none';
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  
  const div = document.createElement('div');
  div.setAttribute('class', 'review-header');
  
  const name = document.createElement('span');
  name.setAttribute('class', 'review-author');
  name.innerHTML = review.name;
  div.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = new Date(review.createdAt).toDateString();
  date.setAttribute('class', 'review-date');
  div.appendChild(date);

  li.appendChild(div);

  const rating = document.createElement('span');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.setAttribute('class', 'review-rating');
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Get the reviews for this restaurant.
 */
fetchReviewsFromURL = (callback) => {
  if (self.reviews) { // reviews already fetched!
    callback(null, self.reviews)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchReviewsById(id, (error, reviews) => {
      self.reviews = reviews;
      callback(null, reviews)
    });
  }
}

function refreshForm() {
  document.getElementById('new-review-modal').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('user-review').value = '';
}

function createReviewObject(FD){
  const review = {createdAt: Date.now()};
  for ([key, val] of FD.entries()) {
    review[key] = val;
  }
  return review;
}

function submitReview() {
  const form = document.getElementById('new-review-form');
  const FD = new FormData(form);
  const review = createReviewObject(FD);
  const ul = document.getElementById('reviews-list').appendChild(createReviewHTML(review));
  let idbKey;
  DBHelper.cacheNewReview(review);
  
  DBHelper.sendUpdate(FD);
  
  refreshForm();
  
}
