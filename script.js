let plantsData = {};
let myGarden = JSON.parse(localStorage.getItem("myGarden")) || [];
let currentWeather = null;

async function jsonCek() {
  const response = await fetch("bilgiler.json");
  const data = await response.json();
  plantsData = data.plants || {};
}

function bahceyiKaydet() {
  localStorage.setItem("myGarden", JSON.stringify(myGarden));
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function bitkiBul(input) {
  const temizInput = normalizeText(input);

  for (const key in plantsData) {
    if (normalizeText(key) === temizInput) {
      return {
        plant: plantsData[key],
        key: key
      };
    }
  }

  return {
    plant: null,
    key: ""
  };
}

function gunFarkiHesapla(tarih) {
  const bugun = new Date();
  const eskiTarih = new Date(tarih);
  return Math.floor((bugun - eskiTarih) / (1000 * 60 * 60 * 24));
}

function ayAdiBul(tarih) {
  const aylar = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  return aylar[new Date(tarih).getMonth()];
}

function tarihiYazdir(tarih) {
  if (!tarih) return "Yok";
  return new Date(tarih).toLocaleDateString("tr-TR");
}

async function havaDurumuGetir(city) {
  const apiKey = "apikey";

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
  );

  const data = await response.json();

  if (!response.ok || data.cod === 404 || data.cod === "404") {
    throw new Error("Geçersiz şehir");
  }

  return {
    city: data.name,
    temp: data.main?.temp ?? 0,
    rain: data.weather?.some(item =>
      item.main === "Rain" ||
      item.main === "Drizzle" ||
      item.main === "Thunderstorm"
    ) || false,
    windSpeed: data.wind?.speed ?? 0
  };
}

async function havaDurumuGuncelle(city) {
  currentWeather = await havaDurumuGetir(city);
}

function ekimTarihiUygunMu(plant, tarih) {
  if (!plant.ekim_zamani || !plant.ekim_zamani.length) return true;

  const secilenAy = ayAdiBul(tarih);
  return plant.ekim_zamani.includes(secilenAy);
}

function bugunEkimUygunMu(plant) {
  if (!plant.ekim_zamani || !plant.ekim_zamani.length) return true;

  const bugununAyi = ayAdiBul(new Date());
  return plant.ekim_zamani.includes(bugununAyi);
}

function sulamaKarari(plant) {
  if (!plant.ekimYapildi) {
    return "Önce ekim yapılmalı";
  }

  const gunFarki = gunFarkiHesapla(plant.lastWatered);

  if (currentWeather?.rain) {
    return "☔ Yağmur var, sulama yapma";
  }

  if (currentWeather?.temp > 30 && gunFarki >= 1) {
    return "🔥 Hava sıcak, sulama önerilir";
  }

  if (gunFarki >= (plant.suAraligiGun || plant.waterIntervalDays || 3)) {
    return "💧 Sulama zamanı geldi";
  }

  return "✔️ Bugün sulama gerekmiyor";
}

function gubrelemeKarari(plant) {
  if (!plant.ekimYapildi) {
    return "Önce ekim yapılmalı";
  }

  const gunFarki = gunFarkiHesapla(plant.lastFertilized);

  if (gunFarki >= (plant.gubreAraligiGun || 15)) {
    return "🌿 Gübreleme zamanı geldi";
  }

  return "✔️ Bugün gübreleme gerekmiyor";
}

function bitkiAra() {
  const input = document.getElementById("search").value.trim();
  const sonuc = document.getElementById("sonuc");

  if (!input) {
    sonuc.innerText = "Bitki adı gir!";
    return;
  }

  const result = bitkiBul(input);

  if (!result.plant) {
    sonuc.innerText = "Bitki bulunamadı ❌";
    return;
  }

  sonuc.innerHTML = `
    <strong>Bitki:</strong> ${result.key}<br>
    <strong>Su ihtiyacı:</strong> ${result.plant.su_ihtiyaci || "Bilinmiyor"}<br>
    <strong>Gübre ihtiyacı:</strong> ${result.plant.gubre_ihtiyaci || "Bilinmiyor"}<br>
    <strong>Rüzgar:</strong> ${result.plant.ruzgar || "Bilinmiyor"}<br>
    <strong>Ekim zamanı:</strong> ${result.plant.ekim_zamani ? result.plant.ekim_zamani.join(", ") : "Bilinmiyor"}
  `;
}

