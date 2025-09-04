(async () => {
  const container = document.getElementById("delivery-message-enhanced");
  const timelineMessage = document.getElementById("delivery-timeline-message");
  const orderNowDate = document.getElementById("order-now-date");
  const readyToShipDate = document.getElementById("ready-to-ship-date");
  const deliveryDate = document.getElementById("delivery-date");

  if (!container || !timelineMessage || !orderNowDate || !readyToShipDate || !deliveryDate) {
    console.error("One or more required elements not found");
    return;
  }

  const countrySearch = document.getElementById("countrySearch");
  const countryList = document.getElementById("countryList");
  const checkCountryBtn = document.getElementById("checkCountryBtn");
  const zipCodeInput = document.getElementById("zipCodeInput");

  const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
    "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
    "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
    "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
    "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
    "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
    "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia",
    "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
    "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
    "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan",
    "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
    "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
    "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
    "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
    "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
    "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
    "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
    "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
    "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
    "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
    "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
  ];

  function populateCountryList(searchTerm = "") {
    const filteredCountries = countries.filter((country) =>
      country.toLowerCase().includes(searchTerm.toLowerCase())
    );

    countryList.innerHTML = filteredCountries.length
      ? filteredCountries
        .map(
          (country) => `
          <li class="country-option" style="
            padding: 0.5em;
            cursor: pointer;
            color: ${getComputedStyle(container).color};
          " data-country="${country}">${country}</li>
        `
        )
        .join("")
      : '<li style="padding: 0.5em; color: #888;">No countries found</li>';
    countryList.style.display = filteredCountries.length ? "block" : "none";

    document.querySelectorAll("#countryList .country-option").forEach((li) => {
      li.addEventListener("mouseenter", () => (li.style.backgroundColor = "#f0f0f0"));
      li.addEventListener("mouseleave", () => (li.style.backgroundColor = "transparent"));
      li.addEventListener("click", () => {
        const selectedCountry = li.dataset.country;
        countrySearch.value = selectedCountry;
        container.dataset.country = selectedCountry;
        countryList.style.display = "none";
        checkCountryBtn.click();
      });
    });
  }

  countryList.style.display = "none";

  countrySearch.addEventListener("click", () => {
    populateCountryList(countrySearch.value);
  });

  countrySearch.addEventListener("input", () => {
    populateCountryList(countrySearch.value);
  });

  countrySearch.addEventListener("blur", () => {
    setTimeout(() => {
      countryList.style.display = "none";
    }, 150);
  });

  function formatDate(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date)) return "N/A";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }



 function updateTimeline(data) {
  console.log("Raw data:", data);

  const orderStartDateStr = data.debug && data.debug.startDate
    ? formatDate(data.debug.startDate)
    : null;
  console.log(orderStartDateStr, "orderStartDateStr");

  function getReadyToShipDate(startDate, daysToAdd = 1) {
    if (!startDate) return null;
    const d = new Date(startDate);
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + daysToAdd);
    return d;
  }

  const startDateToUse = data.debug && data.debug.startDate;
  const readyToShipDateObj = getReadyToShipDate(startDateToUse, 1);

  const readyToShipDateStr = readyToShipDateObj ? formatDate(readyToShipDateObj) : null;
  console.log(readyToShipDateStr, "readyToShipDateStr");

  const estimatedDeliveryStart = data.debug && data.debug.startDate
    ? formatDate(data.debug.startDate)
    : null;

  console.log(estimatedDeliveryStart, "estimatedDeliveryStart");

  let ReceiveDate = null;
  if (readyToShipDateObj) {
    const afterShipDate = new Date(readyToShipDateObj);
    afterShipDate.setDate(afterShipDate.getDate() + 1);
    ReceiveDate = afterShipDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    }).replace(/^(\w+) (\d+)$/, "$2 $1");
  }
  console.log(ReceiveDate, "=======ReceiveDate");

  const estimatedDeliveryEnd = data.debug && data.debug.endDate
    ? formatDate(data.debug.endDate).replace(/^(\w+) (\d+)$/, "$2 $1")
    : null;

  console.log(estimatedDeliveryEnd, "estimatedDeliveryEnd ");
  
  if (ReceiveDate && estimatedDeliveryEnd) {
    timelineMessage.textContent = `Delivery between ${ReceiveDate} to ${estimatedDeliveryEnd}`;
    orderNowDate.textContent = orderStartDateStr;
    readyToShipDate.textContent = readyToShipDateStr;
    deliveryDate.textContent = ` ${estimatedDeliveryEnd}`;
  } else {
    console.error("Missing required date data:", data);
    if (data.availableFrom && data.availableUntil) {
      timelineMessage.textContent = `Receive this order between ${data.availableFrom} – ${data.availableUntil}`;
    } else {
      timelineMessage.textContent = "Delivery dates will be confirmed soon";
    }
  }
}


  async function checkAvailability() {
    let productId = container.dataset.productId;
    const collectionId = container.dataset.collectionId;
    const appDomain = container.dataset.appDomain;
    const selectedCountry = container.dataset.country;
    const zipCode = zipCodeInput.value.trim();

    if (selectedCountry && !countries.includes(selectedCountry)) {
      container.innerHTML = `
        <div class="delivery-error">
          Please select a valid country from the list.
        </div>
      `;
      timelineMessage.textContent = "Delivery Timeline Unavailable";
      orderNowDate.textContent = "Place your order";
      readyToShipDate.textContent = "Preparing order";
      deliveryDate.textContent = "Awaiting info...";
      return;
    }

    if (zipCode && !/^\d+(-\d+)?$/.test(zipCode) && !/^\d+\*$/.test(zipCode)) {
      container.innerHTML = `
        <div class="delivery-error">
          Please enter a valid zip code (e.g., 74400 or 74400-74410).
        </div>
      `;
      timelineMessage.textContent = "Delivery Timeline Unavailable";
      orderNowDate.textContent = "Place your order";
      readyToShipDate.textContent = "Preparing order";
      deliveryDate.textContent = "Awaiting info...";
      return;
    }

    if (productId && productId.includes("gid://shopify/Product/")) {
      productId = productId.replace("gid://shopify/Product/", "");
    }

    container.innerHTML = `
      <div class="delivery-loading">
        <span class="loading-spinner"></span>
        <span>Checking availability...</span>
      </div>
    `;
    timelineMessage.textContent = "Checking Delivery Timeline...";
    orderNowDate.textContent = "Place your order";
    readyToShipDate.textContent = "Preparing order";
    deliveryDate.textContent = "Awaiting info...";

    try {
      const params = new URLSearchParams();
      if (productId) params.set("productId", productId);
      if (collectionId) params.set("collectionId", collectionId);
      if (selectedCountry) params.set("country", selectedCountry);
      if (zipCode) params.set("zipCode", zipCode);
      params.set("t", Date.now());

      const apiUrl = `${appDomain}/api/delivery-info?${params.toString()}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-cache",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      container.innerHTML = `
        <div class="delivery-result">
          <div class="delivery-country">${data.country || "Unknown"}${data.zipCode ? ` (Zip: ${data.zipCode})` : ""}</div>
          <div class="delivery-message-enhanced ${data.available ? "available" : "unavailable"}">
            ${data.available ? "Available" : "Not Available"}: ${data.message || "No info"}
          </div>
          ${data.deliveryTime ? `<div class="delivery-time">Delivery: ${data.deliveryTime}</div>` : ""}
          ${data.shippingMethod ? `<div class="shipping-method">Shipping: ${data.shippingMethod}</div>` : ""}
          ${data.eventName ? `<div class="event-name">Event: ${data.eventName}</div>` : ""}
          ${data.pickupAvailable ? `<div class="pickup-option">Pickup Available: Yes</div>` : ""}
          ${data.localDelivery ? `<div class="local-delivery">Local Delivery: ${data.localDelivery}</div>` : ""}
          ${data.estimatedDeliveryDate ? `<div class="estimated-date">Estimated Delivery: ${data.estimatedDeliveryDate}</div>` : ""}
        </div>
      `;

      updateTimeline(data);

      if (!data.available && data.notificationsEnabled) {
        console.log("Backend notificationsEnabled:", data.notificationsEnabled);

        container.innerHTML += `
          <div class="notification-form">
            <p>Sign up for notifications when available in your region:</p>
            <form id="notifyForm">
              <input type="email" name="email" placeholder="Enter email" required />
              <input type="hidden" name="productId" value="${productId}" />
              <input type="hidden" name="collectionId" value="${collectionId}" />
              <input type="hidden" name="country" value="${data.country}" />
              <input type="hidden" name="zipCode" value="${zipCode}" />
              <input type="hidden" name="actionType" value="notify" />
              <button type="submit">Notify Me</button>
            </form>
          </div>
        `;

        document.getElementById("notifyForm")?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          try {
            const response = await fetch(`${appDomain}/api/delivery-info`, {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
              const errorText = await response.text();
              console.error("Server error:", response.status, errorText);
              container.innerHTML += `<div class="notification-error">Server error: ${response.status}. Please try again.</div>`;
              return;
            }
            const result = await response.json();
            if (result.success) {
              container.innerHTML = `<div class="notification-success">${result.message}</div>`;
            } else {
              container.innerHTML += `<div class="notification-error">${result.error}</div>`;
            }
          } catch (error) {
            console.error("Fetch error:", error);
            container.innerHTML += `<div class="notification-error">Failed to submit notification request: ${error.message}</div>`;
          }
        });
      }
    } catch (error) {
      console.error("Error in checkAvailability:", error);
      container.innerHTML = `
        <div class="delivery-error">
          Service temporarily unavailable. Please try again later.
        </div>
      `;
      timelineMessage.textContent = "Delivery Timeline Unavailable";
      orderNowDate.textContent = "Place your order";
      readyToShipDate.textContent = "Preparing order";
      deliveryDate.textContent = "Awaiting info...";
    }
  }

  await checkAvailability();

  if (checkCountryBtn && countrySearch && zipCodeInput) {
    checkCountryBtn.addEventListener("click", async () => {
      const selectedCountry = countrySearch.value.trim();
      if (selectedCountry && !countries.includes(selectedCountry)) {
        container.innerHTML = `
          <div class="delivery-error">
            Please select a valid country from the list.
          </div>
        `;
        timelineMessage.textContent = "Delivery Timeline Unavailable";
        orderNowDate.textContent = "Place your order";
        readyToShipDate.textContent = "Preparing order";
        deliveryDate.textContent = "Awaiting info...";
        return;
      }
      container.dataset.country = selectedCountry || "";
      await checkAvailability();
    });

    zipCodeInput.addEventListener("input", () => {
      checkAvailability();
    });
  }
})();