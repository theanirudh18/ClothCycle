/* ClothCycle — Final Stable JS */
/* ==============================
     LOGIN / SIGNUP TAB SWITCH
============================== */
let leaderboardExpanded = false;

function switchTab(tab) {
  const loginForm = safeGet("loginPageForm");
  const signupForm = safeGet("signupPageForm");
  const tabButtons = document.querySelectorAll(".tab-btn");

  if (!loginForm || !signupForm) return;

  // Switch to SIGN IN
  if (tab === "signin") {
    loginForm.style.display = "block";
    signupForm.style.display = "none";

    tabButtons[0].classList.add("active");
    tabButtons[1].classList.remove("active");
  }

  // Switch to SIGN UP
  if (tab === "signup") {
    loginForm.style.display = "none";
    signupForm.style.display = "block";

    tabButtons[0].classList.remove("active");
    tabButtons[1].classList.add("active");
  }
}

/* ==============================
      CONFIG & UTILITIES
============================== */

const API_BASE = `${location.protocol}//${location.hostname}:5001/api`;

function safeGet(id) {
  return document.getElementById(id) || null;
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"])
    headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = "Bearer " + token;

  try {
    const res = await fetch(API_BASE + endpoint, { ...options, headers });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {}

    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

/* ==============================
           NAVIGATION
============================== */

function navigateTo(section) {
  document.querySelectorAll(".screen").forEach(s => (s.style.display = "none"));
  const el = safeGet(section);
  if (el) el.style.display = "";

  document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active"));
  document.querySelector(`[data-nav="${section}"]`)?.classList.add("active");

  if (section === "bins") loadBins();
  if (section === "profile") loadProfileToUI();
  
  if (section === "impact") {
    renderImpact();
    loadImpactLeaderboard(); // FIXED
  }
}

/* ==============================
            AUTH SYSTEM
============================== */

function updateAuthUI() {
  const navAuth = safeGet("nav-auth");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!navAuth) return;

  if (user?.id) {
    navAuth.innerText = user.name || "Profile";
    navAuth.dataset.nav = "profile";
  } else {
    navAuth.innerText = "Sign In";
    navAuth.dataset.nav = "login";
  }
}

async function handleSignupPage(e) {
  e.preventDefault();

  const name = safeGet("signup_name").value.trim();
  const email = safeGet("signup_email").value.trim();
  const password = safeGet("signup_pass").value.trim();

  try {
    const res = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });

    // 🟢 SIGNUP SUCCESS — show message
    alert("Thank you for registering!");

    // Save data and continue
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    updateAuthUI();
    navigateTo("home");

  } catch (err) {

    // 🛑 SIGNUP FAILED — detect exact backend error
    const msg = err.message.toLowerCase();

    if (msg.includes("registered")) {
      alert("Signup failed: Email already registered.");
    } else {
      alert("Signup failed: " + err.message);
    }

    return; // stop execution
  }
}

