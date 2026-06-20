'use strict';

const XAYLICIOUSS_PRODUCTS = [
  {
    id: 1,
    name: 'Classic Chocolate Brownie',
    category: 'Brownies',
    price: 120,
    image: 'assets/images/classic-chocolate-brownie.jpg',
    description: 'Soft, rich chocolate brownie baked with a fudgy center and premium cocoa flavor.',
    badge: 'Best Seller',
    featured: true
  },
  {
    id: 2,
    name: 'Fudge Brownie Box',
    category: 'Brownies',
    price: 399,
    image: 'assets/images/fudge-brownie-box.jpg',
    description: 'A gift-ready box of dense fudge brownies, perfect for sharing and celebrations.',
    badge: 'Gift Box',
    featured: true
  },
  {
    id: 3,
    name: 'Mini Bento Cake',
    category: 'Cakes',
    price: 499,
    image: 'assets/images/mini-bento-cake.jpg',
    description: 'Cute mini cake with elegant frosting, personalized message, and premium finish.',
    badge: 'Customizable',
    featured: true
  },
  {
    id: 4,
    name: 'Chocolate Truffle Cake',
    category: 'Cakes',
    price: 899,
    image: 'assets/images/chocolate-truffle-cake.jpg',
    description: 'Layered chocolate sponge with smooth truffle cream and rich chocolate glaze.',
    badge: 'Premium',
    featured: true
  },
  {
    id: 5,
    name: 'Vanilla Celebration Cake',
    category: 'Cakes',
    price: 799,
    image: 'assets/images/vanilla-celebration-cake.jpg',
    description: 'Classic vanilla cake with soft sponge, silky cream, and celebration-ready design.',
    badge: 'Celebration',
    featured: false
  },
  {
    id: 6,
    name: 'Red Velvet Cupcake',
    category: 'Cupcakes',
    price: 149,
    image: 'assets/images/red-velvet-cupcake.jpg',
    description: 'Moist red velvet cupcake topped with creamy frosting and aesthetic decoration.',
    badge: 'Elegant',
    featured: false
  },
  {
    id: 7,
    name: 'Chocolate Cupcake',
    category: 'Cupcakes',
    price: 139,
    image: 'assets/images/chocolate-cupcake.jpg',
    description: 'Chocolate cupcake with soft crumb, smooth frosting, and rich cocoa taste.',
    badge: 'Popular',
    featured: false
  },
  {
    id: 8,
    name: 'Premium Dessert Box',
    category: 'Dessert Boxes',
    price: 699,
    image: 'assets/images/premium-dessert-box.jpg',
    description: 'A premium assorted dessert box with brownies, cupcakes, cookies, and mini treats.',
    badge: 'Assorted',
    featured: true
  },
  {
    id: 9,
    name: 'Custom Gift Dessert Box',
    category: 'Dessert Boxes',
    price: 849,
    image: 'assets/images/custom-gift-dessert-box.jpg',
    description: 'Personalized dessert box with theme-based packaging, message card, and treats.',
    badge: 'Personalized',
    featured: false
  },
  {
    id: 10,
    name: 'Butter Cookies',
    category: 'Cookies',
    price: 249,
    image: 'assets/images/butter-cookies.jpg',
    description: 'Crisp, buttery homemade cookies packed beautifully for tea-time and gifting.',
    badge: 'Homemade',
    featured: false
  },
  {
    id: 11,
    name: 'Choco Chip Cookies',
    category: 'Cookies',
    price: 279,
    image: 'assets/images/choco-chip-cookies.jpg',
    description: 'Golden cookies filled with chocolate chips, baked fresh with a soft center.',
    badge: 'Fresh Batch',
    featured: false
  },
  {
    id: 12,
    name: 'Seasonal Special Cake',
    category: 'Cakes',
    price: 999,
    image: 'assets/images/seasonal-special-cake.jpg',
    description: 'Limited-season premium cake designed with special flavors and elegant decoration.',
    badge: 'Seasonal',
    featured: false
  }
];

window.XAYLICIOUSS_PRODUCTS = XAYLICIOUSS_PRODUCTS;
