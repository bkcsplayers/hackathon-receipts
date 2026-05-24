EXPENSE_CATEGORIES = {
    "Dining": {
        "icon": "🍔",
        "subcategories": ["Restaurant", "Fast Food", "Coffee", "Bar", "Delivery", "Takeout"],
        "keywords": ["restaurant", "cafe", "coffee", "pizza", "sushi", "mcdonald", "tim hortons", "starbucks"],
    },
    "Groceries": {
        "icon": "🛒",
        "subcategories": [
            "Supermarket",
            "Convenience Store",
            "Farmers Market",
            "Bulk Store",
            "Dairy",
            "Meat",
            "Produce",
            "Bakery",
            "Household",
        ],
        "keywords": ["costco", "walmart", "loblaws", "metro", "sobeys", "no frills", "food basics", "t&t"],
    },
    "Transportation": {
        "icon": "🚗",
        "subcategories": ["Fuel", "Parking", "Transit", "Rideshare", "Toll", "Car Rental"],
        "keywords": ["shell", "petro-canada", "esso", "uber", "lyft", "presto", "compass"],
    },
    "Vehicle": {
        "icon": "🔧",
        "subcategories": ["Repair", "Service", "Parts", "Car Wash", "Insurance"],
        "keywords": ["canadian tire", "napa", "midas", "mr lube"],
    },
    "Shopping": {
        "icon": "🛍️",
        "subcategories": ["Electronics", "Clothing", "Home & Garden", "Online", "Books"],
        "keywords": ["amazon", "best buy", "ikea", "winners", "homesense"],
    },
    "Utilities": {
        "icon": "⚡",
        "subcategories": ["Hydro/Electric", "Gas", "Water", "Internet", "Phone/Mobile"],
        "keywords": ["hydro", "enbridge", "rogers", "bell", "telus", "fido"],
    },
    "Entertainment": {
        "icon": "🎬",
        "subcategories": ["Movies", "Games", "Sports", "Events", "Streaming", "Gym"],
        "keywords": ["cineplex", "netflix", "spotify", "goodlife", "ymca"],
    },
    "Healthcare": {
        "icon": "💊",
        "subcategories": ["Pharmacy", "Doctor", "Dentist", "Hospital", "Eyecare", "Mental Health"],
        "keywords": ["shoppers drug mart", "rexall", "pharmasave", "lifelab"],
    },
    "Housing": {
        "icon": "🏠",
        "subcategories": ["Rent", "Mortgage", "Maintenance", "Furniture", "Appliances"],
        "keywords": ["rent", "mortgage", "home depot", "rona", "lowes"],
    },
    "Subscriptions": {
        "icon": "📱",
        "subcategories": ["Software", "Streaming", "Memberships", "SaaS"],
        "keywords": ["apple", "google", "adobe", "notion", "chatgpt"],
    },
    "Travel": {
        "icon": "✈️",
        "subcategories": ["Lodging", "Flights", "Vacation", "Rental Car"],
        "keywords": ["airbnb", "booking", "expedia", "air canada", "westjet"],
    },
    "Personal Care": {
        "icon": "💇",
        "subcategories": ["Salon", "Spa", "Beauty", "Grooming"],
        "keywords": ["salon", "spa", "sephora", "bath & body"],
    },
    "Education": {
        "icon": "📚",
        "subcategories": ["Tuition", "Books", "Courses", "School Supplies"],
        "keywords": ["university", "college", "udemy", "coursera", "indigo"],
    },
    "Financial": {
        "icon": "🏦",
        "subcategories": ["Bank Fees", "ATM", "Credit Card Fee", "Interest"],
        "keywords": ["td bank", "rbc", "bmo", "scotiabank", "cibc"],
    },
    "Insurance": {
        "icon": "🛡️",
        "subcategories": ["Auto", "Health", "Home", "Life"],
        "keywords": ["intact", "aviva", "desjardins", "sunlife", "manulife"],
    },
    "Gifts & Donations": {
        "icon": "🎁",
        "subcategories": ["Gifts", "Charity", "Donations"],
        "keywords": ["gift", "donation", "charity"],
    },
    "Pets": {
        "icon": "🐾",
        "subcategories": ["Pet Food", "Vet", "Pet Supplies"],
        "keywords": ["petsmart", "pet valu", "vet"],
    },
    "Kids & Family": {
        "icon": "👶",
        "subcategories": ["Childcare", "School", "Toys", "Activities"],
        "keywords": ["toys r us", "daycare", "babysitter"],
    },
    "Misc": {
        "icon": "🏪",
        "subcategories": ["General", "Uncategorized"],
        "keywords": [],
    },
}


def get_category_icon(category: str) -> str:
    return EXPENSE_CATEGORIES.get(category, EXPENSE_CATEGORIES["Misc"])["icon"]
