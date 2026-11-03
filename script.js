// Analytics helper: sends an event to Google Analytics once it's set up
function trackEvent(name, params) {
  if (window.GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' && typeof gtag === 'function') {
    gtag('event', name, params || {});
  }
}

// Count clicks on any phone link (header, contact section, call button)
document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
  link.addEventListener('click', function () {
    trackEvent('phone_call_click', { link_location: link.dataset.location || 'page' });
  });
});

// Mobile menu
document.getElementById('hamburger').addEventListener('click', function () {
  document.getElementById('mobile-menu').classList.toggle('open');
});

function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
}

// Set today as minimum date
var today = new Date().toISOString().split('T')[0];
['checkin', 'checkout', 'm-checkin', 'm-checkout'].forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.min = today;
});

// Check availability
function checkAvailability() {
  var ci = document.getElementById('checkin').value;
  var co = document.getElementById('checkout').value;
  var room = document.getElementById('roomtype').value;
  var msg = document.getElementById('avail-msg');

  if (!ci || !co) {
    msg.className = 'avail-msg error';
    msg.style.display = 'block';
    msg.textContent = 'Please select both check-in and check-out dates.';
    return;
  }

  if (new Date(co) <= new Date(ci)) {
    msg.className = 'avail-msg error';
    msg.style.display = 'block';
    msg.textContent = 'Check-out date must be after your check-in date.';
    return;
  }

  var nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
  msg.className = 'avail-msg success';
  msg.style.display = 'block';
  msg.innerHTML =
    '✓ Great news! <strong>' + room +
    '</strong> is available for ' +
    nights + ' night' + (nights > 1 ? 's' : '') +
    '. Scroll down to reserve your stay.';
}

// Modal open/close
var selectedRoomName = '';

function openModal(room, price) {
  selectedRoomName = room;
  document.getElementById('modal-room-badge').innerHTML = '🛏️ ' + room + ' &nbsp;·&nbsp; ' + price;

  var ci = document.getElementById('checkin').value;
  var co = document.getElementById('checkout').value;
  if (ci) document.getElementById('m-checkin').value = ci;
  if (co) document.getElementById('m-checkout').value = co;

  document.getElementById('modal-form-section').style.display = 'block';
  document.getElementById('modal-success-section').style.display = 'none';
  clearBookingErrors();
  document.getElementById('booking-modal').classList.add('open');
  trackEvent('booking_form_open', { room_type: room });
  document.getElementById('m-name').focus();
}

function closeModal() {
  document.getElementById('booking-modal').classList.remove('open');
}

document.getElementById('booking-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeModal();
    closeGalleryImage();
  }
});

// Submit booking
emailjs.init({
  publicKey: "pFBz2UZ1vacg9Bb6_"
});

const EMAILJS_SERVICE_ID = "service_0jns43n";
const GUEST_TEMPLATE_ID = "template_r1nc26k";
const NOTIFICATION_TEMPLATE_ID = "template_3i6jn9v";