async function handleLoginPage(e) {
  e.preventDefault();
  const email = safeGet("login_email").value.trim();
  const password = safeGet("login_pass").value.trim();

  try {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    updateAuthUI();
    navigateTo("home");
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

function signOut() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateAuthUI();
  navigateTo("login");
}

/* ==============================
       BINS + MAP SECTION
============================== */

let leafletMap = null;
let leafletMarkers = [];

function initLeafletMap() {
  const map = safeGet("mapContainer");
  if (!map || leafletMap) return;

  leafletMap = L.map("mapContainer").setView([13.036, 77.60], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(leafletMap);
}

async function loadBins() {
  initLeafletMap();
  const list = safeGet("binsList");
  if (!list) return;

  list.innerHTML = "<div class='muted'>Loading bins...</div>";

  try {
    const bins = await apiFetch("/bins");
    list.innerHTML = "";

    leafletMarkers.forEach(m => leafletMap.removeLayer(m));
    leafletMarkers = [];

    bins.forEach(b => {
      const card = document.createElement("div");
      card.className = "bin-card";
      card.innerHTML = `
        <div class="title">${b.name}</div>
        <div class="muted small">${b.address}</div>
        <button class="btn small btn-primary" onclick="openBinDetails('${b.bin_code}')">View</button>
      `;
      list.appendChild(card);

      const marker = L.marker([b.latitude, b.longitude]).addTo(leafletMap);
      marker.bindPopup(`${b.name}<br>${b.address}`);
      leafletMarkers.push(marker);
    });

    safeGet("bins-count").innerText = bins.length;
  } catch (err) {
    list.innerHTML = `<div class="muted">Error: ${err.message}</div>`;
  }
}

async function openBinDetails(binCode) {
  try {
    let bin;
    try { bin = await apiFetch(`/bins/code/${binCode}`); }
    catch { bin = await apiFetch(`/bins/${binCode}`); }

    safeGet("binActionModal")?.remove();

    const modal = document.createElement("div");
    modal.id = "binActionModal";
    modal.style = `
      position:fixed; inset:0; background:#0008;
      display:flex; justify-content:center; align-items:center;
      z-index:999;
    `;

    modal.innerHTML = `
      <div style="
        background:white; padding:25px; border-radius:18px; 
        width:340px; text-align:center;
      ">
        <h3>${bin.name}</h3>
        <p class="muted">${bin.address}</p>

        <!-- GET DIRECTIONS -->
        <button class="btn btn-primary" style="width:100%; margin-top:15px;"
          onclick="getBinDirections('${bin.latitude}', '${bin.longitude}')">
          Get Directions
        </button>

        <!-- DONATE NOW -->
        <button class="btn btn-outline" id="donateNowBtn" style="width:100%; margin-top:12px;">
          Donate Now
        </button>

        <!-- CANCEL -->
        <button class="btn btn-ghost" style="width:100%; margin-top:12px;"
          onclick="closeBinActionModal()">
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // SAFELY attach event listener so JSON never breaks HTML
    safeGet("donateNowBtn").onclick = () => {
      closeBinActionModal();
      openDonateModal(bin);
    };

  } catch (err) {
    alert("Unable to load bin details.");
  }
}
function closeBinActionModal() {
  const modal = document.getElementById("binActionModal");
  if (modal) modal.remove();
}

/* ==============================
       to get directions
============================== */
function getBinDirections(lat, lng) {
  if (!lat || !lng) {
    alert("Location not available for this bin.");
    return;
  }

  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, "_blank");
}



/* ==============================
        DONATION MODAL
============================== */

function openDonateModal(bin) {
  safeGet("donateModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "donateModal";
  modal.style = `
    position:fixed; inset:0; background:#0008;
    display:flex; justify-content:center; align-items:center; z-index:999;
  `;

  modal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:14px;width:350px;">
      <h3>${bin.name}</h3>
      <p>${bin.address}</p>

     <div class="donate-field">
  <label>Items</label>
  <input id="don_items" type="number" value="1" min="1">
</div>

<div class="donate-field" style="margin-top:14px;">
  <label>Weight (kg)</label>
  <input id="don_kg" type="number" value="1" min="0" step="0.01">
</div>


      <button class="btn btn-primary" onclick="submitDonation('${bin.bin_code}')" style="width:100%">Submit</button>
      <button class="btn btn-ghost" onclick="closeDonateModal()" style="width:100%;margin-top:8px;">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeDonateModal() {
  safeGet("donateModal")?.remove();
}

/* ==============================
       DONATION SUBMISSION
============================== */

async function submitDonation(binCode) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const items = Number(safeGet("don_items").value);
  const kg = Number(safeGet("don_kg").value);

  try {
    const res = await apiFetch("/scan", {
      method: "POST",
      body: JSON.stringify({ binCode, items, kg, userId: user.id })
    });

    user.points += res.awardedPoints;
    user.donations += items;
    localStorage.setItem("user", JSON.stringify(user));

    closeDonateModal();
    loadProfileToUI();
    renderImpact();
    loadImpactLeaderboard();
    showSimpleSuccess();


  } catch (err) {
    alert("Donation failed: " + err.message);
  }
}

/* ==============================
        QR SCANNER (3 Alerts)
============================== */

let html5QrCode = null;
let isScanning = false;

async function startQRScanner() {
  const area = safeGet("qr-reader");
  if (!area) return alert("Scanner area missing.");

  try {
    if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      decoded => handleQRCodeSuccess(decoded)
    );

    isScanning = true;
    alert("Scanner started successfully.");

  } catch {
    alert("Camera permission denied. Please allow camera access.");
  }
}

function stopQRScanner() {
  if (!html5QrCode || !isScanning) return;

  html5QrCode.stop().then(() => {
    html5QrCode.clear();
    isScanning = false;
    alert("Scanner stopped.");
  });
}

function handleQRCodeSuccess(text) {
  stopQRScanner();
  alert("Scan completed!");

  let binCode = text;
  try {
    const obj = JSON.parse(text);
    if (obj.binCode) binCode = obj.binCode;
  } catch {}

  showScanSuccessModal(binCode);
}

/* ==============================
      SCAN SUCCESS MODAL
============================== */

function showScanSuccessModal(binCode) {
  safeGet("scanSuccessModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "scanSuccessModal";
  modal.className = "scan-modal";

  modal.innerHTML = `
    <div class="scan-modal-card">
      <h3>Scan Successful!</h3>
      <p class="muted">Bin: <strong>${binCode}</strong></p>

      <button class="btn btn-primary" onclick="openBinDetails('${binCode}'); closeScanModal();">
        Proceed to Donate
      </button>
      <button class="btn btn-ghost" onclick="closeScanModal()">Close</button>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeScanModal() {
  safeGet("scanSuccessModal")?.remove();
}

/* ==============================
   PROFILE & HISTORY
============================== */

function renderDonationHistory(history) {
  const container = safeGet("donationHistory");
  const filterDropdown = safeGet("donationMonthFilter");

  container.innerHTML = "";

  if (!history || history.length === 0) {
    container.innerHTML = "<p>No donations yet.</p>";
    return;
  }

  // Sort latest first
  history = history.sort((a, b) => {
    const dateA = new Date(a.date || a.created_at || a.timestamp || a.time);
    const dateB = new Date(b.date || b.created_at || b.timestamp || b.time);
    return dateB - dateA;
  });

  const SHOW_LIMIT = 10;
  let showingFull = false;

  // Helpers
  function formatMonthTitle(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  function getDonationDate(item) {
    return item.date || item.created_at || item.timestamp || item.time;
  }

  // Build list of unique months for dropdown
  const months = [...new Set(history.map(item => formatMonthTitle(getDonationDate(item))))];

  // Add "All Months" option
  filterDropdown.innerHTML = `<option value="all">All Donations</option>` +
    months.map(m => `<option value="${m}">${m}</option>`).join("");

  // Rendering function
  function render() {
    container.innerHTML = "";

    const selectedMonth = filterDropdown.value;

    // Filter by month or show last 10 donations
    let listToShow;

    if (selectedMonth === "all") {
      listToShow = showingFull ? history : history.slice(0, SHOW_LIMIT);
    } else {
      listToShow = history.filter(item =>
        formatMonthTitle(getDonationDate(item)) === selectedMonth
      );
    }

    // Group items by month
    const grouped = {};
    listToShow.forEach(item => {
      const key = formatMonthTitle(getDonationDate(item));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    // Render groups
    Object.keys(grouped).forEach(month => {
      // Month Header
      const header = document.createElement("div");
      header.className = "month-header";
      header.innerText = month;
      container.appendChild(header);

      // Items
      grouped[month].forEach(item => {
        const donationDate = getDonationDate(item);
        const div = document.createElement("div");
        div.className = "donation-item";
        div.innerHTML = `
          <strong>${item.items} items — ${Number(item.weight_kg).toFixed(2)}kg</strong><br>
          <span class="muted">${formatDonationDate(donationDate)}</span>
        `;
        container.appendChild(div);
      });
    });

    // SEE MORE button appears ONLY in "all" mode
    if (selectedMonth === "all" && history.length > SHOW_LIMIT) {
      const btn = document.createElement("button");
      btn.className = "see-more-btn";
      btn.innerText = showingFull ? "Show Less" : "See More";
      btn.onclick = () => {
        showingFull = !showingFull;
        render();
      };
      container.appendChild(btn);
    }
  }

  // Render initially
  render();

  // Update when month is changed
  filterDropdown.onchange = () => {
    showingFull = false; // reset
    render();
  };
}
// Format date utility
function formatDonationDate(dateStr) {
  const d = new Date(dateStr);

  if (isNaN(d)) return "Invalid Date";

  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}



async function loadProfileToUI() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.id) return;

  try {
    const data = await apiFetch(`/user/${user.id}`);

    const profile = data.profile;
    const history = data.history;

    safeGet("profileName").innerText = profile.name;
    safeGet("profileEmail").innerText = profile.email;
    safeGet("profilePoints").innerText = profile.points;

    const totalKg = history.reduce((a, b) => a + Number(b.weight_kg || 0), 0);
    const families = history.reduce((a, b) => a + Math.floor(b.items / 2), 0);

    safeGet("profileKg").innerText = totalKg.toFixed(2);
    safeGet("profileFam").innerText = families;

    safeGet("profileAvatar").innerText =
      profile.name.split(" ").map(w => w[0]?.toUpperCase()).join("");

    renderDonationHistory(history);
  // ----------------------
// BADGE SYSTEM
// ----------------------
// ----------------------
// BADGE SYSTEM
// ----------------------
const badgeContainer = safeGet("profileBadges");
badgeContainer.innerHTML = "";

const kg = totalKg; // total donated weight

// All badges
const ALL_BADGES = [
  { key: "beginner",   name: "Beginner",    icon: "🟢", min: 1 },
  { key: "helper",     name: "Helper",      icon: "🔵", min: 5 },
  { key: "supporter",  name: "Supporter",   icon: "🟣", min: 10 },
  { key: "hero",       name: "Hero",        icon: "🟡", min: 20 },
  { key: "legend",     name: "Legend",      icon: "🔥", min: 50 },
  { key: "super",      name: "Super Donor", icon: "👑", min: 100 }
];

// READ LAST UNLOCKED BADGE FROM BROWSER
let lastSavedBadge = localStorage.getItem("lastBadgeUnlocked") || "";

// Detect NEW unlock
let latestUnlockedBadge = null;

ALL_BADGES.forEach(b => {
  const earned = kg >= b.min;

  // Detect if this badge is newly unlocked
  if (earned && b.name !== lastSavedBadge) {
    latestUnlockedBadge = b;
  }

  // Build badge UI
  const div = document.createElement("div");
  div.className = "badge-item " + (earned ? "unlocked" : "locked");

  div.innerHTML = `
    <div class="badge-icon badge-${b.key}">
      ${earned ? (b.icon === "●" ? "" : b.icon) : "🔒"}
    </div>
    ${b.name}
  `;

  badgeContainer.appendChild(div);
});

// SHOW POPUP ONLY FOR NEWLY UNLOCKED BADGES
if (latestUnlockedBadge) {
  showBadgePopup(latestUnlockedBadge.name, latestUnlockedBadge.icon);
  localStorage.setItem("lastBadgeUnlocked", latestUnlockedBadge.name);
}

// ----------------------
// PROGRESS BAR FOR NEXT BADGE
// ----------------------
document.querySelectorAll(".all-badges-msg").forEach(e => e.remove());

const impactCard = document.querySelector(".profile-card:last-child");

// Find next badge to unlock
const nextBadge = ALL_BADGES.find(b => b.min > kg);

let progressHTML = "";

if (nextBadge) {
  const progressPercent = Math.min(100, (kg / nextBadge.min) * 100);

  progressHTML = `
    <div style="margin-top:20px;">
      <strong>Next Badge: ${nextBadge.name} (${nextBadge.min}kg)</strong>
      <div class="progress-container">
        <div class="progress-bar" style="width:${progressPercent}%"></div>
      </div>
    </div>
  `;
} else {
  // User has all badges → show ONLY one message
  progressHTML = `
    <div class="all-badges-msg" style="margin-top:16px;font-weight:600;">
      🎉 You have unlocked all badges!
    </div>
  `;
}

// Insert progress bar/message
impactCard.insertAdjacentHTML("beforeend", progressHTML);


  } catch (err) {
    console.error("Profile load failed:", err);
  }
}

/* ==============================
            IMPACT
============================== */

async function renderImpact() {
  try {
    const d = await apiFetch("/leaderboard/impact");

    safeGet("impact-kg").innerText = d.kg;
    safeGet("impact-families").innerText = d.families;
    safeGet("impact-co2").innerText = d.co2;
    safeGet("impact-volunteers").innerText = d.volunteers;

    safeGet("cnt-kg").innerText = d.kg;
    safeGet("cnt-fam").innerText = d.families;
    safeGet("cnt-vol").innerText = d.volunteers;

  } catch {}
}

/* ==============================
   IMPACT PAGE LEADERBOARD
============================== */

async function loadImpactLeaderboard() {
  const listBox = safeGet("impactLeaderboard");
  const topBox = safeGet("topDonorDetails");
  const toggleBtn = safeGet("toggleLeaderboardBtn");

  if (!listBox || !topBox) return;

  listBox.innerHTML = "<div class='muted'>Loading...</div>";

  try {
    const leaders = await apiFetch("/leaderboard");

    if (!leaders || !leaders.length) {
      listBox.innerHTML = "<div class='muted'>No donors yet</div>";
      if (toggleBtn) toggleBtn.style.display = "none";
      return;
    }

    // Top donor
    const top = leaders[0];
    topBox.innerHTML = `
      <div class="top-donor-highlight">
        <h3 style="margin:0">${top.name}</h3>
        <div style="margin-top:6px"><strong>${top.total_kg ?? 0} kg donated</strong></div>
        <div class="lb-progress"><div class="lb-progress-fill" style="width:${Math.min(top.total_kg ?? 0,100)}%"></div></div>
      </div>
    `;

    // choose slice
    const display = leaderboardExpanded ? leaders : leaders.slice(0,5);

    listBox.innerHTML = display.map((u, idx) => `
      <div class="leaderboard-item">
        <div style="display:flex;align-items:center;">
          <div class="rank-badge">${idx + 1}</div>
          <div class="lb-avatar">${(u.name||"U").split(" ").map(x=>x[0]).join("").toUpperCase()}</div>
          <div>${u.name}</div>
        </div>
        <div style="text-align:right;min-width:120px;">
          <div><strong>${u.total_kg ?? 0} kg</strong></div>
          <div class="lb-progress" style="width:110px;"><div class="lb-progress-fill" style="width:${Math.min(u.total_kg ?? 0,100)}%"></div></div>
        </div>
      </div>
    `).join("");

    // toggle visibility
    if (toggleBtn) {
      if (leaders.length <= 5) toggleBtn.style.display = "none";
      else { toggleBtn.style.display = "inline-block"; toggleBtn.innerText = leaderboardExpanded ? "See Less" : "See More"; }
    }

  } catch (err) {
    console.error("loadImpactLeaderboard error:", err);
    listBox.innerHTML = "<div class='muted'>Failed to load leaderboard</div>";
    if (toggleBtn) toggleBtn.style.display = "none";
  }
}




/* ==============================
         INIT APP
============================== */

function init() {
  document.querySelectorAll(".nav-link").forEach(n =>
    n.addEventListener("click", e => {
      e.preventDefault();
      navigateTo(n.dataset.nav);
    })
  );

  safeGet("loginPageForm")?.addEventListener("submit", handleLoginPage);
  safeGet("signupPageForm")?.addEventListener("submit", handleSignupPage);

  updateAuthUI();

  if (localStorage.getItem("token")) navigateTo("home");
  else navigateTo("login");

  renderImpact();
}

window.addEventListener("load", init);

/* ==============================
   GLOBAL EXPORTS FOR HTML
============================== */

window.startQRScanner = startQRScanner;
window.stopQRScanner = stopQRScanner;
window.openBinDetails = openBinDetails;
window.submitDonation = submitDonation;
window.signOut = signOut;
window.navigateTo = navigateTo;
window.closeScanModal = closeScanModal;

window.centerOnUserLocation = centerOnUserLocation;

function centerOnUserLocation() {
  if (!leafletMap) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      leafletMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
    }, () => {
      alert("Unable to fetch your location.");
    });
  } else {
    alert("Geolocation is not supported by your device.");
  }
}
function toggleLeaderboard() {
  leaderboardExpanded = !leaderboardExpanded;

  const btn = safeGet("toggleLeaderboardBtn");
  if (btn) btn.innerText = leaderboardExpanded ? "See Less" : "See More";

  loadImpactLeaderboard();

  setTimeout(() => {
    if (leaderboardExpanded) {
      // Smooth scroll downward to the expanded list
      const leaderboardTop = safeGet("impactLeaderboard")?.offsetTop || 0;
      window.scrollTo({
        top: leaderboardTop - 100,
        behavior: "smooth"
      });
    } else {
      // Scroll back to the top donor section
      const topDonorTop = safeGet("topDonorCard")?.offsetTop || 0;
      window.scrollTo({
        top: topDonorTop - 80,
        behavior: "smooth"
      });
    }
  }, 200);
}
// Simple toast for donation success
function showSimpleSuccess() {
  const old = document.getElementById("simpleSuccessToast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.id = "simpleSuccessToast";

  toast.innerHTML = `
    <span class="checkmark">✔</span>
    Donation Successful
  `;

  document.body.appendChild(toast);

  // Fade + scale in
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, -50%) scale(1)";
  }, 20);

  // Fade + scale out
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -50%) scale(0.9)";
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}
// Badge popup notification
function showBadgePopup(badgeName, badgeIcon) {
  const old = document.getElementById("badgePopup");
  if (old) old.remove();

  const div = document.createElement("div");
  div.id = "badgePopup";
  div.innerHTML = `${badgeIcon} Badge Unlocked: <br> <strong>${badgeName}</strong>`;

  document.body.appendChild(div);

  // Fade-in animation
  setTimeout(() => {
    div.style.opacity = "1";
    div.style.transform = "translate(-50%, -50%) scale(1)";
  }, 20);

  // Auto remove
  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transform = "translate(-50%, -50%) scale(0.8)";
    setTimeout(() => div.remove(), 300);
  }, 2000);
}

