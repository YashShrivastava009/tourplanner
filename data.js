// =========================================================================
// 1. CURRENCY METADATA, LIVE RATE BASELINES & COUNTRY MAPPINGS
// =========================================================================
const CURRENCIES = {
    INR: { code: "INR", symbol: "₹", flag: "🇮🇳", name: "Indian Rupee", country: "India", mealUsd: 4, coffeeUsd: 2.2, transitUsd: 0.7, hotelUsd: 55, chips: [500, 2000, 10000, 50000, 100000] },
    JPY: { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japanese Yen", country: "Japan", mealUsd: 9, coffeeUsd: 3.5, transitUsd: 2, hotelUsd: 115, chips: [1000, 5000, 10000, 50000, 100000] },
    USD: { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", country: "United States", mealUsd: 18, coffeeUsd: 5.5, transitUsd: 3, hotelUsd: 190, chips: [20, 100, 500, 1000, 2500] },
    EUR: { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro", country: "Italy", mealUsd: 16, coffeeUsd: 3.8, transitUsd: 2.5, hotelUsd: 155, chips: [20, 100, 500, 1000, 2500] },
    CHF: { code: "CHF", symbol: "CHF ", flag: "🇨🇭", name: "Swiss Franc", country: "Switzerland", mealUsd: 28, coffeeUsd: 6.5, transitUsd: 5.5, hotelUsd: 240, chips: [20, 100, 500, 1000, 2000] },
    GBP: { code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound", country: "United Kingdom", mealUsd: 18, coffeeUsd: 4.8, transitUsd: 3.8, hotelUsd: 175, chips: [20, 100, 500, 1000, 2000] },
    AED: { code: "AED", symbol: "د.إ ", flag: "🇦🇪", name: "UAE Dirham", country: "United Arab Emirates", mealUsd: 12, coffeeUsd: 5, transitUsd: 2, hotelUsd: 140, chips: [100, 500, 1000, 5000, 10000] },
    THB: { code: "THB", symbol: "฿", flag: "🇹🇭", name: "Thai Baht", country: "Thailand", mealUsd: 4, coffeeUsd: 2.5, transitUsd: 1.2, hotelUsd: 60, chips: [500, 1000, 5000, 10000, 25000] },
    KRW: { code: "KRW", symbol: "₩", flag: "🇰🇷", name: "South Korean Won", country: "South Korea", mealUsd: 8.5, coffeeUsd: 3.8, transitUsd: 1.3, hotelUsd: 105, chips: [10000, 50000, 100000, 500000, 1000000] },
    IDR: { code: "IDR", symbol: "Rp ", flag: "🇮🇩", name: "Indonesian Rupiah", country: "Indonesia", mealUsd: 4, coffeeUsd: 2.5, transitUsd: 1.5, hotelUsd: 65, chips: [100000, 500000, 1000000, 5000000, 10000000] },
    SGD: { code: "SGD", symbol: "S$", flag: "🇸🇬", name: "Singapore Dollar", country: "Singapore", mealUsd: 9, coffeeUsd: 4.5, transitUsd: 1.8, hotelUsd: 165, chips: [50, 100, 500, 1000, 2500] },
    NOK: { code: "NOK", symbol: "kr ", flag: "🇳🇴", name: "Norwegian Krone", country: "Norway", mealUsd: 24, coffeeUsd: 5.5, transitUsd: 4.2, hotelUsd: 180, chips: [200, 1000, 5000, 10000, 20000] },
    AUD: { code: "AUD", symbol: "A$", flag: "🇦🇺", name: "Australian Dollar", country: "Australia", mealUsd: 16, coffeeUsd: 4.2, transitUsd: 3.2, hotelUsd: 150, chips: [50, 100, 500, 1000, 2500] },
    VND: { code: "VND", symbol: "₫", flag: "🇻🇳", name: "Vietnamese Dong", country: "Vietnam", mealUsd: 3, coffeeUsd: 1.8, transitUsd: 0.8, hotelUsd: 45, chips: [200000, 500000, 1000000, 5000000, 10000000] },
    TRY: { code: "TRY", symbol: "₺", flag: "🇹🇷", name: "Turkish Lira", country: "Turkey", mealUsd: 7, coffeeUsd: 3, transitUsd: 1, hotelUsd: 80, chips: [500, 1000, 5000, 10000, 25000] }
};

const DEFAULT_FX_RATES_USD = {
    USD: 1, INR: 84.5, JPY: 153.2, EUR: 0.92, CHF: 0.88, GBP: 0.78,
    AED: 3.67, THB: 34.4, KRW: 1390, IDR: 15800, SGD: 1.34, NOK: 11.05,
    AUD: 1.53, VND: 25300, TRY: 34.4
};

const COUNTRY_TO_CURRENCY = {
    "Japan": "JPY", "India": "INR", "Switzerland": "CHF", "Thailand": "THB",
    "Italy": "EUR", "France": "EUR", "Germany": "EUR", "Spain": "EUR",
    "Greece": "EUR", "Austria": "EUR", "Netherlands": "EUR", "Belgium": "EUR",
    "Portugal": "EUR", "Ireland": "EUR", "Finland": "EUR", "Croatia": "EUR",
    "United Arab Emirates": "AED", "Indonesia": "IDR", "United Kingdom": "GBP",
    "United States": "USD", "Singapore": "SGD", "Vietnam": "VND", "Norway": "NOK",
    "South Korea": "KRW", "Australia": "AUD", "Turkey": "TRY", "Nepal": "INR",
    "Bhutan": "INR", "Maldives": "USD", "Canada": "USD", "New Zealand": "AUD"
};

// Normalize 3D Globe TopoJSON names to our app's standard country names
const GLOBE_NAME_ALIASES = {
    "United States of America": "United States",
    "Korea, Republic of": "South Korea",
    "Republic of Korea": "South Korea",
    "Viet Nam": "Vietnam",
    "Czechia": "Czech Republic",
    "Türkiye": "Turkey",
    "United Republic of Tanzania": "Tanzania",
    "Russian Federation": "Russia",
    "UAE": "United Arab Emirates"
};

function normalizeCountryName(rawName) {
    if (!rawName) return "";
    const trimmed = String(rawName).trim();
    return GLOBE_NAME_ALIASES[trimmed] || trimmed;
}

// =========================================================================
// 2. LIVE WORLD PORTALS & GEOGRAPHY DATABASES
// =========================================================================
const LIVE_PORTALS = [
    {
        id: "japan", country: "Japan", hubCity: "Tokyo", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo",
        image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=600&q=80",
        defaultPlaces: ["Tokyo", "Mount Fuji (Hakone)", "Kyoto"],
        seasonLogic: (m) => {
            if ([2, 3, 4].includes(m)) return { label: "🌸 Sakura Peak", color: "bg-pink-500/25 border-pink-400/50 text-pink-200" };
            if ([9, 10, 11].includes(m)) return { label: "🍁 Autumn Prime", color: "bg-amber-500/25 border-amber-400/50 text-amber-200" };
            if ([0, 1].includes(m)) return { label: "❄️ Crisp Winter", color: "bg-cyan-500/25 border-cyan-400/50 text-cyan-200" };
            return { label: "☀️ Festival Summer", color: "bg-blue-500/25 border-blue-400/50 text-blue-200" };
        }
    },
    {
        id: "norway", country: "Norway", hubCity: "Tromsø", lat: 69.6492, lon: 18.9553, tz: "Europe/Oslo",
        image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=600&q=80",
        defaultPlaces: ["Tromsø (Northern Lights)", "Lofoten Islands", "Oslo"],
        seasonLogic: (m) => {
            if ([9, 10, 11, 0, 1, 2].includes(m)) return { label: "🌌 Aurora Active", color: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200" };
            if ([5, 6, 7].includes(m)) return { label: "☀️ Midnight Sun", color: "bg-amber-500/25 border-amber-400/50 text-amber-200" };
            return { label: "🌊 Fjord Shoulder", color: "bg-blue-500/25 border-blue-400/50 text-blue-200" };
        }
    },
    {
        id: "switzerland", country: "Switzerland", hubCity: "Zermatt", lat: 46.0207, lon: 7.7491, tz: "Europe/Zurich",
        image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80",
        defaultPlaces: ["Interlaken", "Zermatt (Matterhorn)", "Lucerne"],
        seasonLogic: (m) => {
            if ([11, 0, 1, 2].includes(m)) return { label: "⛷️ Alpine Snow Peak", color: "bg-cyan-500/25 border-cyan-400/50 text-cyan-200" };
            if ([5, 6, 7, 8].includes(m)) return { label: "🏔️ Hiking Prime", color: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200" };
            return { label: "🚂 Quiet Rail Season", color: "bg-indigo-500/25 border-indigo-400/50 text-indigo-200" };
        }
    },
    {
        id: "southkorea", country: "South Korea", hubCity: "Seoul", lat: 37.5665, lon: 126.9780, tz: "Asia/Seoul",
        image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80",
        defaultPlaces: ["Seoul", "Busan", "Jeju Island"],
        seasonLogic: (m) => {
            if ([8, 9, 10].includes(m)) return { label: "🍂 Golden Foliage", color: "bg-amber-500/25 border-amber-400/50 text-amber-200" };
            if ([3, 4].includes(m)) return { label: "🌸 Spring Bloom", color: "bg-pink-500/25 border-pink-400/50 text-pink-200" };
            if ([11, 0, 1].includes(m)) return { label: "🍜 Cozy Winter", color: "bg-cyan-500/25 border-cyan-400/50 text-cyan-200" };
            return { label: "🌃 Neon Nights", color: "bg-purple-500/25 border-purple-400/50 text-purple-200" };
        }
    },
    {
        id: "greece", country: "Greece", hubCity: "Santorini", lat: 36.3932, lon: 25.4615, tz: "Europe/Athens",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80",
        defaultPlaces: ["Santorini", "Athens", "Mykonos"],
        seasonLogic: (m) => {
            if ([4, 5, 8, 9].includes(m)) return { label: "✨ Sweet Spot", color: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200" };
            if ([6, 7].includes(m)) return { label: "🔥 Peak Crowds", color: "bg-orange-500/25 border-orange-400/50 text-orange-200" };
            return { label: "🏛️ Calm Off-Peak", color: "bg-slate-500/30 border-slate-400/40 text-slate-200" };
        }
    },
    {
        id: "indonesia", country: "Indonesia", hubCity: "Bali", lat: -8.5069, lon: 115.2625, tz: "Asia/Makassar",
        image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80",
        defaultPlaces: ["Ubud (Bali)", "Uluwatu & Seminyak", "Nusa Penida"],
        seasonLogic: (m) => {
            if ([4, 5, 6, 7, 8].includes(m)) return { label: "☀️ Dry Beach Prime", color: "bg-emerald-500/25 border-emerald-400/50 text-emerald-200" };
            return { label: "🌴 Lush Deals", color: "bg-teal-500/25 border-teal-400/50 text-teal-200" };
        }
    }
];

const QUICK_CITIES = [
    "Sagar, Madhya Pradesh, India", "Satna, Madhya Pradesh, India", "Saharanpur, Uttar Pradesh, India",
    "Sambalpur, Odisha, India", "Surat, Gujarat, India", "Shimla, Himachal Pradesh, India",
    "Srinagar, Jammu & Kashmir, India", "Siliguri, West Bengal, India", "Solapur, Maharashtra, India",
    "Salem, Tamil Nadu, India", "San Francisco, USA", "San Jose, USA", "San Diego, USA",
    "Seattle, USA", "Sydney, Australia", "Singapore, Singapore", "Seoul, South Korea",
    "Shanghai, China", "Stockholm, Sweden", "Bhopal, Madhya Pradesh, India", "Indore, Madhya Pradesh, India",
    "Jabalpur, Madhya Pradesh, India", "Gwalior, Madhya Pradesh, India", "Ujjain, Madhya Pradesh, India",
    "New Delhi, Delhi, India", "Mumbai, Maharashtra, India", "Pune, Maharashtra, India",
    "Nagpur, Maharashtra, India", "Bengaluru, Karnataka, India", "Hyderabad, Telangana, India",
    "Chennai, Tamil Nadu, India", "Kolkata, West Bengal, India", "Ahmedabad, Gujarat, India",
    "Jaipur, Rajasthan, India", "Udaipur, Rajasthan, India", "Jodhpur, Rajasthan, India",
    "Lucknow, Uttar Pradesh, India", "Varanasi, Uttar Pradesh, India", "Agra, Uttar Pradesh, India",
    "Kochi, Kerala, India", "Thiruvananthapuram, Kerala, India", "Goa (Panaji), India",
    "Chandigarh, India", "Amritsar, Punjab, India", "Dehradun, Uttarakhand, India",
    "Patna, Bihar, India", "Ranchi, Jharkhand, India", "Raipur, Chhattisgarh, India",
    "Guwahati, Assam, India", "Bhubaneswar, Odisha, India", "Visakhapatnam, Andhra Pradesh, India",
    "New York, USA", "Los Angeles, USA", "Chicago, USA", "London, United Kingdom",
    "Manchester, United Kingdom", "Paris, France", "Nice, France", "Tokyo, Japan",
    "Osaka, Japan", "Kyoto, Japan", "Dubai, UAE", "Abu Dhabi, UAE", "Bangkok, Thailand",
    "Phuket, Thailand", "Toronto, Canada", "Vancouver, Canada", "Melbourne, Australia",
    "Frankfurt, Germany", "Munich, Germany", "Berlin, Germany", "Rome, Italy", "Milan, Italy",
    "Zurich, Switzerland", "Geneva, Switzerland", "Amsterdam, Netherlands", "Madrid, Spain", "Barcelona, Spain"
];

const COUNTRY_PLACES_DB = {
    "Japan": ["Tokyo", "Kyoto", "Osaka", "Mount Fuji (Hakone)", "Nara", "Hiroshima", "Sapporo (Hokkaido)", "Takayama", "Okinawa", "Fukuoka", "Nagoya", "Kobe", "Yokohama", "Kanazawa", "Nikko", "Kamakura"],
    "India": ["Kerala (Munnar & Alleppey)", "Goa", "Jaipur & Udaipur (Rajasthan)", "Manali & Kasol", "Leh-Ladakh", "Rishikesh & Mussoorie", "Varanasi", "Darjeeling & Gangtok", "Andaman Islands", "Coorg & Ooty", "Agra", "Mumbai", "New Delhi", "Bengaluru"],
    "Switzerland": ["Interlaken", "Zermatt (Matterhorn)", "Lucerne", "Jungfraujoch", "Lauterbrunnen", "Zurich", "Geneva", "Montreux", "Grindelwald", "Bern", "Lugano", "St. Moritz"],
    "Thailand": ["Bangkok", "Phuket", "Krabi & Phi Phi Islands", "Chiang Mai", "Koh Samui", "Pattaya", "Ayutthaya", "Chiang Rai", "Hua Hin"],
    "Italy": ["Rome", "Venice", "Florence (Tuscany)", "Amalfi Coast & Positano", "Milan", "Lake Como", "Cinque Terre", "Naples", "Verona", "Sicily"],
    "France": ["Paris", "Nice & French Riviera", "Chamonix (Mont Blanc)", "Lyon", "Bordeaux", "Mont Saint-Michel", "Provence", "Strasbourg"],
    "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah (Jebel Jais)", "Hatta Mountains", "Fujairah"],
    "Indonesia": ["Ubud (Bali)", "Uluwatu & Seminyak", "Nusa Penida", "Gili Islands", "Lombok", "Yogyakarta", "Komodo Island", "Mount Bromo"],
    "United Kingdom": ["London", "Edinburgh (Scotland)", "Scottish Highlands & Isle of Skye", "Lake District", "Oxford & Cotswolds", "Bath", "Cambridge"],
    "United States": ["New York City", "Grand Canyon & Sedona", "Los Angeles & Santa Monica", "San Francisco & Yosemite", "Las Vegas", "Miami", "Hawaii (Maui & Oahu)", "Chicago", "Washington D.C."],
    "Singapore": ["Marina Bay & Gardens by the Bay", "Sentosa Island", "Chinatown & Little India", "Orchard Road", "Jewel Changi", "Clarke Quay"],
    "Vietnam": ["Ha Long Bay", "Hanoi", "Hoi An & Da Nang", "Ho Chi Minh City", "Ninh Binh", "Sapa", "Phu Quoc", "Hue"],
    "Greece": ["Santorini", "Athens", "Mykonos", "Crete", "Meteora", "Zakynthos", "Rhodes", "Corfu"],
    "Norway": ["Tromsø (Northern Lights)", "Lofoten Islands", "Bergen & Norwegian Fjords", "Oslo", "Geirangerfjord", "Flåm"],
    "South Korea": ["Seoul", "Busan", "Jeju Island", "Gyeongju", "Incheon", "Suwon", "Gangneung", "Jeonju"],
    "Maldives": ["Male", "Maafushi Local Island", "Baa Atoll", "Ari Atoll Overwater Villas"],
    "Australia": ["Sydney", "Melbourne & Great Ocean Road", "Gold Coast", "Cairns (Great Barrier Reef)", "Tasmania", "Uluru"],
    "Spain": ["Barcelona", "Madrid", "Seville", "Granada", "Ibiza & Mallorca", "Valencia", "San Sebastian"],
    "Germany": ["Munich & Bavarian Alps", "Berlin", "Black Forest", "Neuschwanstein Castle", "Hamburg", "Heidelberg"],
    "Turkey": ["Istanbul", "Cappadocia", "Antalya", "Pamukkale", "Bodrum", "Ephesus"],
    "Nepal": ["Kathmandu", "Pokhara", "Chitwan National Park", "Nagarkot", "Lumbini"]
};

const COUNTRY_ISO_MAP = {
    "Japan": "JP", "India": "IN", "Switzerland": "CH", "Thailand": "TH", "Italy": "IT",
    "France": "FR", "United Arab Emirates": "AE", "Indonesia": "ID", "United Kingdom": "GB",
    "United States": "US", "Singapore": "SG", "Vietnam": "VN", "Greece": "GR", "Norway": "NO",
    "South Korea": "KR", "Maldives": "MV", "Australia": "AU", "Spain": "ES", "Germany": "DE",
    "Turkey": "TR", "Nepal": "NP", "Canada": "CA", "Mexico": "MX", "Brazil": "BR",
    "Argentina": "AR", "Peru": "PE", "Chile": "CL", "Egypt": "EG", "South Africa": "ZA",
    "Kenya": "KE", "Morocco": "MA", "Mauritius": "MU", "Seychelles": "SC", "Sri Lanka": "LK",
    "Bhutan": "BT", "Malaysia": "MY", "Philippines": "PH", "Cambodia": "KH", "China": "CN",
    "Taiwan": "TW", "New Zealand": "NZ", "Austria": "AT", "Netherlands": "NL", "Belgium": "BE",
    "Portugal": "PT", "Ireland": "IE", "Iceland": "IS", "Sweden": "SE", "Finland": "FI",
    "Denmark": "DK", "Czech Republic": "CZ", "Hungary": "HU", "Croatia": "HR", "Poland": "PL"
};

const COUNTRY_LANG_CODES = {
    "Japan": "ja-JP", "Thailand": "th-TH", "Italy": "it-IT", "France": "fr-FR",
    "Spain": "es-ES", "Germany": "de-DE", "South Korea": "ko-KR", "China": "zh-CN",
    "Turkey": "tr-TR", "Indonesia": "id-ID", "Vietnam": "vi-VN", "Greece": "el-GR",
    "Norway": "nb-NO", "India": "hi-IN", "United Arab Emirates": "ar-SA",
    "Switzerland": "de-CH", "Brazil": "pt-BR", "Portugal": "pt-PT", "Netherlands": "nl-NL"
};

const COUNTRY_BACKDROPS = {
    "Japan": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1800&q=85",
    "Switzerland": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1800&q=85",
    "India": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1800&q=85",
    "Italy": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1800&q=85",
    "France": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1800&q=85",
    "Greece": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1800&q=85",
    "Norway": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1800&q=85",
    "South Korea": "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1800&q=85",
    "Indonesia": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=85",
    "Thailand": "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=85",
    "United Arab Emirates": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=85",
    "United Kingdom": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1800&q=85",
    "United States": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1800&q=85",
    "Singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1800&q=85",
    "Vietnam": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1800&q=85",
    "Turkey": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1800&q=85",
    "Spain": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1800&q=85",
    "Germany": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1800&q=85",
    "Australia": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1800&q=85"
};

const DEFAULT_BACKDROP = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=85";
const ALL_COUNTRIES = Object.keys(COUNTRY_ISO_MAP);

// =========================================================================
// 3. INSTANT PRE-PLANNED FLAGSHIP BLUEPRINTS (ZERO API COST, 0.1s OPEN)
// =========================================================================
const mkStop = (time, category, title, location, transport, costNote, description) => ({
    time, category, title, location, transport, costNote, description
});

const PREPLANNED_TRIPS = [
    {
        id: "blueprint-korea-10d",
        country: "South Korea",
        durationDays: 10,
        badge: "Instant Blueprint • 10 Days",
        cardTitle: "South Korea in 10 Days: Seoul, Busan & Jeju",
        cardSubtitle: "Neon palaces, KTX bullet rail, coastal cliffs & night markets",
        cardTags: ["🏨 4★ Boutique Stays", "🍜 Street Food & BBQ"],
        image: "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=500&q=80",
        places: ["Seoul", "Gyeongju", "Busan", "Jeju Island"],
        hotelBudget: "3-to-4 Star Comfort & Boutique Hotels",
        dailySpendingBudget: "Moderate (Popular Cafes, Casual Dining & Standard Tickets)",
        budgetEstimateUsd: { hotelPerNight: 110, dailyFoodAndSights: 55, localTransitPerDay: 18 },
        data: {
            summary: {
                tripTitle: "South Korea Complete: Neon Seoul, Ancient Gyeongju, Busan Coast & Volcanic Jeju",
                budgetStrategySummary: "Smart split: Crisp 4-star boutique hotels near major subway lines paired with legendary Korean street markets, local K-BBQ joints, and high-speed KTX rail.",
                homeToDepartureTransit: "Arrive at your international hub 3 hours prior; pre-register K-ETA/Q-Code if required for your passport.",
                flightStrategy: "Fly into Seoul Incheon (ICN), use KTX bullet trains south to Busan, and take a 1-hour domestic hop to Jeju Island before returning to Seoul.",
                recommendedStay: {
                    name: "L7 Myeongdong / Lotte City Hotel",
                    area: "Seoul (Myeongdong) + Haeundae (Busan) + Aewol (Jeju)",
                    details: "Prime subway access, ultra-clean modern rooms, rooftop views, and easy airport limousine bus pickup (~$105–$125/night)."
                },
                localTransportGuide: "Buy a T-Money card (or WOWPASS) at Incheon Airport for subways and buses nationwide, plus book KTX tickets via Korail 2 weeks early. Use Naver Map instead of Google Maps."
            },
            days: [
                {
                    dayNumber: 1, dayTitle: "Seoul Arrival, Myeongdong Neon & Street Food", wakeUpTime: "08:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("10:00 AM - 01:00 PM", "Transit", "Incheon Airport Express (AREX) & Hotel Check-In", "Seoul, Myeongdong", "AREX Express Train (43m) + Subway Line 4", "$10 transit", "Pick up your eSIM and T-Money card at Terminal 1, glide into Seoul Station, and drop luggage at your hotel."),
                        mkStop("01:30 PM - 03:00 PM", "Meal", "Myeongdong Kyoja Knife-Cut Noodles", "Seoul, Myeongdong", "5-min walk", "$10 per person", "Order the Michelin Bib Gourmand kalguksu hand-cut noodles and steamed mandu dumplings to cure jet lag."),
                        mkStop("04:00 PM - 06:30 PM", "Activity", "Cheonggyecheon Stream & N Seoul Tower Sunset", "Seoul, Jung-gu", "Walk + Namsan Cable Car (15m)", "$15 tower ticket", "Stroll along the sunken urban stream before riding up Namsan Mountain for a 360-degree golden-hour skyline view."),
                        mkStop("07:30 PM - 09:30 PM", "Meal", "Myeongdong Night Market Tasting Crawl", "Seoul, Myeongdong", "10-min walk", "$15–$20", "Sample hotteok sweet pancakes, spicy tteokbokki, tornado potatoes, and grilled lobster tails right off the street stalls.")
                    ]
                },
                {
                    dayNumber: 2, dayTitle: "Royal Palaces, Bukchon Hanok & Insadong", wakeUpTime: "07:30 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:30 AM", "Activity", "Gyeongbokgung Palace & Royal Guard Ceremony", "Seoul, Jongno", "Subway Line 3 to Gyeongbokgung (15m)", "$3 entry (Free in Hanbok)", "Arrive before the 10 AM guard changing ceremony at Gwanghwamun Gate and explore the tranquil Hyangwonjeong Pavilion."),
                        mkStop("11:45 AM - 01:15 PM", "Activity", "Bukchon Hanok Village & Samcheong-dong", "Seoul, Bukchon", "10-min walk", "Free", "Wander quiet preserved Joseon-era alleyways framed by curved tiled roofs and indie ceramic studios."),
                        mkStop("01:30 PM - 02:45 PM", "Meal", "Tosokchon Samgyetang Ginseng Chicken", "Seoul, Seochon", "12-min walk", "$16 per person", "Slurp rich, herbal whole-chicken soup stuffed with sticky rice, jujubes, and Korean ginseng inside a traditional courtyard."),
                        mkStop("05:00 PM - 08:30 PM", "Activity", "Gwangjang Market & Ikseon-dong Cafe Alleys", "Seoul, Jongno", "Subway Line 1 (10m)", "$15 food", "Sit at bindaetteok mung-bean pancake counters in Gwangjang Market, then explore lantern-lit hanok cafes in Ikseon-dong.")
                    ]
                },
                {
                    dayNumber: 3, dayTitle: "Futuristic Gangnam, Seongsu & Hongdae Nights", wakeUpTime: "08:00 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:30 AM - 12:00 PM", "Activity", "Starfield COEX Library & Bongeunsa Temple", "Seoul, Gangnam", "Subway Line 2 (25m)", "Free", "Photograph the towering 13-meter bookshelves inside COEX Mall, then cross the street to a peaceful 8th-century Buddhist temple."),
                        mkStop("12:30 PM - 02:30 PM", "Activity", "Seongsu-dong (Seoul's Brooklyn) & Cafe Hopping", "Seoul, Seongsu", "Subway Line 2 (15m)", "$12 coffee & pastry", "Explore converted brick shoe factories packed with avant-garde flagship stores, bakeries, and minimalist coffee bars."),
                        mkStop("03:30 PM - 06:00 PM", "Activity", "Lotte World Tower Seoul Sky Observatory", "Seoul, Jamsil", "Subway Line 2 (12m)", "$22 ticket", "Stand on the glass sky-deck on the 118th floor of the world's 6th tallest skyscraper overlooking the Han River."),
                        mkStop("07:30 PM - 10:30 PM", "Meal", "Hongdae Street Buskers & Charcoal K-BBQ", "Seoul, Hongdae", "Subway Line 2 (35m)", "$25 per person", "Feast on thick Jeju black pork grilled tableside with banchan side dishes, then watch live K-pop dance buskers on Hongdae Walk.")
                    ]
                },
                {
                    dayNumber: 4, dayTitle: "DMZ Border Tour or Nami Island Escape", wakeUpTime: "06:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("07:30 AM - 02:00 PM", "Activity", "Guided Korean DMZ & 3rd Infiltration Tunnel", "Paju (North of Seoul)", "Pre-booked tour shuttle (1h)", "$55 guided tour", "Peer across the border from Dora Observatory and walk down into the historic 3rd Tunnel—bring your original passport."),
                        mkStop("02:30 PM - 04:00 PM", "Meal", "Mapo Galbi & Cold Naengmyeon Lunch", "Seoul, Mapo", "Subway Line 5 (15m)", "$15 per person", "Recharge with icy buckwheat noodles and sweet-savory marinated ribs after returning to the city."),
                        mkStop("05:00 PM - 07:30 PM", "Activity", "Han River Banpo Park Picnic & Rainbow Fountain", "Seoul, Seocho", "Subway Line 9 (20m)", "$10 convenience store picnic", "Cook instant ramyeon at a riverside convenience-store machine and watch Banpo Bridge's musical neon waterfall show."),
                        mkStop("08:00 PM - 09:30 PM", "Activity", "Dongdaemun Design Plaza (DDP) Night Architecture", "Seoul, Dongdaemun", "Subway Line 4 (20m)", "Free", "Walk around Zaha Hadid's spaceship-like aluminum plaza glowing under LED night lights.")
                    ]
                },
                {
                    dayNumber: 5, dayTitle: "KTX Bullet Train to Ancient Gyeongju", wakeUpTime: "07:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("08:30 AM - 11:00 AM", "Transit", "KTX Bullet Train Seoul → Gyeongju", "Seoul to Gyeongju", "KTX High-Speed Rail (2h 10m)", "$38 ticket", "Glide south at 300 km/h into the ancient capital of the Silla Dynasty, known as the museum without walls."),
                        mkStop("11:30 AM - 01:30 PM", "Activity", "Daereungwon Royal Tomb Complex & Hwangnidan-gil", "Gyeongju", "Local taxi (15m)", "$3 entry", "Walk among massive emerald-green grass burial mounds and grab ten-won cheese bread along trendy Hwangnidan Street."),
                        mkStop("02:30 PM - 05:00 PM", "Activity", "Bulguksa UNESCO Mountain Temple", "Gyeongju, Tohamsan", "Bus 10/11 or Taxi (25m)", "Free entry", "Admire 8th-century stone pagodas, painted wooden halls, and serene pine forest courtyards."),
                        mkStop("06:30 PM - 09:00 PM", "Activity", "Donggung Palace & Wolji Pond Night Reflections", "Gyeongju", "10-min taxi", "$3 entry", "Witness Korea's most iconic mirror-like night reflection of illuminated royal pavilions over the lotus pond.")
                    ]
                },
                {
                    dayNumber: 6, dayTitle: "Busan Arrival: Gamcheon Village & Jagalchi Market", wakeUpTime: "08:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("09:00 AM - 10:00 AM", "Transit", "KTX Gyeongju → Busan & Check-In", "Busan", "KTX Rail (30m) + Metro", "$10 ticket", "Arrive at Korea's vibrant coastal port city and drop bags near Haeundae or Seomyeon."),
                        mkStop("11:00 AM - 01:30 PM", "Activity", "Gamcheon Culture Village Hillside Maze", "Busan, Saha-gu", "Metro Line 1 + Green Bus (20m)", "Free", "Explore pastel-painted terraced homes, Little Prince overlook, and cliffside art alleys overlooking the harbor."),
                        mkStop("02:00 PM - 03:30 PM", "Meal", "Jagalchi Seafood Market & BIFF Square", "Busan, Nampo-dong", "10-min taxi", "$18 per person", "Try sizzling grilled mackerel or Busan's famous seed-stuffed ssiat hotteok at BIFF Square."),
                        mkStop("05:00 PM - 08:30 PM", "Activity", "Songdo Marine Cable Car & Gwangalli Drone Beach", "Busan, Gwangalli", "Metro + Taxi (25m)", "$14 cable car", "Float in a crystal-floor gondola over ocean cliffs, then relax on Gwangalli Beach facing the illuminated Diamond Bridge.")
                    ]
                },
                {
                    dayNumber: 7, dayTitle: "Busan Cliffs, Sky Capsule & Cliffside Temple", wakeUpTime: "07:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("08:30 AM - 10:30 AM", "Activity", "Haedong Yonggungsa Oceanside Temple", "Busan, Gijang", "Taxi (25m from Haeundae)", "Free", "Walk down 108 stone steps to a dramatic 14th-century temple perched directly over crashing ocean waves."),
                        mkStop("11:30 AM - 01:00 PM", "Activity", "Haeundae Blueline Sky Capsule", "Busan, Mipo to Cheongsapo", "Pre-booked private rail pod (30m)", "$25 per 2-person pod", "Ride a retro colorful monorail capsule elevated above the sparkling sea cliffs—book 2 weeks in advance."),
                        mkStop("01:30 PM - 03:00 PM", "Meal", "Busan Dwaeji Gukbap (Pork Soup) & Cafe", "Busan, Haeundae", "10-min walk", "$10 per person", "Warm up with Busan's signature hearty soup, followed by ocean-view espresso at Cheongsapo Lighthouse."),
                        mkStop("04:30 PM - 07:30 PM", "Activity", "Shinsegae Centum City Spa Land (Jjimjilbang)", "Busan, Centum City", "Metro Line 2 (15m)", "$18 entry", "Unwind in Korea's premier luxury bathhouse with 22 natural hot spring pools and themed sauna rooms.")
                    ]
                },
                {
                    dayNumber: 8, dayTitle: "Fly to Volcanic Jeju Island & East Coast Cliffs", wakeUpTime: "07:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:00 AM", "Transit", "Short Flight Busan (PUS) → Jeju (CJU)", "Jeju Island", "Domestic Flight (55m)", "$45–$70 flight", "Land on Korea's Hawaii; pick up a rental car (requires IDP) or hire a private Jeju day-driver."),
                        mkStop("12:30 PM - 02:30 PM", "Activity", "Seongsan Ilchulbong (Sunrise Peak Crater)", "East Jeju", "Scenic coastal drive (1h)", "$4 entry", "Climb the boardwalk stairs up a 5,000-year-old tuff cone crater rising vertically out of the turquoise sea."),
                        mkStop("03:00 PM - 05:00 PM", "Activity", "Seopjikoji Cliff Walk & Haenyeo Divers", "East Jeju", "15-min drive", "Free", "Stroll wind-swept volcanic headlands and watch Jeju's legendary free-diving grandmothers harvest sea urchins."),
                        mkStop("06:30 PM - 08:30 PM", "Meal", "Jeju Black Pork BBQ Dinner", "Jeju City / Aewol", "30-min drive", "$25 per person", "Savor thick-cut Jeju heukdwaeji grilled over coals with anchovy dipping sauce and tangerine makgeolli.")
                    ]
                },
                {
                    dayNumber: 9, dayTitle: "Jeju Waterfalls, Green Tea Fields & Aewol Sunset", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:30 AM - 11:30 AM", "Activity", "Jeongbang Waterfall & Jusangjeolli Basalt Cliffs", "South Jeju, Seogwipo", "45-min drive", "$4 combined", "See Asia's rare waterfall pouring directly into the ocean, then admire hexagonal volcanic lava pillars."),
                        mkStop("12:30 PM - 02:30 PM", "Activity", "O'sulloc Green Tea Museum & Innisfree Fields", "West Jeju", "35-min drive", "Free + $8 matcha dessert", "Walk through endless neon-green tea rows and taste freshly whisked Jeju matcha roll cake and ice cream."),
                        mkStop("03:30 PM - 06:30 PM", "Activity", "Hyeopjae Emerald Beach & Aewol Cafe Street", "Northwest Jeju", "25-min drive", "$8 coffee", "Relax on white-shell sands and grab a sunset window seat along Jeju's iconic cliffside cafe row."),
                        mkStop("07:30 PM - 09:00 PM", "Meal", "Dongmun Traditional Market Night Stalls", "Jeju City", "30-min drive", "$15", "Pick up Hallabong tangerine juice, abalone kimbap, and volcanic-stone chocolates.")
                    ]
                },
                {
                    dayNumber: 10, dayTitle: "Return to Seoul, Last-Minute K-Beauty & Departure", wakeUpTime: "08:00 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:30 AM - 11:30 AM", "Transit", "Flight Jeju (CJU) → Seoul Gimpo (GMP)", "Jeju to Seoul", "Domestic Flight (1h 10m)", "$50 flight", "Hop back to mainland Seoul with plenty of buffer before your evening international flight."),
                        mkStop("12:30 PM - 03:00 PM", "Activity", "Olive Young Flagship & Souvenir Sprint", "Seoul, Myeongdong", "AREX / Subway (30m)", "Tax-free instant refund", "Grab Korean skincare favorites, snacks, and artisanal teas—bring your passport for instant VAT refunds."),
                        mkStop("03:30 PM - 04:45 PM", "Meal", "Farewell Bibimbap & Korean Fried Chicken", "Seoul Station / Myeongdong", "5-min walk", "$14", "Enjoy one last crisp chimaek or hot stone-pot dolsot bibimbap before heading to the airport."),
                        mkStop("05:30 PM - 07:30 PM", "Transit", "AREX Express to Incheon International Airport", "Incheon Terminal 1/2", "AREX Nonstop (43m)", "$10 ticket", "Check in early at Incheon's world-class terminal for smooth tax-refund processing and departure.")
                    ]
                }
            ]
        }
    },
    {
        id: "blueprint-usa-10d",
        country: "United States",
        durationDays: 10,
        badge: "Instant Blueprint • 10 Days",
        cardTitle: "USA in 10 Days: NYC, Grand Canyon & California",
        cardSubtitle: "Coast-to-coast highlights: Manhattan, D.C., Vegas, Grand Canyon, SF & LA",
        cardTags: ["🏨 4★ Central Hotels", "✈️ Smart Domestic Hops"],
        image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=500&q=80",
        places: ["New York City", "Washington D.C.", "Las Vegas & Grand Canyon", "San Francisco", "Los Angeles"],
        hotelBudget: "3-to-4 Star Comfort & Boutique Hotels",
        dailySpendingBudget: "Moderate (Popular Cafes, Casual Dining & Standard Tickets)",
        budgetEstimateUsd: { hotelPerNight: 185, dailyFoodAndSights: 85, localTransitPerDay: 28 },
        data: {
            summary: {
                tripTitle: "USA Coast-to-Coast: Manhattan Skylines, Grand Canyon Rim & Golden California",
                budgetStrategySummary: "Optimized cross-country routing: walkable Manhattan & SF transit paired with two strategic domestic flights so you see both coasts without burning days driving.",
                homeToDepartureTransit: "Arrive at your international hub 3.5 hours ahead; verify valid US B1/B2 visa or ESTA approval before check-in.",
                flightStrategy: "Multi-city open-jaw ticket: Fly into New York (JFK/EWR), hop domestic NYC → Las Vegas and Vegas → San Francisco, then fly home from Los Angeles (LAX).",
                recommendedStay: {
                    name: "Arlo Midtown (NYC) / Hotel Nikko (SF) / Loews Santa Monica (LA)",
                    area: "Midtown Manhattan • Union Square • Santa Monica",
                    details: "Safe, well-connected 4-star properties right on metro lines so you cut down on expensive US rideshares (~$175–$210/night)."
                },
                localTransportGuide: "Tap any contactless card on NYC Subway (OMNY) and SF Muni/BART; use Amtrak Northeast Regional for D.C. and Uber/Lyft selectively in Los Angeles."
            },
            days: [
                {
                    dayNumber: 1, dayTitle: "New York City: Midtown Icons & Sunset Deck", wakeUpTime: "08:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("09:30 AM - 12:00 PM", "Activity", "Central Park South & Fifth Avenue Walk", "NYC, Midtown Manhattan", "Subway / Walk", "Free", "Stroll past Bethesda Terrace, Bow Bridge, and the Plaza Hotel to feel Manhattan's morning pulse."),
                        mkStop("12:30 PM - 02:00 PM", "Meal", "Los Tacos No. 1 or Ess-a-Bagel Classic", "NYC, Midtown", "10-min walk", "$14–$18", "Grab an authentic NY smoked salmon bagel or adobada street tacos without wasting two hours on sit-down service."),
                        mkStop("03:00 PM - 06:00 PM", "Activity", "SUMMIT One Vanderbilt or Top of the Rock", "NYC, Midtown", "Walk (10m)", "$42 ticket", "Take in mirror-wrapped skyline views facing the Empire State Building as sunset lights up Midtown."),
                        mkStop("07:30 PM - 09:30 PM", "Activity", "Times Square Neon & Broadway Show", "NYC, Theater District", "10-min walk", "$65–$120 (TKTS booth)", "Catch a world-class Broadway musical or grab late-night Joe's Pizza slices under the neon billboards.")
                    ]
                },
                {
                    dayNumber: 2, dayTitle: "Statue of Liberty, Wall Street & Brooklyn Bridge", wakeUpTime: "07:30 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("08:30 AM - 11:30 AM", "Activity", "Statue of Liberty Ferry & Ellis Island", "NYC, Battery Park", "Subway Line 1 (20m)", "$25 official ferry", "Take the first morning boat from Battery Park (book via Statue City Cruises only—ignore street ticket touts)."),
                        mkStop("12:00 PM - 01:30 PM", "Activity", "9/11 Memorial Pools & Oculus Hub", "NYC, Financial District", "10-min walk", "Free exterior", "Pause at the reflecting pools and marvel at Santiago Calatrava's winged marble Oculus transit hall."),
                        mkStop("02:00 PM - 03:30 PM", "Meal", "Chinatown Dumplings & Little Italy Cannoli", "NYC, Lower Manhattan", "15-min walk", "$15", "Feast on crispy pan-fried dumplings at Wah Fung or Mei Lai Wah before walking into DUMBO."),
                        mkStop("04:30 PM - 07:30 PM", "Activity", "Walk the Brooklyn Bridge & DUMBO Sunset", "NYC, Brooklyn", "35-min scenic bridge walk", "Free", "Cross the timber walkway into Brooklyn for the famous Manhattan Bridge photo and waterfront pizza at Juliana's.")
                    ]
                },
                {
                    dayNumber: 3, dayTitle: "SoHo, High Line & Chelsea Market", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:30 AM - 11:30 AM", "Activity", "The High Line Elevated Park & Vessel", "NYC, Hudson Yards to Chelsea", "Subway Line 7 (15m)", "Free", "Walk a lush 1.5-mile sky park built atop historic freight rail tracks weaving through West Side architecture."),
                        mkStop("12:00 PM - 01:45 PM", "Meal", "Chelsea Market Food Hall & Little Island", "NYC, Meatpacking District", "Direct exit off High Line", "$22", "Sample lobster rolls, hand-pulled noodles, and artisan gelato, then stroll out onto floating Little Island pier."),
                        mkStop("02:30 PM - 05:30 PM", "Activity", "Greenwich Village & Cast-Iron SoHo", "NYC, Lower West Side", "15-min walk", "Free", "Wander Washington Square Park, Bleecker Street vinyl shops, and SoHo's cobblestone galleries."),
                        mkStop("07:00 PM - 09:30 PM", "Meal", "Katz's Delicatessen or Greenwich Jazz Club", "NYC, Lower East Side", "Subway F Line (15m)", "$28", "Share a towering hot pastrami on rye at Katz's or catch an intimate live jazz set at Smalls.")
                    ]
                },
                {
                    dayNumber: 4, dayTitle: "Amtrak Day Trip to Washington D.C. Monuments", wakeUpTime: "06:30 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("07:30 AM - 10:45 AM", "Transit", "Amtrak Northeast Regional NYC → Washington D.C.", "Penn Station to Union Station", "High-Speed Rail (3h 15m)", "$45–$80 (book early)", "Skip airport security and glide straight into downtown D.C.'s grand marble Union Station."),
                        mkStop("11:15 AM - 02:00 PM", "Activity", "Smithsonian Air & Space Museum + National Mall", "Washington D.C.", "15-min walk", "Free (reserve pass)", "See the Wright Flyer and Apollo 11 command module, then walk past the US Capitol and Washington Monument."),
                        mkStop("02:30 PM - 04:30 PM", "Activity", "Lincoln Memorial, Reflecting Pool & White House", "Washington D.C.", "20-min walk", "Free", "Stand on the Lincoln Memorial steps overlooking the Reflecting Pool and swing north to Lafayette Square."),
                        mkStop("06:00 PM - 09:15 PM", "Transit", "Evening Amtrak Return to NYC", "Union Station to Penn Station", "Amtrak Train (3h 15m)", "Included in return", "Grab dinner in Union Station and unwind on the evening rail back to Manhattan.")
                    ]
                },
                {
                    dayNumber: 5, dayTitle: "Fly West to Las Vegas Neon & Sphere", wakeUpTime: "08:00 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:30 AM - 01:00 PM", "Transit", "Direct Flight NYC → Las Vegas (LAS)", "Las Vegas, Nevada", "5h 30m flight (gain 3h timezone)", "$120–$190 flight", "Fly west over the Rockies—thanks to the 3-hour time difference, you land with a full afternoon ahead."),
                        mkStop("02:30 PM - 05:00 PM", "Activity", "Bellagio Conservatory & Venetian Canals", "Las Vegas Strip", "Walk / Monorail", "Free", "Walk through jaw-dropping seasonal floral gardens and indoor painted-sky Venetian gondolas."),
                        mkStop("06:00 PM - 07:30 PM", "Meal", "Tacos El Gordo or Wicked Spoon Buffet", "Las Vegas Strip", "10-min walk", "$20–$45", "Fuel up before sunset along the Strip—avoid overpriced casino-lobby traps."),
                        mkStop("08:00 PM - 10:30 PM", "Activity", "Bellagio Fountains & The Sphere Visual Show", "Las Vegas Strip", "Walk / Rideshare", "$65+ Sphere show (exterior free)", "Watch the dancing Bellagio fountains and witness the world's largest spherical LED arena glowing in 16K.")
                    ]
                },
                {
                    dayNumber: 6, dayTitle: "Grand Canyon South Rim & Hoover Dam Epic", wakeUpTime: "06:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("06:30 AM - 08:00 AM", "Activity", "Hoover Dam & Route 66 Pit Stop", "Nevada / Arizona Border", "Small-group tour or Rental Car", "$95 full-day tour", "Cross the colossal Art Deco Hoover Dam bridge before rolling down classic Route 66 through Seligman."),
                        mkStop("11:30 AM - 02:30 PM", "Activity", "Grand Canyon Mather Point & Rim Trail", "Grand Canyon National Park, AZ", "Park shuttle / Walk", "$35 vehicle / included in tour", "Stand at the edge of the mile-deep crimson gorge carved by the Colorado River—hike part of the Bright Angel Rim Trail."),
                        mkStop("03:00 PM - 04:30 PM", "Activity", "Desert View Watchtower Overlook", "Grand Canyon East Rim", "Scenic drive (30m)", "Included", "Climb the stone watchtower for sweeping panoramic views of the Painted Desert and Colorado River bend."),
                        mkStop("05:00 PM - 09:00 PM", "Transit", "Desert Sunset Drive Back to Las Vegas", "Arizona to Las Vegas", "Highway return (4h)", "Included", "Catch golden desert skies on the return trip and enjoy a relaxed late dinner.")
                    ]
                },
                {
                    dayNumber: 7, dayTitle: "Fly to San Francisco: Golden Gate & Wharf", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:00 AM", "Transit", "Short Flight Las Vegas (LAS) → San Francisco (SFO)", "San Francisco, CA", "1h 35m flight + BART (30m)", "$80–$120 flight", "Touch down by the bay and ride BART straight into downtown San Francisco."),
                        mkStop("12:30 PM - 02:30 PM", "Meal", "Ferry Building Marketplace & Fisherman's Wharf", "San Francisco Embarcadero", "Historic F-Line Streetcar", "$20", "Try sourdough clam chowder bread bowls at Boudin and watch the barking sea lions at Pier 39."),
                        mkStop("03:30 PM - 06:00 PM", "Activity", "Golden Gate Bridge Bike or Walk to Sausalito", "San Francisco, Crissy Field", "Bus 28 or E-Bike rental", "$30 bike / Free walk", "Cross the iconic Art Deco orange span above the swirling bay fog and ferry back from Sausalito."),
                        mkStop("07:00 PM - 09:00 PM", "Meal", "North Beach Italian & Lombard Street Dusk", "San Francisco, North Beach", "Cable Car / Walk", "$30", "Ride a historic clanging cable car up Russian Hill to crooked Lombard Street, then dine in Little Italy.")
                    ]
                },
                {
                    dayNumber: 8, dayTitle: "Alcatraz Island, Painted Ladies & Mission Burritos", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 12:00 PM", "Activity", "Alcatraz Island Prison Audio Tour", "San Francisco Bay", "Pier 33 Ferry (15m)", "$45 (book 3 weeks early)", "Walk the haunting cellblock with an award-winning audio guide narrated by former guards and inmates."),
                        mkStop("12:45 PM - 02:15 PM", "Meal", "Mission District Burritos & Murals", "San Francisco, Mission", "BART (15m)", "$15", "Grab a foil-wrapped Mission-style carne asada or veggie burrito at La Taqueria and stroll Clarion Alley's street art."),
                        mkStop("03:00 PM - 05:00 PM", "Activity", "Alamo Square Painted Ladies & Golden Gate Park", "San Francisco", "Muni Bus (20m)", "Free", "Photograph the famous Victorian townhouses against the skyline, then explore the Japanese Tea Garden."),
                        mkStop("06:00 PM - 08:30 PM", "Activity", "Twin Peaks Panorama & Chinatown Dinner", "San Francisco", "Rideshare (15m)", "$25", "Catch twinkling city lights from Twin Peaks before heading to historic Chinatown for dim sum.")
                    ]
                },
                {
                    dayNumber: 9, dayTitle: "Los Angeles: Santa Monica Pier & Griffith Sunset", wakeUpTime: "07:30 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("08:30 AM - 10:15 AM", "Transit", "Flight San Francisco (SFO) → Los Angeles (LAX)", "Los Angeles, CA", "1h 20m flight", "$75–$110 flight", "Hop down the California coast to Los Angeles and check in near Santa Monica or West Hollywood."),
                        mkStop("11:30 AM - 02:30 PM", "Activity", "Santa Monica Pier & Venice Beach Boardwalk", "LA, Westside", "Beachfront walk / E-Bike", "Free", "Walk to the official End of Route 66 sign on the pier, then cruise down to Venice Canals and Muscle Beach."),
                        mkStop("03:30 PM - 05:00 PM", "Activity", "The Getty Center Art & Architecture Overlook", "LA, Brentwood", "Rideshare (20m)", "Free entry (reserve)", "Ride the hilltop tram to travertine gardens and sweeping views stretching from downtown LA to the Pacific."),
                        mkStop("05:45 PM - 08:30 PM", "Activity", "Griffith Observatory Sunset & Hollywood Sign", "LA, Griffith Park", "Rideshare (30m)", "Free entry", "Watch the sun dip behind the Hollywood Sign as LA's endless grid of city lights flickers to life below.")
                    ]
                },
                {
                    dayNumber: 10, dayTitle: "Universal Studios or Beverly Hills & Departure", wakeUpTime: "08:00 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 01:30 PM", "Activity", "Universal Studios Hollywood Studio Tour (or Beverly Hills)", "LA, Universal City / Rodeo", "Metro B Line or Rideshare", "$109 park / Free Beverly Hills", "Go behind the scenes on real working movie backlots and Super Nintendo World, or stroll palm-lined Rodeo Drive."),
                        mkStop("02:00 PM - 03:30 PM", "Meal", "Grand Central Market or In-N-Out Burger Ritual", "Downtown LA / Near LAX", "20-min ride", "$12–$18", "Order a classic Double-Double Animal Style burger and watch jets roar overhead at the Sepulveda In-N-Out."),
                        mkStop("04:30 PM - 07:30 PM", "Transit", "LAX International Departure", "Los Angeles International Airport", "Rideshare (15m)", "$20", "Allow extra buffer for LA traffic and depart with coast-to-coast memories locked in.")
                    ]
                }
            ]
        }
    },
    {
        id: "blueprint-japan-10d",
        country: "Japan",
        durationDays: 10,
        badge: "Instant Blueprint • 10 Days",
        cardTitle: "Japan in 10 Days: Tokyo, Fuji, Kyoto & Osaka",
        cardSubtitle: "Shinkansen bullet trains, hidden shrines, ramen alleys & Hiroshima",
        cardTags: ["🏨 4★ Stays", "🍜 Low Daily Spend"],
        image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=500&q=80",
        places: ["Tokyo", "Mount Fuji (Hakone)", "Kyoto", "Nara", "Osaka", "Hiroshima"],
        hotelBudget: "3-to-4 Star Comfort & Boutique Hotels",
        dailySpendingBudget: "Low / Economical (Street Food, Local Spots & Free/Cheap Sights)",
        budgetEstimateUsd: { hotelPerNight: 120, dailyFoodAndSights: 48, localTransitPerDay: 22 },
        data: {
            summary: {
                tripTitle: "Japan Golden Route: Tokyo Neon, Mt. Fuji Onsen, Kyoto Shrines & Osaka Eats",
                budgetStrategySummary: "High-comfort 4-star Japanese business/boutique hotels paired with ultra-affordable $8 ramen bowls, konbini breakfasts, and point-to-point Shinkansen tickets.",
                homeToDepartureTransit: "Arrive 3 hours ahead; complete Visit Japan Web QR codes before boarding for fast immigration.",
                flightStrategy: "Fly into Tokyo (HND/NRT) and depart from Osaka Kansai (KIX) or loop back to Tokyo via Shinkansen.",
                recommendedStay: {
                    name: "Hotel Gracery Shinjuku / Mitsui Garden Hotel Kyoto",
                    area: "Shinjuku (Tokyo) • Karasuma (Kyoto) • Namba (Osaka)",
                    details: "Spotless, quiet rooms steps from major JR train stations with luggage-forwarding (Takkyubin) support (~$115–$135/night)."
                },
                localTransportGuide: "Add digital Suica/ICOCA to Apple Wallet (or grab a Welcome Suica at the airport). Book individual Shinkansen seats via SmartEX instead of overpaying for the full JR Pass."
            },
            days: [
                {
                    dayNumber: 1, dayTitle: "Tokyo Arrival, Shibuya Sky & Shinjuku Alleys", wakeUpTime: "08:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("10:30 AM - 01:00 PM", "Transit", "Haneda/Narita Express & Shinjuku Check-In", "Tokyo, Shinjuku", "Narita Express / Monorail (45m)", "$15 transit", "Tap your Suica card, drop bags at your Shinjuku hotel, and grab an egg-salad sando from 7-Eleven."),
                        mkStop("02:00 PM - 04:30 PM", "Activity", "Meiji Jingu Forest Shrine & Harajuku", "Tokyo, Shibuya", "JR Yamanote Line (5m)", "Free", "Step through massive wooden torii gates into a tranquil 100,000-tree forest right beside Takeshita Street."),
                        mkStop("05:00 PM - 07:30 PM", "Activity", "Shibuya Crossing & Shibuya Sky Sunset", "Tokyo, Shibuya", "15-min walk", "$18 ticket", "Watch the world's busiest intersection from 229 meters above on an open-air rooftop deck—book 4 weeks early."),
                        mkStop("08:00 PM - 10:00 PM", "Meal", "Omoide Yokocho Yakitori Lantern Alley", "Tokyo, Shinjuku", "JR Yamanote Line (7m)", "$15 per person", "Squeeze onto a counter stool for charcoal-grilled chicken skewers under glowing red paper lanterns.")
                    ]
                },
                {
                    dayNumber: 2, dayTitle: "Old Tokyo Asakusa, teamLab & Akihabara", wakeUpTime: "07:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("07:30 AM - 10:00 AM", "Activity", "Senso-ji Temple & Nakamise Street Early Visit", "Tokyo, Asakusa", "Metro Ginza Line (25m)", "Free", "Beat the tour buses to Tokyo's oldest Buddhist temple and taste fresh Ningyo-yaki custard cakes."),
                        mkStop("10:45 AM - 12:30 PM", "Meal", "Tsukiji Outer Market Sushi & Matcha", "Tokyo, Tsukiji", "Subway Asakusa Line (18m)", "$16", "Graze on torched wagyu skewers, sweet tamagoyaki omelets, and fresh tuna donburi."),
                        mkStop("01:30 PM - 04:00 PM", "Activity", "teamLab Planets Digital Art Immersion", "Tokyo, Toyosu", "Bus / Yurikamome Line (15m)", "$28 ticket", "Walk barefoot through knee-deep koi projections and floating crystal rooms."),
                        mkStop("05:30 PM - 09:00 PM", "Activity", "Akihabara Electric Town & Kanda Ramen", "Tokyo, Akihabara", "JR Line (20m)", "$10 dinner", "Explore multi-story retro arcade towers and anime shops before ending with rich tonkotsu ramen.")
                    ]
                },
                {
                    dayNumber: 3, dayTitle: "Shinjuku Gardens, Shimokitazawa & Ginza", wakeUpTime: "08:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:00 AM", "Activity", "Shinjuku Gyoen National Garden", "Tokyo, Shinjuku", "10-min walk", "$3.50 entry", "Stroll serene Japanese landscape ponds, maple groves, and tea pavilions right in the skyscraper core."),
                        mkStop("11:45 AM - 02:30 PM", "Activity", "Shimokitazawa Vintage Alleys & Curry", "Tokyo, Setagaya", "Odakyu Line (10m)", "$10 soup curry", "Browse Tokyo's coolest bohemian neighborhood for vinyl records, indie thrift boutiques, and Hokkaido soup curry."),
                        mkStop("03:30 PM - 06:30 PM", "Activity", "Ginza Architecture, Itoya Stationery & Uniqlo Flagship", "Tokyo, Ginza", "Metro (25m)", "Free browsing", "Explore 12 floors of Japanese stationery artistry at Itoya and pedestrian-only Chuo-dori boulevards."),
                        mkStop("07:30 PM - 09:30 PM", "Meal", "Conveyor Belt Sushi (Kura / Sushiro)", "Tokyo, Shinjuku/Ginza", "Metro (15m)", "$14 per person", "Order ultra-fresh nigiri via touchscreen tablet delivered straight to your booth on high-speed lanes.")
                    ]
                },
                {
                    dayNumber: 4, dayTitle: "Mount Fuji & Hakone Volcanic Loop", wakeUpTime: "07:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("08:00 AM - 09:45 AM", "Transit", "Romancecar Train to Hakone-Yumoto", "Tokyo to Hakone", "Odakyu Romancecar (85m)", "$42 Hakone Freepass", "Forward big suitcases to Kyoto via hotel Takkyubin ($15) and travel light with a backpack to Mt. Fuji."),
                        mkStop("10:30 AM - 01:30 PM", "Activity", "Hakone Ropeway over Owakudani Crater", "Hakone", "Mountain Railway + Ropeway", "Included in Freepass", "Float above steaming volcanic vents with clear-day views of Mount Fuji and try a sulfur-boiled black egg."),
                        mkStop("02:00 PM - 04:00 PM", "Activity", "Lake Ashi Pirate Ship & Hakone Shrine Torii", "Hakone, Moto-Hakone", "Sightseeing Cruise (30m)", "Included", "Sail across the caldera lake to the iconic red torii gate rising straight out of the water."),
                        mkStop("05:30 PM - 09:00 PM", "Stay", "Traditional Ryokan Hot Spring Onsen Night", "Hakone", "Local bus (15m)", "Included in stay", "Soak in mineral-rich volcanic hot springs and enjoy a multi-course kaiseki dinner in a cotton yukata.")
                    ]
                },
                {
                    dayNumber: 5, dayTitle: "Shinkansen to Kyoto: Gion & Kiyomizu-dera", wakeUpTime: "07:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:30 AM", "Transit", "Shinkansen Bullet Train Odawara → Kyoto", "Hakone to Kyoto", "Bus + Hikari Shinkansen (2h)", "$82 ticket", "Reserve right-side Window Seat E for a dramatic Mount Fuji silhouette as you race toward Kyoto."),
                        mkStop("12:30 PM - 02:00 PM", "Meal", "Nishiki Market Kyoto Food Crawl", "Kyoto, Downtown", "Subway (10m)", "$12–$15", "Taste matcha warabimochi, yuba tofu skin, and crispy sesame croquettes along Kyoto's 400-year-old pantry."),
                        mkStop("03:00 PM - 06:00 PM", "Activity", "Kiyomizu-dera Temple & Ninenzaka Slopes", "Kyoto, Higashiyama", "Bus / 20-min walk", "$3 entry", "Stand on the nail-free wooden veranda overlooking Kyoto's hills, then descend preserved cobblestone lanes."),
                        mkStop("06:30 PM - 09:00 PM", "Activity", "Gion Geisha District & Pontocho Alley Dinner", "Kyoto, Gion", "12-min walk", "$18 dinner", "Walk lantern-lit Hanamikoji Street at dusk and dine on Kyoto obanzai along the Kamogawa River.")
                    ]
                },
                {
                    dayNumber: 6, dayTitle: "Fushimi Inari Gates, Arashiyama Bamboo & Kinkaku-ji", wakeUpTime: "06:15 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("06:45 AM - 09:00 AM", "Activity", "Fushimi Inari Taisha 10,000 Torii Gates", "Kyoto, Fushimi", "JR Nara Line (5m)", "Free", "Arrive before 7 AM to walk through endless vermilion mountain gates in eerie, peaceful silence."),
                        mkStop("10:00 AM - 01:00 PM", "Activity", "Arashiyama Bamboo Grove & Tenryu-ji Garden", "Kyoto, West", "JR San-in Line (25m)", "$3.50 garden", "Hear the wind rustle towering green bamboo stalks and stroll the serene UNESCO pond garden."),
                        mkStop("01:30 PM - 02:30 PM", "Meal", "Arashiyama Handmade Soba & Matcha", "Kyoto, Arashiyama", "5-min walk", "$11", "Enjoy freshly ground cold zaru soba noodles overlooking Togetsukyo Bridge."),
                        mkStop("03:15 PM - 05:30 PM", "Activity", "Kinkaku-ji (Golden Pavilion)", "Kyoto, North", "Randen Tram + Bus (30m)", "$3.50 entry", "See the gold-leaf Zen pavilion gleaming in afternoon sunlight over Mirror Pond.")
                    ]
                },
                {
                    dayNumber: 7, dayTitle: "Nara Bowing Deer & Evening Transfer to Osaka", wakeUpTime: "08:00 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 12:30 PM", "Activity", "Nara Park Deer & Todai-ji Giant Buddha", "Nara", "Kintetsu Express (35m)", "$4.50 temple + $1.50 crackers", "Bow to Nara's gentle free-roaming deer and step inside one of the world's largest wooden halls."),
                        mkStop("01:00 PM - 02:30 PM", "Meal", "Nakatanidou Pounded Mochi & Nara Udon", "Nara, Higashimuki", "12-min walk", "$10", "Watch lightning-fast mugwort mochi pounding live before eating warm kitsune udon."),
                        mkStop("03:30 PM - 04:30 PM", "Transit", "Kintetsu Rapid Train Nara → Osaka Namba", "Osaka", "Direct Train (40m)", "$5 ticket", "Roll straight into downtown Osaka and check into your Namba hotel."),
                        mkStop("06:30 PM - 10:00 PM", "Meal", "Dotonbori Neon Canal, Takoyaki & Okonomiyaki", "Osaka, Dotonbori", "5-min walk", "$18", "Snap the Glico Running Man sign and feast on sizzling octopus balls and savory cabbage pancakes.")
                    ]
                },
                {
                    dayNumber: 8, dayTitle: "Hiroshima Peace Memorial & Miyajima Floating Gate", wakeUpTime: "07:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("08:00 AM - 09:30 AM", "Transit", "Shinkansen Shin-Osaka → Hiroshima", "Osaka to Hiroshima", "Sanyo Shinkansen (1h 25m)", "$72 each way", "Day-trip effortlessly by bullet train to western Japan's most moving historical city."),
                        mkStop("10:00 AM - 12:30 PM", "Activity", "Hiroshima Peace Memorial Park & Museum", "Hiroshima", "Streetcar (15m)", "$1.50 museum", "Reflect at the Atomic Bomb Dome and the deeply moving Peace Museum."),
                        mkStop("01:30 PM - 05:30 PM", "Activity", "Miyajima Island Ferry & Itsukushima Floating Torii", "Miyajima Island", "JR Train + 10m Ferry", "$5 roundtrip", "Cross the Inland Sea to see the giant vermilion shrine gate standing in the tide."),
                        mkStop("06:30 PM - 09:30 PM", "Meal", "Hiroshima-Style Okonomiyaki & Return Shinkansen", "Hiroshima Station to Osaka", "Shinkansen (1h 25m)", "$12 dinner", "Try layered noodle okonomiyaki at Okonomimura before speeding back to Osaka.")
                    ]
                },
                {
                    dayNumber: 9, dayTitle: "Osaka Castle, Kuromon Market & Shinsekai", wakeUpTime: "08:00 AM", sleepTime: "10:30 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:30 AM", "Activity", "Osaka Castle Park & Main Keep", "Osaka, Chuo-ku", "Metro (15m)", "$4 entry", "Walk past colossal megalithic stone walls and climb the reconstructed samurai tower."),
                        mkStop("12:00 PM - 02:00 PM", "Meal", "Kuromon Ichiba Market Tasting Walk", "Osaka, Nipponbashi", "Metro (12m)", "$15", "Sample grilled scallops, fresh strawberries, and wagyu skewers in Osaka's historic kitchen."),
                        mkStop("03:00 PM - 05:30 PM", "Activity", "Umeda Sky Building Floating Garden", "Osaka, Umeda", "Metro Midosuji Line (15m)", "$10 entry", "Ride suspended glass escalators 173 meters in the air for a full panorama of Osaka Bay."),
                        mkStop("06:30 PM - 09:30 PM", "Meal", "Retro Shinsekai & Kushikatsu Skewers", "Osaka, Shinsekai", "Metro (15m)", "$16", "Dine on crispy golden deep-fried skewers beneath Tsutenkaku Tower—remember: no double-dipping the sauce!")
                    ]
                },
                {
                    dayNumber: 10, dayTitle: "Final Souvenir Hunt & Kansai Airport Departure", wakeUpTime: "08:30 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:30 AM - 12:00 PM", "Activity", "Shinsaibashi Shopping Arcade & Don Quijote", "Osaka, Namba", "5-min walk", "Tax-free shopping", "Grab Kit-Kat flavors, Japanese knives, and skincare gifts inside covered shopping streets."),
                        mkStop("12:30 PM - 02:00 PM", "Meal", "Farewell Ichiran Ramen or Fluffy Cheesecake", "Osaka, Namba", "5-min walk", "$10", "Pick up a jiggly Rikuro Ojisan cheesecake and one final bowl of custom ramen."),
                        mkStop("03:00 PM - 04:00 PM", "Transit", "Nankai Rapi:t Express to Kansai Airport (KIX)", "Osaka to KIX", "Limited Express Train (38m)", "$10 ticket", "Glide straight onto the man-made airport island for your flight home.")
                    ]
                }
            ]
        }
    },
    {
        id: "blueprint-swiss-7d",
        country: "Switzerland",
        durationDays: 7,
        badge: "Instant Blueprint • 7 Days",
        cardTitle: "Switzerland in 7 Days: Peaks, Glaciers & Rail",
        cardSubtitle: "Lucerne, Lauterbrunnen waterfalls, Jungfraujoch & Matterhorn",
        cardTags: ["🏨 Alpine Comfort", "🚆 Scenic Swiss Rail"],
        image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80",
        places: ["Lucerne", "Interlaken & Lauterbrunnen", "Jungfraujoch", "Zermatt (Matterhorn)", "Montreux"],
        hotelBudget: "3-to-4 Star Comfort & Boutique Hotels",
        dailySpendingBudget: "Moderate (Popular Cafes, Casual Dining & Standard Tickets)",
        budgetEstimateUsd: { hotelPerNight: 220, dailyFoodAndSights: 75, localTransitPerDay: 45 },
        data: {
            summary: {
                tripTitle: "Swiss Alps Grand Rail: Lucerne, Lauterbrunnen Valley, Top of Europe & Matterhorn",
                budgetStrategySummary: "Smart Swiss hack: Pair a Swiss Half Fare Card (or Swiss Travel Pass) with Coop/Migros picnic lunches against glacier backdrops while splurging on mountain cableways and cozy chalet stays.",
                homeToDepartureTransit: "Arrive 3 hours ahead; ensure Schengen visa and travel insurance are printed in your carry-on.",
                flightStrategy: "Fly into Zurich (ZRH)—the railway station sits directly beneath the airport terminal, connecting you to Lucerne in 70 minutes.",
                recommendedStay: {
                    name: "Hotel Des Alpes (Lucerne) • Valley Hostel/Hotel Staubbach (Lauterbrunnen) • Hotel Butterfly (Zermatt)",
                    area: "Lucerne • Lauterbrunnen • Zermatt",
                    details: "Walkable chalet-style 3-to-4 star properties steps from SBB train platforms with mountain balcony views (~$200–$240/night)."
                },
                localTransportGuide: "Download the SBB Mobile app for exact platform timings. A Swiss Half Fare Card cuts all trains, boats, and expensive alpine gondolas by 50%."
            },
            days: [
                {
                    dayNumber: 1, dayTitle: "Zurich Arrival → Lakeside Lucerne Old Town", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("10:00 AM - 11:30 AM", "Transit", "Zurich Airport Direct Train to Lucerne", "Zurich Airport to Lucerne", "SBB InterRegio Train (1h 10m)", "$16 w/ Half Fare", "Step off the plane directly into SBB trains rolling along emerald lakes to Lucerne."),
                        mkStop("12:30 PM - 02:00 PM", "Meal", "Old Town Bakery & Lakeside Picnic", "Lucerne, Reuss River", "5-min walk", "$16", "Grab fresh pretzels, Gruyere cheese sandwiches, and Swiss chocolate by the water."),
                        mkStop("02:30 PM - 05:30 PM", "Activity", "Chapel Bridge, Lion Monument & Musegg Wall", "Lucerne", "Walkable loop (20m)", "Free", "Cross Europe's oldest covered wooden bridge and climb medieval watchtowers for snowy Pilatus views."),
                        mkStop("06:30 PM - 08:30 PM", "Meal", "Traditional Cheese Fondue & Rösti Dinner", "Lucerne Old Town", "5-min walk", "$32 per person", "Dip warm crusty bread into bubbling Alpine fondue at Wirtshaus Galliker or Stadtkeller.")
                    ]
                },
                {
                    dayNumber: 2, dayTitle: "Mount Pilatus Golden Round Trip & Lake Cruise", wakeUpTime: "07:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("08:45 AM - 10:15 AM", "Activity", "Paddle Steamer Cruise Across Lake Lucerne", "Lucerne to Alpnachstad", "Historic Lake Boat (1h 30m)", "50% off w/ Half Fare", "Glide past sheer limestone cliffs and lakeside castles on an open-air wooden deck."),
                        mkStop("10:30 AM - 01:30 PM", "Activity", "World's Steepest Cogwheel Railway to Mt. Pilatus", "Mount Pilatus (2,132m)", "48% gradient cog train (30m)", "$45 roundtrip w/ pass", "Ascend dramatic dragon-legend cliffs and walk the short panoramic summit ridge above the clouds."),
                        mkStop("02:00 PM - 04:00 PM", "Activity", "Aerial Cableway Descent & Fräkmüntegg Toboggan", "Kriens / Pilatus", "Dragon Ride Gondola", "$10 toboggan run", "Descend into alpine meadows and zip down Switzerland's longest summer toboggan track."),
                        mkStop("06:00 PM - 08:00 PM", "Meal", "Riverfront Sunset & Local Bratwurst", "Lucerne", "Bus 1 (15m)", "$20", "Unwind along the Reuss promenade watching swans drift beneath the illuminated water tower.")
                    ]
                },
                {
                    dayNumber: 3, dayTitle: "GoldenPass Panoramic Train to Lauterbrunnen Valley", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 11:30 AM", "Transit", "Luzern-Interlaken Express Panoramic Rail", "Lucerne to Lauterbrunnen", "Panoramic Train + Local Rail (2h 20m)", "$22 w/ Half Fare", "Sit on the right-hand side for turquoise Lake Lungern and Lake Brienz views before entering the waterfall valley."),
                        mkStop("12:30 PM - 03:00 PM", "Activity", "Staubbach Falls & Trümmelbach Glacier Waterfalls", "Lauterbrunnen", "Scenic valley walk (40m)", "$16 Trümmelbach entry", "Walk beneath 72 cliffside waterfalls and step inside the mountain to hear thunderous glacial cascades."),
                        mkStop("03:30 PM - 06:00 PM", "Activity", "Car-Free Mürren Cliff Village", "Mürren (above valley)", "Cable car + cliff train (20m)", "$12 w/ Half Fare", "Stroll flower-draped wooden chalets staring face-to-face at the Eiger, Mönch, and Jungfrau walls."),
                        mkStop("07:00 PM - 08:30 PM", "Meal", "Chalet Pasta & Alpine Soup Dinner", "Lauterbrunnen", "5-min walk", "$26", "Dine under starlit vertical cliffs as cowbells echo softly across the valley.")
                    ]
                },
                {
                    dayNumber: 4, dayTitle: "Jungfraujoch (Top of Europe) & Grindelwald First", wakeUpTime: "07:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("07:45 AM - 10:00 AM", "Transit", "Eiger Express Tri-Cable Gondola to Jungfraujoch", "Lauterbrunnen → Grindelwald → 3,454m", "Train + Eiger Express + Cog Rail", "$115 w/ Half Fare", "Ascend through the heart of the Eiger to Europe's highest railway station—wear sunglasses and a warm jacket."),
                        mkStop("10:00 AM - 01:00 PM", "Activity", "Sphinx Observatory, Aletsch Glacier & Ice Palace", "Jungfraujoch", "Walkable tunnels", "Included in ticket", "Walk out onto eternal snow overlooking the 22 km Aletsch Glacier and explore ice-sculpted caverns."),
                        mkStop("02:30 PM - 05:30 PM", "Activity", "Grindelwald First Cliff Walk by Tissot", "Grindelwald", "First Gondola (25m)", "$35 w/ Half Fare", "Step onto a metal walkway bolted to the cliff face and optionally ride the First Flyer zipline."),
                        mkStop("06:30 PM - 08:30 PM", "Meal", "Interlaken Cozy Bistro Dinner", "Interlaken / Lauterbrunnen", "Train (25m)", "$28", "Celebrate conquering the Top of Europe with warm Swiss Älplermagronen (alpine mac & cheese).")
                    ]
                },
                {
                    dayNumber: 5, dayTitle: "Car-Free Zermatt & Matterhorn Reflections", wakeUpTime: "08:00 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("08:30 AM - 11:15 AM", "Transit", "Alpine Rail Journey to Car-Free Zermatt", "Lauterbrunnen → Visp → Zermatt", "SBB + Matterhorn Gotthard Bahn (2h 40m)", "$36 w/ Half Fare", "Climb up the dramatic Mattertal gorge into Zermatt where only electric shuttles and horse carriages roam."),
                        mkStop("12:30 PM - 03:30 PM", "Activity", "Gornergrat Cog Railway & Riffelsee Mirror Lake", "Zermatt (3,089m)", "Gornergrat Bahn (33m)", "$55 w/ Half Fare", "Ride up to 29 four-thousand-meter peaks and hike 10 minutes down to Riffelsee for the famous Matterhorn reflection."),
                        mkStop("04:30 PM - 06:30 PM", "Activity", "Hinterdorf Historic Timber Barns & Bahnhofstrasse", "Zermatt Village", "Walk", "Free", "Wander 500-year-old blackened larch granaries built on mushroom-shaped stone stilts."),
                        mkStop("07:30 PM - 09:00 PM", "Meal", "Valais Raclette & Matterhorn View", "Zermatt", "5-min walk", "$30", "Watch melted alpine cheese scraped onto baby potatoes and pickled onions.")
                    ]
                },
                {
                    dayNumber: 6, dayTitle: "Lake Geneva Riviera, Chillon Castle & Montreux", wakeUpTime: "07:30 AM", sleepTime: "10:00 PM",
                    schedule: [
                        mkStop("08:30 AM - 11:15 AM", "Transit", "Scenic Train Zermatt → Montreux Riviera", "Zermatt to Montreux", "Rail via Visp (2h 40m)", "$34 w/ Half Fare", "Descend from glacial snows into palm-lined Lake Geneva vineyards."),
                        mkStop("11:45 AM - 02:00 PM", "Activity", "Château de Chillon Island Fortress", "Montreux, Veytaux", "Lakeside walk / Bus 201 (10m)", "$15 entry", "Explore Switzerland's fairy-tale medieval castle jutting into Lake Geneva's clear blue waters."),
                        mkStop("02:30 PM - 05:30 PM", "Activity", "Lavaux UNESCO Terraced Vineyards & Promenade", "Montreux / Vevey", "Local train (12m)", "Free walk", "Walk stone vineyard paths high above the lake with snow-dusted French Alps glowing across the water."),
                        mkStop("06:30 PM - 08:30 PM", "Meal", "Lakefront Dinner by Freddie Mercury Statue", "Montreux", "Walk", "$28", "Catch a pastel sunset over the lakefront promenade before your final morning.")
                    ]
                },
                {
                    dayNumber: 7, dayTitle: "Chocolate Train Stop or Zurich Return & Departure", wakeUpTime: "08:00 AM", sleepTime: "11:00 PM",
                    schedule: [
                        mkStop("09:00 AM - 12:00 PM", "Transit", "Direct SBB Train Montreux → Zurich (or Geneva)", "Montreux to Zurich", "SBB Rail (2h 50m)", "$38 w/ Half Fare", "Relax in panoramic rail seats crossing the Swiss plateau back toward Zurich."),
                        mkStop("12:30 PM - 02:30 PM", "Activity", "Lindt Home of Chocolate & Zurich Niederdorf", "Zurich", "Train/Bus (15m)", "$18 museum (book early)", "Stand beneath the 9-meter flowing chocolate fountain and stock up on Läderach fresh bark."),
                        mkStop("03:30 PM - 05:00 PM", "Transit", "Zurich HB Direct to Zurich Airport (ZRH)", "Zurich Airport", "10-min airport train", "$4", "Seamless 10-minute rail transfer straight into your departure terminal.")
                    ]
                }
            ]
        }
    }
];
