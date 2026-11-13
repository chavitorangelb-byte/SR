/* VIDEO PROMOCIONAL · configuración editable.
   El video es para enseñárselo al dueño de The Cheese Burger (no a sus clientes).
   Todo lo que dice sale de aquí o de ../data.js. */
window.TCB_VIDEO = {
  fps: 30,
  formatos: { v: { ancho: 1080, alto: 1920, nombre: 'vertical' }, h: { ancho: 1920, alto: 1080, nombre: 'horizontal' } },
  SHOW_OFFER: true,            // false = el cierre no menciona el precio
  SHOW_DEMO_NOTE: true,        // nota pequeña "Demo de diseño" en el cierre
  contacto: '',                // opcional: una línea de contacto en el cierre (ej. "WhatsApp 81 0000 0000"). Vacío = no se muestra. Sin dominio, a petición de Salvador.

  // Escena 2: tarjetas. foto = archivo en ../assets/fotos. La relación foto-platillo es por parecido con la descripción del menú: confirmar con el dueño.
  tarjetas: [
    { foto: 'burger-queso-panela', platillo: 'tres-cheeses' },
    { foto: 'chicken-sandwich',    platillo: 'spicy-chicken' },
    { foto: 'burgers-para-llevar', titulo: 'Y todo el menú', nota: '{n} platillos con precio' }
  ],

  // Escena 3: textos
  problema: ['CADA PEDIDO', 'POR APP', 'PAGA COMISIÓN'],
  solucion: ['AQUÍ LLEGA', 'DIRECTO A TU', 'WHATSAPP'],

  // Escena 4: una capa de la burger por cada cosa que lleva la página (de abajo hacia arriba).
  // Las primeras cuatro son las de data.js > oferta.incluye; las dos últimas son parte del demo.
  capasExtra: ['Reseñas de Google', 'Tu marca y tus fotos'],

  // Escena 5: cierre
  cierre: { l1: 'QUE TE PIDAN', l2: 'DIRECTO', bajada: 'En tu propia página.' },

  audio: null                  // sin audio por defecto. Para agregar música: ver README (se mezcla con ffmpeg sobre el MP4).
};