function bahceyiGoster() {
  const gardenList = document.getElementById("gardenList");

  if (myGarden.length === 0) {
    gardenList.innerHTML = "<p>Henüz bahçene bitki eklenmedi.</p>";
    return;
  }

  gardenList.innerHTML = myGarden.map((plant, index) => `
    <div class="garden-card">
      <h3>${plant.eslesenBitkiAdi}</h3>
      <p><strong>Şehir:</strong> ${plant.sehir}</p>
      <p><strong>Ekim Tarihi:</strong> ${plant.ekimTarihi}</p>
      <p><strong>Son Sulama:</strong> ${tarihiYazdir(plant.lastWatered)}</p>
      <p><strong>Son Gübreleme:</strong> ${tarihiYazdir(plant.lastFertilized)}</p>
      <p><strong>Su İhtiyacı:</strong> ${plant.su_ihtiyaci || "Bilinmiyor"}</p>
      <p><strong>Gübre İhtiyacı:</strong> ${plant.gubre_ihtiyaci || "Bilinmiyor"}</p>
      <button onclick="bitkiSulandi(${index})">Sulandı</button>
      <button onclick="bitkiGubrelendi(${index})">Gübrelendi</button>
      <button onclick="bitkiHasatEt(${index})">Hasat Et</button>
      <button onclick="bitkiSil(${index})">Sil</button>
    </div>
  `).join("");
}

function bildirimleriGoster() {
  const bildirimler = document.getElementById("bildirimler");

  if (myGarden.length === 0) {
    bildirimler.innerHTML = "Henüz bir bildirim yok.";
    return;
  }

  const mesajlar = [];

  myGarden.forEach(plant => {
    if (!plant.ekimYapildi) {
      if (bugunEkimUygunMu(plant)) {
        mesajlar.push(`🌱 <strong>${plant.eslesenBitkiAdi}</strong>: Artık ekim yapabilirsiniz.`);
      } else {
        mesajlar.push(`📅 <strong>${plant.eslesenBitkiAdi}</strong>: Bu ay ekilemez. Uygun aylar: ${plant.ekim_zamani.join(", ")}`);
      }
      return;
    }

    mesajlar.push(`
      <strong>${plant.eslesenBitkiAdi}</strong><br>
      ${sulamaKarari(plant)}<br>
      ${gubrelemeKarari(plant)}
    `);
  });

  bildirimler.innerHTML = mesajlar.join("<hr>");
}

function bitkiSulandi(index) {
  myGarden[index].lastWatered = new Date().toISOString();
  bahceyiKaydet();
  bahceyiGoster();
  bildirimleriGoster();
}

function bitkiGubrelendi(index) {
  myGarden[index].lastFertilized = new Date().toISOString();
  bahceyiKaydet();
  bahceyiGoster();
  bildirimleriGoster();
}

function bitkiHasatEt(index) {
  const sonuc = document.getElementById("sonuc");
  const hasatEdilenBitki = myGarden[index];

  myGarden.splice(index, 1);
  bahceyiKaydet();
  bahceyiGoster();
  bildirimleriGoster();

  sonuc.innerHTML = `${hasatEdilenBitki.eslesenBitkiAdi} hasat edildi 🌾`;
}

function bitkiSil(index) {
  myGarden.splice(index, 1);
  bahceyiKaydet();
  bahceyiGoster();
  bildirimleriGoster();
}

async function bitkiEkle() {
  const input = document.getElementById("search").value.trim();
  const city = document.getElementById("city").value.trim();
  const ekimTarihi = document.getElementById("ekimTarihi").value;
  const sonuc = document.getElementById("sonuc");

  if (!Object.keys(plantsData).length) {
    await jsonCek();
  }

  if (!input || !city || !ekimTarihi) {
    sonuc.innerText = "Bitki adı, şehir ve ekim tarihi gir!";
    return;
  }

  try {
    await havaDurumuGuncelle(city);
  } catch (error) {
    sonuc.innerText = "Geçerli bir şehir gir!";
    return;
  }

  const result = bitkiBul(input);

  if (!result.plant) {
    sonuc.innerText = "Bitki bulunamadı ❌";
    return;
  }

  const uygunMu = ekimTarihiUygunMu(result.plant, ekimTarihi);

  if (!uygunMu) {
    sonuc.innerHTML = `${result.key} bu ay ekilemez ❌ Uygun aylar: ${result.plant.ekim_zamani.join(", ")}`;
    return;
  }

  const ekimDate = new Date(ekimTarihi);

  const yeniBitki = {
    ...result.plant,
    girilenBilgi: input,
    eslesenBitkiAdi: result.key,
    sehir: city,
    ekimTarihi: ekimTarihi,
    ekimYapildi: true,
    plantedAt: ekimDate.toISOString(),
    lastWatered: ekimDate.toISOString(),
    lastFertilized: ekimDate.toISOString()
  };

  myGarden.push(yeniBitki);
  bahceyiKaydet();
  bahceyiGoster();
  bildirimleriGoster();

  sonuc.innerHTML = `${result.key} bahçene eklendi ve ekim yapıldı ✅`;
}

jsonCek().then(() => {
  bahceyiGoster();
  bildirimleriGoster();
});

setInterval(bildirimleriGoster, 60000);
