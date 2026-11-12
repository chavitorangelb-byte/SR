/* =====================================================================
   THE CHEESE BURGER · datos editables del demo
   Todo lo que se ve en la página sale de este archivo.
   Lo marcado con  confirmar: true  no está verificado con el dueño.
   ===================================================================== */
window.TCB = {

  /* ---------- Banderas ---------- */
  SHOW_OFFER: true,          // false = oculta la sección "Tu página, desde $1,000 MXN" (para enseñarlo al cliente final)
  SHOW_DEMO_BADGE: true,     // false = quita la nota "Demo de diseño"
  DEMO_MODE: true,           // true = el pedido muestra el mensaje antes de abrir WhatsApp; false = abre WhatsApp directo
  SHOW_PENDIENTES: true,     // true = muestra la etiqueta "por confirmar" junto a los datos sin verificar

  /* ---------- Negocio ---------- */
  negocio: {
    nombre: 'The Cheese Burger',
    corto: 'TCB',
    giro: 'Hamburguesas, pollo frito y snacks',
    lema: 'Feel the world in just a bite',
    zona: 'Cumbres 2º Sector',
    ciudad: 'Monterrey, N.L.',
    logo: 'assets/logo.png',                   // si el archivo no carga, se usa el wordmark tipográfico "TCB"

    direccion: { valor: '', confirmar: true }, // NO inventar. Vacío = se muestra "Dirección exacta por confirmar"
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=The+Cheese+Burger+Cumbres+2do+Sector+Monterrey', // pegar aquí el enlace exacto de Google Maps
    telefono: { valor: '+52 81 8161 8030', tel: '+528181618030', confirmar: true },
    whatsappPedidos: { valor: '528181618030', confirmar: true }, // solo dígitos, con 52. Falta confirmar que ese número tenga WhatsApp

    instagram: { usuario: '@thecheeseburger_mx', url: 'https://www.instagram.com/thecheeseburger_mx/' },
    facebook: { nombre: 'The Cheese Burger Mx', url: 'https://www.facebook.com/search/top?q=The%20Cheese%20Burger%20Mx', confirmar: true }, // pegar la URL exacta de la página

    // Horario según Google Maps. dias: 0 = domingo … 6 = sábado. Horas en formato 24 h, hora de Monterrey.
    horario: {
      confirmar: true,
      zonaHoraria: 'America/Monterrey',
      bloques: [
        { etiqueta: 'Lunes a jueves',    dias: [1, 2, 3, 4], abre: '14:00', cierra: '22:00' },
        { etiqueta: 'Viernes a domingo', dias: [5, 6, 0],    abre: '14:00', cierra: '23:00' }
      ]
    },

    // Formas de recibir el pedido. Entrega a domicilio propia: sin confirmar, por eso no aparece.
    tiposDePedido: ['Paso a recoger', 'Para comer ahí']
  },

  /* ---------- Google Maps ---------- */
  google: {
    calificacion: 4.6,       // confirmar el día de la presentación
    totalResenas: 156,       // confirmar el día de la presentación
    confirmar: true,
    // Citas textuales de reseñas públicas en Google Maps. Solo nombre de pila. Aprobadas por Salvador para el demo.
    resenas: [
      { texto: 'Excelente servicio, comida y ambiente… sus paredes negras llenas de gises de colores.', autor: '' },
      { texto: 'La hamburguesa deliciosa, la atención muy buena, el lugar muy cómodo y limpio.', autor: 'Leticia' },
      { texto: 'Hamburguesas deliciosas, papas recién freidas calientitas.', autor: 'Dani' }
    ]
  },

  /* ---------- Fotos (recortadas de su Instagram; reemplazar por originales del dueño) ---------- */
  // archivo = nombre base en assets/fotos/ (existen -640.webp y -1080.webp). Si falta el archivo se ve un placeholder de tablero.
  fotos: [
    { archivo: 'burger-queso-panela',  alt: 'Hamburguesa con queso derretido y panela a la plancha, lechuga y tomate, servida con papas a la francesa' },
    { archivo: 'chicken-sandwich',     alt: 'Sándwich de pollo empanizado bañado en salsa, con lechuga, en pan brioche' },
    { archivo: 'burger-carne-y-pollo', alt: 'Hamburguesa con carne y pollo empanizado, queso derretido, lechuga y tomate en pan brioche' },
    { archivo: 'burgers-para-llevar',  alt: 'Dos hamburguesas con papas a la francesa en sus cajas de The Cheese Burger' },
    { archivo: 'burger-guacamole',     alt: 'Hamburguesa con guacamole, queso, trozos de carne dorada y aderezo' },
    { archivo: 'tenders-con-salsa',    alt: 'Tender de pollo empanizado bañado en salsa sobre una charola con papas' },
    { archivo: 'burger-con-papas',     alt: 'Hamburguesa con tocino, queso derretido y papas a la francesa dentro del pan' },
    { archivo: 'burger-con-mac',       alt: 'Hamburguesa con carne, pollo empanizado y macarrón con queso, junto a una malteada' }
  ],

  /* ---------- Menú ---------- */
  // Fuente: historia de Instagram "MENÚ" del 18 de enero de 2024. Los precios pueden haber cambiado.
  // Un platillo puede tener  precio  o  opciones: [{ nombre, precio }]  (tamaños o sabores).
  menu: {
    fuente: 'Menú publicado en Instagram el 18 de enero de 2024',
    aviso: 'Precios sujetos a cambio',
    confirmar: true,
    categorias: [
      {
        id: 'burgers', nombre: 'Burgers',
        nota: 'Todas van en pan brioche, con papas a la francesa. Puedes cambiar tu pan por lechuga.',
        items: [
          { id: 'cheeseburger', nombre: 'Cheeseburger', precio: 120,
            desc: 'La clásica, sencilla pero inigualable. 150 g de carne, queso suizo americano, aderezo de la casa, lechuga italiana y tomate. Con aderezo chipotle.' },
          { id: 'superbacon', nombre: 'Superbacon', precio: 150, sello: 'La más pedida',
            desc: '150 g de carne, queso suizo americano, aderezo hot BBQ, aros de cebolla empanizados, tocino y cebolla caramelizada. Con aderezo ranch.' },
          { id: 'tres-cheeses', nombre: "3x Cheese's", precio: 150,
            desc: '¿Muy fan del queso? 150 g de carne de res, queso suizo americano, cheddar y panela a la plancha, aderezo de la casa, lechuga italiana y tomate. Con aderezo chipotle.' },
          { id: 'jalapeno-burger', nombre: 'Jalapeño Burger', precio: 155,
            desc: 'La combinación perfecta. 150 g de carne, queso suizo americano, aderezo de jalapeño, champiñones y tocino. Con chipotle.' }
        ]
      },
      {
        id: 'pollo', nombre: 'Pollo',
        nota: 'Pechuga empanizada o al natural, en pan brioche, con papas a la francesa.',
        items: [
          { id: 'chicken-sandwich', nombre: 'Chicken Sandwich', precio: 130,
            desc: 'La sencilla de pollo. Queso suizo americano, lechuga italiana, tomate y aderezo de la casa. Con aderezo ranch.' },
          { id: 'spicy-chicken', nombre: 'Spicy Chicken Sandwich', precio: 140,
            desc: 'Para los amantes de la salsa. Pechuga bañada en tu salsa favorita, queso suizo americano, lechuga italiana, tomate y aderezo de la casa. Con aderezo ranch.' },
          { id: 'buffalo-ranch', nombre: 'Buffalo Ranch Chicken Sandwich', precio: 150,
            desc: 'Dos en uno. Queso suizo americano sobre una cama de buffalo ranch coleslaw y pepinillos. Con chipotle.' },
          { id: 'hot-chicken', nombre: 'Hot Chicken Sandwich', precio: 155, sello: 'La más picante',
            desc: 'Sobre una cama de aderezo spicy garlic, cacahuate triturado y tocino. Con chipotle.' }
        ]
      },
      {
        id: 'fries', nombre: 'Fries',
        items: [
          { id: 'simple-fries', nombre: 'Simple Fries', precio: 50, desc: 'Papas a la francesa sencillas.' },
          { id: 'cheesefries', nombre: 'Cheesefries', precio: 79, desc: 'Papas a la francesa bañadas en nuestro queso amarillo y en tu salsa favorita.' },
          { id: 'red-hot-chillifries', nombre: 'Red Hot Chillifries', precio: 89, desc: 'Papas a la francesa bañadas en nuestro queso amarillo y chilli.' },
          { id: 'jalapeno-fries', nombre: 'Jalapeño Fries', precio: 99, desc: 'Papas a la francesa bañadas en aderezo de jalapeño y queso cheddar.' },
          { id: 'flamin-fries', nombre: 'Flamin Fries', precio: 99, desc: 'Papas a la francesa con queso amarillo, chipotle, hot lemon y papas flaming hot trituradas.' }
        ]
      },
      {
        id: 'sides', nombre: 'Sides',
        items: [
          { id: 'pickle-poppers', nombre: 'Pickle Poppers', precio: 55, desc: 'Pepinillos empanizados recién hechos, con aderezo de la casa.' },
          { id: 'mac-and-cheese', nombre: 'Mac and Cheese', precio: 60, desc: 'Macarrón con queso, tocino y galletas saladas trituradas.' },
          { id: 'cheesesticks', nombre: 'Cheesesticks', precio: 89, desc: '5 dedos de queso empanizados hechos en casa, con aderezo chipotle.' },
          { id: 'onion-rings', nombre: 'Onion Rings', precio: 99, desc: 'Aros de cebolla empanizados, con aderezo green sauce.' }
        ]
      },
      {
        id: 'dont-skip', nombre: "Don't Skip",
        items: [
          { id: 'boneless', nombre: 'Boneless',
            desc: 'Pechuga de pollo en cubos empanizados, bañada en tu salsa favorita. Con papas a la francesa, ranch, zanahoria y apio.',
            opciones: [ { nombre: '8 pzas', precio: 120 }, { nombre: '16 pzas', precio: 220 }, { nombre: '32 pzas', precio: 400 } ] },
          { id: 'chickn-mac', nombre: "Chick'n Mac", precio: 130,
            desc: 'Una cama de macarrón en queso amarillo y cheddar, con 4 tiras de pollo empanizadas bañadas en tu salsa favorita.' },
          { id: 'chicken-cheesefries', nombre: 'Chicken Cheesefries', precio: 130,
            desc: 'Una cama de papas a la francesa en queso amarillo, con 4 tiras de pollo empanizadas bañadas en tu salsa favorita. Con aderezo ranch.' }
        ]
      },
      {
        id: 'shakes', nombre: 'Shakes',
        items: [
          { id: 'shake-clasico', nombre: "The Classic's", desc: 'Malteada clásica.',
            opciones: [ { nombre: 'Chocolate', precio: 75 }, { nombre: 'Vainilla', precio: 75 }, { nombre: 'Fresa', precio: 75 } ] },
          { id: 'shake-oreo', nombre: 'Oreo', precio: 85, desc: 'Special shake.' },
          { id: 'shake-kitkat', nombre: 'Kit Kat', precio: 95, desc: 'Special shake.' },
          { id: 'shake-mms', nombre: "M&M's", precio: 95, desc: 'Special shake.' },
          { id: 'shake-ferrero', nombre: 'Ferrero Rocher', precio: 95, desc: 'Special shake.' },
          { id: 'shake-mazapan', nombre: 'Mazapán', precio: 95, desc: 'Special shake.' }
        ]
      },
      {
        id: 'mas', nombre: 'Más',
        nota: 'Ensalada, kids, bebidas y extras.',
        items: [
          { id: 'salad', nombre: 'Salad "Para los fit"', precio: 130,
            desc: 'Lechuga italiana, zanahoria, tomate, tortilla frita, cacahuate natural y pechuga de pollo a la plancha o empanizada. Con aderezo ranch y salsa a elegir.' },
          { id: 'kids-nuggets', nombre: 'Kids: nuggets de pollo', precio: 100, desc: '6 nuggets de pollo, papas y ranch. Incluye un jugo.' },
          { id: 'bebida', nombre: 'Bebidas', desc: 'Refrescos y agua.',
            opciones: [ { nombre: 'Coca-Cola', precio: 25 }, { nombre: 'Coca-Cola Light', precio: 25 }, { nombre: 'Agua embotellada', precio: 25 }, { nombre: 'Mountain Dew', precio: 35 }, { nombre: 'Dr Pepper', precio: 35 } ] },
          { id: 'aderezo', nombre: 'Aderezo extra', desc: 'Para acompañar.',
            opciones: [ { nombre: 'Ranch', precio: 15 }, { nombre: 'Chipotle', precio: 15 }, { nombre: 'Búfalo', precio: 15 }, { nombre: 'Mid Búfalo', precio: 15 }, { nombre: 'BBQ', precio: 15 }, { nombre: 'Hot BBQ', precio: 15 }, { nombre: 'Hot Lemon', precio: 15 }, { nombre: 'Spicy Garlic', precio: 15 }, { nombre: 'Green Sauce', precio: 15 }, { nombre: 'Jalapeño Dip', precio: 20 }, { nombre: 'Cheese', precio: 20 } ] },
          { id: 'crisscut', nombre: 'Cambio a papas crisscut', precio: 20, desc: 'Cambia las papas a la francesa de tu burger por crisscut.' },
          { id: 'extra-carne', nombre: 'Extra carne o pollo', precio: 40, desc: 'Una porción más en tu burger o sándwich.' }
        ]
      }
    ]
  },

  /* ---------- Capas de la burger isométrica (de abajo hacia arriba) ---------- */
  // Ingredientes tomados de la descripción de su Cheeseburger.
  capas: [
    { id: 'pan-abajo',  nombre: 'Pan brioche',           nota: 'La base de todas.' },
    { id: 'carne',      nombre: '150 g de carne',        nota: 'En cada burger.' },
    { id: 'queso',      nombre: 'Queso suizo americano', nota: 'Derretido encima.' },
    { id: 'lechuga',    nombre: 'Lechuga italiana',      nota: 'O en lugar del pan, si quieres.' },
    { id: 'tomate',     nombre: 'Tomate',                nota: 'En rodajas.' },
    { id: 'pan-arriba', nombre: 'Pan brioche',           nota: 'Y papas a la francesa a un lado.' }
  ],

  /* ---------- Oferta (sección final, solo si SHOW_OFFER es true) ---------- */
  oferta: {
    titular: 'Tu página, desde $1,000 MXN',
    bajada: 'Precios accesibles para negocios como el tuyo',
    incluye: [                                   // editable: lo que incluye el precio
      'Menú digital',
      'Botón de pedido por WhatsApp',
      'Mapa y horarios',
      'Sin comisiones por pedido'
    ],
    boton: 'Quiero mi página',
    whatsapp: '52XXXXXXXXXX',                    // <- TU número, solo dígitos con 52. Mientras tenga X el botón queda desactivado
    mensaje: 'Hola, vi el demo de The Cheese Burger y quiero mi página.'
  }
};
