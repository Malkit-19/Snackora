require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const { USER_ROLES, B2B_STATUS } = require('../src/config/constants');

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snackora';
    console.log(`Connecting to database: ${mongoURI}`);
    await mongoose.connect(mongoURI);

    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    console.log('Seeding Users (Admin, Approved B2B Wholesaler, Pending B2B, Retail Customer)...');
    
    // 1. Admin - Provisioned via environment configuration
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@snackora.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminUser = await User.create({
      name: process.env.ADMIN_NAME || 'Snackora Administrator',
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword,
      phone: process.env.ADMIN_PHONE || '+91 9876543210',
      role: USER_ROLES.ADMIN,
      status: 'ACTIVE'
    });

    // 2. Approved B2B Wholesaler
    const approvedB2BUser = await User.create({
      name: 'Rajesh Sharma',
      email: 'wholesaler@snackora.in',
      password: 'B2b@12345',
      phone: '+91 9822012345',
      role: USER_ROLES.B2B_WHOLESALER,
      b2bProfile: {
        companyName: 'SuperBite Mart Private Limited',
        gstin: '27AAACS1429B1ZB',
        pan: 'AAACS1429B',
        businessType: 'Supermarket Chain & FMCG Wholesale',
        businessAddress: {
          street: 'Plot 42, Sector 18, Vashi Industrial Area',
          city: 'Navi Mumbai',
          state: 'Maharashtra',
          postalCode: '400703',
          country: 'India'
        },
        verificationStatus: B2B_STATUS.APPROVED,
        verificationDate: new Date()
      },
      addresses: [{
        name: 'SuperBite Central Distribution Hub',
        phone: '+91 9822012345',
        addressLine1: 'Warehouse 4B, MIDC Industrial Area',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        postalCode: '400703',
        country: 'India',
        isDefault: true,
        addressType: 'WAREHOUSE'
      }]
    });

    // 3. Pending B2B Wholesaler
    const pendingB2BUser = await User.create({
      name: 'Vikram Mehta',
      email: 'pendingb2b@snackora.in',
      password: 'Pending@12345',
      phone: '+91 9988776655',
      role: USER_ROLES.B2B_WHOLESALER,
      b2bProfile: {
        companyName: 'Apex Grocers LLP',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        businessType: 'Convenience Store Chain',
        businessAddress: {
          street: '88 Brigade Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India'
        },
        verificationStatus: B2B_STATUS.PENDING
      }
    });

    // 4. Retail Customer
    const retailCustomer = await User.create({
      name: 'Ananya Deshmukh',
      email: 'customer@snackora.in',
      password: 'Customer@12345',
      phone: '+91 9123456789',
      role: USER_ROLES.CUSTOMER,
      addresses: [{
        name: 'Ananya Deshmukh',
        phone: '+91 9123456789',
        addressLine1: 'A-402, Sunshine Heights, Baner Road',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411045',
        country: 'India',
        isDefault: true,
        addressType: 'HOME'
      }]
    });

    console.log('Seeding Categories...');
    const catCookies = await Category.create({
      name: 'Cookies',
      slug: 'cookies',
      description: 'Artisanal crunchy and chewy cookies crafted with pure butter, rich chocolate, and clean proteins.',
      image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
      displayOrder: 1
    });

    const catProtein = await Category.create({
      name: 'Protein',
      slug: 'protein',
      description: 'Clean, macro-balanced protein bars and cookies designed for athletes and active lifestyles.',
      image: 'https://images.unsplash.com/photo-1622484216850-8b17b2b73bc3?auto=format&fit=crop&w=600&q=80',
      displayOrder: 2
    });

    const catDairy = await Category.create({
      name: 'Dairy',
      slug: 'dairy',
      description: 'Fresh, pure Amul dairy staples including milk, butter, cheese, and sweetened condensed milk.',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      displayOrder: 3
    });

    const catMakhana = await Category.create({
      name: 'Makhana',
      slug: 'makhana',
      description: 'Slow-roasted popped foxnuts infused with gourmet spices. Gluten-free, crispy, and nutritious.',
      image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80',
      displayOrder: 4
    });

    console.log('Seeding Products...');
    const productsData = [
      // 1. COOKIES
      {
        name: 'Snackora Classic Golden Butter Cookies',
        slug: 'classic-butter-cookies',
        category: catCookies._id,
        sku: 'CK-CLS-01',
        description: 'Traditional slow-baked golden butter cookies with a melt-in-mouth texture and rich dairy aroma.',
        shortDescription: 'Slow-baked buttery perfection with golden crisp edges.',
        images: [{ url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 149,
        wholesalePrice: 89,
        b2bMoq: 24,
        stock: 350,
        unit: '150g pack',
        isFeatured: true,
        tags: ['cookies', 'butter', 'classic', 'bakery'],
        ratings: { average: 4.8, count: 42 }
      },
      {
        name: 'Snackora Dark Chocolate Fudge Cookies',
        slug: 'dark-chocolate-cookies',
        category: catCookies._id,
        sku: 'CK-CHO-02',
        description: 'Decadent Dutch cocoa cookies studded with 55% dark chocolate chips and sea salt flakes.',
        shortDescription: 'Rich Dutch cocoa studded with melting dark chocolate morsels.',
        images: [{ url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 179,
        wholesalePrice: 105,
        b2bMoq: 24,
        stock: 280,
        unit: '150g pack',
        isFeatured: true,
        tags: ['cookies', 'chocolate', 'dark chocolate', 'dessert'],
        ratings: { average: 4.9, count: 68 }
      },
      {
        name: 'Snackora High-Protein Whey Cookies',
        slug: 'protein-cookies-bakery',
        category: catCookies._id,
        sku: 'CK-PRO-03',
        description: 'Freshly baked cookies providing 15g clean whey protein per serving with zero added refined sugars.',
        shortDescription: '15g Whey Protein per serving with zero refined sugar.',
        images: [{ url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 199,
        wholesalePrice: 119,
        b2bMoq: 20,
        stock: 200,
        unit: 'Pack of 3 (225g)',
        isFeatured: true,
        tags: ['cookies', 'protein', 'fitness', 'whey'],
        ratings: { average: 4.7, count: 35 }
      },

      // 2. PROTEIN
      {
        name: 'Snackora 20g Whey Protein Bar - Choco Peanut',
        slug: 'protein-bar-choco-peanut',
        category: catProtein._id,
        sku: 'PR-BAR-01',
        description: 'High-density workout fuel loaded with roasted peanuts, whey isolate, and crispies covered in milk chocolate.',
        shortDescription: '20g protein per bar with crunchy peanuts and cocoa.',
        images: [{ url: 'https://images.unsplash.com/photo-1622484216850-8b17b2b73bc3?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 120,
        wholesalePrice: 72,
        b2bMoq: 30,
        stock: 500,
        unit: '60g bar',
        isFeatured: true,
        tags: ['protein', 'energy bar', 'peanut butter', 'gym'],
        ratings: { average: 4.8, count: 85 }
      },
      {
        name: 'Snackora Almond Crunch Protein Cookie Bar',
        slug: 'protein-cookie-almond-crunch',
        category: catProtein._id,
        sku: 'PR-CK-02',
        description: 'Chewy protein cookie loaded with California roasted almonds and prebiotic fiber for sustained energy.',
        shortDescription: '18g protein soft-baked cookie with roasted almond slivers.',
        images: [{ url: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 135,
        wholesalePrice: 80,
        b2bMoq: 30,
        stock: 320,
        unit: '75g cookie',
        isFeatured: false,
        tags: ['protein', 'cookie', 'almond', 'snack'],
        ratings: { average: 4.6, count: 29 }
      },

      // 3. DAIRY
      {
        name: 'Amul Taaza Homogenised Toned Milk',
        slug: 'amul-taaza-milk-1l',
        category: catDairy._id,
        sku: 'DY-MLK-01',
        description: 'Long shelf-life UHT treated toned milk from Amul. Fresh, wholesome, and ready to consume with zero preservatives.',
        shortDescription: '1L UHT long-life toned milk with 3.0% fat.',
        images: [{ url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 74,
        wholesalePrice: 62,
        b2bMoq: 12,
        stock: 600,
        unit: '1 Litre Tetra Pak',
        isFeatured: true,
        tags: ['dairy', 'milk', 'amul', 'breakfast'],
        ratings: { average: 4.9, count: 120 }
      },
      {
        name: 'Amul Pasteurized Table Butter',
        slug: 'amul-pasteurized-butter-500g',
        category: catDairy._id,
        sku: 'DY-BTR-02',
        description: 'Iconic Utterly Butterly Delicious salted table butter made from fresh dairy cream.',
        shortDescription: 'Pure cream salted golden table butter.',
        images: [{ url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 275,
        wholesalePrice: 235,
        b2bMoq: 10,
        stock: 400,
        unit: '500g block',
        isFeatured: true,
        tags: ['dairy', 'butter', 'amul', 'kitchen'],
        ratings: { average: 5.0, count: 210 }
      },
      {
        name: 'Amul Processed Cheese Block',
        slug: 'amul-processed-cheese-500g',
        category: catDairy._id,
        sku: 'DY-CHS-03',
        description: 'Wholesome processed cheddar cheese block, perfect for grating over pizzas, sandwiches, and pastas.',
        shortDescription: 'Creamy processed cheese block with high meltability.',
        images: [{ url: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 310,
        wholesalePrice: 265,
        b2bMoq: 10,
        stock: 300,
        unit: '500g pack',
        isFeatured: false,
        tags: ['dairy', 'cheese', 'amul', 'gourmet'],
        ratings: { average: 4.8, count: 94 }
      },
      {
        name: 'Amul Mithai Mate Condensed Milk',
        slug: 'amul-condensed-milk-400g',
        category: catDairy._id,
        sku: 'DY-CNM-04',
        description: 'Sweetened condensed milk ideal for cakes, traditional Indian sweets, puddings, and creamy ice creams.',
        shortDescription: 'Rich, thick sweetened condensed milk for gourmet desserts.',
        images: [{ url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 145,
        wholesalePrice: 122,
        b2bMoq: 12,
        stock: 250,
        unit: '400g tin',
        isFeatured: false,
        tags: ['dairy', 'condensed milk', 'amul', 'desserts'],
        ratings: { average: 4.7, count: 50 }
      },

      // 4. MAKHANA
      {
        name: 'Snackora Classic Salted Roasted Makhana',
        slug: 'normal-makhana',
        category: catMakhana._id,
        sku: 'MK-NRM-01',
        description: 'Jumbo foxnuts slowly dry-roasted with extra virgin olive oil and rock salt. Pure, simple, and crunchy.',
        shortDescription: 'Slow-roasted jumbo foxnuts with Himalayan pink salt.',
        images: [{ url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 160,
        wholesalePrice: 95,
        b2bMoq: 25,
        stock: 450,
        unit: '80g pouch',
        isFeatured: true,
        tags: ['makhana', 'foxnuts', 'roasted', 'healthy'],
        ratings: { average: 4.9, count: 77 }
      },
      {
        name: 'Snackora Fiery Peri Peri Roasted Makhana',
        slug: 'peri-peri-makhana',
        category: catMakhana._id,
        sku: 'MK-PRP-02',
        description: 'Crispy popped lotus seeds dusted with zesty bird’s eye chili, garlic, and tangy lemon peri peri seasonings.',
        shortDescription: 'Bold African peri-peri spices with a zesty chili punch.',
        images: [{ url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 175,
        wholesalePrice: 105,
        b2bMoq: 25,
        stock: 400,
        unit: '80g pouch',
        isFeatured: true,
        tags: ['makhana', 'peri peri', 'spicy', 'snacks'],
        ratings: { average: 4.9, count: 112 }
      },
      {
        name: 'Snackora Cream & Onion Roasted Makhana',
        slug: 'cream-and-onion-makhana',
        category: catMakhana._id,
        sku: 'MK-CNO-03',
        description: 'Mouthwatering blend of cultured sour cream, scallions, and roasted garlic over crisp popped makhana.',
        shortDescription: 'Savory sour cream and chives for indulgent snacking.',
        images: [{ url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 175,
        wholesalePrice: 105,
        b2bMoq: 25,
        stock: 380,
        unit: '80g pouch',
        isFeatured: true,
        tags: ['makhana', 'cream onion', 'flavor', 'crunch'],
        ratings: { average: 4.8, count: 88 }
      },
      {
        name: 'Snackora Malabar Black Pepper Makhana',
        slug: 'black-pepper-makhana',
        category: catMakhana._id,
        sku: 'MK-BKP-04',
        description: 'Aromatic crushed Tellicherry black pepper paired with sea salt and cold-pressed olive oil.',
        shortDescription: 'Fresh cracked Tellicherry black pepper with sea salt.',
        images: [{ url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 175,
        wholesalePrice: 105,
        b2bMoq: 25,
        stock: 300,
        unit: '80g pouch',
        isFeatured: false,
        tags: ['makhana', 'black pepper', 'digestive', 'classic'],
        ratings: { average: 4.6, count: 41 }
      },
      {
        name: 'Snackora Tangy Spanish Tomato Makhana',
        slug: 'tomato-makhana',
        category: catMakhana._id,
        sku: 'MK-TOM-05',
        description: 'Sun-ripened Spanish tomatoes, sweet paprika, and herbs layered over golden roasted makhana.',
        shortDescription: 'Sweet and tangy sun-dried tomato seasoning.',
        images: [{ url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 175,
        wholesalePrice: 105,
        b2bMoq: 25,
        stock: 350,
        unit: '80g pouch',
        isFeatured: false,
        tags: ['makhana', 'tomato', 'tangy', 'kids favorite'],
        ratings: { average: 4.7, count: 52 }
      },
      {
        name: 'Snackora Royal Indian Masala Touch Makhana',
        slug: 'indian-touch-makhana',
        category: catMakhana._id,
        sku: 'MK-IND-06',
        description: 'Authentic royal Indian spice blend featuring amchur, cumin, coriander, and black salt.',
        shortDescription: 'Authentic chatpata Indian masala flavor.',
        images: [{ url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80', isPrimary: true }],
        retailPrice: 175,
        wholesalePrice: 105,
        b2bMoq: 25,
        stock: 420,
        unit: '80g pouch',
        isFeatured: true,
        tags: ['makhana', 'indian touch', 'masala', 'chatpata'],
        ratings: { average: 4.9, count: 130 }
      }
    ];

    await Product.insertMany(productsData);

    console.log('----------------------------------------------------');
    console.log('Master Seed Complete!');
    console.log(`Users Created: 4`);
    console.log(`  - Admin: admin@snackora.in / Admin@12345`);
    console.log(`  - Approved B2B: wholesaler@snackora.in / B2b@12345`);
    console.log(`  - Pending B2B: pendingb2b@snackora.in / Pending@12345`);
    console.log(`  - Retail Customer: customer@snackora.in / Customer@12345`);
    console.log(`Categories Created: 4 (Cookies, Protein, Dairy, Makhana)`);
    console.log(`Products Created: ${productsData.length}`);
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
