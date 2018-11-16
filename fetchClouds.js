const axios = require('axios')
const Event = require('./models/Event')
const User = require('./models/User')

function fetchClouds(location) {
  User.getAll()
  .then(users => {
    Promise.all(users.map(user => {
      return axios.get(`https://api.darksky.net/forecast/4f6c922b9b20ecf763ece25f86c994d0/${user.lat},${user.lon}?exclude=[currently, minutely, hourly]`)
      .then(parseResponse)
      .then(parseForecast)
      .then(cloudForecast => updateForecast(cloudForecast, user))
    }))
  })
}

function parseResponse(response) {
  return response.data
}

function parseForecast(weatherData) {
  const dailyWeatherArray = weatherData.daily.data
  const cloudForecast = dailyWeatherArray.map(day => {
      return { 
        // convert UNIX time to JD
      time: new Date(day.time * 1000),
      cloudCover: day.cloudCover,
      visibility: day.visibility
      }
  })
 
  return cloudForecast
}

function updateForecast(cloudForecast, user) {
  // check each date of forecast
  cloudForecast.forEach(day => {
    // get any events on the days of the forecast
    Event.getByDate(day.time)
    .then(eventArray => findClearSkies(eventArray, user.id))
    .then(deleteClearSkies)
    .then(() => {
      addClearSky(day, user.id)
    })
  })
}

function findClearSkies(eventArray, user_id) {
  // delete any clear sky events in database on these days
  return eventArray.filter(event => event.name == 'clear sky' && event.user_id == user_id)
}

// return promise that all clear skies will be deleted
function deleteClearSkies(clearSkyEventArray) {
  return Promise.all(clearSkyEventArray.map(clearSkyEvent => clearSkyEvent.delete()))
}

function addClearSky(day, user_id) {
  // and add any event days that are forecasted clear
  if (day.cloudCover < 0.2) {
    Event.add('clear sky', day.time, 1, user_id)
  }
}

module.exports = fetchClouds