// Show or clear an error message under a field
function setFieldError(errorId, message, inputIds) {
  var el = document.getElementById(errorId);
  el.textContent = message || '';
  el.classList.toggle('show', !!message);
  (inputIds || []).forEach(function (id) {
    var input = document.getElementById(id);
    input.classList.toggle('invalid', !!message);
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

function clearBookingErrors() {
  setFieldError('m-name-error', '', ['m-name']);
  setFieldError('m-email-error', '', ['m-email']);
  setFieldError('m-dates-error', '', ['m-checkin', 'm-checkout']);
  setFieldError('m-form-error', '');
}

// Clear a field's error as soon as the guest fixes it
[['m-name', 'm-name-error', ['m-name']],
 ['m-email', 'm-email-error', ['m-email']],
 ['m-checkin', 'm-dates-error', ['m-checkin', 'm-checkout']],
 ['m-checkout', 'm-dates-error', ['m-checkin', 'm-checkout']]].forEach(function (f) {
  document.getElementById(f[0]).addEventListener('input', function () {
    setFieldError(f[1], '', f[2]);
  });
});

var bookingSending = false;

function submitBooking() {
  if (bookingSending) return;

  var name = document.getElementById('m-name').value.trim();
  var email = document.getElementById('m-email').value.trim();
  var phone = document.getElementById('m-phone').value.trim();
  var ci = document.getElementById('m-checkin').value;
  var co = document.getElementById('m-checkout').value;
  var requests = document.getElementById('m-requests').value.trim();
  var roomText = document.getElementById('modal-room-badge').innerText;

  clearBookingErrors();
  var firstInvalid = null;

  if (!name) {
    setFieldError('m-name-error', 'Please enter your full name.', ['m-name']);
    firstInvalid = firstInvalid || 'm-name';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('m-email-error', 'Please enter a valid email address.', ['m-email']);
    firstInvalid = firstInvalid || 'm-email';
  }

  if (!ci || !co) {
    setFieldError('m-dates-error', 'Please select check-in and check-out dates.', ['m-checkin', 'm-checkout']);
    firstInvalid = firstInvalid || (!ci ? 'm-checkin' : 'm-checkout');
  } else if (new Date(co) <= new Date(ci)) {
    setFieldError('m-dates-error', 'Check-out must be after check-in.', ['m-checkin', 'm-checkout']);
    firstInvalid = firstInvalid || 'm-checkout';
  }

  if (firstInvalid) {
    document.getElementById(firstInvalid).focus();
    return;
  }

  // Spam trap: real guests never see this field, so if it has a value it's a bot.
  // Show the normal success screen but don't send anything.
  if (document.getElementById('m-website').value) {
    document.getElementById('modal-form-section').style.display = 'none';
    document.getElementById('modal-success-section').style.display = 'block';
    return;
  }

  var params = {
    guest_name: name,
    guest_email: email,
    guest_phone: phone,
    room_type: roomText,
    checkin: ci,
    checkout: co,
    special_requests: requests || 'None'
  };

  var btn = document.getElementById('m-submit');
  bookingSending = true;
  btn.disabled = true;

  Promise.all([
    emailjs.send(EMAILJS_SERVICE_ID, GUEST_TEMPLATE_ID, params),
    emailjs.send(EMAILJS_SERVICE_ID, NOTIFICATION_TEMPLATE_ID, params)
  ])
  .then(function () {
    document.getElementById('modal-form-section').style.display = 'none';
    document.getElementById('modal-success-section').style.display = 'block';
    trackEvent('booking_request', { room_type: selectedRoomName });
  })
  .catch(function (error) {
    console.error('EmailJS error:', error);
    setFieldError('m-form-error', 'Sorry, we couldn\'t send your request right now. Please call us at (602) 209-7127.');
  })
  .finally(function () {
    bookingSending = false;
    btn.disabled = false;
  });
}

// Gallery lightbox
function openGalleryImage(src) {
  document.getElementById('galleryModalImg').src = src;
  document.getElementById('galleryModal').classList.add('open');
}

function closeGalleryImage() {
  document.getElementById('galleryModal').classList.remove('open');
  document.getElementById('galleryModalImg').src = '';
}

// Animation

document.addEventListener('DOMContentLoaded', function () {
  const roomsSection = document.querySelector('.rooms-section');
  if (!roomsSection) return;

  const observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        roomsSection.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  observer.observe(roomsSection);
});

// Copy email address (works even when the visitor has no email app set up)
function copyEmail(btn) {
  var email = 'sunvalley02433@gmail.com';
  var label = btn.querySelector('span');

  function done() {
    trackEvent('email_copy');
    label.textContent = 'Copied!';
    setTimeout(function () { label.textContent = 'Copy'; }, 2000);
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(email).then(done, fallback);
  } else {
    fallback();
  }

  function fallback() {
    var t = document.createElement('textarea');
    t.value = email;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); done(); } catch (e) { label.textContent = email; }
    document.body.removeChild(t);
  }
}
