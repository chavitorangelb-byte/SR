// Placa de cristal clara con el letrero AG (foto recortada de su local). El letrero solo se mueve, escala o
// enmascara: no se redibuja. Va a 340 px de ancho (su detalle real rinde ~450 px).
import * as THREE from 'three';

export async function crearPlaca({ url, radio = 200, anchoLetrero = 340 }) {
  const grupo = new THREE.Group();
  grupo.name = 'placa';
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, 16, 128, 1), new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.1, transmission: 1, thickness: 16, ior: 1.5,
    attenuationColor: new THREE.Color('#f7dde2'), attenuationDistance: 320, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2,
  }));
  disco.rotation.x = Math.PI / 2;
  grupo.add(disco);
  // Fondo claro de la placa (para que el letrero se lea como en su local, sobre blanco). Va sobre la cara del
  // cristal (z > 8): lo transparente detrás de un cristal con transmisión no se vería.
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(radio - 10, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f8f2f0'), transparent: true, opacity: 0.86 }));
  fondo.position.z = 9;
  grupo.add(fondo);
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 8;
  tex.flipY = true; tex.needsUpdate = true;
  const alto = anchoLetrero * (img.height / img.width);
  const letrero = new THREE.Mesh(new THREE.PlaneGeometry(anchoLetrero, alto), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  letrero.position.z = 10;
  grupo.add(letrero);
  // Barrido de luz sobre el cristal.
  const barrido = new THREE.Mesh(new THREE.CircleGeometry(radio - 2, 128), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { x: { value: -1.5 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float x; varying vec2 vUv; void main(){ float d = (vUv.x - 0.5) + (vUv.y - 0.5) * 0.6 - x; float b = exp(-d * d / 0.004) * 0.22; gl_FragColor = vec4(vec3(1.0, 0.97, 0.96) * b, 0.0); }`,
  }));
  barrido.position.z = 11;
  barrido.renderOrder = 15;
  grupo.add(barrido);
  return { grupo, disco, fondo, letrero, barrido };
}
