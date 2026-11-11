// Menú de la demo. Solo platillos y precios de su propia página (capturas del 10-nov-2026).
// El color es el del título de cada burger en su menú = color de pan recomendado.
window.PANES = {
  amarillo: { nombre: 'Amarillo', pan: '#F5C455', texto: '#F5C455' },
  azul: { nombre: 'Azul', pan: '#3D7BD9', texto: '#6FA4F2' },
  rosa: { nombre: 'Rosa', pan: '#E872C0', texto: '#F08ACD' },
  morado: { nombre: 'Morado', pan: '#8E3FC9', texto: '#B67AE8' },
  rojo: { nombre: 'Rojo', pan: '#D6232A', texto: '#F2554F' },
};

window.MENU = {
  burgers: [
    {
      id: 'clasico', titulo: "Pa' el clásico",
      nota: 'Carne de res, mix de quesos, aderezo Mandala, lechuga y cebolla asada, más:',
      items: [
        { id: 'point', nombre: 'Point', precio: 129, pan: 'amarillo', desc: 'Pepinillos', extra: 'pepinillos' },
        { id: 'karma', nombre: 'Karma', precio: 159, pan: 'azul', desc: 'Mucho tocino', extra: 'tocino' },
        { id: 'moksha', nombre: 'Moksha', precio: 149, pan: 'rosa', desc: 'Piña con canela y jamón de pavo', extra: 'pina' },
        { id: 'garden', nombre: 'Garden', precio: 169, pan: 'morado', desc: 'Guacamole y tocino', extra: 'guacamole' },
      ],
    },
    {
      id: 'atrevido', titulo: "Pa' el atrevido",
      nota: 'Carne de res, mix de quesos, aderezo Mandala, lechuga y cebolla asada, más:',
      items: [
        { id: 'purusha', nombre: 'Purusha', precio: 165, pan: 'rojo', desc: 'Mermelada de tocino y aros de cebolla', extra: 'aros' },
        { id: 'mandala', nombre: 'Mandala', precio: 169, pan: 'morado', desc: 'Piña, cereza y tocino', extra: 'cereza' },
        { id: 'artha', nombre: 'Artha', precio: 159, pan: 'rosa', desc: 'Salsa de pizza, pepperoni y chimichurri argentino', extra: 'pepperoni' },
        { id: 'holi', nombre: 'Holi', precio: 169, pan: 'rojo', desc: 'Manzana asada con canela y mermelada de tocino', extra: 'manzana' },
      ],
    },
    {
      id: 'pollo', titulo: 'Pollo', nota: '',
      items: [
        { id: 'mahant', nombre: 'Mahant', precio: 169, pan: 'morado', desc: 'Boneless BBQ, tocino y salchicha', extra: 'bbq' },
        { id: 'loto', nombre: 'Loto', precio: 159, pan: 'azul', desc: 'Boneless buffalo y ranch', extra: 'buffalo' },
      ],
    },
  ],
  hotdogs: [
    { id: 'pointdog', ico: 'hotdog', nombre: 'Point Dog', precio: 49, desc: 'Pan brioche, salchicha jumbo de pavo, jitomate, cebolla asada y aderezo Mandala' },
  ],
  hotdogsNota: 'Ármalo a tu gusto con extras desde $15',
  entradas: [
    { id: 'frenchies', ico: 'papas', nombre: 'Frenchies', precio: 79, desc: '400 gr de papas francesa con sal y paprika' },
    { id: 'gajos', ico: 'papas', nombre: 'Gajos', precio: 79, desc: '400 gr de papas gajo con sal y paprika' },
    { id: 'aros', ico: 'aros', nombre: 'Aros de cebolla', precio: 99, desc: '10 piezas con mermelada de tocino' },
    { id: 'porkypapas', ico: 'papas', nombre: 'Porkypapas', precio: 135, desc: 'Papas, mix de queso fundido, salsa BBQ y tocino' },
  ],
  postres: [
    { id: 'nubes', nombre: 'Nubes asadas', precio: 79, desc: '10 bombones con una fogata personal para asarlos en la mesa' },
    { id: 'smores', nombre: "Six S'mores Kit", precio: 129, desc: 'Bombones, galletas y chocolate con fogata personal' },
    { id: 'panque', nombre: 'Panque del abuelo', precio: 79, desc: 'Panquecito de elote bañado en rompope' },
    { id: 'helado', nombre: 'Helado', precio: 45, desc: 'Vainilla o chocolate' },
  ],
  resenas: [
    'Muy rica la comida! Los hot dogs son grandes, tienen diferentes tipos de pan para hamburguesa y al final nos trajeron bombones para asar con la cuenta.',
    'El lugar es muy agradable, el personal muy amable. La comida está muy rica!',
    'Un lugar distinto, familiar, cálido, la atención, la comida muy rica.',
  ],
};
