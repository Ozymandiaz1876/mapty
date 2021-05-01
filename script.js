'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

/////////////////////////////////////////////////////////////
// workout class and child classes

class Workout {
  date = new Date();
  id = new Date().getTime().toString().slice(-10);
  //   .slice(-10);
  constructor(coords, duration, distance) {
    this.coords = coords; // [lat, lon]
    this.duration = duration; // in km
    this.distance = distance; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, duration, distance, cadence) {
    super(coords, duration, distance);
    this.cadence = cadence;
    this.calPace();
    this._setDescription();
  }
  calPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, duration, distance, elevationGain) {
    super(coords, duration, distance);
    this.elevationGain = elevationGain;
    this.calSpeed();
    this._setDescription();
  }
  calSpeed() {
    this.speed = this.distance / (this.duration / 60); // km / hr
    return this.speed;
  }
}

////////////////////////////////////////////////////////////
// App class

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoom = 13;
  constructor() {
    this._getPosition();

    //get items from Local storage

    this._getLocalStorage();

    // submit form
    form.addEventListener('submit', this._newWorkout.bind(this));

    // elevation toggle
    inputType.addEventListener('change', this.toggleElevationField);

    // Move to popup in map
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
    }
  }

  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // load local storage markers on map
    if (this.#workouts === []) return;

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // clear input fields
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // helper functions
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const positiveNumber = (...inputs) => inputs.every(inp => inp > 0);

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout = running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // date validation
      if (
        !validInput(distance, duration, cadence) ||
        !positiveNumber(distance, duration, cadence)
      )
        return alert('input should be a positive number');

      // new workout created for running
      workout = new Running([lat, lng], duration, distance, cadence);
    }

    // if workout = cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // date validation
      if (
        !validInput(distance, duration, elevation) ||
        !positiveNumber(distance, duration)
      )
        return alert('input should be a positive number');

      // new workout created for cycling
      workout = new Cycling([lat, lng], duration, distance, elevation);
    }

    // add new workout to workout array

    this.#workouts.push(workout);

    // render workout on list
    this._renderWorkoutList(workout);

    // display marker
    this._renderWorkoutMarker(workout);

    // hide form
    this._hideForm();

    // set local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const popupSetting = L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    });
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(popupSetting)
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = ` 
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === 'running') {
      html += `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const PopupElement = e.target.closest('.workout');
    if (!PopupElement) return;
    const clickedWorkout = this.#workouts.find(
      el => el.id === PopupElement.dataset.id
    );
    this.#map.setView(clickedWorkout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkoutList(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
